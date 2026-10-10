import type { Metadata } from "next";
import { NoPermission } from "@/components/admin/no-permission";
import { getCurrentUser } from "@/server/auth";
import { AdminPageHeader, StatTile } from "@/components/admin/ui";
import { InviteMemberButton, UsersTable } from "@/components/admin/users-table";
import { listPayments } from "@/server/admin/payments";
import { listUsers } from "@/server/admin/users";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  if ((await getCurrentUser())?.role !== "ADMIN") return <NoPermission />;
  const [adminUsers, payments] = await Promise.all([listUsers(), listPayments()]);
  const customers = adminUsers.filter((u) => u.role === "customer");
  const buyers = customers.filter((u) => u.orders > 0);
  const repeat = customers.filter((u) => u.orders > 1).length;
  const ltv = buyers.length ? buyers.reduce((s, u) => s + u.spent, 0) / buyers.length : 0;

  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Community"
        title="Users"
        description="Customers and team members, their roles, orders and access."
        actions={<InviteMemberButton />}
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatTile label="Customers" value={String(customers.length)} hint="registered" />
        <StatTile label="Repeat customers" value={`${customers.length ? Math.round((repeat / customers.length) * 100) : 0}%`} hint="2+ orders" />
        <StatTile label="Avg. lifetime value" value={formatPrice(ltv)} hint="per buyer" />
        <StatTile label="Team members" value={String(adminUsers.length - customers.length)} hint="admins & editors" />
      </div>
      <UsersTable users={adminUsers} payments={payments} />
    </div>
  );
}
