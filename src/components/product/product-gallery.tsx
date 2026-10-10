"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Expand, X } from "lucide-react";
import type { ProductImage } from "@/lib/types";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = scroller.current;
    if (el) setActive(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="lg:grid lg:grid-cols-[72px_1fr] lg:gap-5">
      {/* Thumbnails — desktop */}
      <ul className="hidden flex-col gap-3 lg:flex" aria-label="Product images">
        {images.map((img, i) => (
          <li key={img.src}>
            <button
              type="button"
              onClick={() => setActive(i)}
              aria-label={`Show image ${i + 1} of ${images.length}`}
              aria-current={active === i}
              className={cn(
                "relative block aspect-[4/5] w-full overflow-hidden bg-paper transition-opacity",
                active === i ? "opacity-100 ring-1 ring-ink ring-offset-2" : "opacity-50 hover:opacity-100",
              )}
            >
              <Image src={img.src} alt="" fill sizes="72px" className="object-cover" />
            </button>
          </li>
        ))}
      </ul>

      {/* Main image — desktop with hover zoom */}
      <div
        className="relative hidden aspect-[4/5] cursor-zoom-in overflow-hidden bg-paper lg:block"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
        onClick={() => setFullscreen(true)}
      >
        {images.map((img, i) => (
          <Image
            key={img.src}
            src={img.src}
            alt={img.alt}
            fill
            priority={i === 0}
            sizes="(min-width: 1024px) 55vw, 100vw"
            className={cn(
              "object-cover transition-[opacity,transform] duration-500 ease-editorial",
              active === i ? "opacity-100" : "opacity-0",
            )}
            style={
              active === i && zoom
                ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` }
                : undefined
            }
          />
        ))}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setFullscreen(true);
          }}
          className="absolute right-4 bottom-4 bg-white/90 p-2.5"
          aria-label="Open fullscreen"
        >
          <Expand className="size-4" strokeWidth={1.25} />
        </button>
      </div>

      {/* Swipe carousel — mobile/tablet */}
      <div className="relative -mx-4 sm:-mx-8 lg:hidden">
        <div
          ref={scroller}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
          aria-label="Product images, swipe to browse"
        >
          {images.map((img, i) => (
            <button
              key={img.src}
              type="button"
              onClick={() => setFullscreen(true)}
              className="relative aspect-[4/5] w-full shrink-0 snap-center bg-paper"
              aria-label={`Open image ${i + 1} fullscreen`}
            >
              <Image src={img.src} alt={img.alt} fill priority={i === 0} sizes="100vw" className="object-cover" />
            </button>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-4 flex justify-center gap-2" aria-hidden>
          {images.map((img, i) => (
            <span
              key={img.src}
              className={cn("h-px w-6 transition-colors", active === i ? "bg-ink" : "bg-ink/25")}
            />
          ))}
        </div>
      </div>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent
          showCloseButton={false}
          className="h-[100dvh] max-w-none translate-x-[-50%] translate-y-[-50%] border-0 bg-white p-0 sm:max-w-none"
        >
          <DialogTitle className="sr-only">{name} — gallery</DialogTitle>
          <DialogDescription className="sr-only">Scroll to view all images</DialogDescription>
          <DialogClose className="fixed top-4 right-4 z-10 bg-white/90 p-3" aria-label="Close gallery">
            <X className="size-5" strokeWidth={1.25} />
          </DialogClose>
          <div className="h-full overflow-y-auto">
            {images.map((img) => (
              <div key={img.src} className="relative mx-auto aspect-[4/5] w-full max-w-[1100px]">
                <Image src={img.src} alt={img.alt} fill sizes="100vw" quality={90} className="object-cover" />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
