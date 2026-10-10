import type { Metadata } from "next";
import Link from "next/link";
import { Download, Plus, Upload } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";
import { ProductsTable } from "@/components/admin/products-table";
import { listAdminCategories, listAdminProducts } from "@/server/admin/products";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProductsPage() {
  const [products, categories] = await Promise.all([listAdminProducts(), listAdminCategories()]);
  return (
    <div className="space-y-8">
      <AdminPageHeader
        eyebrow="Catalogue"
        title="Products"
        description="Manage the collection, pricing, variants and inventory."
        actions={
          <>
            <button type="button" className="btn btn-outline h-10 px-4">
              <Upload className="size-3.5" /> Import
            </button>
            <button type="button" className="btn btn-outline h-10 px-4">
              <Download className="size-3.5" /> Export
            </button>
            <Link href="/admin/products/new" className="btn btn-primary h-10 px-5">
              <Plus className="size-3.5" /> New product
            </Link>
          </>
        }
      />
      <ProductsTable products={products} categories={categories} />
    </div>
  );
}
