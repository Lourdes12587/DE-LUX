import "server-only";
import type { DiscountCode, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { computeTotals, round2, type ShippingMethodId, type Totals } from "@/lib/pricing";
import type { CartItemInput } from "@/lib/schemas/checkout";
import { ApiError } from "./http";

type Client = Prisma.TransactionClient | typeof db;

export { cartItemSchema, quoteSchema, type CartItemInput } from "@/lib/schemas/checkout";

const variantInclude = {
  product: { include: { category: true, images: { orderBy: { position: "asc" }, take: 1 } } },
  color: true,
  reservations: { select: { quantity: true, expiresAt: true } },
} satisfies Prisma.VariantInclude;

export type PricedLine = {
  input: CartItemInput;
  variant: Prisma.VariantGetPayload<{ include: typeof variantInclude }>;
  unitPrice: number;
  available: number;
};

export type Quote = Totals & {
  lines: PricedLine[];
  discountCode: DiscountCode | null;
  discountError: string | null;
};

const fmt = (n: number) => new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(n);

/** Resolves each cart line to a sellable variant using live prices and stock. */
async function resolveLines(client: Client, items: CartItemInput[]) {
  const now = Date.now();
  const lines: PricedLine[] = [];
  for (const input of items) {
    const variant = await client.variant.findFirst({
      where: { productId: input.productId, size: input.size, color: { name: input.color } },
      include: variantInclude,
    });
    if (!variant || variant.product.status !== "ACTIVE") {
      throw new ApiError(409, "An item in your bag is no longer available", {
        productId: input.productId,
        color: input.color,
        size: input.size,
      });
    }
    const reserved = variant.reservations
      .filter((r) => r.expiresAt.getTime() > now)
      .reduce((s, r) => s + r.quantity, 0);
    lines.push({ input, variant, unitPrice: Number(variant.product.price), available: variant.stock - reserved });
  }
  return lines;
}

/** Returns the discount amount for a code, or an error message explaining why it does not apply. */
async function evaluateDiscount(
  client: Client,
  rawCode: string,
  lines: PricedLine[],
  subtotal: number,
  email?: string,
): Promise<{ code: DiscountCode | null; amount: number; error: string | null }> {
  const code = await client.discountCode.findUnique({
    where: { code: rawCode.trim().toUpperCase() },
    include: { categories: { select: { id: true } } },
  });
  const now = new Date();
  const fail = (error: string) => ({ code: null, amount: 0, error });

  if (!code || !code.active) return fail("This code is not valid.");
  if (code.startsAt && code.startsAt > now) return fail("This code is not active yet.");
  if (code.expiresAt && code.expiresAt < now) return fail("This code has expired.");
  if (code.maxUses != null && code.usedCount >= code.maxUses) return fail("This code has reached its usage limit.");
  if (code.minSubtotal && subtotal < Number(code.minSubtotal))
    return fail(`Spend ${fmt(Number(code.minSubtotal))} or more to use this code.`);

  const categoryIds = code.categories.map((c) => c.id);
  const eligible = lines
    .filter((l) => categoryIds.length === 0 || categoryIds.includes(l.variant.product.categoryId))
    .reduce((s, l) => s + l.unitPrice * l.input.quantity, 0);
  if (eligible <= 0) return fail("This code does not apply to the items in your bag.");

  if (code.oncePerCustomer && email) {
    const used = await client.discountRedemption.findFirst({ where: { codeId: code.id, user: { email } } });
    if (used) return fail("You have already used this code.");
  }

  const value = Number(code.value);
  const amount = code.type === "PERCENT" ? round2((eligible * value) / 100) : Math.min(value, eligible);
  return { code, amount: round2(amount), error: null };
}

/** Server-side cart pricing: the single source of truth for checkout and the /api/cart/quote preview. */
export async function priceCart(
  client: Client,
  input: { items: CartItemInput[]; promoCode?: string | null; shippingMethod: ShippingMethodId; email?: string },
): Promise<Quote> {
  const lines = await resolveLines(client, input.items);
  const subtotal = round2(lines.reduce((s, l) => s + l.unitPrice * l.input.quantity, 0));

  let discount = { code: null as DiscountCode | null, amount: 0, error: null as string | null };
  if (input.promoCode) discount = await evaluateDiscount(client, input.promoCode, lines, subtotal, input.email);

  return {
    ...computeTotals(subtotal, discount.amount, input.shippingMethod),
    lines,
    discountCode: discount.code,
    discountError: discount.error,
  };
}
