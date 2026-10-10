import { products } from "@/lib/data/products";
import type {
  AdminUser,
  Payment,
  PaymentMethod,
  PaymentStatus,
  ProductStatus,
  UserRole,
  UserStatus,
} from "@/lib/admin-types";

// Mock admin data. Only used by prisma/seed.ts — the admin UI reads the database via src/server/admin/*.

export type { AdminUser, Payment, PaymentMethod, PaymentStatus, ProductStatus, UserRole, UserStatus };

/** Deterministic PRNG so every seed run produces identical data. */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

const FIRST = ["Claire", "Lucía", "Sofia", "Amélie", "Giulia", "Marta", "Inès", "Lea", "Carmen", "Noor", "Elena", "Julia", "Camille", "Ana", "Chloé", "Valentina", "Hannah", "Paula", "Zoé", "Irene", "Marco", "Lucas", "Hugo", "Daniel"];
const LAST = ["Martin", "García", "Rossi", "Dubois", "Bianchi", "López", "Moreau", "Schmidt", "Ruiz", "Haddad", "Romano", "Fischer", "Laurent", "Silva", "Bernard", "Conti", "Weber", "Navarro", "Leroy", "Costa"];
const COUNTRIES = ["Spain", "France", "Italy", "Germany", "Portugal", "Netherlands"];
const METHODS: PaymentMethod[] = ["Visa", "Visa", "Mastercard", "Apple Pay", "PayPal", "Google Pay", "Amex"];

const TODAY = new Date("2026-10-07T12:00:00Z");
const daysAgo = (n: number, r = 0) => new Date(TODAY.getTime() - n * 864e5 - r * 36e5);

const r = rng(42);
const pick = <T,>(arr: T[]) => arr[Math.floor(r() * arr.length)];

export const adminUsers: AdminUser[] = Array.from({ length: 36 }, (_, i) => {
  const first = FIRST[i % FIRST.length];
  const last = LAST[(i * 7) % LAST.length];
  const role: UserRole = i === 0 ? "admin" : i === 5 ? "editor" : "customer";
  const status: UserStatus = i % 17 === 9 ? "blocked" : i % 13 === 11 ? "invited" : "active";
  const orders = status === "invited" ? 0 : Math.floor(r() * 9);
  return {
    id: `usr_${(1000 + i).toString(36)}`,
    name: `${first} ${last}`,
    email: `${first}.${last}`.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") + "@example.com",
    role,
    status,
    country: pick(COUNTRIES),
    orders,
    spent: Math.round(orders * (90 + r() * 160) * 100) / 100,
    joined: daysAgo(Math.floor(20 + r() * 600)).toISOString(),
    lastSeen: daysAgo(Math.floor(r() * 30), Math.floor(r() * 20)).toISOString(),
  };
});

const customers = adminUsers.filter((u) => u.status !== "invited");

export const payments: Payment[] = Array.from({ length: 48 }, (_, i) => {
  const u = customers[Math.floor(r() * customers.length)];
  const n = 1 + Math.floor(r() * 3);
  const items = Array.from({ length: n }, () => {
    const p = pick(products);
    const qty = r() > 0.85 ? 2 : 1;
    return { productId: p.id, name: p.name, size: pick(["XS", "S", "M", "L", "XL"]), qty, price: p.price };
  });
  const sub = items.reduce((s, it) => s + it.price * it.qty, 0);
  const amount = Math.round((sub + (sub >= 150 ? 0 : 4.95)) * 100) / 100;
  const roll = r();
  const status: PaymentStatus = i < 3 && roll > 0.4 ? "pending" : roll > 0.94 ? "failed" : roll > 0.88 ? "refunded" : "succeeded";
  const method = pick(METHODS);
  return {
    id: `pi_3Q${(987654 + i * 7919).toString(36).toUpperCase()}x${i}`,
    order: `PH-2026-${String(125 + 48 - i).padStart(5, "0")}`,
    userId: u.id,
    customer: u.name,
    email: u.email,
    amount,
    method,
    last4: ["Visa", "Mastercard", "Amex"].includes(method) ? String(1000 + Math.floor(r() * 8999)) : undefined,
    status,
    date: daysAgo(Math.floor(i * 0.6), Math.floor(r() * 12)).toISOString(),
    items,
  };
});

/** Daily net revenue for the last 30 days. */
export const revenueSeries = Array.from({ length: 30 }, (_, i) => {
  const d = daysAgo(29 - i);
  const weekend = [0, 6].includes(d.getUTCDay());
  const trend = 1800 + i * 38;
  const value = Math.round(trend * (weekend ? 1.35 : 1) * (0.78 + r() * 0.44));
  return { date: d.toISOString().slice(0, 10), value };
});

export const salesByCategory = [
  { category: "Trench & Coats", value: 18420 },
  { category: "Jackets", value: 14310 },
  { category: "Trousers", value: 9870 },
  { category: "Dresses", value: 8240 },
  { category: "Shirts", value: 6120 },
  { category: "Knitwear", value: 4380 },
  { category: "T-Shirts", value: 3010 },
];

/** Admin-only product fields that don't exist on the storefront type yet. */
export const productAdminMeta: Record<string, { status: ProductStatus; sku: string; sold: number }> = Object.fromEntries(
  products.map((p, i) => [
    p.id,
    {
      status: i === 23 ? "draft" : i === 19 ? "archived" : "active",
      sku: `PH-${p.category.slice(0, 3).toUpperCase()}-${String(100 + i)}`,
      sold: Math.floor(20 + ((i * 53) % 180)),
    },
  ]),
);

export const ADMIN_TODAY = TODAY;
