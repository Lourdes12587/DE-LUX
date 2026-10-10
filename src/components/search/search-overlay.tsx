"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/lib/types";
import { useUI } from "@/store/ui";

const TRENDING = ["Trench", "Blazer", "Shirts", "Wide-leg", "Leather", "Dresses"];

/** Live results from GET /api/products?q=, debounced. `deferred` is the term the results belong to. */
function useSearch(query: string) {
  const [state, setState] = useState<{ deferred: string; results: Product[] }>({ deferred: "", results: [] });
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setState({ deferred: "", results: [] });
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      api<{ products: Product[] }>(`/api/products?q=${encodeURIComponent(q)}&limit=6`, { signal: ctrl.signal })
        .then(({ products }) => setState({ deferred: q, results: products }))
        .catch(() => !ctrl.signal.aborted && setState({ deferred: q, results: [] }));
    }, 200);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [query]);
  return state;
}

export function SearchOverlay() {
  const open = useUI((s) => s.searchOpen);
  const setOpen = useUI((s) => s.setSearchOpen);
  const router = useRouter();
  const [query, setQuery] = useState("");
  const { deferred, results } = useSearch(query);
  const close = () => setOpen(false);

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQuery("");
      }}
    >
      <SheetContent side="top" showCloseButton={false} className="max-h-[100dvh] gap-0 overflow-y-auto border-0 p-0">
        <div className="container-edit py-6 md:py-10">
          <div className="flex items-center justify-between">
            <SheetTitle className="eyebrow font-semibold text-subtle">What are you looking for?</SheetTitle>
            <SheetDescription className="sr-only">Search the De Lux catalogue</SheetDescription>
            <SheetClose className="-mr-2 p-2" aria-label="Close search">
              <X className="size-5" strokeWidth={1.25} />
            </SheetClose>
          </div>

          <form
            role="search"
            className="mt-6 flex items-center gap-4 border-b border-ink pb-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!query.trim()) return;
              close();
              router.push(`/search?q=${encodeURIComponent(query.trim())}`);
            }}
          >
            <Search className="size-6 shrink-0" strokeWidth={1} />
            <label htmlFor="site-search" className="sr-only">
              Search products
            </label>
            <input
              id="site-search"
              autoFocus
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full bg-transparent font-display text-[34px] leading-none outline-none placeholder:text-stone focus-visible:outline-none md:text-[56px]"
            />
          </form>

          {!deferred.trim() ? (
            <div className="mt-8 pb-4">
              <p className="eyebrow text-subtle">Trending searches</p>
              <ul className="mt-4 flex flex-wrap gap-x-8 gap-y-3">
                {TRENDING.map((t) => (
                  <li key={t}>
                    <button type="button" onClick={() => setQuery(t)} className="font-display text-[22px] italic hover:text-burgundy">
                      {t}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : results.length === 0 ? (
            <p className="mt-8 pb-4 text-[14px] text-subtle">
              No results for &ldquo;{deferred}&rdquo;. Try another term.
            </p>
          ) : (
            <div className="mt-8 pb-4">
              <div className="flex items-baseline justify-between">
                <p className="eyebrow text-subtle" aria-live="polite">
                  {results.length} {results.length === 1 ? "result" : "results"}
                </p>
                <Link href={`/search?q=${encodeURIComponent(deferred)}`} onClick={close} className="link-underline">
                  View all
                </Link>
              </div>
              <ul className="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-6 sm:gap-5">
                {results.map((p) => (
                  <li key={p.id}>
                    <Link href={`/products/${p.slug}`} onClick={close} className="group block">
                      <div className="relative aspect-[4/5] overflow-hidden bg-paper">
                        {p.images[0] && (
                          <Image
                            src={p.images[0].src}
                            alt={p.images[0].alt}
                            fill
                            sizes="200px"
                            className="object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                          />
                        )}
                      </div>
                      <p className="mt-2 truncate text-[10px] font-semibold uppercase tracking-[0.12em]">{p.name}</p>
                      <p className="text-[11px] text-subtle">{formatPrice(p.price)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Link
            href="/shop"
            onClick={close}
            className="nav-label mt-4 inline-flex items-center gap-2 text-subtle hover:text-ink"
          >
            Browse all products <ArrowRight className="size-3" />
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}
