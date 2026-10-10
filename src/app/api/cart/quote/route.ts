import { db } from "@/lib/db";
import { handle, readJson } from "@/server/http";
import { priceCart, quoteSchema } from "@/server/pricing";

/**
 * POST /api/cart/quote — prices the bag on the server (live prices, stock, discount rules, shipping).
 * Body: { items: [{ productId, color, size, quantity }], promoCode?, shippingMethod? }
 */
export const POST = handle(async (req: Request) => {
  const input = await readJson(req, quoteSchema);
  const quote = await priceCart(db, input);
  return {
    subtotal: quote.subtotal,
    discount: quote.discount,
    shipping: quote.shipping,
    total: quote.total,
    promoCode: quote.discountCode?.code ?? null,
    discountError: quote.discountError,
    items: quote.lines.map((l) => ({
      productId: l.input.productId,
      color: l.input.color,
      size: l.input.size,
      unitPrice: l.unitPrice,
      available: Math.max(0, l.available),
    })),
  };
});
