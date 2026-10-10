import "server-only";
import { revalidatePath } from "next/cache";
import type { Prisma, ProductStatus as DbProductStatus } from "@prisma/client";
import type { ProductInput } from "@/lib/schemas/product";
import { db } from "@/lib/db";
import { productInclude, toProduct, type ProductRow } from "@/lib/catalog";
import type { AdminCategory, AdminProduct, ProductStatus } from "@/lib/admin-types";
import { SIZES } from "@/lib/types";
import { ApiError, notFound } from "@/server/http";

/** Order states that count as a completed sale. */
export const SOLD_STATUSES = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

const colorCode = (name: string) => name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase() || "COL";

/** Base SKU = variant SKU without its colour and size suffixes (PH-COA-100-BUR-XS → PH-COA-100). */
const skuBase = (row: ProductRow) => row.variants[0]?.sku.split("-").slice(0, -2).join("-") ?? "";

async function soldByProduct(productIds?: string[]) {
  const items = await db.orderItem.findMany({
    where: {
      order: { status: { in: [...SOLD_STATUSES] } },
      variant: productIds ? { productId: { in: productIds } } : { isNot: null },
    },
    select: { quantity: true, variant: { select: { productId: true } } },
  });
  const sold = new Map<string, number>();
  for (const it of items) {
    const id = it.variant?.productId;
    if (id) sold.set(id, (sold.get(id) ?? 0) + it.quantity);
  }
  return sold;
}

function toAdminProduct(row: ProductRow, sold: number): AdminProduct {
  return {
    ...toProduct(row),
    status: row.status.toLowerCase() as ProductStatus,
    sku: skuBase(row),
    sold,
    categoryId: row.categoryId,
    seoTitle: row.seoTitle ?? undefined,
    seoDescription: row.seoDescription ?? undefined,
  };
}

export async function listAdminProducts(): Promise<AdminProduct[]> {
  const rows = await db.product.findMany({ include: productInclude, orderBy: [{ category: { position: "asc" } }, { createdAt: "asc" }] });
  const sold = await soldByProduct();
  return rows.map((r) => toAdminProduct(r, sold.get(r.id) ?? 0));
}

export async function getAdminProduct(id: string): Promise<AdminProduct> {
  const row = await db.product.findUnique({ where: { id }, include: productInclude });
  if (!row) throw notFound("Product");
  const sold = await soldByProduct([id]);
  return toAdminProduct(row, sold.get(id) ?? 0);
}

export async function listAdminCategories(): Promise<AdminCategory[]> {
  return db.category.findMany({ orderBy: { position: "asc" }, select: { id: true, slug: true, name: true } });
}

export { productInputSchema, type ProductInput } from "@/lib/schemas/product";

function refreshStorefront() {
  revalidatePath("/", "layout");
}

async function uniqueSkuBase(tx: Prisma.TransactionClient, categoryId: string) {
  const cat = await tx.category.findUniqueOrThrow({ where: { id: categoryId } });
  const prefix = `PH-${cat.slug.replace(/[^a-z]/g, "").slice(0, 3).toUpperCase()}-`;
  for (;;) {
    const base = prefix + Math.floor(100 + Math.random() * 900);
    const clash = await tx.variant.findFirst({ where: { sku: { startsWith: `${base}-` } } });
    if (!clash) return base;
  }
}

