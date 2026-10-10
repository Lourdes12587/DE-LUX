"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Menu, Search } from "lucide-react";
import { useSession } from "@/store/session";
import type { StaffRole } from "./nav";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { AdminBrand, AdminNavLinks } from "./admin-sidebar";
import { Avatar } from "./ui";

export function AdminTopbar({ user }: { user: { name: string | null; email: string; role: StaffRole } }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const signOut = useSession((s) => s.signOut);
  const displayName = user.name ?? user.email;

  return (
    <header className="sticky top-0 z-30 border-b border-stone bg-white/90 backdrop-blur-sm">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-8">
        <button type="button" onClick={() => setOpen(true)} className="-ml-2 p-2 lg:hidden" aria-label="Open admin menu">
          <Menu className="size-5" strokeWidth={1.25} />
        </button>

        <form role="search" className="flex max-w-md flex-1 items-center gap-3" onSubmit={(e) => e.preventDefault()}>
          <Search className="size-4 shrink-0 text-subtle" strokeWidth={1.25} />
          <label htmlFor="admin-search" className="sr-only">
            Search orders, products, customers
          </label>
          <input
            id="admin-search"
            placeholder="Search orders, products, customers…"
            className="h-9 w-full bg-transparent text-[13px] outline-none placeholder:text-subtle/70 focus-visible:outline-none"
          />
          <kbd className="hidden rounded-sm border border-stone px-1.5 py-0.5 text-[10px] text-subtle sm:block">⌘K</kbd>
        </form>

        <div className="ml-auto flex items-center gap-5">
          <div className="flex items-center gap-3">
            <Avatar name={displayName} />
            <div className="hidden leading-tight sm:block">
              <p className="text-[12px] font-semibold">{displayName}</p>
              <p className="text-[11px] text-subtle">{user.role === "ADMIN" ? "Administrator" : "Editor"}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={async () => {
              await signOut();
              router.replace("/account");
              router.refresh();
            }}
            className="flex items-center gap-1.5 p-1 text-[12px] text-subtle hover:text-ink"
            aria-label="Sign out"
          >
            <LogOut className="size-4" strokeWidth={1.25} />
            <span className="hidden md:inline">Sign out</span>
          </button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[280px] gap-10 border-0 bg-ink px-4 py-7 text-white [&>button]:text-white">
          <SheetTitle className="sr-only">Admin navigation</SheetTitle>
          <SheetDescription className="sr-only">Navigate between admin sections</SheetDescription>
          <AdminBrand />
          <AdminNavLinks role={user.role} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
