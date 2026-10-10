import { z } from "zod";
import { SIZES } from "@/lib/types";

// Shared by the admin product form (react-hook-form) and POST/PUT /api/admin/products.

/** Must match next.config.ts `images.remotePatterns`, or the storefront cannot render the image. */
export const IMAGE_HOSTS = ["images.unsplash.com"];

/** Images uploaded through the admin are served by src/app/media/[file]/route.ts. */
export const MEDIA_PREFIX = "/media/";
export const MEDIA_FILE_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.webp$/;

const money = z.number({ error: "Enter an amount" }).nonnegative().max(100000);

export const productColorSchema = z.object({
  name: z.string().trim().min(1, "Name the colour").max(40),
  hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour"),
});

/** An uploaded image (/media/<uuid>.webp) or a URL on an allowed remote host. */
export function isAllowedImageUrl(u: string) {
  if (u.startsWith(MEDIA_PREFIX)) return MEDIA_FILE_RE.test(u.slice(MEDIA_PREFIX.length));
  try {
    const url = new URL(u);
    return url.protocol === "https:" && IMAGE_HOSTS.includes(url.hostname);
  } catch {
    return false;
  }
}

export const productImageSchema = z.object({
  url: z.string().trim().min(1).refine(isAllowedImageUrl, `Upload the image, or use a URL hosted on ${IMAGE_HOSTS.join(", ")}`),
  alt: z.string().trim().max(200).default(""),
});

export const productInputSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    slug: z
      .string()
      .trim()
      .min(1, "URL handle is required")
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and dashes"),
    description: z.string().trim().max(5000).default(""),
    composition: z.string().trim().max(300).optional(),
    details: z.array(z.string().trim().min(1).max(120)).max(20).default([]),
    price: money.positive("Price must be greater than 0"),
    compareAtPrice: money.nullable().default(null),
    status: z.enum(["active", "draft", "archived"]),
    categoryId: z.string().min(1, "Choose a category"),
    featured: z.boolean().default(false),
    newArrival: z.boolean().default(false),
    bestSeller: z.boolean().default(false),
    seoTitle: z.string().trim().max(120).optional(),
    seoDescription: z.string().trim().max(300).optional(),
    colors: z.array(productColorSchema).min(1, "Add at least one colour"),
    /** stock[colorName][size] — sizes may be omitted (treated as 0). */
    stock: z.record(
      z.string(),
      z.partialRecord(z.enum(SIZES as [string, ...string[]]), z.number({ error: "Enter a number" }).int().min(0, "Stock can't be negative").max(100000)),
    ),
    images: z.array(productImageSchema).max(20).default([]),
  })
  .refine((v) => v.compareAtPrice == null || v.compareAtPrice > v.price, {
    message: "Compare-at price must be higher than the price",
    path: ["compareAtPrice"],
  })
  .refine((v) => new Set(v.colors.map((c) => c.name.toLowerCase())).size === v.colors.length, {
    message: "Colour names must be unique",
    path: ["colors"],
  });

export type ProductInput = z.infer<typeof productInputSchema>;
export type ProductFormValues = z.input<typeof productInputSchema>;
