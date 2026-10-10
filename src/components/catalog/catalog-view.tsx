"use client";

import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { Product, ProductFilters, Size, SortOption } from "@/lib/types";
import { applyFilters, sortProducts } from "@/lib/catalog-utils";
import { ProductCard } from "@/components/product/product-card";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FilterPanel } from "./filter-panel";

const SORTS: { value: SortOption; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "newest", label: "Newest" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
];

export function CatalogView({ products, showCategoryFilter }: { products: Product[]; showCategoryFilter?: boolean }) {
  const priceCeiling = useMemo(() => Math.ceil(Math.max(...products.map((p) => p.price), 0) / 10) * 10, [products]);
  const [filters, setFilters] = useState<ProductFilters>({});
  const [sort, setSort] = useState<SortOption>("featured");
  const [open, setOpen] = useState(false);
  const [dense, setDense] = useState(true);

  const categoryLabel = (slug: string) => products.find((p) => p.category === slug)?.categoryName ?? slug;

  const visible = useMemo(() => sortProducts(applyFilters(products, filters), sort), [products, filters, sort]);

  const chips = [
    ...(filters.categories ?? []).map((v) => ({ key: `c-${v}`, label: categoryLabel(v), clear: () => toggle("categories", v) })),
    ...(filters.sizes ?? []).map((v) => ({ key: `s-${v}`, label: `Size ${v}`, clear: () => toggle("sizes", v) })),
    ...(filters.colors ?? []).map((v) => ({ key: `co-${v}`, label: v, clear: () => toggle("colors", v) })),
    ...(filters.maxPrice != null && filters.maxPrice < priceCeiling
      ? [{ key: "p", label: `Up to €${filters.maxPrice}`, clear: () => setFilters((f) => ({ ...f, maxPrice: undefined })) }]
      : []),
    ...(filters.inStockOnly ? [{ key: "st", label: "In stock", clear: () => setFilters((f) => ({ ...f, inStockOnly: false })) }] : []),
  ];

  function toggle<K extends "categories" | "sizes" | "colors">(key: K, value: string) {
    setFilters((f) => {
      const current = (f[key] ?? []) as string[];
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
      return { ...f, [key]: next as Size[] & string[] };
    });
  }

  return (
    <>
      <div className="sticky top-14 z-30 -mx-4 border-y border-stone bg-white/95 px-4 backdrop-blur-sm sm:-mx-8 sm:px-8 lg:top-[108px] lg:-mx-12 lg:px-12">
        <div className="flex h-12 items-center justify-between gap-4">
          <button type="button" onClick={() => setOpen(true)} className="nav-label flex items-center gap-2">
            <SlidersHorizontal className="size-4" strokeWidth={1.25} />
            <span className="lg:hidden">Filter + Sort</span>
            <span className="hidden lg:inline">Filter{chips.length > 0 && ` (${chips.length})`}</span>
          </button>

          <p className="nav-label text-subtle" aria-live="polite">
            {visible.length} {visible.length === 1 ? "product" : "products"}
          </p>

          <div className="hidden items-center gap-6 lg:flex">
            <div className="flex items-center gap-2" role="group" aria-label="Grid density">
              {[true, false].map((d) => (
                <button
                  key={String(d)}
                  type="button"
                  onClick={() => setDense(d)}
                  aria-pressed={dense === d}
                  aria-label={d ? "Four columns" : "Two columns"}
                  className={cn("flex gap-0.5 p-1", dense === d ? "opacity-100" : "opacity-30 hover:opacity-70")}
                >
                  {Array.from({ length: d ? 4 : 2 }).map((_, i) => (
                    <span key={i} className="block h-3 w-1 bg-ink" />
                  ))}
                </button>
              ))}
            </div>
            <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
              <SelectTrigger aria-label="Sort products" className="nav-label h-8 gap-2 border-0 px-0 shadow-none focus-visible:ring-0">
                <span className="text-subtle">Sort:</span>
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="end" className="rounded-none">
                {SORTS.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-[12px]">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {chips.length > 0 && (
        <ul className="mt-5 flex flex-wrap gap-2" aria-label="Active filters">
          {chips.map((c) => (
            <li key={c.key}>
              <button
                type="button"
                onClick={c.clear}
                className="flex items-center gap-2 border border-stone px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] hover:border-ink"
              >
                {c.label} <X className="size-3" aria-label="Remove filter" />
              </button>
            </li>
          ))}
          <li>
            <button type="button" onClick={() => setFilters({})} className="px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] underline underline-offset-4">
              Clear all
            </button>
          </li>
        </ul>
      )}

      {visible.length === 0 ? (
        <div className="py-32 text-center">
          <p className="display text-[36px]">Nothing matches — yet.</p>
          <p className="mt-4 text-[13px] text-subtle">Try removing a filter to see more pieces.</p>
          <button type="button" onClick={() => setFilters({})} className="btn btn-outline mt-8">
            Clear filters
          </button>
        </div>
      ) : (
        <ul
          className={cn(
            "mt-8 grid grid-cols-2 gap-x-3 gap-y-12 sm:gap-x-5 lg:gap-y-16",
            dense ? "lg:grid-cols-4" : "lg:grid-cols-2 lg:gap-x-8",
          )}
        >
          {visible.map((p, i) => (
            <li key={p.id}>
              <ProductCard product={p} priority={i < 4} sizes={dense ? "(min-width: 1024px) 25vw, 50vw" : "50vw"} />
            </li>
          ))}
        </ul>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-full gap-0 border-0 p-0 sm:max-w-[420px]">
          <div className="flex h-16 items-center border-b border-stone px-6">
            <SheetTitle className="nav-label font-semibold">Filter &amp; Sort</SheetTitle>
            <SheetDescription className="sr-only">Refine the products shown</SheetDescription>
          </div>
          <div className="flex-1 overflow-y-auto px-6">
            <fieldset className="border-b border-stone py-6 lg:hidden">
              <legend className="nav-label float-left mb-4 w-full font-semibold">Sort by</legend>
              <div className="clear-both flex flex-wrap gap-2">
                {SORTS.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    aria-pressed={sort === s.value}
                    onClick={() => setSort(s.value)}
                    className={cn(
                      "border px-3 py-2 text-[11px] uppercase tracking-[0.12em]",
                      sort === s.value ? "border-ink bg-ink text-white" : "border-stone",
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <FilterPanel
              products={products}
              filters={filters}
              priceCeiling={priceCeiling}
              showCategories={showCategoryFilter}
              onToggle={toggle}
              onChange={setFilters}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-stone px-6 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button type="button" onClick={() => setFilters({})} className="btn btn-outline px-2">
              Clear
            </button>
            <button type="button" onClick={() => setOpen(false)} className="btn btn-primary px-2">
              View {visible.length}
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
