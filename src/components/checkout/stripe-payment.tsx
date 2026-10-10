"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loadStripe, type Appearance, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Lock } from "lucide-react";
import { formatPrice } from "@/lib/format";

// One Stripe.js instance per publishable key (the key arrives at runtime with the checkout session).
const stripePromises = new Map<string, Promise<Stripe | null>>();
const getStripeJs = (key: string) => {
  if (!stripePromises.has(key)) stripePromises.set(key, loadStripe(key));
  return stripePromises.get(key)!;
};

/** Payment Element styled to the DE LUX design tokens (square corners, ink, Manrope). */
const appearance: Appearance = {
  theme: "flat",
  variables: {
    colorPrimary: "#111111",
    colorText: "#111111",
    colorTextSecondary: "#6b6862",
    colorDanger: "#a3121d",
    colorBackground: "#ffffff",
    fontFamily: "Manrope, ui-sans-serif, system-ui, sans-serif",
    fontSizeBase: "14px",
    borderRadius: "0px",
    spacingUnit: "4px",
  },
  rules: {
    ".Input": { border: "1px solid #e8e6e1", boxShadow: "none", padding: "12px" },
    ".Input:focus": { border: "1px solid #111111", boxShadow: "none" },
    ".Input--invalid": { border: "1px solid #a3121d" },
    ".Label": { fontSize: "10px", fontWeight: "600", letterSpacing: "0.22em", textTransform: "uppercase", color: "#6b6862" },
    ".Tab": { border: "1px solid #e8e6e1", boxShadow: "none" },
    ".Tab--selected": { border: "1px solid #111111", boxShadow: "none" },
  },
};

/** Billing details already collected by the checkout form, sent to Stripe instead of asking again. */
export type BillingDetails = {
  name: string;
  email: string;
  phone: string;
  address: { line1: string; line2: string; city: string; postal_code: string; country: string; state: string };
};

export type PaymentSession = {
  orderNumber: string;
  paymentIntentId: string;
  clientSecret: string;
  publishableKey: string;
  total: number;
};

const confirmationUrl = (s: PaymentSession) =>
  `/order-confirmation?payment_intent=${encodeURIComponent(s.paymentIntentId)}&payment_intent_client_secret=${encodeURIComponent(s.clientSecret)}`;

function PayForm({ session, billing, disabled }: { session: PaymentSession; billing: BillingDetails; disabled?: boolean }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [ready, setReady] = useState(false);

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    setError(null);
    // Redirect-based methods (PayPal, iDEAL, 3-D Secure…) leave the site and come back to return_url;
    // instant methods resolve here and we navigate ourselves.
    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}${confirmationUrl(session)}`,
        // Required because the Payment Element hides these fields (see options below).
        payment_method_data: { billing_details: billing },
      },
      redirect: "if_required",
    });
    if (stripeError) {
      setError(
        stripeError.type === "card_error" || stripeError.type === "validation_error"
          ? (stripeError.message ?? "Your payment could not be processed.")
          : "Something went wrong with the payment. Please try again.",
      );
      setPaying(false);
      return;
    }
    if (paymentIntent) router.push(confirmationUrl(session));
  };

  return (
    <form onSubmit={pay} noValidate>
      <PaymentElement
        onReady={() => setReady(true)}
        options={{
          layout: "tabs",
          wallets: { link: "never" },
          // Name, email, phone and address come from the checkout form — don't ask twice.
          fields: { billingDetails: { name: "never", email: "never", phone: "never", address: "never" } },
        }}
      />
      {error && (
        <p role="alert" className="mt-4 text-[13px] text-destructive">
          {error}
        </p>
      )}
      <button type="submit" disabled={!stripe || !ready || paying || disabled} className="btn btn-primary mt-6 h-14 w-full">
        {paying ? "Processing…" : `Pay ${formatPrice(session.total)}`}
      </button>
      <p className="mt-3 flex items-center justify-center gap-2 text-[11px] text-subtle">
        <Lock className="size-3" /> Payments are processed securely by Stripe. We never see your card details.
      </p>
    </form>
  );
}

/** Mounts Stripe Elements for a checkout session. Remount (key) when the session changes. */
export function StripePayment({ session, billing, disabled }: { session: PaymentSession; billing: BillingDetails; disabled?: boolean }) {
  return (
    <Elements
      stripe={getStripeJs(session.publishableKey)}
      options={{
        clientSecret: session.clientSecret,
        appearance,
        locale: "en",
        fonts: [{ cssSrc: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600&display=swap" }],
      }}
    >
      <PayForm session={session} billing={billing} disabled={disabled} />
    </Elements>
  );
}
