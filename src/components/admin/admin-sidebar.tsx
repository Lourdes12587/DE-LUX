"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { adminNav, type StaffRole } from "./nav";

export function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

export function AdminNavLinks({ role, onNavigate }: { role: StaffRole; onNavigate?: () => void }) {
  const pathname = usePathname();
  const item = (l: (typeof adminNav)[number]) => {
    const active = isActive(pathname, l.href);
    return (
      <li key={l.href}>
        <Link
          href={l.href}
          onClick={onNavigate}
          aria-current={active ? "page" : undefined}
          className={cn(
            "group relative flex items-center gap-3 px-3 py-2.5 text-[13px] transition-colors",
            active ? "bg-white/[0.07] text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white",
          )}
        >
          <span
            aria-hidden
            className={cn("absolute inset-y-2 left-0 w-px bg-rose transition-opacity", active ? "opacity-100" : "opacity-0")}
          />
          <l.icon className="size-4" strokeWidth={1.25} />
          {l.label}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label="Admin" className="flex flex-1 flex-col">
      <p className="eyebrow px-3 text-white/35">Manage</p>
      <ul className="mt-3 space-y-0.5">{adminNav.filter((l) => role === "ADMIN" || !l.adminOnly).map(item)}</ul>
      <Link
        href="/"
        className="mt-auto flex items-center justify-between border-t border-white/10 px-3 pt-5 text-[12px] text-white/55 hover:text-white"
      >
        View storefront <ArrowUpRight className="size-3.5" strokeWidth={1.25} />
      </Link>
    </nav>
  );
}

export function AdminBrand() {
  return (
    <Link href="/admin" className="block px-3">
      <span className="block font-display text-[20px] leading-none tracking-[0.16em] text-white">DE LUX</span>
      <span className="mt-1.5 block text-[9px] font-semibold uppercase tracking-[0.4em] text-rose">Atelier · Admin</span>
    </Link>
  );
}

export function AdminSidebar({ role }: { role: StaffRole }) {
  return (
    <aside className="sticky top-0 hidden h-svh w-[248px] shrink-0 flex-col gap-10 bg-ink px-4 py-7 lg:flex">
      <AdminBrand />
      <AdminNavLinks role={role} />
    </aside>
  );
}
