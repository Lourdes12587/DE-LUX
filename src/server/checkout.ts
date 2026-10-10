import "server-only";
import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import type { CheckoutInput } from "@/lib/schemas/checkout";
import { db } from "@/lib/db";
import { ApiError, notFound } from "./http";
import { priceCart } from "./pricing";
import { getStripe, publishableKey, toCents } from "./stripe";
import type { SessionUser } from "./auth";

export { checkoutSchema, type CheckoutInput } from "@/lib/schemas/checkout";

/** How long stock stays held for a shopper on the payment step. */
const RESERVATION_MINUTES = 30;

export type OrderConfirmation = {
  number: string;
  email: string;
  status: "paid" | "processing" | "failed" | "cancelled";
  lines: { key: string; name: string; image: string; color: string; size: string; quantity: number; price: number }[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  method: "standard" | "express";
  address: CheckoutInput["address"];
};

export type CheckoutSession = {
  orderNumber: string;
  paymentIntentId: string;
  clientSecret: string;
  publishableKey: string;
  total: number;
};

async function nextOrderNumber(tx: Prisma.TransactionClient) {
  const year = new Date().getFullYear();
  const prefix = `PH-${year}-`;
  const last = await tx.order.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: "desc" } });
  const n = last ? Number(last.number.slice(prefix.length)) + 1 : 1;
  return prefix + String(n).padStart(5, "0");
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      // Serialization conflicts / duplicate order numbers under concurrency → retry.
      const retryable = e instanceof Prisma.PrismaClientKnownRequestError && (e.code === "P2034" || e.code === "P2002");
      if (!retryable || attempt === 2) throw e;
    }
  }
}

/** Cancels a payment the shopper abandoned (e.g. they went back and changed the bag) and releases its stock. */
async function abandonPaymentIntent(paymentIntentId: string) {
  const payment = await db.payment.findUnique({ where: { stripePaymentIntentId: paymentIntentId }, include: { order: true } });
  if (!payment || payment.status !== "PENDING" || payment.order.status !== "PENDING") return;
  try {
    await getStripe().paymentIntents.cancel(paymentIntentId);
  } catch {
    // Already succeeded/cancelled on Stripe's side — fulfilPayment reconciles it.
    return;
  }
  await db.$transaction([
    db.stockReservation.deleteMany({ where: { paymentIntentId } }),
    db.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: "abandoned" } }),
    db.order.update({ where: { id: payment.orderId }, data: { status: "CANCELLED" } }),
  ]);
}

/**
 * Step 1 of checkout: prices the bag on the server, creates a PENDING order, holds the stock for
 * RESERVATION_MINUTES and creates the Stripe PaymentIntent the browser pays with (Payment Element).
 */
