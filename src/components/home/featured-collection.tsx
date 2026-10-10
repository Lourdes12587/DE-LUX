import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/types";
import { ProductCard } from "@/components/product/product-card";
import { Reveal } from "@/components/reveal";
import { editorialImages } from "@/lib/data/products";

export function FeaturedCollection({ products }: { products: Product[] }) {
  return (
    <section aria-labelledby="featured-title" className="grid lg:grid-cols-12">
      {/* Typographic poster */}
      <div className="relative flex min-h-[560px] items-center justify-center overflow-hidden bg-burgundy lg:col-span-7 lg:min-h-[820px]">
        <p
          aria-hidden
          className="absolute inset-0 flex flex-col justify-center font-display text-[30vw] leading-[0.78] tracking-[-0.03em] text-ink/85 lg:text-[19vw]"
        >
          <span className="-ml-[0.08em]">TAIL</span>
          <span className="self-end -mr-[0.05em]">ORED</span>
        </p>
        <div className="relative aspect-[3/4] w-[56%] max-w-[380px] overflow-hidden rounded-[50%] bg-paper">
          <Image
            src={editorialImages.suit}
            alt="Model in the Night Tailored Blazer"
            fill
            sizes="(min-width: 1024px) 30vw, 60vw"
            className="object-cover"
          />
        </div>
        <div className="absolute bottom-6 left-6 text-white sm:bottom-10 sm:left-10">
          <p className="eyebrow text-white/70">New collection</p>
          <p className="mt-2 font-display text-[20px] leading-tight">
            Golden Hour
            <br />
            Paris
          </p>
        </div>
        <p className="eyebrow absolute top-6 right-6 text-white/70 sm:top-10 sm:right-10">N°02 — The Tailoring Edit</p>
      </div>

      <div className="flex flex-col justify-between gap-12 px-4 py-16 sm:px-8 lg:col-span-5 lg:px-12 lg:py-20">
        <Reveal>
          <p className="eyebrow text-burgundy">Featured collection</p>
          <h2 id="featured-title" className="display mt-5 text-[44px] sm:text-[56px]">
            The art of <em>tailoring</em>
          </h2>
          <p className="mt-6 max-w-sm text-[14px] text-subtle">
            Sharp shoulders, fluid lines. Blazers and coats cut to be worn from the boardroom to the last train home.
          </p>
          <Link href="/collections/jackets" className="link-underline mt-8">
            Shop the edit
          </Link>
        </Reveal>
        <ul className="grid grid-cols-2 gap-x-4 gap-y-10">
          {products.slice(0, 2).map((p, i) => (
            <Reveal as="li" key={p.id} delay={i * 120}>
              <ProductCard product={p} sizes="(min-width: 1024px) 18vw, 50vw" />
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
