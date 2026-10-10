import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import type { Payment, PaymentMethod, PaymentStatus } from "@/lib/admin-types";
import { ApiError, notFound } from "@/server/http";
import { getStripe, stripeConfigured } from "@/server/stripe";
import Stripe from "stripe";

const paymentInclude = {
  order: { include: { user: true, items: { include: { variant: { select: { productId: true } } } } } },
} satisfies Prisma.PaymentInclude;

type PaymentRow = Prisma.PaymentGetPayload<{ include: typeof paymentInclude }>;

const METHOD_LABEL: Record<string, PaymentMethod> = {
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  paypal: "PayPal",
  klarna: "Klarna",
  ideal: "iDEAL",
  bancontact: "Bancontact",
  sepa_debit: "SEPA Debit",
  link: "Link",
  pending: "Pending",
};
const label = (m: string) => METHOD_LABEL[m] ?? m.replace(/_/g, " ").replace(/w/g, (c) => c.toUpperCase());
const BRAND_LABEL: Record<string, PaymentMethod> = { visa: "Visa", mastercard: "Mastercard", amex: "Amex" };

function toPayment(p: PaymentRow): Payment {
  const method = p.method === "card" ? (p.brand ? (BRAND_LABEL[p.brand] ?? "Card") : "Card") : label(p.method);
  return {
    id: p.stripePaymentIntentId,
    order: p.order.number,
    userId: p.order.userId,
    customer: p.order.user.name ?? p.order.email,
    email: p.order.email,
    amount: Number(p.amount),
    method,
    last4: p.last4 ?? undefined,
    status: (p.status === "PARTIALLY_REFUNDED" ? "refunded" : p.status.toLowerCase()) as PaymentStatus,
    date: p.createdAt.toISOString(),
    items: p.order.items.map((it) => ({
      productId: it.variant?.productId ?? "",
      name: it.name,
      size: it.size,
      qty: it.quantity,
      price: Number(it.unitPrice),
    })),
  };
}

export async function listPayments(take?: number): Promise<Payment[]> {
  const rows = await db.payment.findMany({ include: paymentInclude, orderBy: { createdAt: "desc" }, take });
  return rows.map(toPayment);
}

/**
 * Full refund through the Stripe Refunds API. Payments that don't exist in Stripe (seed data / pre-Stripe
 * simulated orders with `pi_sim_` or fake ids) are refunded in the database only, with a `re_sim_` id.
 * Stock is not returned — that happens when a Return is received.
 */
async function refundInStripe(stripePaymentIntentId: string, paymentId: string) {
  if (stripePaymentIntentId.startsWith("pi_sim_") || !stripeConfigured()) return null;
  try {
    const refund = await getStripe().refunds.create(
      { payment_intent: stripePaymentIntentId, reason: "requested_by_customer" },
      { idempotencyKey: `refund-${paymentId}` },
    );
    return refund.id;
  } catch (e) {
    if (e instanceof Stripe.errors.StripeInvalidRequestError && e.code === "resource_missing") return null; // seed data
    throw new ApiError(502, `Stripe refused the refund: ${e instanceof Error ? e.message : "unknown error"}`);
  }
}

export async function refundPayment(stripePaymentIntentId: string, reason?: string) {
  const existing = await db.payment.findUnique({ where: { stripePaymentIntentId } });
  if (!existing) throw notFound("Payment");
  if (existing.status !== "SUCCEEDED") throw new ApiError(409, "Only succeeded payments can be refunded");
  const stripeRefundId = await refundInStripe(stripePaymentIntentId, existing.id);

  await db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { stripePaymentIntentId } });
    if (!payment) throw notFound("Payment");
    if (payment.status !== "SUCCEEDED") throw new ApiError(409, "Only succeeded payments can be refunded");

    await tx.refund.create({
      data: {
        paymentId: payment.id,
        stripeRefundId: stripeRefundId ?? `re_sim_${crypto.randomUUID().replaceAll("-", "")}`,
        amount: payment.amount,
        reason: reason ?? "requested_by_customer",
      },
    });
    await tx.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED", amountRefunded: payment.amount } });
    await tx.order.update({ where: { id: payment.orderId }, data: { status: "REFUNDED" } });
  });

  const row = await db.payment.findUniqueOrThrow({ where: { stripePaymentIntentId }, include: paymentInclude });
  return toPayment(row);
}
