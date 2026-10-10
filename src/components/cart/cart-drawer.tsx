"use client";

import Link from "next/link";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { formatPrice } from "@/lib/format";
import { selectItemCount, selectSubtotal, useCart } from "@/store/cart";
import { useHydrated, useUI } from "@/store/ui";
import { CartLine } from "./cart-line";
import { FreeShippingMeter } from "./free-shipping-meter";

export function CartDrawer() {
  const open = useUI((s) => s.cartOpen);
  const setOpen = useUI((s) => s.setCartOpen);
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const count = useCart(selectItemCount);
  const subtotal = useCart(selectSubtotal);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="w-full gap-0 border-0 p-0 sm:max-w-[440px]">
        <div className="flex h-16 items-center border-b border-stone px-6">
          <SheetTitle className="nav-label font-semibold">My Bag ({hydrated ? count : 0})</SheetTitle>
          <SheetDescription className="sr-only">Review the items in your shopping bag</SheetDescription>
        </div>

        {!hydrated || lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <p className="display text-[36px]">Your bag is empty</p>
            <p className="mt-4 text-[13px] text-subtle">Discover the new edition and find your next piece.</p>
            <Link href="/collections/new-in" onClick={close} className="btn btn-primary mt-8">
              Shop New In
            </Link>
          </div>
        ) : (
          <>
            <div className="border-b border-stone px-6 py-4">
              <FreeShippingMeter subtotal={subtotal} />
            </div>
            <ul className="flex-1 divide-y divide-stone overflow-y-auto px-6">
              {lines.map((l) => (
                <CartLine key={l.key} line={l} onNavigate={close} />
              ))}
            </ul>
            <div className="space-y-4 border-t border-stone bg-white px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <div className="flex items-baseline justify-between">
                <span className="nav-label font-semibold">Subtotal</span>
                <span className="text-[15px] tabular-nums">{formatPrice(subtotal)}</span>
              </div>
              <p className="text-[12px] text-subtle">Shipping and discounts calculated at checkout.</p>
              <Link href="/checkout" onClick={close} className="btn btn-primary w-full">
                Checkout
              </Link>
              <Link href="/cart" onClick={close} className="btn btn-outline w-full">
                View Bag
              </Link>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
