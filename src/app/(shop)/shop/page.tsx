import type { Metadata } from "next";
import { getProducts } from "@/lib/catalog";
import { editorialImages } from "@/lib/data/products";
import { CatalogView } from "@/components/catalog/catalog-view";
import { CollectionHeader } from "@/components/catalog/collection-header";

export const metadata: Metadata = {
  title: "Shop All",
  description: "The complete De Lux wardrobe: coats, trench, jackets, shirts, tees, trousers and dresses.",
};

export const revalidate = 60;

export default async function ShopPage() {
  const products = await getProducts();
  return (
    <div className="container-edit pb-24">
      <CollectionHeader
        title="The Wardrobe"
        description="Every piece of the collection, from statement outerwear to everyday essentials."
        image={editorialImages.rack}
        breadcrumb="Shop all"
      />
      <CatalogView products={products} showCategoryFilter />
    </div>
  );
}
