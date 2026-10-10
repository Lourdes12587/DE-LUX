import type { Product } from "@/lib/types";

// Row shapes consumed by the admin UI. Produced by src/server/admin/* (and by the mocks in src/lib/data/admin.ts).

export type PaymentStatus = "succeeded" | "pending" | "refunded" | "failed";
export type PaymentMethod = string; // display label: "Visa", "Apple Pay", "PayPal", "Klarna"…
export type UserRole = "customer" | "admin" | "editor";
export type UserStatus = "active" | "blocked" | "invited";
export type ProductStatus = "active" | "draft" | "archived";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  country: string;
  orders: number;
  spent: number;
  joined: string; // ISO date
  lastSeen: string;
};

export type Payment = {
  id: string;
  order: string;
  userId: string;
  customer: string;
  email: string;
  amount: number;
  method: PaymentMethod;
  last4?: string;
  status: PaymentStatus;
  date: string; // ISO datetime
  items: { productId: string; name: string; size: string; qty: number; price: number }[];
};

export type AdminProduct = Product & {
  status: ProductStatus;
  sku: string;
  sold: number;
  categoryId: string;
  seoTitle?: string;
  seoDescription?: string;
};

export type AdminCategory = { id: string; slug: string; name: string };

export type DashboardData = {
  revenue: { value: number; delta: number | null };
  orders: { value: number; delta: number | null };
  aov: { value: number; delta: number | null };
  newCustomers: { value: number; delta: number | null };
  revenueSeries: { date: string; value: number }[];
  salesByCategory: { category: string; value: number }[];
  recentPayments: Payment[];
  bestSellers: { id: string; name: string; image: string; sold: number }[];
  lowStock: { id: string; name: string; units: number }[];
};