export async function createCheckoutSession(input: CheckoutInput, account: SessionUser): Promise<CheckoutSession> {
  const stripe = getStripe();
  // Checkout requires an account: the order always belongs to the signed-in user and uses their email.
  const email = account.email;
  if (input.previousPaymentIntentId) await abandonPaymentIntent(input.previousPaymentIntentId);

  const order = await withRetry(() =>
    db.$transaction(
      async (tx) => {
        const quote = await priceCart(tx, { items: input.items, promoCode: input.promoCode, shippingMethod: input.shippingMethod, email });
        if (input.promoCode && quote.discountError) throw new ApiError(422, quote.discountError);
        for (const l of quote.lines) {
          if (l.available < l.input.quantity) {
            throw new ApiError(409, `Only ${Math.max(0, l.available)} left of ${l.variant.product.name} (${l.input.color}, ${l.input.size})`, {
              productId: l.input.productId,
            });
          }
        }

        const user = await tx.user.findUniqueOrThrow({ where: { id: account.id }, include: { addresses: { take: 1 } } });
        if (user.status !== "ACTIVE") throw new ApiError(403, "This account cannot place orders. Please contact us.");
        // First purchase: remember the shipping address as the customer's default.
        if (user.addresses.length === 0) {
          const a = input.address;
          await tx.address.create({
            data: { userId: user.id, firstName: a.firstName, lastName: a.lastName, line1: a.address, line2: a.apartment || null, city: a.city, postalCode: a.postalCode, country: a.country, phone: a.phone, isDefault: true },
          });
        }

        const created = await tx.order.create({
          data: {
            number: await nextOrderNumber(tx),
            userId: user.id,
            email,
            status: "PENDING",
            subtotal: quote.subtotal,
            discountTotal: quote.discount,
            shippingTotal: quote.shipping,
            total: quote.total,
            shippingMethod: input.shippingMethod === "express" ? "EXPRESS" : "STANDARD",
            shippingAddress: input.address,
            items: {
              create: quote.lines.map((l) => ({
                variantId: l.variant.id,
                name: l.variant.product.name,
                sku: l.variant.sku,
                color: l.variant.color.name,
                size: l.variant.size,
                image: l.variant.product.images[0]?.url ?? "",
                unitPrice: l.unitPrice,
                quantity: l.input.quantity,
              })),
            },
          },
        });
        return {
          ...created,
          userId: user.id,
          lines: quote.lines.map((l) => ({ variantId: l.variant.id, quantity: l.input.quantity })),
          discountCodeId: quote.discount > 0 ? (quote.discountCode?.id ?? null) : null,
          discount: quote.discount,
          total: quote.total,
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );

  let intent: Stripe.PaymentIntent;
  try {
    intent = await stripe.paymentIntents.create(
      {
        amount: toCents(order.total),
        currency: "eur",
        // Methods come from the Stripe Dashboard (card, Apple Pay / Google Pay, PayPal, Klarna…).
        automatic_payment_methods: { enabled: true },
        receipt_email: email,
        description: `DE LUX order ${order.number}`,
        metadata: {
          orderId: order.id,
          orderNumber: order.number,
          ...(order.discountCodeId && { discountCodeId: order.discountCodeId, discountAmount: String(order.discount) }),
        },
      },
      { idempotencyKey: `order-${order.id}` },
    );
  } catch (e) {
    await db.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    throw new ApiError(502, `Stripe could not start the payment: ${e instanceof Error ? e.message : "unknown error"}`);
  }

  const expiresAt = new Date(Date.now() + RESERVATION_MINUTES * 60_000);
  await db.$transaction([
    db.payment.create({
      data: { orderId: order.id, stripePaymentIntentId: intent.id, amount: order.total, status: "PENDING", method: "pending" },
    }),
    db.stockReservation.createMany({
      data: order.lines.map((l) => ({
        variantId: l.variantId,
        userId: order.userId,
        quantity: l.quantity,
        paymentIntentId: intent.id,
        expiresAt,
      })),
    }),
  ]);

  return {
    orderNumber: order.number,
    paymentIntentId: intent.id,
    clientSecret: intent.client_secret!,
    publishableKey: publishableKey(),
    total: order.total,
  };
}

/** Card brand / wallet details from the PaymentIntent's charge, for the admin payments list. */
function paymentDetails(intent: Stripe.PaymentIntent) {
  const charge = typeof intent.latest_charge === "object" ? intent.latest_charge : null;
  const details = charge?.payment_method_details;
  if (details?.type === "card" && details.card) {
    const wallet = details.card.wallet?.type; // apple_pay | google_pay | …
    return { method: wallet ?? "card", brand: details.card.brand ?? null, last4: details.card.last4 ?? null };
  }
  return { method: details?.type ?? intent.payment_method_types[0] ?? "unknown", brand: null, last4: null };
}

/**
 * Reconciles our order with Stripe's PaymentIntent. Idempotent — called by the webhook and when the shopper
 * returns to /order-confirmation (so payments confirm locally even without a webhook).
 *   succeeded → order PAID, stock decremented (SALE movements), reservations released, discount redeemed
 *   canceled  → order CANCELLED, reservations released
 *   failed    → payment FAILED with reason (order stays PENDING so the shopper can retry)
 */
export async function fulfillPayment(paymentIntentId: string) {
  const stripe = getStripe();
  const intent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });

  await withRetry(() =>
    db.$transaction(
      async (tx) => {
        const payment = await tx.payment.findUnique({
          where: { stripePaymentIntentId: intent.id },
          include: { order: { include: { items: true } } },
        });
        if (!payment) return;
        const order = payment.order;

        if (intent.status === "succeeded") {
          if (payment.status === "SUCCEEDED") return; // already fulfilled
          await tx.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED", failureReason: null, ...paymentDetails(intent) } });
          if (order.status === "PENDING" || order.status === "CANCELLED") {
            await tx.order.update({ where: { id: order.id }, data: { status: "PAID" } });
            for (const item of order.items) {
              if (!item.variantId) continue;
              const updated = await tx.variant.updateMany({
                where: { id: item.variantId, stock: { gte: item.quantity } },
                data: { stock: { decrement: item.quantity } },
              });
              if (updated.count === 0) {
                // Reservation expired and someone else bought the last units: the customer has paid, so keep
                // the order, zero the stock and flag it in the inventory history for the team.
                await tx.variant.update({ where: { id: item.variantId }, data: { stock: 0 } });
              }
              await tx.inventoryMovement.create({
                data: {
                  variantId: item.variantId,
                  delta: -item.quantity,
                  reason: "SALE",
                  orderId: order.id,
                  note: updated.count === 0 ? "Oversold: paid after reservation expired" : null,
                },
              });
            }
            const codeId = intent.metadata.discountCodeId;
            if (codeId && !(await tx.discountRedemption.findUnique({ where: { orderId: order.id } }))) {
              await tx.discountRedemption.create({
                data: { codeId, userId: order.userId, orderId: order.id, amount: Number(intent.metadata.discountAmount ?? order.discountTotal) },
              });
              await tx.discountCode.update({ where: { id: codeId }, data: { usedCount: { increment: 1 } } });
            }
          }
          await tx.stockReservation.deleteMany({ where: { paymentIntentId: intent.id } });
        } else if (intent.status === "canceled") {
          if (order.status === "PENDING") await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
          if (payment.status === "PENDING") await tx.payment.update({ where: { id: payment.id }, data: { status: "FAILED", failureReason: "canceled" } });
          await tx.stockReservation.deleteMany({ where: { paymentIntentId: intent.id } });
        } else if (intent.status === "requires_payment_method" && intent.last_payment_error) {
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: "FAILED", failureReason: intent.last_payment_error.code ?? intent.last_payment_error.message ?? "payment_failed" },
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    ),
  );
  return intent;
}

/**
 * Order summary for /order-confirmation. Stripe appends `payment_intent` and `payment_intent_client_secret` to the
 * return URL; the secret proves the visitor owns this payment (there is no login yet).
 */
export async function getConfirmation(paymentIntentId: string, clientSecret: string): Promise<OrderConfirmation> {
  const intent = await fulfillPayment(paymentIntentId);
  if (intent.client_secret !== clientSecret) throw notFound("Order");

  const payment = await db.payment.findUnique({
    where: { stripePaymentIntentId: paymentIntentId },
    include: { order: { include: { items: true } } },
  });
  if (!payment) throw notFound("Order");
  const o = payment.order;
  const status: OrderConfirmation["status"] =
    intent.status === "succeeded"
      ? "paid"
      : intent.status === "processing"
        ? "processing"
        : intent.status === "canceled"
          ? "cancelled"
          : "failed";

  return {
    number: o.number,
    email: o.email,
    status,
    lines: o.items.map((i) => ({
      key: i.id,
      name: i.name,
      image: i.image,
      color: i.color,
      size: i.size,
      quantity: i.quantity,
      price: Number(i.unitPrice),
    })),
    subtotal: Number(o.subtotal),
    discount: Number(o.discountTotal),
    shipping: Number(o.shippingTotal),
    total: Number(o.total),
    method: o.shippingMethod === "EXPRESS" ? "express" : "standard",
    address: o.shippingAddress as CheckoutInput["address"],
  };
}
