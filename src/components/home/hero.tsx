import Image from "next/image";
import Link from "next/link";
import { editorialImages } from "@/lib/data/products";

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="grid lg:h-[calc(100svh-10rem)] lg:min-h-[640px] lg:grid-cols-12">
      {/* Campaign column — desktop only, echoes the magazine spread */}
      <div className="relative hidden flex-col bg-burgundy p-6 text-white lg:col-span-4 lg:flex xl:p-8">
        <div className="relative flex-1 overflow-hidden">
          <Image
            src={editorialImages.noir}
            alt="Model in a black ruffle coat against a red and white set"
            fill
            priority
            sizes="33vw"
            className="animate-reveal object-cover"
          />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-6">
          <div>
            <p className="eyebrow text-white/60">Campaign</p>
            <p className="mt-2 font-display text-[18px] leading-tight">
              Midnight
              <br />
              Rouge
            </p>
          </div>
          <div>
            <p className="eyebrow text-white/60">New collection</p>
            <p className="mt-2 font-display text-[18px] leading-tight">
              Autumn Edition
              <br />
              Paris
            </p>
          </div>
        </div>
      </div>

      {/* Main hero image */}
      <div className="relative h-[78svh] min-h-[520px] overflow-hidden bg-ink lg:col-span-8 lg:h-auto">
        <Image
          src={editorialImages.hero}
          alt="Model wearing the Burgundy Wrap Coat from the Autumn / Winter 2026 collection"
          fill
          priority
          sizes="(min-width: 1024px) 67vw, 100vw"
          className="animate-in fade-in zoom-in-[1.04] object-cover object-[50%_20%] duration-[1400ms]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-black/20" />

        <div className="absolute inset-x-0 bottom-0 p-6 text-white sm:p-10 xl:p-14">
          <p className="eyebrow animate-rise text-white/80" style={{ animationDelay: "200ms" }}>
            Autumn / Winter 2026
          </p>
          <h1
            id="hero-title"
            className="display animate-rise mt-4 text-[64px] sm:text-[96px] xl:text-[128px]"
            style={{ animationDelay: "350ms" }}
          >
            the new
            <br />
            <em className="pl-[0.6em]">edition</em>
          </h1>
          <div className="animate-rise mt-8 flex flex-wrap items-center gap-8" style={{ animationDelay: "550ms" }}>
            <Link href="/collections/new-in" className="link-underline text-white">
              Discover the collection
            </Link>
            <Link href="/collections/coats" className="link-underline text-white/70 hover:text-white">
              Shop coats
            </Link>
          </div>
        </div>
        <p className="absolute top-6 right-6 font-script text-[40px] leading-none text-white/90 sm:top-10 sm:right-10 sm:text-[56px]">
          De Lux
        </p>
      </div>
    </section>
  );
}
