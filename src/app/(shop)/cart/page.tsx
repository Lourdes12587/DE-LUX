"use client";

import Link from "next/link";
import { ShieldCheck, RotateCcw, Truck } from "lucide-react";
import { CartLine } from "@/components/cart/cart-line";
import { FreeShippingMeter } from "@/components/cart/free-shipping-meter";
import { PromoCodeForm, TotalsTable } from "@/components/cart/order-summary";
import { selectItemCount, selectSubtotal, useCart } from "@/store/cart";
import { useHydrated } from "@/store/ui";
import { useCartQuote } from "@/hooks/use-cart-quote";

export default function CartPage() {
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const count = useCart(selectItemCount);
  const subtotal = useCart(selectSubtotal);
  const { quote, loading, error } = useCartQuote();

  if (!hydrated) return <div className="min-h-[60vh]" />;

  if (lines.length === 0) {
    return (
      <div className="container-edit flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
        <p className="eyebrow text-burgundy">My bag</p>
        <h1 className="display mt-6 text-[48px] sm:text-[64px]">Your bag is empty</h1>
        <p className="mt-4 text-[14px] text-subtle">Pieces you add will appear here.</p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link href="/collections/new-in" className="btn btn-primary">
            Shop New In
          </Link>
          <Link href="/wishlist" className="btn btn-outline">
            View wishlist
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-edit py-10 md:py-16">
      <h1 className="display text-[48px] sm:text-[64px]">
        My Bag <span className="align-top font-sans text-[14px] tracking-normal text-subtle">({count})</span>
      </h1>

      <div className="mt-10 grid gap-12 lg:grid-cols-12 lg:gap-16">
        <section aria-label="Items in your bag" className="lg:col-span-7">
          <div className="border-y border-stone py-5">
            <FreeShippingMeter subtotal={subtotal} />
          </div>
          <ul className="divide-y divide-stone border-b border-stone">
            {lines.map((l) => (
              <CartLine key={l.key} line={l} large />
            ))}
          </ul>
          <Link href="/shop" className="link-underline mt-8">
            Continue shopping
          </Link>
        </section>

        <aside aria-labelledby="summary-title" className="lg:col-span-5 lg:col-start-8">
          <div className="bg-paper p-6 sm:p-10 lg:sticky lg:top-[140px]">
            <h2 id="summary-title" className="nav-label font-semibold">
              Order summary
            </h2>
            <div className="mt-8">
              <PromoCodeForm />
            </div>
            <TotalsTable quote={quote} loading={loading} className="mt-8" />
            {error && (
              <p role="alert" className="mt-4 text-[12px] text-destructive">
                {error}
              </p>
            )}
            <Link href="/checkout" className="btn btn-primary mt-8 w-full">
              Proceed to checkout
            </Link>
            <ul className="mt-8 space-y-3 text-[12px] text-subtle">
              <li className="flex items-center gap-3">
                <Truck className="size-4" strokeWidth={1.25} /> Free shipping on orders over €150
              </li>
              <li className="flex items-center gap-3">
                <RotateCcw className="size-4" strokeWidth={1.25} /> Free returns within 30 days
              </li>
              <li className="flex items-center gap-3">
                <ShieldCheck className="size-4" strokeWidth={1.25} /> Secure payment with Stripe
              </li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
