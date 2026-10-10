import "server-only";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { VIRTUAL_COLLECTIONS } from "@/lib/collections";
import { SIZES, type Category, type Product, type Size } from "@/lib/types";

// Storefront data access. Server components call these directly; /api/* route handlers wrap them for the browser.
// Only ACTIVE products are ever exposed here.

export const productInclude = {
  category: true,
  colors: { orderBy: { position: "asc" } },
  images: { orderBy: { position: "asc" } },
  // Expired reservations are ignored in toProduct (the include is static, so "now" is applied there).
  variants: { include: { reservations: { select: { quantity: true, expiresAt: true } } } },
} satisfies Prisma.ProductInclude;

export type ProductRow = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

const sizeOrder = (s: string) => SIZES.indexOf(s as Size);

/** Maps a Prisma row to the UI `Product` shape. Available stock discounts active reservations. */
export function toProduct(row: ProductRow): Product {
  const now = Date.now();
  const variants = row.variants
    .map((v) => {
      const reserved = v.reservations
        .filter((r) => r.expiresAt.getTime() > now)
        .reduce((s, r) => s + r.quantity, 0);
      const color = row.colors.find((c) => c.id === v.colorId)?.name ?? "";
      return { id: v.id, sku: v.sku, color, size: v.size as Size, stock: Math.max(0, v.stock - reserved) };
    })
    .sort((a, b) => sizeOrder(a.size) - sizeOrder(b.size));

  const sizes = SIZES.filter((s) => variants.some((v) => v.size === s));
  const stock: Product["stock"] = {};
  for (const s of sizes) stock[s] = variants.filter((v) => v.size === s).reduce((n, v) => n + v.stock, 0);

  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    category: row.category.slug,
    categoryName: row.category.name,
    price: Number(row.price),
    compareAtPrice: row.compareAtPrice != null ? Number(row.compareAtPrice) : undefined,
    description: row.description,
    details: row.details,
    composition: row.composition ?? "",
    images: row.images.map((i) => ({ src: i.url, alt: i.alt })),
    colors: row.colors.map((c) => ({ name: c.name, hex: c.hex })),
    sizes,
    stock,
    variants,
    featured: row.featured,
    newArrival: row.newArrival,
    bestSeller: row.bestSeller,
  };
}

async function findProducts(where: Prisma.ProductWhereInput = {}, take?: number) {
  const rows = await db.product.findMany({
    where: { status: "ACTIVE", ...where },
    include: productInclude,
    orderBy: [{ featured: "desc" }, { createdAt: "asc" }],
    take,
  });
  return rows.map(toProduct);
}

export async function getCategories(): Promise<Category[]> {
  const rows = await db.category.findMany({ orderBy: { position: "asc" } });
  const real = rows.map((c) => ({
    slug: c.slug,
    name: c.name,
    title: c.title,
    description: c.description ?? "",
    image: c.image ?? "",
  }));
  return [VIRTUAL_COLLECTIONS[0], ...real, VIRTUAL_COLLECTIONS[1]];
}

export async function getCategory(slug: string): Promise<Category | undefined> {
  return (await getCategories()).find((c) => c.slug === slug);
}

export async function getProduct(slug: string): Promise<Product | undefined> {
  const row = await db.product.findFirst({ where: { slug, status: "ACTIVE" }, include: productInclude });
  return row ? toProduct(row) : undefined;
}

export async function getProducts(opts: { collection?: string; limit?: number } = {}) {
  const virtual = VIRTUAL_COLLECTIONS.find((c) => c.slug === opts.collection)?.virtual;
  const where: Prisma.ProductWhereInput =
    virtual === "new"
      ? { newArrival: true }
      : virtual === "sale"
        ? { compareAtPrice: { not: null } }
        : opts.collection
          ? { category: { slug: opts.collection } }
          : {};
  return findProducts(where, opts.limit);
}

export const getNewArrivals = (limit = 4) => findProducts({ newArrival: true }, limit);
export const getBestSellers = (limit = 4) => findProducts({ bestSeller: true }, limit);
export const getFeatured = (limit = 4) => findProducts({ featured: true }, limit);

export async function getRelated(product: Product, limit = 4) {
  const same = await findProducts({ category: { slug: product.category }, id: { not: product.id } }, limit);
  if (same.length >= limit) return same;
  const rest = await findProducts({ category: { slug: { not: product.category } } }, limit - same.length);
  return [...same, ...rest];
}

export async function getProductsByIds(ids: string[]) {
  if (ids.length === 0) return [];
  const list = await findProducts({ id: { in: ids } });
  return ids.map((id) => list.find((p) => p.id === id)).filter((p): p is Product => !!p);
}

export async function searchProducts(query: string, limit?: number) {
  const q = query.trim();
  if (!q) return [];
  const contains = { contains: q, mode: "insensitive" as const };
  return findProducts(
    {
      OR: [
        { name: contains },
        { description: contains },
        { category: { name: contains } },
        { colors: { some: { name: contains } } },
      ],
    },
    limit,
  );
}
