/**
 * Seeds the database from the UI-phase mocks (src/lib/data/*). Idempotent: safe to run repeatedly.
 * Run with `npx prisma db seed` (or `npm run db:seed`).
 */
import {
  OrderStatus,
  PaymentStatus,
  Prisma,
  PrismaClient,
  ProductStatus,
  Role,
  UserStatus,
} from "@prisma/client";
import { categories, products } from "../src/lib/data/products";
import { adminUsers, payments, productAdminMeta } from "../src/lib/data/admin";
import type { Size } from "../src/lib/types";

const db = new PrismaClient();

const SIZES: Size[] = ["XS", "S", "M", "L", "XL"];
const COUNTRY_CODE: Record<string, string> = {
  Spain: "ES",
  France: "FR",
  Italy: "IT",
  Germany: "DE",
  Portugal: "PT",
  Netherlands: "NL",
};

const colorCode = (name: string) => name.replace(/[^A-Za-z]/g, "").slice(0, 3).toUpperCase();

/** Split per-size stock across colours; the first colour gets the remainder. */
function splitStock(total: number, colors: number, index: number) {
  const base = Math.floor(total / colors);
  return index === 0 ? base + (total - base * colors) : base;
}

async function seedCatalogue() {
  const real = categories.filter((c) => !c.virtual);
  const categoryIds = new Map<string, string>();
  for (const [position, c] of real.entries()) {
    const row = await db.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, title: c.title, description: c.description, image: c.image, position },
      create: { slug: c.slug, name: c.name, title: c.title, description: c.description, image: c.image, position },
    });
    categoryIds.set(c.slug, row.id);
  }

  /** mock product id → variant lookup used when seeding orders */
  const variants = new Map<string, Map<Size, { id: string; sku: string; color: string; image: string }>>();

  for (const p of products) {
    const meta = productAdminMeta[p.id];
    const data = {
      name: p.name,
      description: p.description,
      details: p.details,
      composition: p.composition,
      price: p.price,
      compareAtPrice: p.compareAtPrice ?? null,
      status: meta.status.toUpperCase() as ProductStatus,
      featured: !!p.featured,
      newArrival: !!p.newArrival,
      bestSeller: !!p.bestSeller,
      categoryId: categoryIds.get(p.category)!,
    };
    const product = await db.product.upsert({ where: { slug: p.slug }, update: data, create: { slug: p.slug, ...data } });

    const colorIds: string[] = [];
    for (const [position, c] of p.colors.entries()) {
      const color = await db.productColor.upsert({
        where: { productId_name: { productId: product.id, name: c.name } },
        update: { hex: c.hex, position },
        create: { productId: product.id, name: c.name, hex: c.hex, position },
      });
      colorIds.push(color.id);
    }

    // Images have no natural key: replace them wholesale. The cover belongs to the first colour.
    await db.productImage.deleteMany({ where: { productId: product.id } });
    await db.productImage.createMany({
      data: p.images.map((img, position) => ({
        productId: product.id,
        colorId: position === 0 ? colorIds[0] : null,
        url: img.src,
        alt: img.alt,
        position,
      })),
    });

    const bySize = new Map<Size, { id: string; sku: string; color: string; image: string }>();
    for (const [ci, colorId] of colorIds.entries()) {
      for (const size of SIZES) {
        const sku = `${meta.sku}-${colorCode(p.colors[ci].name)}-${size}`;
        const stock = splitStock(p.stock[size] ?? 0, colorIds.length, ci);
        const v = await db.variant.upsert({
          where: { sku },
          update: { stock },
          create: { productId: product.id, colorId, size, sku, stock },
        });
        if (ci === 0) bySize.set(size, { id: v.id, sku, color: p.colors[0].name, image: p.images[0].src });
      }
    }
    variants.set(p.id, bySize);
  }
  return variants;
}

async function seedUsers() {
  const ids = new Map<string, string>();
  for (const u of adminUsers) {
    const data = {
      name: u.name,
      role: u.role.toUpperCase() as Role,
      status: u.status.toUpperCase() as UserStatus,
      lastSeenAt: new Date(u.lastSeen),
    };
    const row = await db.user.upsert({
      where: { email: u.email },
      update: data,
      create: {
        email: u.email,
        ...data,
        emailVerified: u.status === "invited" ? null : new Date(u.joined),
        createdAt: new Date(u.joined),
        addresses: {
          create: {
            firstName: u.name.split(" ")[0],
            lastName: u.name.split(" ").slice(1).join(" "),
            line1: "12 Rue de Rivoli",
            city: "Paris",
            postalCode: "75004",
            country: COUNTRY_CODE[u.country] ?? "ES",
            phone: "+34 600 000 000",
            isDefault: true,
          },
        },
      },
    });
    ids.set(u.id, row.id);
  }
  return ids;
}

