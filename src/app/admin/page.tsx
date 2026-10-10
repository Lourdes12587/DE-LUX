import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Download } from "lucide-react";
import { AdminPageHeader, Avatar, Panel, StatTile, StatusBadge, td, th } from "@/components/admin/ui";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { CategoryBars } from "@/components/admin/category-bars";
import { fmtDateTime, paymentStatus } from "@/components/admin/status";
import { redirect } from "next/navigation";
import { getDashboard } from "@/server/admin/dashboard";
import { getCurrentUser } from "@/server/auth";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Overview" };

const greeting = (h: number) => (h < 12 ? "Good morning" : h < 19 ? "Good afternoon" : "Good evening");
const delta = (d: number | null) => d ?? undefined;

export default async function AdminOverview() {
  // Revenue and payments are for administrators; editors work in Products.
  if ((await getCurrentUser())?.role !== "ADMIN") redirect("/admin/products");
  const d = await getDashboard();
  const now = new Date();
  const today = new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }).format(now);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow={today}
        title={<em>{greeting(now.getHours())}</em>}
        description="Here is what is happening in the atelier over the last 30 days."
        actions={
          <>
            <button type="button" className="btn btn-outline h-10 px-5">
              <Download className="size-3.5" /> Export
            </button>
            <Link href="/admin/products/new" className="btn btn-primary h-10 px-5">
              New product
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile label="Net revenue" value={formatPrice(d.revenue.value).replace(/\.\d+$/, "")} delta={delta(d.revenue.delta)} hint="vs. previous 30 days" />
        <StatTile label="Orders" value={String(d.orders.value)} delta={delta(d.orders.delta)} hint="vs. previous 30 days" />
        <StatTile label="Average order" value={formatPrice(d.aov.value)} delta={delta(d.aov.delta)} hint="vs. previous 30 days" />
        <StatTile label="New customers" value={String(d.newCustomers.value)} delta={delta(d.newCustomers.delta)} hint="vs. previous 30 days" />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Net revenue · last 30 days" className="xl:col-span-2">
          <RevenueChart data={d.revenueSeries} />
        </Panel>
        <Panel title="Revenue by category">
          {d.salesByCategory.length ? (
            <CategoryBars data={d.salesByCategory} />
          ) : (
            <p className="text-[13px] text-subtle">No sales in the last 30 days.</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Recent payments"
          className="xl:col-span-2"
          bodyClassName="p-0 sm:p-0"
          action={
            <Link href="/admin/payments" className="nav-label inline-flex items-center gap-1.5 text-subtle hover:text-ink">
              View all <ArrowRight className="size-3" />
            </Link>
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-[13px]">
              <thead>
                <tr className="border-b border-stone">
                  <th className={th}>Customer</th>
                  <th className={th}>Order</th>
                  <th className={th}>Date</th>
                  <th className={th}>Status</th>
                  <th className={`${th} text-right`}>Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone">
                {d.recentPayments.map((p) => (
                  <tr key={p.id} className="hover:bg-paper/70">
                    <td className={td}>
                      <div className="flex items-center gap-3">
                        <Avatar name={p.customer} size="sm" />
                        <span className="font-medium">{p.customer}</span>
                      </div>
                    </td>
                    <td className={`${td} text-subtle`}>#{p.order}</td>
                    <td className={`${td} text-subtle`}>{fmtDateTime(p.date)}</td>
                    <td className={td}>
                      <StatusBadge tone={paymentStatus[p.status].tone}>{paymentStatus[p.status].label}</StatusBadge>
                    </td>
                    <td className={`${td} text-right tabular-nums`}>{formatPrice(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-4">
          <Panel title="Best sellers" bodyClassName="p-0 sm:p-0">
            <ol className="divide-y divide-stone">
              {d.bestSellers.map((p, i) => (
                <li key={p.id} className="flex items-center gap-4 px-5 py-3 sm:px-6">
                  <span className="w-4 font-display text-[18px] italic text-burgundy">{i + 1}</span>
                  <div className="relative aspect-[4/5] w-9 shrink-0 bg-paper">
                    {p.image && <Image src={p.image} alt="" fill sizes="36px" className="object-cover" />}
                  </div>
                  <Link href={`/admin/products/${p.id}`} className="min-w-0 flex-1 truncate text-[12px] font-medium hover:underline">
                    {p.name}
                  </Link>
                  <span className="text-[12px] tabular-nums text-subtle">{p.sold} sold</span>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title="Low stock" bodyClassName="p-0 sm:p-0">
            <ul className="divide-y divide-stone">
              {d.lowStock.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 px-5 py-3 sm:px-6">
                  <Link href={`/admin/products/${p.id}`} className="min-w-0 truncate text-[12px] font-medium hover:underline">
                    {p.name}
                  </Link>
                  <StatusBadge tone={p.units < 15 ? "critical" : "warning"}>{p.units} units</StatusBadge>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
