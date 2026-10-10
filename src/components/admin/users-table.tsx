"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronRight, KeyRound, Mail, ShieldBan, ShieldCheck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import type { AdminUser, Payment, UserRole } from "@/lib/admin-types";
import { api, ApiRequestError } from "@/lib/api";
import { roleFormSchema, type RoleFormValues } from "@/lib/schemas/user";
import { formatPrice } from "@/lib/format";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Avatar, FilterTabs, SearchField, StatusBadge, td, th } from "./ui";
import { fmtDate, fmtDateTime, paymentStatus, userStatus } from "./status";

type Tab = "all" | "customers" | "staff" | "blocked";

const ROLE_LABEL: Record<UserRole, string> = { customer: "Customer", admin: "Admin", editor: "Editor" };

function RoleTag({ role }: { role: UserRole }) {
  return (
    <span
      className={cn(
        "eyebrow inline-block px-2 py-1",
        role === "admin" ? "bg-ink text-white" : role === "editor" ? "border border-ink text-ink" : "text-subtle",
      )}
    >
      {ROLE_LABEL[role]}
    </span>
  );
}

function UserDetail({ user, payments, onDone }: { user: AdminUser; payments: Payment[]; onDone: () => void }) {
  const router = useRouter();
  const roleForm = useForm<RoleFormValues>({ resolver: zodResolver(roleFormSchema), defaultValues: { role: user.role } });
  const role = roleForm.watch("role");
  const [saving, setSaving] = useState(false);

  const update = async (body: { role?: UserRole; status?: "active" | "blocked" }, success: string) => {
    setSaving(true);
    try {
      await api(`/api/admin/users/${user.id}`, { method: "PATCH", body });
      toast(success, { description: user.name });
      onDone();
      router.refresh();
    } catch (e) {
      toast("Update failed", { description: e instanceof ApiRequestError ? e.message : undefined });
      setSaving(false);
    }
  };
  const history = payments.filter((p) => p.userId === user.id).slice(0, 5);
  const blocked = user.status === "blocked";

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-stone px-6 py-8 text-center">
        <div className="flex justify-center">
          <Avatar name={user.name} size="lg" />
        </div>
        <SheetTitle className="mt-4 font-display text-[28px] leading-tight font-normal">{user.name}</SheetTitle>
        <SheetDescription className="mt-1 text-[12px] text-subtle">{user.email}</SheetDescription>
        <div className="mt-4 flex justify-center gap-2">
          <StatusBadge tone={userStatus[user.status].tone}>{userStatus[user.status].label}</StatusBadge>
          <RoleTag role={role} />
        </div>
      </div>

      <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6 text-[13px]">
        <dl className="grid grid-cols-3 border border-stone text-center">
          {[
            ["Orders", String(user.orders)],
            ["Spent", formatPrice(user.spent)],
            ["AOV", user.orders ? formatPrice(user.spent / user.orders) : "—"],
          ].map(([k, v]) => (
            <div key={k} className="border-r border-stone px-2 py-4 last:border-r-0">
              <dt className="eyebrow text-subtle">{k}</dt>
              <dd className="mt-2 font-display text-[18px] tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>

        <section>
          <h3 className="eyebrow text-subtle">Profile</h3>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
            <dt className="text-subtle">Country</dt>
            <dd>{user.country}</dd>
            <dt className="text-subtle">Member since</dt>
            <dd>{fmtDate(user.joined)}</dd>
            <dt className="text-subtle">Last seen</dt>
            <dd>{fmtDateTime(user.lastSeen)}</dd>
            <dt className="text-subtle">User ID</dt>
            <dd className="font-mono text-[12px]">{user.id}</dd>
          </dl>
        </section>

        <form
          id="role-form"
          onSubmit={roleForm.handleSubmit(({ role }) => update({ role }, `Role changed to ${ROLE_LABEL[role]}`))}
        >
          <label htmlFor="user-role" className="eyebrow text-subtle">
            Role & permissions
          </label>
          <Controller
            control={roleForm.control}
            name="role"
            render={({ field }) => (
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id="user-role" className="mt-3 h-10 w-full rounded-none border-stone text-[13px] shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-none">
              <SelectItem value="customer">Customer — storefront only</SelectItem>
              <SelectItem value="editor">Editor — products & content</SelectItem>
              <SelectItem value="admin">Admin — full access</SelectItem>
            </SelectContent>
          </Select>
            )}
          />
        </form>

        <section>
          <h3 className="eyebrow text-subtle">Recent orders</h3>
          {history.length === 0 ? (
            <p className="mt-3 text-subtle">No orders yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-stone border-y border-stone">
              {history.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                  <span>
                    #{p.order}
                    <span className="block text-[11px] text-subtle">{fmtDate(p.date)}</span>
                  </span>
                  <span className="flex items-center gap-3">
                    <StatusBadge tone={paymentStatus[p.status].tone}>{paymentStatus[p.status].label}</StatusBadge>
                    <span className="tabular-nums">{formatPrice(p.amount)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="eyebrow text-subtle">Actions</h3>
          <button type="button" disabled className="flex w-full items-center gap-3 border border-stone px-4 py-3 text-left disabled:opacity-50">
            <Mail className="size-4" strokeWidth={1.25} /> Send email
          </button>
          <button type="button" disabled className="flex w-full items-center gap-3 border border-stone px-4 py-3 text-left disabled:opacity-50">
            <KeyRound className="size-4" strokeWidth={1.25} /> Send password reset
          </button>
          <p className="text-[11px] text-subtle">Available once login and transactional email are set up.</p>
        </section>
      </div>

      <div className="grid grid-cols-2 gap-3 border-t border-stone px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          disabled={saving}
          onClick={() => update({ status: blocked ? "active" : "blocked" }, blocked ? "User unblocked" : "User blocked")}
          className={cn(
            "btn h-10 px-2",
            blocked ? "btn-outline" : "border border-critical/40 text-critical hover:bg-critical hover:text-white",
          )}
        >
          {blocked ? <ShieldCheck className="size-3.5" /> : <ShieldBan className="size-3.5" />}
          {blocked ? "Unblock" : "Block"}
        </button>
        <button type="submit" form="role-form" disabled={saving || role === user.role} className="btn btn-primary h-10 px-2">
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

/** Team members are created on a dedicated page (/admin/users/new), not in a modal. */
export function InviteMemberButton() {
  return (
    <Link href="/admin/users/new" className="btn btn-primary h-10 px-5">
      <UserPlus className="size-3.5" /> Invite member
    </Link>
  );
}

export function UsersTable({ users, payments }: { users: AdminUser[]; payments: Payment[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<AdminUser | null>(null);

  const counts = useMemo(
    () => ({
      all: users.length,
      customers: users.filter((u) => u.role === "customer").length,
      staff: users.filter((u) => u.role !== "customer").length,
      blocked: users.filter((u) => u.status === "blocked").length,
    }),
    [users],
  );

  const rows = users.filter((u) => {
    if (tab === "customers" && u.role !== "customer") return false;
    if (tab === "staff" && u.role === "customer") return false;
    if (tab === "blocked" && u.status !== "blocked") return false;
    const q = query.trim().toLowerCase();
    return !q || u.name.toLowerCase().includes(q) || u.email.includes(q);
  });

  return (
    <>
      <div className="border border-stone bg-white">
        <div className="px-5 sm:px-6">
          <FilterTabs<Tab>
            label="User segment"
            value={tab}
            onChange={setTab}
            options={[
              { value: "all", label: "All", count: counts.all },
              { value: "customers", label: "Customers", count: counts.customers },
              { value: "staff", label: "Team", count: counts.staff },
              { value: "blocked", label: "Blocked", count: counts.blocked },
            ]}
          />
        </div>
        <div className="px-5 py-4 sm:px-6">
          <SearchField id="user-search" value={query} onChange={setQuery} placeholder="Search by name or email" />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-[13px]">
            <thead>
              <tr className="border-y border-stone bg-paper/60">
                <th className={th}>User</th>
                <th className={th}>Role</th>
                <th className={th}>Status</th>
                <th className={th}>Country</th>
                <th className={cn(th, "text-right")}>Orders</th>
                <th className={cn(th, "text-right")}>Total spent</th>
                <th className={th}>Joined</th>
                <th className={cn(th, "w-10")}>
                  <span className="sr-only">Open</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone">
              {rows.map((u) => (
                <tr key={u.id} onClick={() => setOpen(u)} className="cursor-pointer hover:bg-paper/60">
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} />
                      <div className="min-w-0">
                        <p className="font-medium">{u.name}</p>
                        <p className="truncate text-[11px] text-subtle">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className={td}>
                    <RoleTag role={u.role} />
                  </td>
                  <td className={td}>
                    <StatusBadge tone={userStatus[u.status].tone}>{userStatus[u.status].label}</StatusBadge>
                  </td>
                  <td className={cn(td, "text-subtle")}>{u.country}</td>
                  <td className={cn(td, "text-right tabular-nums")}>{u.orders}</td>
                  <td className={cn(td, "text-right tabular-nums")}>{formatPrice(u.spent)}</td>
                  <td className={cn(td, "whitespace-nowrap text-subtle")}>{fmtDate(u.joined)}</td>
                  <td className={td}>
                    <button type="button" onClick={() => setOpen(u)} aria-label={`Open ${u.name}`} className="p-1 text-subtle hover:text-ink">
                      <ChevronRight className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="py-16 text-center text-[13px] text-subtle">No users match these filters.</p>}
        </div>
        <p className="border-t border-stone px-5 py-3 text-[12px] text-subtle sm:px-6">
          Showing {rows.length} of {users.length}
        </p>
      </div>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent side="right" className="w-full gap-0 border-0 p-0 sm:max-w-[440px]">
          {open && <UserDetail key={open.id} user={open} payments={payments} onDone={() => setOpen(null)} />}
        </SheetContent>
      </Sheet>
    </>
  );
}
