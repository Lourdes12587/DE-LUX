import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Pencil } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductPurchase } from "@/components/product/product-purchase";
import { StatusBadge } from "@/components/admin/ui";
import { productStatus } from "@/components/admin/status";
import { getAdminProduct } from "@/server/admin/products";
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
  return { title: `Preview ${(await load((await params).id)).name}` };
}

/** Shows a product exactly as the storefront renders it — including drafts, which the public site hides. */
export default async function ProductPreviewPage({ params }: Props) {
  const product = await load((await params).id);
  const live = product.status === "active";
  const units = product.variants.reduce((s, v) => s + v.stock, 0);
  const warnings = [
    !live && `It is ${product.status === "draft" ? "a draft" : "archived"}, so it is not visible in the store.`,
    product.images.length === 0 && "It has no images.",
    units === 0 && "It has no stock: it will show as sold out.",
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <Link href={`/admin/products/${product.id}`} className="nav-label inline-flex items-center gap-2 text-subtle hover:text-ink">
            <ArrowLeft className="size-3.5" /> Back to edit
          </Link>
          <h1 className="display mt-4 text-[40px] sm:text-[48px]">
            Preview · <em>{product.name}</em>
          </h1>
          <div className="mt-3 flex items-center gap-3 text-[12px] text-subtle">
            <StatusBadge tone={productStatus[product.status].tone}>{productStatus[product.status].label}</StatusBadge>
            <span>{product.categoryName}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={`/admin/products/${product.id}`} className="btn btn-primary h-10 px-5">
            <Pencil className="size-3.5" /> Edit
          </Link>
          {live && (
            <Link href={`/products/${product.slug}`} target="_blank" className="btn btn-outline h-10 px-5">
              <ExternalLink className="size-3.5" /> View in store
            </Link>
          )}
        </div>
      </div>

      {warnings.length > 0 && (
        <ul role="status" className="space-y-1 border border-warning/30 bg-warning/[0.06] px-4 py-3 text-[13px]">
          {warnings.map((w) => (
            <li key={w}>· {w}</li>
          ))}
        </ul>
      )}

      <section aria-labelledby="preview-card" className="border border-stone bg-white p-6 sm:p-8">
        <h2 id="preview-card" className="nav-label font-semibold">
          In the catalogue
        </h2>
        <p className="mt-1 text-[12px] text-subtle">How the product card appears in collections, search and home rails.</p>
        {/* inert: a visual preview only — links and quick add are disabled. */}
        <div inert className="mt-6 w-full max-w-[300px]">
          <ProductCard product={product} sizes="300px" />
        </div>
      </section>

      <section aria-labelledby="preview-page" className="border border-stone bg-white p-6 sm:p-8">
        <h2 id="preview-page" className="nav-label font-semibold">
          Product page
        </h2>
        <p className="mt-1 text-[12px] text-subtle">The product detail page as shoppers see it. Colour and size selection work; buying is disabled.</p>
        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            {product.images.length > 0 ? (
              <ProductGallery images={product.images} name={product.name} />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center bg-paper text-[13px] text-subtle">No images yet</div>
            )}
          </div>
          <div className="lg:col-span-5">
            <ProductPurchase product={product} preview />
          </div>
        </div>
      </section>
    </div>
  );
}
