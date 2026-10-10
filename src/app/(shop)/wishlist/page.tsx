"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { Product, Size } from "@/lib/types";
import { useWishlist } from "@/store/wishlist";
import { pickVariant, useCart } from "@/store/cart";
import { notifyAdd } from "@/lib/cart-feedback";
import { useHydrated, useUI } from "@/store/ui";
import { cn } from "@/lib/utils";

function WishlistItem({ product }: { product: Product }) {
  const remove = useWishlist((s) => s.remove);
  const addToCart = useCart((s) => s.addToCart);
  const setCartOpen = useUI((s) => s.setCartOpen);
  const [size, setSize] = useState<Size | null>(null);
  const [needSize, setNeedSize] = useState(false);

  const add = () => {
    if (!size) return setNeedSize(true);
    const variant = pickVariant(product, size);
    if (!variant) return;
    const result = addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.images[0]?.src ?? "",
      price: product.price,
      color: variant.color,
      size,
      maxQuantity: variant.stock,
    });
    if (notifyAdd(result, `${product.name} — ${variant.color}, ${size}`)) setCartOpen(true);
  };

  return (
    <li>
      <Link href={`/products/${product.slug}`} className="group relative block aspect-[4/5] overflow-hidden bg-paper">
        {product.images[0] && (
          <Image
            src={product.images[0].src}
            alt={product.images[0].alt}
            fill
            sizes="(min-width: 1024px) 25vw, 50vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
          />
        )}
      </Link>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-[11px] font-semibold uppercase tracking-[0.12em]">{product.name}</h2>
          <p className="mt-1 text-[12px] text-subtle">{product.categoryName}</p>
        </div>
        <p className="text-[12px]">{formatPrice(product.price)}</p>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-1" role="radiogroup" aria-label={`Size for ${product.name}`}>
        {product.sizes.map((s) => {
          const out = (product.stock[s] ?? 0) === 0;
          return (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={size === s}
              disabled={out}
              onClick={() => {
                setSize(s);
                setNeedSize(false);
              }}
              className={cn(
                "h-8 border text-[11px]",
                size === s ? "border-ink bg-ink text-white" : "border-stone hover:border-ink",
                out && "text-subtle/40 line-through",
                needSize && size !== s && !out && "border-destructive/50",
              )}
            >
              {s}
            </button>
          );
        })}
      </div>
      {needSize && <p className="mt-2 text-[11px] text-destructive">Select a size first.</p>}
      <button type="button" onClick={add} className="btn btn-primary mt-3 h-10 w-full">
        Add to bag
      </button>
      <button
        type="button"
        onClick={() => remove(product.id)}
        className="mt-3 w-full text-[11px] uppercase tracking-[0.16em] text-subtle underline-offset-4 hover:text-ink hover:underline"
      >
        Remove
      </button>
    </li>
  );
}

export default function WishlistPage() {
  const hydrated = useHydrated();
  const ids = useWishlist((s) => s.ids);
  const [loaded, setLoaded] = useState<Product[] | null>(null);
  const key = ids.join(",");

  // Saved ids live in localStorage; product data (price, stock) comes from the API.
  useEffect(() => {
    if (!hydrated) return;
    if (!key) {
      setLoaded([]);
      return;
    }
    const ctrl = new AbortController();
    api<{ products: Product[] }>(`/api/products?ids=${encodeURIComponent(key)}`, { signal: ctrl.signal })
      .then(({ products }) => setLoaded(products))
      .catch(() => !ctrl.signal.aborted && setLoaded([]));
    return () => ctrl.abort();
  }, [hydrated, key]);

  // Removing an item updates instantly, without refetching.
  const saved = (loaded ?? []).filter((p) => ids.includes(p.id));
  const ready = hydrated && loaded !== null;

  return (
    <div className="container-edit py-12 md:py-20">
      <p className="eyebrow text-burgundy">Saved for later</p>
      <h1 className="display mt-4 text-[48px] sm:text-[64px]">
        Wishlist <span className="align-top font-sans text-[14px] text-subtle">({saved.length})</span>
      </h1>
      {!ready ? (
        <div className="mt-12 min-h-[40vh]" aria-busy />
      ) : saved.length === 0 ? (
        <div className="mt-12 border-t border-stone py-24 text-center">
          <p className="display text-[32px]">Nothing saved yet</p>
          <p className="mt-4 text-[13px] text-subtle">Tap the heart on any piece to keep it here.</p>
          <Link href="/collections/new-in" className="btn btn-primary mt-8">
            Discover New In
          </Link>
        </div>
      ) : (
        <ul className="mt-12 grid grid-cols-2 gap-x-3 gap-y-14 sm:gap-x-5 lg:grid-cols-4">
          {saved.map((p) => (
            <WishlistItem key={p.id} product={p} />
          ))}
        </ul>
      )}
    </div>
  );
}
