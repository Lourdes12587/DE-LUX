import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product/product-card";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";

export function ProductRail({
  id,
  eyebrow,
  title,
  subtitle,
  href,
  products,
}: {
  id: string;
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: string;
  href: string;
  products: Product[];
}) {
  return (
    <section aria-labelledby={id} className="container-edit py-20 md:py-32">
      <SectionHeading id={id} eyebrow={eyebrow} title={title} subtitle={subtitle} href={href} />
      {/* Horizontal swipe on mobile, 4-up grid on desktop */}
      <ul className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:-mx-8 sm:px-8 lg:mx-0 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:px-0">
        {products.map((p, i) => (
          <Reveal as="li" key={p.id} delay={i * 90} className="w-[68vw] shrink-0 snap-start sm:w-[40vw] lg:w-auto">
            <ProductCard product={p} sizes="(min-width: 1024px) 25vw, 70vw" />
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
