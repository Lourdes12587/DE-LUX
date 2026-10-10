"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import { variantStock, type Product, type Size } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { FREE_SHIPPING_THRESHOLD } from "@/lib/pricing";
import { useCart } from "@/store/cart";
import { notifyAdd } from "@/lib/cart-feedback";
import { MAX_QTY_PER_LINE } from "@/lib/schemas/checkout";
import { useUI } from "@/store/ui";
import { cn } from "@/lib/utils";
import { QuantityStepper } from "@/components/cart/cart-line";
import { SizeGuide } from "./size-guide";
import { WishlistButton } from "./wishlist-button";

/** `preview`: admin preview of an unpublished product — selection works, buying is disabled. */
export function ProductPurchase({ product, preview }: { product: Product; preview?: boolean }) {
  const router = useRouter();
  const addToCart = useCart((s) => s.addToCart);
  const setCartOpen = useUI((s) => s.setCartOpen);
  const [color, setColor] = useState(product.colors[0]);
  const [size, setSize] = useState<Size | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [sizeError, setSizeError] = useState(false);
  const [added, setAdded] = useState(false);

  // Stock is per colour × size: switching colour changes which sizes are available.
  const stock = size ? variantStock(product, color.name, size) : null;
  const inBag = useCart((s) => (size ? (s.lines.find((l) => l.key === `${product.id}:${color.name}:${size}`)?.quantity ?? 0) : 0));
  // What can still be added for this colour/size, given stock, the per-line limit and what is already in the bag.
  const remaining = stock == null ? MAX_QTY_PER_LINE : Math.max(0, Math.min(stock, MAX_QTY_PER_LINE) - inBag);
  const onSale = product.compareAtPrice != null;

  const add = (buyNow = false) => {
    if (!size) {
      setSizeError(true);
      document.getElementById("size-group")?.focus();
      return;
    }
    const result = addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0]?.src ?? "",
      price: product.price,
      color: color.name,
      size,
      quantity: Math.min(quantity, Math.max(remaining, 1)),
      maxQuantity: stock ?? 0,
    });
    setQuantity(1);
    // "Buy it now" goes to checkout if the item is in the bag (just added or already there).
    if (buyNow && (result.status === "added" || result.status === "max_reached")) {
      router.push("/checkout");
      return;
    }
    if (!notifyAdd(result, `${product.name} — ${color.name}, ${size}`)) return;
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
    setCartOpen(true);
  };

  return (
    <div>
      <p className="eyebrow text-subtle">{product.categoryName}</p>
      <h1 className="display mt-4 text-[40px] sm:text-[52px]">{product.name}</h1>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-[18px] tabular-nums">
          {onSale && <span className="mr-3 text-subtle line-through">{formatPrice(product.compareAtPrice!)}</span>}
          <span className={cn(onSale && "text-burgundy")}>{formatPrice(product.price)}</span>
        </p>
        {/* Ratings render only when the product has them (the database has no reviews table yet). */}
        {product.rating != null && (
          <div className="flex items-center gap-2 text-[12px] text-subtle">
            <span className="flex" aria-hidden>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  className={cn("size-3", i < Math.round(product.rating!) ? "fill-ink text-ink" : "text-stone")}
                />
              ))}
            </span>
            <span>
              {product.rating.toFixed(1)} ({product.reviewCount ?? 0} reviews)
            </span>
          </div>
        )}
      </div>

      <p className="mt-8 max-w-md text-[14px] leading-relaxed text-subtle">{product.description}</p>

      {/* Colour */}
      <fieldset className="mt-10">
        <legend className="nav-label">
          Colour: <span className="text-subtle">{color.name}</span>
        </legend>
        <div className="mt-4 flex gap-3">
          {product.colors.map((c) => (
            <button
              key={c.name}
              type="button"
              onClick={() => {
                setColor(c);
                if (size && variantStock(product, c.name, size) === 0) setSize(null);
                setQuantity(1);
              }}
              aria-label={c.name}
              aria-pressed={color.name === c.name}
              className={cn(
                "size-8 rounded-full ring-1 ring-offset-[3px] transition-shadow",
                color.name === c.name ? "ring-ink" : "ring-black/15 hover:ring-black/40",
              )}
              style={{ background: c.hex }}
            />
          ))}
        </div>
      </fieldset>

      {/* Size */}
      <fieldset className="mt-10">
        <div className="flex items-center justify-between">
          <legend className="nav-label">
            Size{size && <span className="text-subtle">: {size}</span>}
          </legend>
          <SizeGuide />
        </div>
        <div
          id="size-group"
          tabIndex={-1}
          role="radiogroup"
          aria-label="Select a size"
          aria-invalid={sizeError}
          aria-describedby={sizeError ? "size-error" : undefined}
          className="mt-4 grid grid-cols-5 gap-2 outline-none"
        >
          {product.sizes.map((s) => {
            const qty = variantStock(product, color.name, s);
            const selected = size === s;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={qty === 0}
                onClick={() => {
                  setSize(s);
                  setSizeError(false);
                  setQuantity(1);
                }}
                className={cn(
                  "relative h-12 border text-[12px] font-medium transition-colors",
                  selected ? "border-ink bg-ink text-white" : "border-stone hover:border-ink",
                  qty === 0 && "cursor-not-allowed text-subtle/50 line-through hover:border-stone",
                  sizeError && !selected && "border-destructive/50",
                )}
              >
                {s}
                {qty === 0 && <span className="sr-only"> — sold out</span>}
              </button>
            );
          })}
        </div>
        <p className="mt-3 min-h-5 text-[12px]" aria-live="polite">
          {sizeError ? (
            <span id="size-error" className="text-destructive">
              Please select a size.
            </span>
          ) : size && stock != null && stock > 0 && remaining === 0 ? (
            <span className="text-subtle">You have all {Math.min(stock, MAX_QTY_PER_LINE)} available in your bag</span>
          ) : stock != null && stock <= 3 ? (
            <span className="text-burgundy">Only {stock} left in this size</span>
          ) : stock != null ? (
            <span className="text-subtle">In stock — ready to ship</span>
          ) : null}
        </p>
      </fieldset>

      {/* Quantity + CTAs */}
      <div className="mt-6 flex items-center gap-4">
        <QuantityStepper
          value={Math.min(quantity, Math.max(1, remaining))}
          max={Math.max(1, remaining)}
          onChange={setQuantity}
          label="Quantity"
          className="h-12 [&_button]:size-12"
        />
        <button type="button" disabled={preview || (!!size && remaining === 0)} onClick={() => add()} className="btn btn-primary flex-1">
          {added ? "Added to bag ✓" : "Add to bag"}
        </button>
      </div>
      <button type="button" disabled={preview} onClick={() => add(true)} className="btn btn-outline mt-3 w-full">
        Buy it now
      </button>
      {preview ? (
        <p className="mt-4 text-center text-[11px] text-subtle">Preview — purchasing is disabled.</p>
      ) : (
        <WishlistButton productId={product.id} name={product.name} withLabel className="mx-auto mt-6" />
      )}

      <p className="mt-8 border-t border-stone pt-6 text-[12px] text-subtle">
        Free standard shipping on orders over {formatPrice(FREE_SHIPPING_THRESHOLD)} · Free returns within 30 days
      </p>
    </div>
  );
}
