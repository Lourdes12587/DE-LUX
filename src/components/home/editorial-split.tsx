import Image from "next/image";
import Link from "next/link";
import { editorialImages } from "@/lib/data/products";
import { Reveal } from "@/components/reveal";

export function EditorialSplit() {
  return (
    <section aria-labelledby="who-we-are" className="bg-paper">
      <div className="container-edit grid items-center gap-12 py-20 md:py-32 lg:grid-cols-12 lg:gap-8">
        <Reveal className="relative lg:col-span-5">
          <div className="relative aspect-[4/5] overflow-hidden">
            <Image
              src={editorialImages.milano}
              alt="Model in a powder blue wool coat in front of a cathedral"
              fill
              sizes="(min-width: 1024px) 40vw, 100vw"
              className="object-cover transition-transform duration-[1200ms] ease-editorial hover:scale-[1.03]"
            />
          </div>
          <p className="eyebrow mt-4 text-subtle">Milano Wool Coat — Sky</p>
        </Reveal>

        <div className="text-center lg:col-span-6 lg:col-start-7">
          <Reveal>
            <p id="who-we-are" className="eyebrow">
              Who we are
            </p>
            <p className="mx-auto mt-8 max-w-xl font-display text-[26px] leading-[1.3] sm:text-[34px]">
              Inspired by Parisian elegance and modern simplicity, we create pieces that move with you,{" "}
              <em className="text-burgundy">effortlessly complementing your life and style.</em>
            </p>
          </Reveal>
          <Reveal delay={150} className="relative mx-auto mt-14 w-[62%] max-w-[300px]">
            <div className="relative aspect-[4/5] overflow-hidden">
              <Image
                src={editorialImages.suit}
                alt="Model in a black tailored suit on a Paris street"
                fill
                sizes="300px"
                className="object-cover"
              />
            </div>
            <p
              aria-hidden
              className="pointer-events-none absolute -bottom-10 left-1/2 w-[200%] -translate-x-1/2 -rotate-6 font-script text-[64px] leading-none text-burgundy sm:text-[84px]"
            >
              Looking for our stories
            </p>
          </Reveal>
          <Reveal delay={250} className="mt-20">
            <Link href="/about" className="link-underline">
              Read our story
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
