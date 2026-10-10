import Image from "next/image";
import Link from "next/link";
import { editorialImages } from "@/lib/data/products";

export function PromoBanner() {
  return (
    <section aria-labelledby="promo-title" className="grid bg-ink text-white md:grid-cols-2">
      <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[560px]">
        <Image
          src={editorialImages.polka}
          alt="Model in the Polka Dot Midi Dress walking through a field"
          fill
          sizes="(min-width: 768px) 50vw, 100vw"
          className="object-cover"
        />
      </div>
      <div className="flex flex-col justify-center px-6 py-16 sm:px-12 lg:px-20">
        <p className="eyebrow text-rose">Private Sale</p>
        <h2 id="promo-title" className="display mt-6 text-[52px] sm:text-[72px]">
          Up to <em className="text-rose">30%</em>
          <br />
          off
        </h2>
        <p className="mt-6 max-w-sm text-[14px] text-white/70">
          A considered selection of outerwear, knitwear and essentials — at a new price, for a limited time.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link href="/collections/sale" className="btn btn-light">
            Shop the sale
          </Link>
        </div>
      </div>
    </section>
  );
}
