import type { Metadata } from "next";
import Link from "next/link";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { getCurrentUser } from "@/server/auth";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const user = await getCurrentUser();

  // Checkout requires an account (orders belong to a customer). The bag is kept in the browser meanwhile.
  if (!user) {
    return (
      <div className="container-edit flex min-h-[60vh] flex-col items-center justify-center py-24 text-center">
        <p className="eyebrow text-burgundy">Checkout</p>
        <h1 className="display mt-4 text-[40px] sm:text-[56px]">Sign in to check out</h1>
        <p className="mt-4 max-w-md text-[14px] text-subtle">
          Use your account to place the order and follow it afterwards. Your bag is saved — you&rsquo;ll come straight back here.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <Link href="/account?next=/checkout" className="btn btn-primary">
            Sign in or create account
          </Link>
          <Link href="/cart" className="btn btn-outline">
            Back to bag
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-edit">
      <CheckoutForm account={{ email: user.email, name: user.name }} />
    </div>
  );
}
