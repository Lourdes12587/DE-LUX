import Image from "next/image";
import Link from "next/link";
import type { Category } from "@/lib/types";
import { Reveal } from "@/components/reveal";
import { SectionHeading } from "@/components/section-heading";
import { cn } from "@/lib/utils";

// Asymmetric editorial mosaic: one tall feature + a staggered set.
const LAYOUT = [
  { cell: "col-span-2 lg:col-span-5 lg:row-span-2", tile: "aspect-[4/5] lg:aspect-auto" },
  { cell: "lg:col-span-4", tile: "aspect-[4/5]" },
  { cell: "lg:col-span-3", tile: "aspect-[4/5] lg:aspect-auto" },
  { cell: "lg:col-span-3", tile: "aspect-[4/5] lg:aspect-auto" },
  { cell: "lg:col-span-4", tile: "aspect-[4/5]" },
];

export function ShopByCategory({ categories }: { categories: Category[] }) {
  const items = ["coats", "jackets", "shirts", "trousers", "t-shirts"]
    .map((s) => categories.find((c) => c.slug === s)!)
    .filter(Boolean);

  return (
    <section aria-labelledby="categories-title" className="container-edit py-20 md:py-32">
      <SectionHeading id="categories-title" eyebrow="The wardrobe" title={<>Shop by <em>category</em></>} />
      <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-12 lg:gap-8">
        {items.map((c, i) => (
          <Reveal as="li" key={c.slug} delay={i * 80} className={LAYOUT[i].cell}>
            <Link href={`/collections/${c.slug}`} className={cn("group relative block h-full overflow-hidden bg-paper", LAYOUT[i].tile)}>
              <Image
                src={c.image}
                alt=""
                fill
                sizes={i === 0 ? "(min-width: 1024px) 40vw, 100vw" : "(min-width: 1024px) 30vw, 50vw"}
                className="object-cover transition-transform duration-[1200ms] ease-editorial group-hover:scale-[1.04]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between p-4 text-white sm:p-6">
                <span className={cn("font-display leading-none", i === 0 ? "text-[40px] sm:text-[56px]" : "text-[22px] sm:text-[30px]")}>
                  {c.name}
                </span>
                <span className="eyebrow hidden translate-x-2 opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100 sm:block">
                  Shop →
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </ul>
    </section>
  );
}
