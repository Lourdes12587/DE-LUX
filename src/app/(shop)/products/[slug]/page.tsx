import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, getProducts, getRelated } from "@/lib/catalog";
import { isInStock } from "@/lib/catalog-utils";
import { Breadcrumbs } from "@/components/catalog/collection-header";
import { ProductGallery } from "@/components/product/product-gallery";
import { ProductPurchase } from "@/components/product/product-purchase";
import { ProductGrid } from "@/components/product/product-grid";
import { SectionHeading } from "@/components/section-heading";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { SHIPPING_METHODS, FREE_SHIPPING_THRESHOLD } from "@/lib/pricing";
import { formatPrice } from "@/lib/format";

type Props = { params: Promise<{ slug: string }> };

// Statically rendered; admin edits call revalidatePath, and stock refreshes at least every minute.
export const revalidate = 60;

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/products/${product.slug}` },
    openGraph: { title: product.name, description: product.description, images: product.images.slice(0, 1).map((i) => i.src) },
  };
}

export default async function ProductPage({ params }: Props) {
  const product = await getProduct((await params).slug);
  if (!product) notFound();
  const related = await getRelated(product, 4);
  const category = product.categoryName;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      description: product.description,
      image: product.images.map((i) => i.src),
      sku: product.id,
      brand: { "@type": "Brand", name: "DE LUX" },
      ...(product.rating != null && {
        aggregateRating: { "@type": "AggregateRating", ratingValue: product.rating, reviewCount: product.reviewCount },
      }),
      offers: {
        "@type": "Offer",
        priceCurrency: "EUR",
        price: product.price,
        availability: isInStock(product) ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
        url: `https://delux-studio.com/products/${product.slug}`,
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://delux-studio.com/" },
        { "@type": "ListItem", position: 2, name: category, item: `https://delux-studio.com/collections/${product.category}` },
        { "@type": "ListItem", position: 3, name: product.name },
      ],
    },
  ];

  const trigger = "nav-label py-5 font-semibold hover:no-underline";

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="container-edit pt-6 pb-20 md:pt-10">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: category, href: `/collections/${product.category}` },
            { label: product.name },
          ]}
        />
        <div className="mt-6 grid gap-10 md:mt-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-7">
            <ProductGallery images={product.images} name={product.name} />
          </div>
          <div className="lg:col-span-5 xl:col-span-4 xl:col-start-9">
            <div className="lg:sticky lg:top-[140px]">
              <ProductPurchase product={product} />
              <Accordion type="single" collapsible className="mt-8 border-t border-stone">
                <AccordionItem value="details">
                  <AccordionTrigger className={trigger}>Product details</AccordionTrigger>
                  <AccordionContent>
                    <ul className="list-inside list-disc space-y-1 text-[13px] text-subtle marker:text-stone">
                      {product.details.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                    <p className="mt-4 text-[13px]">
                      <span className="text-subtle">Composition:</span> {product.composition}
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="shipping">
                  <AccordionTrigger className={trigger}>Shipping</AccordionTrigger>
                  <AccordionContent className="space-y-2 text-[13px] text-subtle">
                    {SHIPPING_METHODS.map((m) => (
                      <p key={m.id} className="flex justify-between">
                        <span>
                          {m.name} · {m.eta}
                        </span>
                        <span className="text-ink">{formatPrice(m.price)}</span>
                      </p>
                    ))}
                    <p className="flex justify-between">
                      <span>Standard over {formatPrice(FREE_SHIPPING_THRESHOLD)}</span>
                      <span className="text-ink">Free</span>
                    </p>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="returns">
                  <AccordionTrigger className={trigger}>Returns &amp; exchanges</AccordionTrigger>
                  <AccordionContent className="text-[13px] text-subtle">
                    Free returns within 30 days of delivery. Items must be unworn with original tags attached.
                    Exchanges for a different size are processed as soon as we receive your return.
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </div>
      </div>

      <section aria-labelledby="related-title" className="container-edit border-t border-stone py-20 md:py-28">
        <SectionHeading
          id="related-title"
          title={
            <>
              Complete the <em>look</em>
            </>
          }
          href={`/collections/${product.category}`}
          linkLabel={`More ${category}`}
        />
        <ProductGrid products={related} />
      </section>
    </>
  );
}
