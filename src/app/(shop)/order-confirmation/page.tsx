"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { api, ApiRequestError } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { SHIPPING_METHODS, type ShippingMethodId } from "@/lib/pricing";
import { useCart } from "@/store/cart";

/** Mirrors `OrderConfirmation` from GET /api/checkout/confirmation (src/server/checkout.ts). */
type Order = {
  number: string;
  email: string;
  status: "paid" | "processing" | "failed" | "cancelled";
  lines: { key: string; name: string; image: string; color: string; size: string; quantity: number; price: number }[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  method: ShippingMethodId;
  address: { firstName: string; lastName: string; address: string; apartment: string; city: string; postalCode: string; country: string };
};

function deliveryWindow(method: ShippingMethodId) {
  const [from, to] = method === "express" ? [1, 2] : [3, 5];
  const add = (n: number) => {
    const d = new Date();
    let added = 0;
    while (added < n) {
      d.setDate(d.getDate() + 1);
      if (d.getDay() !== 0 && d.getDay() !== 6) added++;
    }
    return d;
  };
  const fmt = new Intl.DateTimeFormat("en-GB", { month: "long", day: "numeric" });
  return `${fmt.format(add(from))} – ${fmt.format(add(to))}`;
}

function Message({ title, children, action }: { title: string; children: React.ReactNode; action: React.ReactNode }) {
  return (
    <div className="container-edit flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
      <h1 className="display text-[40px] sm:text-[56px]">{title}</h1>
      <div className="mt-4 max-w-md text-[14px] text-subtle">{children}</div>
      <div className="mt-8">{action}</div>
    </div>
  );
}

export default function OrderConfirmationPage() {
  // useSearchParams needs a Suspense boundary on statically rendered pages.
  return (
    <Suspense fallback={<div className="min-h-[70vh]" />}>
      <OrderConfirmation />
    </Suspense>
  );
}

function OrderConfirmation() {
  const params = useSearchParams();
  const clearCart = useCart((s) => s.clearCart);
  const [order, setOrder] = useState<Order | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const paymentIntent = params.get("payment_intent");
  const clientSecret = params.get("payment_intent_client_secret");

  useEffect(() => {
    if (!paymentIntent || !clientSecret) {
      setOrder(null);
      return;
    }
    let cancelled = false;
    let attempts = 0;
    // The server reconciles with Stripe on every call; poll while the payment is still processing.
    const load = async () => {
      try {
        const { order } = await api<{ order: Order }>(
          `/api/checkout/confirmation?payment_intent=${encodeURIComponent(paymentIntent)}&payment_intent_client_secret=${encodeURIComponent(clientSecret)}`,
        );
        if (cancelled) return;
        setOrder(order);
        if (order.status === "paid" || order.status === "processing") clearCart();
        if (order.status === "processing" && attempts++ < 10) setTimeout(load, 3000);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof ApiRequestError ? e.message : "We couldn't load your order.");
          setOrder(null);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [paymentIntent, clientSecret, clearCart]);

  if (order === undefined) {
    return (
      <div className="container-edit flex min-h-[60vh] items-center justify-center text-[14px] text-subtle" aria-busy>
        Confirming your payment…
      </div>
    );
  }
  if (order === null) {
    return (
      <Message title={error ? "We couldn't find this order" : "No recent order"} action={<Link href="/shop" className="btn btn-primary">Continue shopping</Link>}>
        {error ?? "Your order confirmation appears here right after checkout."}
      </Message>
    );
  }
  if (order.status === "failed" || order.status === "cancelled") {
    return (
      <Message title="Payment not completed" action={<Link href="/checkout" className="btn btn-primary">Back to checkout</Link>}>
        The payment for order #{order.number} was {order.status === "cancelled" ? "cancelled" : "declined"}. You have not been charged — your bag is
        still saved, so you can try again with another payment method.
      </Message>
    );
  }
  const a = order.address;

  return (
    <div className="container-edit py-16 md:py-24">
      <header className="mx-auto max-w-3xl text-center">
        <p className="animate-rise font-script text-[56px] leading-none text-burgundy sm:text-[72px]">Merci</p>
        <h1 className="display animate-rise mt-6 text-[40px] sm:text-[64px]" style={{ animationDelay: "120ms" }}>
          Thank you for your order
        </h1>
        <p className="mt-6 text-[14px] text-subtle">
          {order.status === "processing" ? (
            <>Your payment is being processed — we&rsquo;ll email </>
          ) : (
            <>Your payment was successful and your order is confirmed. A receipt is on its way to </>
          )}
          <span className="text-ink">{order.email}</span>.
        </p>
        <p className="eyebrow mt-8">Order #{order.number}</p>
      </header>

      <div className="mx-auto mt-16 grid max-w-5xl gap-12 border-t border-stone pt-12 md:grid-cols-12">
        <section aria-labelledby="items-title" className="md:col-span-7">
          <h2 id="items-title" className="nav-label font-semibold">
            Items
          </h2>
          <ul className="mt-4 divide-y divide-stone">
            {order.lines.map((l) => (
              <li key={l.key} className="flex gap-5 py-5">
                <div className="relative aspect-[4/5] w-20 shrink-0 bg-paper">
                  {l.image && <Image src={l.image} alt={l.name} fill sizes="80px" className="object-cover" />}
                </div>
                <div className="flex-1 text-[12px]">
                  <p className="font-semibold uppercase tracking-[0.1em]">{l.name}</p>
                  <p className="mt-1 text-subtle">
                    {l.color} · {l.size} · Qty {l.quantity}
                  </p>
                </div>
                <p className="text-[13px] tabular-nums">{formatPrice(l.price * l.quantity)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-3 border-t border-stone pt-6 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-subtle">Subtotal</dt>
              <dd>{formatPrice(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-burgundy">
                <dt>Discount</dt>
                <dd>−{formatPrice(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-subtle">Shipping</dt>
              <dd>{order.shipping === 0 ? "Free" : formatPrice(order.shipping)}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-stone pt-4">
              <dt className="nav-label font-semibold">Total</dt>
              <dd className="font-display text-[26px]">{formatPrice(order.total)}</dd>
            </div>
          </dl>
        </section>

        <aside className="space-y-10 md:col-span-4 md:col-start-9">
          <div>
            <h2 className="nav-label font-semibold">Shipping address</h2>
            <address className="mt-4 text-[13px] leading-relaxed not-italic text-subtle">
              {a.firstName} {a.lastName}
              <br />
              {a.address}
              {a.apartment && `, ${a.apartment}`}
              <br />
              {a.postalCode} {a.city}
              <br />
              {a.country}
            </address>
          </div>
          <div>
            <h2 className="nav-label font-semibold">Estimated delivery</h2>
            <p className="mt-4 font-display text-[24px]">{deliveryWindow(order.method)}</p>
            <p className="mt-1 text-[12px] text-subtle">{SHIPPING_METHODS.find((m) => m.id === order.method)?.name}</p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/account/orders" className="btn btn-primary">
              View order
            </Link>
            <Link href="/shop" className="btn btn-outline">
              Continue shopping
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
