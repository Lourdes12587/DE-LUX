"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, CreditCard, Wallet } from "lucide-react";
import { toast } from "sonner";
import type { Payment, PaymentStatus } from "@/lib/admin-types";
import { api, ApiRequestError } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Avatar, FilterTabs, SearchField, StatusBadge, td, th } from "./ui";
import { fmtDateTime, paymentStatus } from "./status";

type Tab = "all" | PaymentStatus;

function MethodCell({ p }: { p: Payment }) {
  const Icon = p.last4 ? CreditCard : Wallet;
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className="size-4 text-subtle" strokeWidth={1.25} />
      {p.method}
      {p.last4 && <span className="text-subtle tabular-nums">•••• {p.last4}</span>}
    </span>
  );
}

function PaymentDetail({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const s = paymentStatus[payment.status];
  const subtotal = payment.items.reduce((t, i) => t + i.price * i.qty, 0);
  const shipping = Math.round((payment.amount - subtotal) * 100) / 100;

  const timeline = [
    { label: "Payment created", at: payment.date },
    ...(payment.status === "succeeded" || payment.status === "refunded" ? [{ label: "Payment succeeded", at: payment.date }] : []),
    ...(payment.status === "failed" ? [{ label: "Card declined — insufficient funds", at: payment.date }] : []),
    ...(payment.status === "refunded" ? [{ label: "Refund issued", at: payment.date }] : []),
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-stone px-6 py-6">
        <p className="eyebrow text-subtle">Payment</p>
        <SheetTitle className="mt-3 font-display text-[36px] leading-none font-normal tabular-nums">{formatPrice(payment.amount)}</SheetTitle>
        <SheetDescription className="mt-3 flex flex-wrap items-center gap-3 text-[12px]">
          <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
          <span className="text-subtle">#{payment.order}</span>
        </SheetDescription>
      </div>

      <div className="flex-1 space-y-8 overflow-y-auto px-6 py-6 text-[13px]">
        <section>
          <h3 className="eyebrow text-subtle">Customer</h3>
          <div className="mt-3 flex items-center gap-3">
            <Avatar name={payment.customer} />
            <div>
              <p className="font-medium">{payment.customer}</p>
              <p className="text-[12px] text-subtle">{payment.email}</p>
            </div>
          </div>
        </section>

        <section>
          <h3 className="eyebrow text-subtle">Items</h3>
          <ul className="mt-3 divide-y divide-stone border-y border-stone">
            {payment.items.map((it, i) => (
              <li key={i} className="flex justify-between gap-4 py-3">
                <span>
                  {it.name}
                  <span className="block text-[11px] text-subtle">
                    Size {it.size} · Qty {it.qty}
                  </span>
                </span>
                <span className="tabular-nums">{formatPrice(it.price * it.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 space-y-1.5">
            <div className="flex justify-between text-subtle">
              <dt>Shipping</dt>
              <dd className="tabular-nums">{shipping <= 0 ? "Free" : formatPrice(shipping)}</dd>
            </div>
            <div className="flex justify-between font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatPrice(payment.amount)}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h3 className="eyebrow text-subtle">Payment details</h3>
          <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
            <dt className="text-subtle">Method</dt>
            <dd><MethodCell p={payment} /></dd>
            <dt className="text-subtle">Stripe ID</dt>
            <dd className="truncate font-mono text-[12px]">{payment.id}</dd>
            <dt className="text-subtle">Date</dt>
            <dd>{fmtDateTime(payment.date)}</dd>
            <dt className="text-subtle">Risk</dt>
            <dd><StatusBadge tone="good">Normal</StatusBadge></dd>
          </dl>
        </section>

        <section>
          <h3 className="eyebrow text-subtle">Timeline</h3>
          <ol className="mt-4 space-y-4 border-l border-stone pl-5">
            {timeline.map((t, i) => (
              <li key={i} className="relative">
                <span className="absolute top-1.5 -left-[23.5px] size-2 rounded-full bg-ink ring-4 ring-white" />
                <p>{t.label}</p>
                <p className="text-[11px] text-subtle">{fmtDateTime(t.at)}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <div className="border-t border-stone px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {confirming ? (
          <div role="alertdialog" aria-labelledby="refund-q" className="space-y-3">
            <p id="refund-q" className="text-[13px]">
              Refund <strong>{formatPrice(payment.amount)}</strong> to {payment.customer}? This cannot be undone.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setConfirming(false)} className="btn btn-outline h-10 px-2">
                Cancel
              </button>
              <button
                type="button"
                disabled={refunding}
                onClick={async () => {
                  setRefunding(true);
                  try {
                    await api(`/api/admin/payments/${encodeURIComponent(payment.id)}/refund`, { method: "POST" });
                    toast("Payment refunded", { description: `${formatPrice(payment.amount)} · #${payment.order}` });
                    onClose();
                    router.refresh();
                  } catch (e) {
                    toast("Refund failed", { description: e instanceof ApiRequestError ? e.message : undefined });
                    setRefunding(false);
                  }
                }}
                className="btn h-10 bg-critical px-2 text-white hover:bg-ink"
              >
                {refunding ? "Refunding…" : "Confirm refund"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button type="button" className="btn btn-outline h-10 px-2" onClick={() => toast("Receipt sent")}>
              Send receipt
            </button>
            <button
              type="button"
              disabled={payment.status !== "succeeded"}
              onClick={() => setConfirming(true)}
              className="btn h-10 border border-critical/40 px-2 text-critical hover:bg-critical hover:text-white"
            >
              Refund
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function PaymentsTable({ payments }: { payments: Payment[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [method, setMethod] = useState("all");
  const [open, setOpen] = useState<Payment | null>(null);

  const counts = useMemo(() => {
    const c: Record<Tab, number> = { all: payments.length, succeeded: 0, pending: 0, refunded: 0, failed: 0 };
    payments.forEach((p) => c[p.status]++);
    return c;
  }, [payments]);

  const methods = [...new Set(payments.map((p) => p.method))];
  const rows = payments.filter((p) => {
    if (tab !== "all" && p.status !== tab) return false;
    if (method !== "all" && p.method !== method) return false;
    const q = query.trim().toLowerCase();
    return !q || [p.customer, p.email, p.order, p.id].some((v) => v.toLowerCase().includes(q));
  });

  return (
    <div className="border border-stone bg-white">
      <div className="px-5 sm:px-6">
        <FilterTabs<Tab>
          label="Payment status"
          value={tab}
          onChange={setTab}
          options={(["all", "succeeded", "pending", "refunded", "failed"] as Tab[]).map((t) => ({
            value: t,
            label: t === "all" ? "All" : paymentStatus[t].label,
            count: counts[t],
          }))}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3 px-5 py-4 sm:px-6">
        <SearchField id="payment-search" value={query} onChange={setQuery} placeholder="Customer, email, order or ID" />
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger aria-label="Filter by payment method" className="h-10 w-[170px] rounded-none border-stone text-[13px] shadow-none">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="rounded-none">
            <SelectItem value="all">All methods</SelectItem>
            {methods.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[880px] text-[13px]">
          <thead>
            <tr className="border-y border-stone bg-paper/60">
              <th className={cn(th, "text-right")}>Amount</th>
              <th className={th}>Status</th>
              <th className={th}>Customer</th>
              <th className={th}>Order</th>
              <th className={th}>Method</th>
              <th className={th}>Date</th>
              <th className={cn(th, "w-10")}>
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone">
            {rows.map((p) => (
              <tr key={p.id} onClick={() => setOpen(p)} className="cursor-pointer hover:bg-paper/60">
                <td className={cn(td, "text-right font-medium tabular-nums")}>
                  <span className={cn(p.status === "refunded" && "text-subtle line-through", p.status === "failed" && "text-subtle")}>
                    {formatPrice(p.amount)}
                  </span>
                </td>
                <td className={td}>
                  <StatusBadge tone={paymentStatus[p.status].tone}>{paymentStatus[p.status].label}</StatusBadge>
                </td>
                <td className={td}>
                  <p className="font-medium">{p.customer}</p>
                  <p className="text-[11px] text-subtle">{p.email}</p>
                </td>
                <td className={cn(td, "text-subtle")}>#{p.order}</td>
                <td className={td}>
                  <MethodCell p={p} />
                </td>
                <td className={cn(td, "whitespace-nowrap text-subtle")}>{fmtDateTime(p.date)}</td>
                <td className={td}>
                  <button type="button" onClick={() => setOpen(p)} aria-label={`Open payment ${p.order}`} className="p-1 text-subtle hover:text-ink">
                    <ChevronRight className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <p className="py-16 text-center text-[13px] text-subtle">No payments match these filters.</p>}
      </div>
      <p className="border-t border-stone px-5 py-3 text-[12px] text-subtle sm:px-6">
        Showing {rows.length} of {payments.length}
      </p>

      <Sheet open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent side="right" className="w-full gap-0 border-0 p-0 sm:max-w-[460px]">
          {open && <PaymentDetail key={open.id} payment={open} onClose={() => setOpen(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
