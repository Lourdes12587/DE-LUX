import { CreditCard, LayoutDashboard, Package, Users } from "lucide-react";

export type StaffRole = "ADMIN" | "EDITOR";

/** `adminOnly` sections are hidden from editors (and their APIs return 403). */
export const adminNav = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard, adminOnly: true },
  { label: "Products", href: "/admin/products", icon: Package, adminOnly: false },
  { label: "Payments", href: "/admin/payments", icon: CreditCard, adminOnly: true },
  { label: "Users", href: "/admin/users", icon: Users, adminOnly: true },
];