/** Creates (id = null) or updates a product with its colours, variants (colour × size), stock and images. */
export async function saveProduct(id: string | null, input: ProductInput): Promise<AdminProduct> {
  const productId = await db.$transaction(async (tx) => {
    const scalars = {
      name: input.name,
      slug: input.slug,
      description: input.description,
      composition: input.composition || null,
      details: input.details,
      price: input.price,
      compareAtPrice: input.compareAtPrice,
      status: input.status.toUpperCase() as DbProductStatus,
      categoryId: input.categoryId,
      featured: input.featured,
      newArrival: input.newArrival,
      bestSeller: input.bestSeller,
      seoTitle: input.seoTitle || null,
      seoDescription: input.seoDescription || null,
    };

    let product;
    if (id) {
      const existing = await tx.product.findUnique({ where: { id }, include: { variants: true } });
      if (!existing) throw notFound("Product");
      product = await tx.product.update({ where: { id }, data: scalars, include: { variants: true } });
    } else {
      product = await tx.product.create({ data: scalars, include: { variants: true } });
    }
    const base = product.variants[0]?.sku.split("-").slice(0, -2).join("-") || (await uniqueSkuBase(tx, input.categoryId));

    // Colours: remove the ones no longer listed (their variants cascade), upsert the rest.
    const names = input.colors.map((c) => c.name);
    await tx.productColor.deleteMany({ where: { productId: product.id, name: { notIn: names } } });
    for (const [position, c] of input.colors.entries()) {
      const color = await tx.productColor.upsert({
        where: { productId_name: { productId: product.id, name: c.name } },
        update: { hex: c.hex, position },
        create: { productId: product.id, name: c.name, hex: c.hex, position },
        include: { variants: true },
      });

      for (const size of SIZES) {
        const stock = input.stock[c.name]?.[size] ?? 0;
        const variant = color.variants.find((v) => v.size === size);
        if (variant) {
          const delta = stock - variant.stock;
          if (delta !== 0) {
            await tx.variant.update({ where: { id: variant.id }, data: { stock } });
            await tx.inventoryMovement.create({
              data: { variantId: variant.id, delta, reason: delta > 0 ? "RESTOCK" : "ADJUSTMENT", note: "Admin edit" },
            });
          }
        } else {
          const created = await tx.variant.create({
            data: { productId: product.id, colorId: color.id, size, sku: `${base}-${colorCode(c.name)}-${size}`, stock },
          });
          if (stock > 0) {
            await tx.inventoryMovement.create({
              data: { variantId: created.id, delta: stock, reason: "RESTOCK", note: "Initial stock" },
            });
          }
        }
      }
    }

    // Images have no natural key: replace them. The cover belongs to the first colour.
    const firstColor = await tx.productColor.findFirst({ where: { productId: product.id }, orderBy: { position: "asc" } });
    await tx.productImage.deleteMany({ where: { productId: product.id } });
    if (input.images.length) {
      await tx.productImage.createMany({
        data: input.images.map((img, position) => ({
          productId: product.id,
          colorId: position === 0 ? (firstColor?.id ?? null) : null,
          url: img.url,
          alt: img.alt || (position === 0 ? input.name : `${input.name} — alternate view`),
          position,
        })),
      });
    }
    return product.id;
  });

  refreshStorefront();
  return getAdminProduct(productId);
}

export async function setProductsStatus(ids: string[], status: ProductStatus) {
  const res = await db.product.updateMany({ where: { id: { in: ids } }, data: { status: status.toUpperCase() as DbProductStatus } });
  refreshStorefront();
  return { updated: res.count };
}

/** Copies a product as a DRAFT with zero stock, so it never goes live by accident. */
export async function duplicateProduct(id: string): Promise<AdminProduct> {
  const p = await getAdminProduct(id);
  let slug = `${p.slug}-copy`;
  for (let i = 2; await db.product.findUnique({ where: { slug } }); i++) slug = `${p.slug}-copy-${i}`;
  return saveProduct(null, {
    name: `${p.name} (copy)`,
    slug,
    description: p.description,
    composition: p.composition,
    details: p.details,
    price: p.price,
    compareAtPrice: p.compareAtPrice ?? null,
    status: "draft",
    categoryId: p.categoryId,
    featured: false,
    newArrival: p.newArrival ?? false,
    bestSeller: false,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    colors: p.colors,
    stock: {},
    images: p.images.map((i) => ({ url: i.src, alt: i.alt })),
  });
}

/** Products with sales are kept for history — archive them instead. */
export async function deleteProduct(id: string) {
  const sold = await db.orderItem.count({ where: { variant: { productId: id } } });
  if (sold > 0) throw new ApiError(409, "This product has orders. Archive it instead of deleting it.");
  await db.product.delete({ where: { id } });
  refreshStorefront();
  return { deleted: true };
}
