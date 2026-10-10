"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useSession } from "@/store/session";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/account/orders", label: "My Orders" },
  { href: "/wishlist", label: "Wishlist" },
  { href: "/account/orders#personal", label: "Personal Information" },
  { href: "/account/orders#addresses", label: "Addresses" },
];

export function AccountShell({ title, name, children }: { title: string; name: string | null; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const signOut = useSession((s) => s.signOut);
  const [leaving, setLeaving] = useState(false);

  return (
    <div className="container-edit py-12 md:py-20">
      <p className="eyebrow text-burgundy">Hello{name ? `, ${name.split(" ")[0]}` : ""}</p>
      <h1 className="display mt-4 text-[48px] sm:text-[64px]">{title}</h1>
      <div className="mt-12 grid gap-10 lg:grid-cols-12">
        <nav aria-label="Account" className="lg:col-span-3">
          <ul className="flex gap-6 overflow-x-auto border-b border-stone pb-3 lg:flex-col lg:gap-4 lg:border-0">
            {LINKS.map((l) => {
              const active = pathname === l.href || (l.href === "/account/orders" && pathname.startsWith("/account/orders/"));
              return (
                <li key={l.label} className="shrink-0">
                  <Link href={l.href} aria-current={active ? "page" : undefined} className={cn("nav-label hover:text-ink", active ? "text-ink" : "text-subtle")}>
                    {l.label}
                  </Link>
                </li>
              );
            })}
            <li className="shrink-0 lg:mt-6">
              <button
                type="button"
                disabled={leaving}
                onClick={async () => {
                  setLeaving(true);
                  await signOut();
                  router.replace("/account");
                  router.refresh();
                }}
                className="nav-label text-subtle underline underline-offset-4 hover:text-ink disabled:opacity-50"
              >
                {leaving ? "Signing out…" : "Log out"}
              </button>
            </li>
          </ul>
        </nav>
        <div className="lg:col-span-9">{children}</div>
      </div>
    </div>
  );
}
