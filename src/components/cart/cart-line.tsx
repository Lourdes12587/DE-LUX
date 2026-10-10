"use client";

import Image from "next/image";
import Link from "next/link";
import { Minus, Plus } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useCart, type CartLine as Line } from "@/store/cart";
import { cn } from "@/lib/utils";

export function QuantityStepper({
  value,
  max,
  onChange,
  label,
  className,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex h-9 items-center border border-stone", className)} role="group" aria-label={label}>
      <button
        type="button"
        className="flex size-9 items-center justify-center transition-colors hover:bg-paper disabled:opacity-30"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label="Decrease quantity"
      >
        <Minus className="size-3" strokeWidth={1.5} />
      </button>
      <span className="w-8 text-center text-[13px] tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        className="flex size-9 items-center justify-center transition-colors hover:bg-paper disabled:opacity-30"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        <Plus className="size-3" strokeWidth={1.5} />
      </button>
    </div>
  );
}

export function CartLine({ line, onNavigate, large }: { line: Line; onNavigate?: () => void; large?: boolean }) {
  const updateQuantity = useCart((s) => s.updateQuantity);
  const removeFromCart = useCart((s) => s.removeFromCart);

  return (
    <li className={cn("flex gap-4 py-6", large && "sm:gap-8")}>
      <Link
        href={`/products/${line.slug}`}
        onClick={onNavigate}
        className={cn("relative aspect-[4/5] shrink-0 overflow-hidden bg-paper", large ? "w-28 sm:w-40" : "w-24")}
      >
        {line.image && <Image src={line.image} alt={line.name} fill sizes="160px" className="object-cover" />}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-4">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em]">
            <Link href={`/products/${line.slug}`} onClick={onNavigate}>
              {line.name}
            </Link>
          </h3>
          <p className="shrink-0 text-[13px] tabular-nums">{formatPrice(line.price * line.quantity)}</p>
        </div>
        <dl className="mt-2 space-y-0.5 text-[12px] text-subtle">
          <div className="flex gap-1">
            <dt>Colour:</dt>
            <dd>{line.color}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Size:</dt>
            <dd>{line.size}</dd>
          </div>
          {large && (
            <div className="flex gap-1">
              <dt>Price:</dt>
              <dd>{formatPrice(line.price)}</dd>
            </div>
          )}
        </dl>
        <div className="mt-auto flex items-end justify-between pt-4">
          <QuantityStepper
            value={line.quantity}
            max={line.maxQuantity}
            onChange={(n) => updateQuantity(line.key, n)}
            label={`Quantity for ${line.name}`}
          />
          <button
            type="button"
            onClick={() => removeFromCart(line.key)}
            className="text-[11px] uppercase tracking-[0.16em] text-subtle underline-offset-4 hover:text-ink hover:underline"
          >
            Remove
          </button>
        </div>
      </div>
    </li>
  );
}
