import type { Metadata } from "next";
import { ProductForm } from "@/components/admin/product-form";
import { listAdminCategories } from "@/server/admin/products";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  return <ProductForm categories={await listAdminCategories()} />;
}
