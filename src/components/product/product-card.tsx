"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { Product, Size } from "@/lib/types";
import { formatPrice } from "@/lib/format";
import { isInStock } from "@/lib/catalog-utils";
import { pickVariant, useCart } from "@/store/cart";
import { notifyAdd } from "@/lib/cart-feedback";
import { useUI } from "@/store/ui";
import { cn } from "@/lib/utils";
import { WishlistButton } from "./wishlist-button";

export function ProductCard({
  product,
  priority,
  sizes = "(min-width: 1024px) 25vw, 50vw",
}: {
  product: Product;
  priority?: boolean;
  sizes?: string;
}) {
  const [quick, setQuick] = useState(false);
  const addToCart = useCart((s) => s.addToCart);
  const setCartOpen = useUI((s) => s.setCartOpen);
  const [primary, secondary] = product.images;
  const onSale = product.compareAtPrice != null;
  const available = isInStock(product);
  const badge = !available ? "Sold out" : onSale ? "Sale" : product.newArrival ? "New" : null;

  const quickAdd = (size: Size) => {
    const variant = pickVariant(product, size);
    if (!variant) return;
    const result = addToCart({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: primary?.src ?? "",
      price: product.price,
      color: variant.color,
      size,
      maxQuantity: variant.stock,
    });
    setQuick(false);
    if (notifyAdd(result, `${product.name} — ${variant.color}, ${size}`)) setCartOpen(true);
  };

  return (
    <article className="group" onMouseLeave={() => setQuick(false)}>
      <div className="relative">
      <Link href={`/products/${product.slug}`} className="block" tabIndex={-1}>
        <div className="relative aspect-[4/5] overflow-hidden bg-paper">
          {primary ? (
            <Image
              src={primary.src}
              alt={primary.alt}
              fill
              priority={priority}
              sizes={sizes}
              className="object-cover transition-transform duration-[900ms] ease-editorial group-hover:scale-[1.03]"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center font-display text-[15px] italic text-subtle">{product.name}</span>
          )}
          {secondary && (
            <Image
              src={secondary.src}
              alt=""
              aria-hidden
              fill
              sizes={sizes}
              className="hidden object-cover opacity-0 transition-opacity duration-700 ease-editorial group-hover:opacity-100 md:block"
            />
          )}
          {badge && (
            <span
              className={cn(
                "eyebrow absolute top-3 left-3 bg-white px-2 py-1",
                badge === "Sale" && "bg-burgundy text-white",
              )}
            >
              {badge}
            </span>
          )}
        </div>
      </Link>

      <WishlistButton
        productId={product.id}
        name={product.name}
        className="absolute top-2 right-2 bg-white/0 p-1.5 backdrop-blur-0 transition hover:bg-white/70"
      />

      {/* Quick add — desktop hover */}
      {available && (
        <div className="absolute inset-x-3 bottom-3 hidden translate-y-2 opacity-0 transition-all duration-500 ease-editorial group-focus-within:translate-y-0 group-focus-within:opacity-100 group-hover:translate-y-0 group-hover:opacity-100 md:block">
          {quick ? (
            <div className="flex bg-white/95" role="group" aria-label={`Choose a size for ${product.name}`}>
              {product.sizes.map((s) => {
                const out = (product.stock[s] ?? 0) === 0;
                return (
                  <button
                    key={s}
                    type="button"
                    disabled={out}
                    onClick={() => quickAdd(s)}
                    className="h-10 flex-1 text-[11px] font-medium tracking-wider transition-colors hover:bg-ink hover:text-white disabled:text-subtle/40 disabled:line-through"
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          ) : (
            <button type="button" onClick={() => setQuick(true)} className="btn h-10 w-full bg-white/95 hover:bg-ink hover:text-white">
              Quick add
            </button>
          )}
        </div>
      )}
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[11px] font-semibold uppercase tracking-[0.12em]">
            <Link href={`/products/${product.slug}`}>{product.name}</Link>
          </h3>
          <p className="mt-1 text-[12px] text-subtle">{product.categoryName}</p>
        </div>
        <p className="shrink-0 text-right text-[12px]">
          {onSale && <span className="mr-2 text-subtle line-through">{formatPrice(product.compareAtPrice!)}</span>}
          <span className={cn(onSale && "text-burgundy")}>{formatPrice(product.price)}</span>
        </p>
      </div>
      <ul className="mt-3 flex gap-1.5" aria-label="Available colours">
        {product.colors.map((c) => (
          <li key={c.name} title={c.name}>
            <span className="block size-2.5 rounded-full ring-1 ring-black/15" style={{ background: c.hex }} />
            <span className="sr-only">{c.name}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}
