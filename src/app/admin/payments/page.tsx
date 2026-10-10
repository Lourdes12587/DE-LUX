import type { Metadata } from "next";
import { NoPermission } from "@/components/admin/no-permission";
import { getCurrentUser } from "@/server/auth";
import { Download } from "lucide-react";
import { AdminPageHeader, StatTile } from "@/components/admin/ui";
import { PaymentsTable } from "@/components/admin/payments-table";
import { listPayments } from "@/server/admin/payments";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Payments" };

export default async function AdminPaymentsPage() {
  if ((await getCurrentUser())?.role !== "ADMIN") return <NoPermission />;
  const payments = await listPayments();
  const sum = (s: string) => payments.filter((p) => p.status === s).reduce((t, p) => t + p.amount, 0);
  const failedRate = payments.length ? (payments.filter((p) => p.status === "failed").length / payments.length) * 100 : 0;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Finance"
        title="Payments"
        description="Every transaction processed through Stripe. Refunds and receipts are managed from the detail panel."
        actions={
          <button type="button" className="btn btn-outline h-10 px-5">
            <Download className="size-3.5" /> Export CSV
          </button>
        }
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile label="Gross volume" value={formatPrice(sum("succeeded") + sum("refunded"))} hint="all time" />
        <StatTile label="Net volume" value={formatPrice(sum("succeeded"))} hint="after refunds" />
        <StatTile label="Refunded" value={formatPrice(sum("refunded"))} hint="all time" />
        <StatTile label="Failure rate" value={`${failedRate.toFixed(1)}%`} hint="of all attempts" />
      </div>
      <PaymentsTable payments={payments} />
    </div>
  );
}
