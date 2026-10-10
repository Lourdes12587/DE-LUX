"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatPrice } from "@/lib/format";
import { api, ApiRequestError } from "@/lib/api";
import { promoFormSchema, type PromoFormValues } from "@/lib/schemas/checkout";
import type { ShippingMethodId } from "@/lib/pricing";
import type { CartQuote } from "@/hooks/use-cart-quote";
import { useCart } from "@/store/cart";
import { cn } from "@/lib/utils";

export function PromoCodeForm({ method = "standard" }: { method?: ShippingMethodId }) {
  const lines = useCart((s) => s.lines);
  const promoCode = useCart((s) => s.promoCode);
  const setPromoCode = useCart((s) => s.setPromoCode);
  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PromoFormValues>({ resolver: zodResolver(promoFormSchema), defaultValues: { code: "" } });
  const error = errors.code?.message;

  if (promoCode) {
    return (
      <div className="flex items-center justify-between text-[12px]">
        <span>
          Code <strong className="font-semibold tracking-wider">{promoCode}</strong> applied
        </span>
        <button type="button" onClick={() => setPromoCode(null)} className="text-subtle underline underline-offset-4 hover:text-ink">
          Remove
        </button>
      </div>
    );
  }

  // The server decides whether the code applies to this bag (dates, minimum, categories, usage limits).
  const apply = async ({ code }: PromoFormValues) => {
    try {
      const q = await api<CartQuote>("/api/cart/quote", {
        method: "POST",
        body: {
          items: lines.map((l) => ({ productId: l.productId, color: l.color, size: l.size, quantity: l.quantity })),
          promoCode: code,
          shippingMethod: method,
        },
      });
      if (q.discountError) setError("code", { type: "server", message: q.discountError });
      else {
        setPromoCode(q.promoCode);
        reset();
      }
    } catch (e) {
      setError("code", { type: "server", message: e instanceof ApiRequestError ? e.message : "Could not check this code. Try again." });
    }
  };

  return (
    <form onSubmit={handleSubmit(apply)} noValidate>
      <label htmlFor="promo" className="eyebrow">
        Promo code
      </label>
      <div className="mt-1 flex items-end gap-4">
        <input
          id="promo"
          placeholder="Enter code"
          aria-invalid={!!error}
          aria-describedby={error ? "promo-error" : "promo-hint"}
          className="field flex-1 uppercase placeholder:normal-case"
          {...register("code")}
        />
        <button type="submit" disabled={!watch("code").trim() || isSubmitting} className="link-underline mb-3 disabled:opacity-40">
          {isSubmitting ? "Checking…" : "Apply"}
        </button>
      </div>
      {error ? (
        <p id="promo-error" role="alert" className="mt-2 text-[12px] text-destructive">
          {error}
        </p>
      ) : (
        <p id="promo-hint" className="mt-2 text-[11px] text-subtle">
          Try WELCOME10 for 10% off your first order.
        </p>
      )}
    </form>
  );
}

export function TotalsTable({
  quote,
  loading,
  className,
}: {
  quote: CartQuote;
  loading?: boolean;
  className?: string;
}) {
  const setPromoCode = useCart((s) => s.setPromoCode);
  const promoCode = useCart((s) => s.promoCode);
  const { subtotal, discount, shipping, total } = quote;

  return (
    <dl className={cn("space-y-3 text-[13px] transition-opacity", loading && "opacity-60", className)} aria-busy={loading}>
      <div className="flex justify-between">
        <dt className="text-subtle">Subtotal</dt>
        <dd className="tabular-nums">{formatPrice(subtotal)}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-subtle">Shipping</dt>
        <dd className="tabular-nums">{shipping === 0 ? "Free" : formatPrice(shipping)}</dd>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-burgundy">
          <dt>Discount</dt>
          <dd className="tabular-nums">−{formatPrice(discount)}</dd>
        </div>
      )}
      {promoCode && quote.discountError && (
        <p role="alert" className="text-[12px] text-destructive">
          {promoCode}: {quote.discountError}{" "}
          <button type="button" onClick={() => setPromoCode(null)} className="underline underline-offset-2">
            Remove
          </button>
        </p>
      )}
      <div className="flex items-baseline justify-between border-t border-stone pt-4">
        <dt className="nav-label font-semibold">Total</dt>
        <dd className="font-display text-[26px] tabular-nums">{formatPrice(total)}</dd>
      </div>
      <p className="text-[11px] text-subtle">Including VAT</p>
    </dl>
  );
}
