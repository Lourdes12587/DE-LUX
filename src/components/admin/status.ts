import type { PaymentStatus, ProductStatus, UserStatus } from "@/lib/admin-types";
import type { StatusTone } from "./ui";

export const paymentStatus: Record<PaymentStatus, { tone: StatusTone; label: string }> = {
  succeeded: { tone: "good", label: "Succeeded" },
  pending: { tone: "warning", label: "Pending" },
  refunded: { tone: "info", label: "Refunded" },
  failed: { tone: "critical", label: "Failed" },
};

export const userStatus: Record<UserStatus, { tone: StatusTone; label: string }> = {
  active: { tone: "good", label: "Active" },
  invited: { tone: "warning", label: "Invited" },
  blocked: { tone: "critical", label: "Blocked" },
};

export const productStatus: Record<ProductStatus, { tone: StatusTone; label: string }> = {
  active: { tone: "good", label: "Active" },
  draft: { tone: "neutral", label: "Draft" },
  archived: { tone: "info", label: "Archived" },
};

const dt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const dtt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" });
export const fmtDate = (iso: string) => dt.format(new Date(iso));
export const fmtDateTime = (iso: string) => dtt.format(new Date(iso));
