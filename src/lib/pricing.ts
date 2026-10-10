// Shipping rules shared by client (display) and server (src/server/pricing.ts, the source of truth).

export const FREE_SHIPPING_THRESHOLD = 150;

export type ShippingMethodId = "standard" | "express";

export const SHIPPING_METHODS: {
  id: ShippingMethodId;
  name: string;
  eta: string;
  price: number;
}[] = [
  { id: "standard", name: "Standard Shipping", eta: "3–5 business days", price: 4.95 },
  { id: "express", name: "Express Shipping", eta: "1–2 business days", price: 9.95 },
];

export const round2 = (n: number) => Math.round(n * 100) / 100;

/** Shipping is free on standard delivery once the discounted subtotal reaches the threshold. */
export function shippingCost(discountedSubtotal: number, method: ShippingMethodId = "standard") {
  if (discountedSubtotal <= 0) return 0;
  if (method === "standard" && discountedSubtotal >= FREE_SHIPPING_THRESHOLD) return 0;
  return SHIPPING_METHODS.find((m) => m.id === method)!.price;
}

export type Totals = { subtotal: number; discount: number; shipping: number; total: number };

export function computeTotals(subtotal: number, discount: number, method: ShippingMethodId = "standard"): Totals {
  const shipping = shippingCost(subtotal - discount, method);
  return { subtotal: round2(subtotal), discount: round2(discount), shipping, total: round2(subtotal - discount + shipping) };
}
