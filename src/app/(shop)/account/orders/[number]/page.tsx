import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { AccountShell } from "@/components/account/account-shell";
import { OrderStatusLabel, fmtOrderDate } from "@/components/account/order-status";
import { formatPrice } from "@/lib/format";
import { SHIPPING_METHODS } from "@/lib/pricing";
import { getMyOrder } from "@/server/account";
import { getCurrentUser } from "@/server/auth";
import { ApiError } from "@/server/http";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ number: string }> };

export const metadata: Metadata = { title: "Order details", robots: { index: false } };
export const dynamic = "force-dynamic";

const STEPS = [
  { key: "placed", label: "Order placed" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
] as const;

export default async function OrderDetailPage({ params }: Props) {
  const number = decodeURIComponent((await params).number);
  const user = await getCurrentUser();
  if (!user) redirect(`/account?next=/account/orders/${encodeURIComponent(number)}`);

  let order;
  try {
    order = await getMyOrder(user.id, number);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }

  const reached = order.status === "delivered" ? 2 : order.status === "shipped" ? 1 : 0;
  const a = order.address;
  const method = SHIPPING_METHODS.find((m) => m.id === order.shippingMethod);

  return (
    <AccountShell title={`Order #${order.number}`} name={user.name}>
      <Link href="/account/orders" className="nav-label inline-flex items-center gap-2 text-subtle hover:text-ink">
        <ArrowLeft className="size-3.5" /> All orders
      </Link>

      <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px]">
        <span className="text-subtle">Placed on {fmtOrderDate(order.date)}</span>
        <OrderStatusLabel status={order.status} />
      </div>

      {order.status !== "refunded" && (
        <ol className="mt-8 grid grid-cols-3 border-y border-stone py-6" aria-label="Delivery progress">
          {STEPS.map((s, i) => (
            <li key={s.key} className="flex flex-col items-center gap-3 text-center">
              <span className={cn("size-3 rounded-full", i <= reached ? "bg-ink" : "bg-stone")} aria-hidden />
              <span className={cn("nav-label", i <= reached ? "text-ink" : "text-subtle")}>{s.label}</span>
              {i === 1 && order.shipment?.shippedAt && <span className="text-[11px] text-subtle">{fmtOrderDate(order.shipment.shippedAt)}</span>}
              {i === 2 && order.shipment?.deliveredAt && <span className="text-[11px] text-subtle">{fmtOrderDate(order.shipment.deliveredAt)}</span>}
            </li>
          ))}
        </ol>
      )}
      {order.status === "refunded" && (
        <p className="mt-8 border border-stone bg-paper px-5 py-4 text-[13px]">
          This order was refunded{order.payment?.refunded ? ` (${formatPrice(order.payment.refunded)})` : ""}. Refunds reach your account in 3–5 business days.
        </p>
      )}

      <div className="mt-10 grid gap-12 md:grid-cols-12">
        <section aria-labelledby="items-title" className="md:col-span-7">
          <h2 id="items-title" className="nav-label font-semibold">
            Items
          </h2>
          <ul className="mt-4 divide-y divide-stone border-y border-stone">
            {order.items.map((it) => (
              <li key={it.id} className="flex gap-5 py-5">
                <div className="relative aspect-[4/5] w-20 shrink-0 bg-paper">
                  {it.image && <Image src={it.image} alt={it.name} fill sizes="80px" className="object-cover" />}
                </div>
                <div className="flex-1 text-[12px]">
                  <p className="font-semibold uppercase tracking-[0.1em]">
                    {it.slug ? (
                      <Link href={`/products/${it.slug}`} className="hover:underline">
                        {it.name}
                      </Link>
                    ) : (
                      it.name
                    )}
                  </p>
                  <p className="mt-1 text-subtle">
                    {it.color} · {it.size} · Qty {it.quantity}
                  </p>
                  <p className="mt-1 text-subtle">{formatPrice(it.price)} each</p>
                </div>
                <p className="text-[13px] tabular-nums">{formatPrice(it.price * it.quantity)}</p>
              </li>
            ))}
          </ul>
          <dl className="mt-4 space-y-3 text-[13px]">
            <div className="flex justify-between">
              <dt className="text-subtle">Subtotal</dt>
              <dd className="tabular-nums">{formatPrice(order.subtotal)}</dd>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between text-burgundy">
                <dt>Discount</dt>
                <dd className="tabular-nums">−{formatPrice(order.discount)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-subtle">Shipping ({method?.name ?? order.shippingMethod})</dt>
              <dd className="tabular-nums">{order.shipping === 0 ? "Free" : formatPrice(order.shipping)}</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-stone pt-4">
              <dt className="nav-label font-semibold">Total</dt>
              <dd className="font-display text-[26px] tabular-nums">{formatPrice(order.total)}</dd>
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
              {a.phone && (
                <>
                  <br />
                  {a.phone}
                </>
              )}
            </address>
          </div>
          {order.payment && (
            <div>
              <h2 className="nav-label font-semibold">Payment</h2>
              <p className="mt-4 text-[13px] text-subtle">
                {order.payment.method}
                {order.payment.last4 && ` •••• ${order.payment.last4}`}
              </p>
            </div>
          )}
          {order.shipment && (
            <div>
              <h2 className="nav-label font-semibold">Tracking</h2>
              <p className="mt-4 text-[13px] text-subtle">
                {order.shipment.carrier} · {order.shipment.trackingNumber}
              </p>
              {order.shipment.trackingUrl && (
                <a href={order.shipment.trackingUrl} target="_blank" rel="noreferrer" className="link-underline mt-3 inline-flex items-center gap-1.5">
                  Track parcel <ExternalLink className="size-3" />
                </a>
              )}
            </div>
          )}
          <div className="border-t border-stone pt-8 text-[13px] text-subtle">
            Need help with this order?{" "}
            <Link href="/returns" className="text-ink underline underline-offset-4">
              Returns &amp; exchanges
            </Link>{" "}
            ·{" "}
            <Link href="/contact" className="text-ink underline underline-offset-4">
              Contact us
            </Link>
          </div>
        </aside>
      </div>
    </AccountShell>
  );
}
