"use client";

import { useMemo } from "react";
import type { Product, ProductFilters, Size } from "@/lib/types";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

const SIZES: Size[] = ["XS", "S", "M", "L", "XL"];

export function FilterPanel({
  products,
  filters,
  priceCeiling,
  showCategories,
  onToggle,
  onChange,
}: {
  products: Product[];
  filters: ProductFilters;
  priceCeiling: number;
  showCategories?: boolean;
  onToggle: (key: "categories" | "sizes" | "colors", value: string) => void;
  onChange: (f: ProductFilters) => void;
}) {
  const categories = useMemo(() => [...new Set(products.map((p) => p.category))], [products]);
  const colors = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => p.colors.forEach((c) => map.set(c.name, c.hex)));
    return [...map.entries()];
  }, [products]);
  const maxPrice = filters.maxPrice ?? priceCeiling;

  const triggerClass = "nav-label py-5 font-semibold hover:no-underline";

  return (
    <Accordion type="multiple" defaultValue={["category", "size", "color", "price"]}>
      {showCategories && (
        <AccordionItem value="category">
          <AccordionTrigger className={triggerClass}>Category</AccordionTrigger>
          <AccordionContent>
            <ul className="space-y-3">
              {categories.map((c) => (
                <li key={c} className="flex items-center gap-3">
                  <Checkbox
                    id={`cat-${c}`}
                    checked={filters.categories?.includes(c) ?? false}
                    onCheckedChange={() => onToggle("categories", c)}
                    className="rounded-none"
                  />
                  <label htmlFor={`cat-${c}`} className="text-[13px]">
                    {products.find((p) => p.category === c)?.categoryName ?? c}
                  </label>
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>
      )}

      <AccordionItem value="size">
        <AccordionTrigger className={triggerClass}>Size</AccordionTrigger>
        <AccordionContent>
          <div className="grid grid-cols-5 gap-2">
            {SIZES.map((s) => {
              const active = filters.sizes?.includes(s);
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onToggle("sizes", s)}
                  className={cn(
                    "h-10 border text-[12px] transition-colors",
                    active ? "border-ink bg-ink text-white" : "border-stone hover:border-ink",
                  )}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="color">
        <AccordionTrigger className={triggerClass}>Colour</AccordionTrigger>
        <AccordionContent>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-3">
            {colors.map(([name, hex]) => {
              const active = filters.colors?.includes(name);
              return (
                <li key={name}>
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => onToggle("colors", name)}
                    className="flex items-center gap-3 text-[13px]"
                  >
                    <span
                      className={cn(
                        "size-4 rounded-full ring-1 ring-black/15 ring-offset-2 transition-shadow",
                        active && "ring-ink",
                      )}
                      style={{ background: hex }}
                    />
                    <span className={cn(active && "underline underline-offset-4")}>{name}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="price">
        <AccordionTrigger className={triggerClass}>Price</AccordionTrigger>
        <AccordionContent className="px-1">
          <Slider
            min={0}
            max={priceCeiling}
            step={10}
            value={[maxPrice]}
            onValueChange={([v]) => onChange({ ...filters, maxPrice: v })}
            aria-label="Maximum price"
            className="mt-2"
          />
          <div className="mt-4 flex justify-between text-[12px] text-subtle">
            <span>€0</span>
            <span>Up to €{maxPrice}</span>
          </div>
        </AccordionContent>
      </AccordionItem>

      <AccordionItem value="availability">
        <AccordionTrigger className={triggerClass}>Availability</AccordionTrigger>
        <AccordionContent>
          <div className="flex items-center gap-3">
            <Checkbox
              id="in-stock"
              checked={!!filters.inStockOnly}
              onCheckedChange={(v) => onChange({ ...filters, inStockOnly: v === true })}
              className="rounded-none"
            />
            <label htmlFor="in-stock" className="text-[13px]">
              In stock only
            </label>
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
