import type { Product, ProductFilters, SortOption } from "@/lib/types";

// Pure helpers for filtering/sorting an already-loaded list. Safe to use in client components.

export function isInStock(p: Product) {
  return p.variants.some((v) => v.stock > 0);
}

export function applyFilters(list: Product[], f: ProductFilters) {
  return list.filter((p) => {
    if (f.categories?.length && !f.categories.includes(p.category)) return false;
    if (f.sizes?.length && !f.sizes.some((s) => (p.stock[s] ?? 0) > 0)) return false;
    if (f.colors?.length && !p.colors.some((c) => f.colors!.includes(c.name))) return false;
    if (f.maxPrice != null && p.price > f.maxPrice) return false;
    if (f.inStockOnly && !isInStock(p)) return false;
    return true;
  });
}

export function sortProducts(list: Product[], sort: SortOption) {
  const copy = [...list];
  switch (sort) {
    case "price-asc":
      return copy.sort((a, b) => a.price - b.price);
    case "price-desc":
      return copy.sort((a, b) => b.price - a.price);
    case "newest":
      return copy.sort((a, b) => Number(!!b.newArrival) - Number(!!a.newArrival));
    default:
      return copy.sort((a, b) => Number(!!b.featured) - Number(!!a.featured));
  }
}
