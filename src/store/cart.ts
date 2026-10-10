"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Product, ProductVariant, Size } from "@/lib/types";
import { MAX_CART_LINES, MAX_QTY_PER_LINE } from "@/lib/schemas/checkout";

export type CartLine = {
  key: string;
  productId: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  color: string;
  size: Size;
  quantity: number;
  /** Most this line can hold: min(available stock, MAX_QTY_PER_LINE). */
  maxQuantity: number;
};

/** What addToCart actually did, so the UI never claims "Added to bag" when nothing was added. */
export type AddResult =
  | { status: "added"; added: number; quantity: number; capped: boolean }
  | { status: "out_of_stock" }
  | { status: "max_reached"; quantity: number }
  | { status: "bag_full" };

/** Changes applied from the server's view of the bag (see useCartQuote). */
export type AvailabilityChange = { name: string; color: string; size: string; kind: "removed" | "reduced" | "price"; quantity?: number; price?: number };

type CartState = {
  lines: CartLine[];
  /** Code the shopper entered. Validity and amount always come from the server (/api/cart/quote). */
  promoCode: string | null;
  addToCart: (line: Omit<CartLine, "key" | "quantity"> & { quantity?: number }) => AddResult;
  removeFromCart: (key: string) => void;
  /** Removes every line of a product (e.g. the server says it is no longer sold). Returns the removed lines. */
  removeProduct: (productId: string) => CartLine[];
  updateQuantity: (key: string, quantity: number) => void;
  /** Applies server-reported availability (price changes, lower stock) and reports what changed. */
  syncAvailability: (items: { productId: string; color: string; size: string; unitPrice: number; available: number }[]) => AvailabilityChange[];
  clearCart: () => void;
  setPromoCode: (code: string | null) => void;
};

const lineKey = (productId: string, color: string, size: string) => `${productId}:${color}:${size}`;
const capOf = (available: number) => Math.max(0, Math.min(Math.floor(available), MAX_QTY_PER_LINE));

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      promoCode: null,

      addToCart: ({ quantity = 1, ...line }) => {
        const key = lineKey(line.productId, line.color, line.size);
        const cap = capOf(line.maxQuantity);
        const wanted = Math.max(1, Math.floor(quantity));
        if (cap === 0) return { status: "out_of_stock" };

        const existing = get().lines.find((l) => l.key === key);
        if (!existing) {
          if (get().lines.length >= MAX_CART_LINES) return { status: "bag_full" };
          const qty = Math.min(wanted, cap);
          set({ lines: [...get().lines, { ...line, key, maxQuantity: cap, quantity: qty }] });
          return { status: "added", added: qty, quantity: qty, capped: qty < wanted };
        }

        const qty = Math.min(existing.quantity + wanted, cap);
        const added = qty - existing.quantity;
        // Refresh price/name/image from the page the shopper is looking at; never exceed current stock.
        set({ lines: get().lines.map((l) => (l.key === key ? { ...l, ...line, key, maxQuantity: cap, quantity: Math.min(qty, cap) } : l)) });
        if (added <= 0) return { status: "max_reached", quantity: Math.min(existing.quantity, cap) };
        return { status: "added", added, quantity: qty, capped: added < wanted };
      },

      removeFromCart: (key) => set({ lines: get().lines.filter((l) => l.key !== key) }),

      removeProduct: (productId) => {
        const removed = get().lines.filter((l) => l.productId === productId);
        if (removed.length) set({ lines: get().lines.filter((l) => l.productId !== productId) });
        return removed;
      },

      updateQuantity: (key, quantity) =>
        set({
          lines: get()
            .lines.map((l) => (l.key === key ? { ...l, quantity: Math.min(Math.max(0, Math.floor(quantity)), l.maxQuantity) } : l))
            .filter((l) => l.quantity > 0),
        }),

      syncAvailability: (items) => {
        const changes: AvailabilityChange[] = [];
        const lines = get().lines.flatMap((l) => {
          const s = items.find((i) => lineKey(i.productId, i.color, i.size) === l.key);
          if (!s) return [l];
          const cap = capOf(s.available);
          const quantity = Math.min(l.quantity, cap);
          const info = { name: l.name, color: l.color, size: l.size };
          if (quantity === 0) {
            changes.push({ ...info, kind: "removed" });
            return [];
          }
          if (quantity < l.quantity) changes.push({ ...info, kind: "reduced", quantity });
          if (s.unitPrice !== l.price) changes.push({ ...info, kind: "price", price: s.unitPrice });
          return [cap === l.maxQuantity && quantity === l.quantity && s.unitPrice === l.price ? l : { ...l, price: s.unitPrice, maxQuantity: cap, quantity }];
        });
        if (changes.length || lines.some((l, i) => l !== get().lines[i])) set({ lines });
        return changes;
      },

      clearCart: () => set({ lines: [], promoCode: null }),
      setPromoCode: (promoCode) => set({ promoCode: promoCode ? promoCode.trim().toUpperCase() : null }),
    }),
    {
      name: "phenomenon-cart",
      // v2: products come from the database (cuid ids). Bags saved with mock ids are discarded.
      version: 2,
      migrate: () => ({ lines: [], promoCode: null }),
    },
  ),
);

// Keep the bag in sync across tabs: another tab writing localStorage re-hydrates this one.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "phenomenon-cart") void useCart.persist.rehydrate();
  });
}

export const selectItemCount = (s: CartState) => s.lines.reduce((n, l) => n + l.quantity, 0);
export const selectSubtotal = (s: CartState) => s.lines.reduce((n, l) => n + l.price * l.quantity, 0);

/**
 * Variant for one-tap adds (quick add, wishlist) where the shopper picks only a size: the first colour, in display
 * order, that has stock and still has room in the bag — falling back to the first in-stock colour.
 */
export function pickVariant(product: Product, size: Size) {
  const lines = useCart.getState().lines;
  const inStock = product.colors
    .map((c) => product.variants.find((v) => v.color === c.name && v.size === size))
    .filter((v): v is ProductVariant => !!v && v.stock > 0);
  const room = (v: ProductVariant) =>
    Math.min(v.stock, MAX_QTY_PER_LINE) - (lines.find((l) => l.key === lineKey(product.id, v.color, size))?.quantity ?? 0);
  return inStock.find((v) => room(v) > 0) ?? inStock[0];
}
