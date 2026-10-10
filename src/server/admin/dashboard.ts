import "server-only";
import { db } from "@/lib/db";
import type { DashboardData } from "@/lib/admin-types";
import { listPayments } from "./payments";
import { listAdminProducts, SOLD_STATUSES } from "./products";

const DAY = 864e5;
const NET_PAYMENT = ["SUCCEEDED", "PARTIALLY_REFUNDED", "REFUNDED"] as const;

function delta(current: number, previous: number) {
  return previous > 0 ? Math.round(((current - previous) / previous) * 1000) / 10 : null;
}

async function windowMetrics(from: Date, to: Date) {
  const [payments, orders, newCustomers] = await Promise.all([
    db.payment.findMany({
      where: { status: { in: [...NET_PAYMENT] }, createdAt: { gte: from, lt: to } },
      select: { amount: true, amountRefunded: true, createdAt: true },
    }),
    db.order.count({ where: { status: { in: [...SOLD_STATUSES] }, createdAt: { gte: from, lt: to } } }),
    db.user.count({ where: { role: "CUSTOMER", createdAt: { gte: from, lt: to } } }),
  ]);
  const revenue = payments.reduce((s, p) => s + Number(p.amount) - Number(p.amountRefunded), 0);
  return { payments, revenue, orders, newCustomers };
}

/** KPIs and charts for /admin, over the last 30 days compared with the 30 days before. */
export async function getDashboard(): Promise<DashboardData> {
  const now = new Date();
  const start = new Date(now.getTime() - 30 * DAY);
  const prevStart = new Date(now.getTime() - 60 * DAY);

  const [cur, prev, items, products, recentPayments] = await Promise.all([
    windowMetrics(start, now),
    windowMetrics(prevStart, start),
    db.orderItem.findMany({
      where: { order: { status: { in: [...SOLD_STATUSES] }, createdAt: { gte: start } } },
      select: { quantity: true, unitPrice: true, variant: { select: { product: { select: { category: { select: { name: true } } } } } } },
    }),
    listAdminProducts(),
    listPayments(9),
  ]);

  // One point per day, oldest first (UTC dates).
  const byDay = new Map<string, number>();
  for (let i = 29; i >= 0; i--) byDay.set(new Date(now.getTime() - i * DAY).toISOString().slice(0, 10), 0);
  for (const p of cur.payments) {
    const key = p.createdAt.toISOString().slice(0, 10);
    if (byDay.has(key)) byDay.set(key, byDay.get(key)! + Number(p.amount) - Number(p.amountRefunded));
  }

  const byCategory = new Map<string, number>();
  for (const it of items) {
    const name = it.variant?.product.category.name ?? "Other";
    byCategory.set(name, (byCategory.get(name) ?? 0) + Number(it.unitPrice) * it.quantity);
  }

  const aov = cur.orders ? cur.revenue / cur.orders : 0;
  const prevAov = prev.orders ? prev.revenue / prev.orders : 0;

  return {
    revenue: { value: cur.revenue, delta: delta(cur.revenue, prev.revenue) },
    orders: { value: cur.orders, delta: delta(cur.orders, prev.orders) },
    aov: { value: aov, delta: delta(aov, prevAov) },
    newCustomers: { value: cur.newCustomers, delta: delta(cur.newCustomers, prev.newCustomers) },
    revenueSeries: [...byDay].map(([date, value]) => ({ date, value: Math.round(value * 100) / 100 })),
    salesByCategory: [...byCategory]
      .map(([category, value]) => ({ category, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value),
    recentPayments,
    bestSellers: [...products]
      .sort((a, b) => b.sold - a.sold)
      .slice(0, 5)
      .map((p) => ({ id: p.id, name: p.name, image: p.images[0]?.src ?? "", sold: p.sold })),
    lowStock: products
      .filter((p) => p.status === "active")
      .map((p) => ({ id: p.id, name: p.name, units: p.variants.reduce((s, v) => s + v.stock, 0) }))
      .sort((a, b) => a.units - b.units)
      .slice(0, 5),
  };
}
