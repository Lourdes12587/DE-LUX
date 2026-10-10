import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { AuthForms } from "@/components/account/auth-forms";
import { editorialImages } from "@/lib/data/products";
import { getCurrentUser } from "@/server/auth";
import { safeNext } from "@/lib/safe-next";

export const metadata: Metadata = { title: "My Account", robots: { index: false } };
export const dynamic = "force-dynamic";

const INTRO: Record<string, string> = {
  "/checkout": "Sign in or create an account to complete your purchase.",
  "/admin": "Sign in with your team account to open the admin.",
};

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next);
  if (await getCurrentUser()) redirect(next);

  return (
    <div className="grid min-h-[80vh] lg:grid-cols-2">
      <div className="relative hidden lg:block">
        <Image src={editorialImages.suit} alt="" fill sizes="50vw" className="object-cover" priority />
        <div className="absolute inset-0 bg-ink/20" />
        <p className="absolute bottom-12 left-12 font-display text-[64px] leading-[0.95] text-white">
          Welcome
          <br />
          <em>back</em>
        </p>
      </div>
      <div className="flex items-center justify-center px-4 py-16 sm:px-8">
        <AuthForms next={next} intro={INTRO[next.split("?")[0]] ?? (next.startsWith("/admin") ? INTRO["/admin"] : undefined)} />
      </div>
    </div>
  );
}
