import type { CustomerOrderStatus } from "@/server/account";
import { cn } from "@/lib/utils";

export const ORDER_STATUS: Record<CustomerOrderStatus, { label: string; className: string }> = {
  paid: { label: "Confirmed", className: "text-ink" },
  processing: { label: "Preparing", className: "text-ink" },
  shipped: { label: "Shipped", className: "text-burgundy" },
  delivered: { label: "Delivered", className: "text-good" },
  refunded: { label: "Refunded", className: "text-subtle" },
};

export function OrderStatusLabel({ status, className }: { status: CustomerOrderStatus; className?: string }) {
  const s = ORDER_STATUS[status];
  return <span className={cn("eyebrow inline-block", s.className, className)}>● {s.label}</span>;
}

export const fmtOrderDate = (iso: string) => new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(iso));
