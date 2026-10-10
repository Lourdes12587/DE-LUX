import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import { getAdminProduct, listAdminCategories } from "@/server/admin/products";
import { ApiError } from "@/server/http";

type Props = { params: Promise<{ id: string }> };

async function load(id: string) {
  try {
    return await getAdminProduct(id);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await load((await params).id);
  return { title: `Edit ${product.name}` };
}

export default async function EditProductPage({ params }: Props) {
  const [product, categories] = await Promise.all([load((await params).id), listAdminCategories()]);
  return <ProductForm key={product.id} product={product} categories={categories} />;
}
