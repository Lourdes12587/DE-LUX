import { Hero } from "@/components/home/hero";
import { ProductRail } from "@/components/home/product-rail";
import { EditorialSplit } from "@/components/home/editorial-split";
import { FeaturedCollection } from "@/components/home/featured-collection";
import { ShopByCategory } from "@/components/home/shop-by-category";
import { PromoBanner } from "@/components/home/promo-banner";
import { Newsletter } from "@/components/layout/newsletter";
import { getBestSellers, getCategories, getFeatured, getNewArrivals } from "@/lib/catalog";

// Catalogue pages are static and refreshed every minute (admin edits also revalidate them).
export const revalidate = 60;

export default async function HomePage() {
  const [newArrivals, featured, bestSellers, categories] = await Promise.all([
    getNewArrivals(4),
    getFeatured(6),
    getBestSellers(4),
    getCategories(),
  ]);

  return (
    <>
      <Hero />
      <ProductRail
        id="new-arrivals"
        title={
          <>
            Our New <em>Arrivals</em>
          </>
        }
        subtitle="Discover the latest pieces from the new collection."
        href="/collections/new-in"
        products={newArrivals}
      />
      <EditorialSplit />
      <FeaturedCollection products={featured.filter((p) => p.category === "jackets")} />
      <ShopByCategory categories={categories} />
      <PromoBanner />
      <ProductRail
        id="best-sellers"
        eyebrow="Most wanted"
        title="Best Sellers"
        href="/shop"
        products={bestSellers}
      />
      <Newsletter />
    </>
  );
}
