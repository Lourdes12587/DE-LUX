"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import { computeTotals, type ShippingMethodId, type Totals } from "@/lib/pricing";
import { selectSubtotal, useCart } from "@/store/cart";
import { notifyAvailability } from "@/lib/cart-feedback";
import { toast } from "sonner";

export type CartQuote = Totals & {
  promoCode: string | null;
  discountError: string | null;
  items: { productId: string; color: string; size: string; unitPrice: number; available: number }[];
};

/**
 * Prices the bag on the server whenever lines, promo code or shipping method change.
 * Until the first response arrives, falls back to a client-side estimate without discount.
 */
export function useCartQuote(method: ShippingMethodId = "standard") {
  const lines = useCart((s) => s.lines);
  const promoCode = useCart((s) => s.promoCode);
  const subtotal = useCart(selectSubtotal);
  const syncAvailability = useCart((s) => s.syncAvailability);
  const removeProduct = useCart((s) => s.removeProduct);
  const removeFromCart = useCart((s) => s.removeFromCart);
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const items = useMemo(
    () => lines.map((l) => ({ productId: l.productId, color: l.color, size: l.size, quantity: l.quantity })),
    [lines],
  );
  const key = JSON.stringify([items, promoCode, method]);

  useEffect(() => {
    if (items.length === 0) {
      setQuote(null);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      api<CartQuote>("/api/cart/quote", {
        method: "POST",
        body: { items, promoCode, shippingMethod: method },
        signal: ctrl.signal,
      })
        .then((q) => {
          setQuote(q);
          setError(null);
          // Stock dropped or price changed since the item was added: adjust the bag and tell the shopper.
          notifyAvailability(syncAvailability(q.items));
        })
        .catch((e) => {
          if (ctrl.signal.aborted) return;
          // A product in the bag is no longer sold (archived, deleted, colour removed): drop it so the shopper
          // isn't stuck — removing it changes the bag, which triggers a fresh quote.
          const gone = e instanceof ApiRequestError && e.status === 409 ? (e.details as { productId?: string; color?: string; size?: string } | undefined) : undefined;
          const line = gone?.productId ? lines.find((l) => l.key === `${gone.productId}:${gone.color}:${gone.size}`) : undefined;
          const removed = line ? (removeFromCart(line.key), [line]) : gone?.productId ? removeProduct(gone.productId) : [];
          if (removed.length) {
            toast("Removed from your bag", { description: `${removed[0].name} (${removed[0].color}, ${removed[0].size}) is no longer available` });
            return;
          }
          setError(e instanceof ApiRequestError ? e.message : "Could not update your bag");
        })
        .finally(() => !ctrl.signal.aborted && setLoading(false));
    }, 250);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const totals = quote ?? { ...computeTotals(subtotal, 0, method), promoCode: null, discountError: null, items: [] };
  return { quote: totals, loading, error, confirmed: !!quote };
}
