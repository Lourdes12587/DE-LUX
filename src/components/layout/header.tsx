"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCart, selectItemCount } from "@/store/cart";
import { useWishlist } from "@/store/wishlist";
import { useHydrated, useUI } from "@/store/ui";
import { firstName, useSession } from "@/store/session";
import { Logo } from "./logo";
import { mainNav } from "./nav";

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const hydrated = useHydrated();
  const count = useCart(selectItemCount);
  const wishCount = useWishlist((s) => s.ids.length);
  const { setCartOpen, setSearchOpen, setMenuOpen } = useUI();
  const user = useSession((s) => s.user);
  const loadSession = useSession((s) => s.load);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const bag = hydrated ? count : 0;
  const wish = hydrated ? wishCount : 0;

  return (
    <header
      className={cn(
        "sticky top-0 z-40 bg-white/95 backdrop-blur-sm transition-[box-shadow] duration-500",
        scrolled && "shadow-[0_1px_0_var(--stone)]",
      )}
    >
      <div
        className={cn(
          "container-edit grid grid-cols-[1fr_auto_1fr] items-center transition-[height] duration-500 ease-editorial",
          scrolled ? "h-14 lg:h-16" : "h-16 lg:h-24",
        )}
      >
        {/* Left */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="-ml-2 p-2 lg:hidden"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="size-5" strokeWidth={1.25} />
          </button>
          <p className="nav-label hidden text-subtle lg:block">Free shipping on orders over €150</p>
        </div>

        <Logo compact={scrolled} />

        {/* Right */}
        <div className="flex items-center justify-end gap-1 lg:gap-7">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="nav-label flex items-center gap-2 p-2 lg:p-0"
            aria-label="Search"
          >
            <Search className="size-[18px] lg:size-4" strokeWidth={1.25} />
            <span className="hidden lg:inline">Search</span>
          </button>
          <Link href={user ? "/account/orders" : "/account"} className="nav-label hidden items-center gap-2 lg:flex">
            <User className="size-4" strokeWidth={1.25} />
            {user ? firstName(user) ?? "Account" : "Sign in"}
          </Link>
          <Link href="/wishlist" className="nav-label hidden items-center gap-2 lg:flex" aria-label={`Wishlist, ${wish} items`}>
            <Heart className="size-4" strokeWidth={1.25} />
            Wishlist{wish > 0 && <span className="text-burgundy">({wish})</span>}
          </Link>
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="nav-label relative -mr-2 flex items-center gap-2 p-2 lg:mr-0 lg:p-0"
            aria-label={`Shopping bag, ${bag} items`}
          >
            <ShoppingBag className="size-[18px] lg:size-4" strokeWidth={1.25} />
            <span className="hidden lg:inline">Bag ({bag})</span>
            {bag > 0 && (
              <span
                key={bag}
                className="animate-in zoom-in-50 absolute top-0.5 right-0 flex size-4 items-center justify-center rounded-full bg-burgundy text-[9px] font-semibold text-white duration-300 lg:hidden"
              >
                {bag}
              </span>
            )}
          </button>
        </div>
      </div>

      <nav aria-label="Main" className={cn("hidden border-b border-stone lg:block", scrolled && "border-transparent")}>
        <ul className="container-edit flex h-11 items-center justify-center gap-9">
          {mainNav.map((item) => {
            const active = pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "nav-label relative py-3 transition-colors hover:text-burgundy",
                    item.accent && "text-burgundy",
                    "after:absolute after:inset-x-0 after:-bottom-px after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-transform after:duration-500 hover:after:scale-x-100",
                    active && "after:scale-x-100",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