async function seedDiscounts() {
  await db.discountCode.upsert({
    where: { code: "WELCOME10" },
    update: {},
    create: { code: "WELCOME10", type: "PERCENT", value: 10, oncePerCustomer: true },
  });
  await db.discountCode.upsert({
    where: { code: "PHENOMENON20" },
    update: {},
    create: { code: "PHENOMENON20", type: "PERCENT", value: 20, minSubtotal: 150, expiresAt: new Date("2026-12-31T23:59:59Z") },
  });
}

const ORDER_STATUS: Record<string, OrderStatus> = {
  succeeded: "DELIVERED",
  pending: "PENDING",
  refunded: "REFUNDED",
  failed: "CANCELLED",
};

async function seedOrders(
  variants: Awaited<ReturnType<typeof seedCatalogue>>,
  users: Map<string, string>,
) {
  for (const p of payments) {
    const userId = users.get(p.userId);
    if (!userId) continue;
    const createdAt = new Date(p.date);
    const subtotal = p.items.reduce((s, it) => s + it.price * it.qty, 0);
    const shippingTotal = Math.round((p.amount - subtotal) * 100) / 100;
    const ageDays = (Date.parse("2026-10-07T12:00:00Z") - createdAt.getTime()) / 864e5;
    const delivered = p.status === "succeeded" && ageDays > 3;

    const create: Prisma.OrderCreateInput = {
      number: p.order,
      email: p.email,
      user: { connect: { id: userId } },
      status: p.status === "succeeded" && !delivered ? "SHIPPED" : ORDER_STATUS[p.status],
      subtotal,
      shippingTotal,
      total: p.amount,
      shippingMethod: shippingTotal > 5 ? "EXPRESS" : "STANDARD",
      shippingAddress: { name: p.customer, line1: "12 Rue de Rivoli", city: "Paris", postalCode: "75004", country: "FR" },
      createdAt,
      items: {
        create: p.items.map((it) => {
          const v = variants.get(it.productId)!.get(it.size as Size)!;
          return {
            variant: { connect: { id: v.id } },
            name: it.name,
            sku: v.sku,
            color: v.color,
            size: it.size,
            image: v.image,
            unitPrice: it.price,
            quantity: it.qty,
          };
        }),
      },
      payments: {
        create: {
          stripePaymentIntentId: p.id,
          amount: p.amount,
          amountRefunded: p.status === "refunded" ? p.amount : 0,
          status: p.status.toUpperCase() as PaymentStatus,
          method: p.last4 ? "card" : p.method.toLowerCase().replace(" ", "_"),
          brand: p.last4 ? p.method.toLowerCase() : null,
          last4: p.last4 ?? null,
          failureReason: p.status === "failed" ? "card_declined" : null,
          createdAt,
          ...(p.status === "refunded" && {
            refunds: { create: { stripeRefundId: `re_${p.id.slice(3)}`, amount: p.amount, reason: "requested_by_customer" } },
          }),
        },
      },
      ...(p.status === "succeeded" && {
        shipments: {
          create: {
            carrier: "Correos Express",
            trackingNumber: `CE${p.order.replace(/\D/g, "")}ES`,
            status: delivered ? "DELIVERED" : "IN_TRANSIT",
            shippedAt: new Date(createdAt.getTime() + 864e5),
            deliveredAt: delivered ? new Date(createdAt.getTime() + 3 * 864e5) : null,
          },
        },
      }),
    };

    // Orders are immutable history: create once, never overwrite.
    await db.order.upsert({ where: { number: p.order }, update: {}, create });
  }
}

async function main() {
  const variants = await seedCatalogue();
  const users = await seedUsers();
  await seedDiscounts();
  await seedOrders(variants, users);

  const counts = await Promise.all([
    db.category.count(),
    db.product.count(),
    db.variant.count(),
    db.user.count(),
    db.order.count(),
    db.payment.count(),
    db.discountCode.count(),
  ]);
  console.log(
    `Seeded: ${counts[0]} categories, ${counts[1]} products, ${counts[2]} variants, ${counts[3]} users, ` +
      `${counts[4]} orders, ${counts[5]} payments, ${counts[6]} discount codes`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
