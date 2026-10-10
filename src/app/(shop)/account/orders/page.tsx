import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/account/account-shell";
import { OrderStatusLabel, fmtOrderDate } from "@/components/account/order-status";
import { formatPrice } from "@/lib/format";
import { getMyProfile, listMyOrders } from "@/server/account";
import { getCurrentUser } from "@/server/auth";

export const metadata: Metadata = { title: "My Orders", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/account?next=/account/orders");
  const [orders, profile] = await Promise.all([listMyOrders(user.id), getMyProfile(user.id)]);

  return (
    <AccountShell title="My Orders" name={user.name}>
      {orders.length === 0 ? (
        <div className="border-y border-stone py-16 text-center">
          <p className="display text-[32px]">No orders yet</p>
          <p className="mt-3 text-[13px] text-subtle">When you place an order it will appear here.</p>
          <Link href="/collections/new-in" className="btn btn-primary mt-8">
            Discover New In
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-stone border-y border-stone">
          {orders.map((o) => (
            <li key={o.number} className="grid gap-6 py-8 sm:grid-cols-[1fr_auto] sm:items-center">
              <div className="flex gap-6">
                <div className="flex -space-x-6">
                  {o.items.slice(0, 3).map((it) => (
                    <div key={it.id} className="relative aspect-[4/5] w-20 border-2 border-white bg-paper">
                      {it.image && <Image src={it.image} alt={it.name} fill sizes="80px" className="object-cover" />}
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-[13px] font-semibold tracking-wider">#{o.number}</p>
                  <p className="mt-1 text-[12px] text-subtle">
                    {fmtOrderDate(o.date)} · {o.items.reduce((n, i) => n + i.quantity, 0)} item{o.items.reduce((n, i) => n + i.quantity, 0) === 1 ? "" : "s"}
                  </p>
                  <p className="mt-3 text-[13px] tabular-nums">{formatPrice(o.total)}</p>
                  <OrderStatusLabel status={o.status} className="mt-3" />
                </div>
              </div>
              <Link href={`/account/orders/${o.number}`} className="btn btn-outline">
                View order
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-16 grid gap-10 md:grid-cols-2">
        <section id="personal" aria-labelledby="personal-title" className="scroll-mt-40 bg-paper p-8">
          <h2 id="personal-title" className="nav-label font-semibold">
            Personal information
          </h2>
          <dl className="mt-6 space-y-2 text-[13px]">
            <div className="flex gap-2">
              <dt className="text-subtle">Name:</dt>
              <dd>{profile.name ?? "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-subtle">Email:</dt>
              <dd>{profile.email}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-subtle">Phone:</dt>
              <dd>{profile.phone ?? "—"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-subtle">Member since:</dt>
              <dd>{fmtOrderDate(profile.memberSince)}</dd>
            </div>
          </dl>
        </section>
        <section id="addresses" aria-labelledby="addresses-title" className="scroll-mt-40 bg-paper p-8">
          <h2 id="addresses-title" className="nav-label font-semibold">
            Default address
          </h2>
          {profile.address ? (
            <address className="mt-6 text-[13px] leading-relaxed not-italic">
              {profile.name}
              <br />
              {profile.address.line1}
              {profile.address.line2 && `, ${profile.address.line2}`}
              <br />
              {profile.address.postalCode} {profile.address.city}, {profile.address.country}
            </address>
          ) : (
            <p className="mt-6 text-[13px] text-subtle">Your shipping address is saved here after your first order.</p>
          )}
        </section>
      </div>
    </AccountShell>
  );
}
