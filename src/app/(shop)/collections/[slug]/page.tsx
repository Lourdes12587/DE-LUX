import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories, getCategory, getProducts } from "@/lib/catalog";
import { CatalogView } from "@/components/catalog/catalog-view";
import { CollectionHeader } from "@/components/catalog/collection-header";

type Props = { params: Promise<{ slug: string }> };

export const revalidate = 60;

export async function generateStaticParams() {
  return (await getCategories()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const category = await getCategory((await params).slug);
  if (!category) return {};
  return {
    title: category.title,
    description: category.description,
    alternates: { canonical: `/collections/${category.slug}` },
    openGraph: { title: category.title, description: category.description, images: [category.image] },
  };
}

export default async function CollectionPage({ params }: Props) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();
  const products = await getProducts({ collection: slug });

  return (
    <div className="container-edit pb-24">
      <CollectionHeader
        title={category.title}
        description={category.description}
        image={category.image}
        breadcrumb={category.name}
      />
      <CatalogView products={products} showCategoryFilter={!!category.virtual} />
    </div>
  );
}
