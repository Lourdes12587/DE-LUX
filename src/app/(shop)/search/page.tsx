import type { Metadata } from "next";
import Link from "next/link";
import { searchProducts } from "@/lib/catalog";
import { CatalogView } from "@/components/catalog/catalog-view";
import { Breadcrumbs } from "@/components/catalog/collection-header";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const q = (await searchParams).q?.trim() ?? "";
  const results = await searchProducts(q);

  return (
    <div className="container-edit pb-24">
      <header className="pt-8 pb-10 md:pt-12 md:pb-14">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Search" }]} />
        <p className="eyebrow mt-8 text-subtle">Results for</p>
        <h1 className="display mt-3 text-[48px] sm:text-[72px]">
          <em>&ldquo;{q || "…"}&rdquo;</em>
        </h1>
      </header>
      {results.length > 0 ? (
        <CatalogView products={results} showCategoryFilter />
      ) : (
        <div className="border-t border-stone py-24 text-center">
          <p className="display text-[32px]">We couldn&rsquo;t find a match.</p>
          <p className="mt-4 text-[13px] text-subtle">Check the spelling or explore the new edition.</p>
          <Link href="/collections/new-in" className="btn btn-primary mt-8">
            Shop New In
          </Link>
        </div>
      )}
    </div>
  );
}
