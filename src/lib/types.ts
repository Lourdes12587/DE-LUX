export type Size = "XS" | "S" | "M" | "L" | "XL";

export const SIZES: Size[] = ["XS", "S", "M", "L", "XL"];

export type ProductColor = {
  name: string;
  hex: string;
};

export type ProductImage = {
  src: string;
  alt: string;
};

/** One SKU: colour × size. `stock` is what can be sold now (physical stock − active reservations). */
export type ProductVariant = {
  id: string;
  sku: string;
  color: string;
  size: Size;
  stock: number;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: string; // Category slug
  categoryName: string;
  price: number;
  compareAtPrice?: number;
  description: string;
  details: string[];
  composition: string;
  images: ProductImage[];
  colors: ProductColor[];
  sizes: Size[];
  /** Units available per size, summed over all colours. 0 = sold out. */
  stock: Partial<Record<Size, number>>;
  variants: ProductVariant[];
  /** Not stored in the database yet (no reviews table) — only present in mock data. */
  rating?: number;
  reviewCount?: number;
  featured?: boolean;
  newArrival?: boolean;
  bestSeller?: boolean;
};

export type Category = {
  slug: string;
  name: string;
  title: string;
  description: string;
  image: string;
  /** Virtual collections are computed from product flags instead of the category field. */
  virtual?: "new" | "sale";
};

export type SortOption = "featured" | "newest" | "price-asc" | "price-desc";

export type ProductFilters = {
  categories?: string[];
  sizes?: Size[];
  colors?: string[];
  maxPrice?: number;
  inStockOnly?: boolean;
};

/** Stock of one colour/size, or 0 if that combination does not exist. */
export function variantStock(product: Product, color: string, size: Size) {
  return product.variants.find((v) => v.color === color && v.size === size)?.stock ?? 0;
}
