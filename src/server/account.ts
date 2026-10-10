import "server-only";
import type { OrderStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { notFound } from "./http";

/** Abandoned/unpaid checkouts (PENDING) and their cancellations are not shown to customers. */
const VISIBLE: OrderStatus[] = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED", "REFUNDED", "PARTIALLY_REFUNDED"];

export type CustomerOrderStatus = "paid" | "processing" | "shipped" | "delivered" | "refunded";

const toStatus = (s: OrderStatus): CustomerOrderStatus =>
  s === "PAID" ? "paid" : s === "PROCESSING" ? "processing" : s === "SHIPPED" ? "shipped" : s === "DELIVERED" ? "delivered" : "refunded";

const METHOD: Record<string, string> = { card: "Card", apple_pay: "Apple Pay", google_pay: "Google Pay", paypal: "PayPal", klarna: "Klarna" };
const BRAND: Record<string, string> = { visa: "Visa", mastercard: "Mastercard", amex: "American Express" };

const orderInclude = {
  items: { include: { variant: { select: { product: { select: { slug: true, status: true } } } } } },
  payments: { orderBy: { createdAt: "desc" } },
  shipments: { orderBy: { createdAt: "desc" } },
} satisfies Prisma.OrderInclude;

type OrderRow = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export type CustomerOrder = {
  number: string;
  date: string;
  status: CustomerOrderStatus;
  total: number;
  subtotal: number;
  discount: number;
  shipping: number;
  shippingMethod: "standard" | "express";
  address: { firstName: string; lastName: string; address: string; apartment?: string; city: string; postalCode: string; country: string; phone: string };
  payment: { method: string; last4: string | null; refunded: number } | null;
  shipment: { carrier: string; trackingNumber: string; trackingUrl: string | null; status: string; shippedAt: string | null; deliveredAt: string | null } | null;
  items: { id: string; name: string; color: string; size: string; quantity: number; price: number; image: string; slug: string | null }[];
};

function toCustomerOrder(o: OrderRow): CustomerOrder {
  const pay = o.payments.find((p) => p.status === "SUCCEEDED" || p.status === "REFUNDED" || p.status === "PARTIALLY_REFUNDED") ?? null;
  const ship = o.shipments[0] ?? null;
  return {
    number: o.number,
    date: o.createdAt.toISOString(),
    status: toStatus(o.status),
    total: Number(o.total),
    subtotal: Number(o.subtotal),
    discount: Number(o.discountTotal),
    shipping: Number(o.shippingTotal),
    shippingMethod: o.shippingMethod === "EXPRESS" ? "express" : "standard",
    address: o.shippingAddress as CustomerOrder["address"],
    payment: pay
      ? {
          method: pay.method === "card" && pay.brand ? (BRAND[pay.brand] ?? "Card") : (METHOD[pay.method] ?? pay.method),
          last4: pay.last4,
          refunded: Number(pay.amountRefunded),
        }
      : null,
    shipment: ship
      ? {
          carrier: ship.carrier,
          trackingNumber: ship.trackingNumber,
          trackingUrl: ship.trackingUrl,
          status: ship.status,
          shippedAt: ship.shippedAt?.toISOString() ?? null,
          deliveredAt: ship.deliveredAt?.toISOString() ?? null,
        }
      : null,
    items: o.items.map((i) => ({
      id: i.id,
      name: i.name,
      color: i.color,
      size: i.size,
      quantity: i.quantity,
      price: Number(i.unitPrice),
      image: i.image,
      // Link back to the product only while it is still sold.
      slug: i.variant?.product.status === "ACTIVE" ? i.variant.product.slug : null,
    })),
  };
}

export async function listMyOrders(userId: string): Promise<CustomerOrder[]> {
  const rows = await db.order.findMany({ where: { userId, status: { in: VISIBLE } }, include: orderInclude, orderBy: { createdAt: "desc" } });
  return rows.map(toCustomerOrder);
}

/** One order — only if it belongs to the user (404 otherwise, so order numbers can't be probed). */
export async function getMyOrder(userId: string, number: string): Promise<CustomerOrder> {
  const row = await db.order.findFirst({ where: { number, userId, status: { in: VISIBLE } }, include: orderInclude });
  if (!row) throw notFound("Order");
  return toCustomerOrder(row);
}

export async function getMyProfile(userId: string) {
  const user = await db.user.findUniqueOrThrow({
    where: { id: userId },
    include: { addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }], take: 1 } },
  });
  const a = user.addresses[0];
  return {
    name: user.name,
    email: user.email,
    phone: user.phone ?? a?.phone ?? null,
    memberSince: user.createdAt.toISOString(),
    address: a ? { line1: a.line1, line2: a.line2, city: a.city, postalCode: a.postalCode, country: a.country } : null,
  };
}
