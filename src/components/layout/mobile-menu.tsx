"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useUI } from "@/store/ui";
import { cn } from "@/lib/utils";
import { mainNav, secondaryNav } from "./nav";

export function MobileMenu() {
  const open = useUI((s) => s.menuOpen);
  const setOpen = useUI((s) => s.setMenuOpen);
  const close = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="left" className="w-full gap-0 overflow-y-auto border-0 p-0 sm:max-w-sm">
        <div className="flex h-16 items-center border-b border-stone px-6">
          <SheetTitle className="font-display text-xl font-normal tracking-[0.18em]">DE LUX</SheetTitle>
          <SheetDescription className="sr-only">Site navigation</SheetDescription>
        </div>
        <nav aria-label="Mobile" className="px-6 py-6">
          <ul>
            {mainNav.map((item, i) => (
              <li
                key={item.href}
                className="animate-in fade-in slide-in-from-left-3 fill-mode-both"
                style={{ animationDelay: `${80 + i * 40}ms`, animationDuration: "500ms" }}
              >
                <Link
                  href={item.href}
                  onClick={close}
                  className={cn(
                    "flex items-center justify-between border-b border-stone py-4 font-display text-[26px] leading-none",
                    item.accent && "text-burgundy",
                  )}
                >
                  {item.label}
                  <ArrowRight className="size-4 text-subtle" strokeWidth={1.25} />
                </Link>
              </li>
            ))}
          </ul>
          <ul className="mt-10 space-y-4">
            {secondaryNav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={close} className="nav-label text-subtle hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="mt-auto bg-paper px-6 py-5 text-[12px] text-subtle">Free shipping on orders over €150</p>
      </SheetContent>
    </Sheet>
  );
}
