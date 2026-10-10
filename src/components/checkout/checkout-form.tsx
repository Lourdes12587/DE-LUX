"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm, type FieldError, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PromoCodeForm, TotalsTable } from "@/components/cart/order-summary";
import { formatPrice } from "@/lib/format";
import { api } from "@/lib/api";
import { applyServerErrors } from "@/lib/form-errors";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_METHODS } from "@/lib/pricing";
import { checkoutFormSchema, type CheckoutFormValues } from "@/lib/schemas/checkout";
import { useCartQuote } from "@/hooks/use-cart-quote";
import { useCart } from "@/store/cart";
import { useHydrated } from "@/store/ui";
import { cn } from "@/lib/utils";
import { StripePayment, type PaymentSession } from "./stripe-payment";

const COUNTRY_CODES: Record<string, string> = {
  Spain: "ES",
  France: "FR",
  Italy: "IT",
  Germany: "DE",
  Portugal: "PT",
  Netherlands: "NL",
  Belgium: "BE",
  Austria: "AT",
  Ireland: "IE",
};
const COUNTRIES = Object.keys(COUNTRY_CODES);

const DEFAULTS: CheckoutFormValues = {
  email: "",
  firstName: "",
  lastName: "",
  address: "",
  apartment: "",
  city: "",
  postalCode: "",
  country: "Spain",
  phone: "",
  shippingMethod: "standard",
};

function Field({
  id,
  label,
  error,
  optional,
  className,
  registration,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: FieldError;
  optional?: boolean;
  registration: UseFormRegisterReturn;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="eyebrow text-subtle">
        {label}
        {optional && <span className="ml-1 normal-case tracking-normal">(optional)</span>}
      </label>
      <input
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        className={cn("field", error && "border-destructive")}
        {...props}
        {...registration}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[12px] text-destructive">
          {error.message}
        </p>
      )}
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`step-${n}`} className="border-t border-stone py-10">
      <h2 id={`step-${n}`} className="flex items-baseline gap-4">
        <span className="font-display text-[22px] italic text-burgundy">0{n}</span>
        <span className="nav-label font-semibold">{title}</span>
      </h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

export function CheckoutForm({ account }: { account: { email: string; name: string | null } }) {
  const hydrated = useHydrated();
  const lines = useCart((s) => s.lines);
  const promoCode = useCart((s) => s.promoCode);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Created by POST /api/checkout; tied to the exact bag + details it was priced for.
  const [session, setSession] = useState<(PaymentSession & { signature: string }) | null>(null);
  const lastIntent = useRef<string | null>(null);
  const paymentRef = useRef<HTMLElement>(null);
  const {
    register,
    control,
    handleSubmit,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    // The order belongs to the signed-in account: its email is fixed, names are prefilled.
    defaultValues: {
      ...DEFAULTS,
      email: account.email,
      firstName: account.name?.split(" ")[0] ?? "",
      lastName: account.name?.split(" ").slice(1).join(" ") ?? "",
    },
    shouldFocusError: true,
  });
  const method = watch("shippingMethod");
  const values = watch();
  const { quote: totals, loading: quoting, error: quoteError } = useCartQuote(method);
  // If the bag, promo code or details change after the payment was prepared, it must be prepared again.
  const signature = JSON.stringify([lines.map((l) => [l.key, l.quantity]), promoCode, values]);
  const stale = !!session && session.signature !== signature;

  useEffect(() => {
    if (session && !stale) paymentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [session, stale]);

  if (!hydrated) return <div className="min-h-[70vh]" />;

  if (lines.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <h1 className="display text-[48px]">Your bag is empty</h1>
        <Link href="/shop" className="btn btn-primary mt-8">
          Continue shopping
        </Link>
      </div>
    );
  }

  const onSubmit = async ({ email, shippingMethod, ...address }: CheckoutFormValues) => {
    setSubmitError(null);
    try {
      // Creates a PENDING order, holds the stock and opens a Stripe PaymentIntent (no charge yet).
      const created = await api<PaymentSession>("/api/checkout", {
        method: "POST",
        body: {
          email,
          address,
          shippingMethod,
          promoCode,
          items: lines.map((l) => ({ productId: l.productId, color: l.color, size: l.size, quantity: l.quantity })),
          previousPaymentIntentId: lastIntent.current,
        },
      });
      lastIntent.current = created.paymentIntentId;
      setSession({ ...created, signature });
    } catch (err) {
      setSession(null);
      // Server field errors come back as "address.city" etc. — map them onto the flat form fields.
      setSubmitError(
        applyServerErrors(
          err,
          (field, e) => setError(String(field).replace(/^address./, "") as keyof CheckoutFormValues, e),
          "We couldn't prepare your payment. Please try again.",
        ),
      );
    }
  };

  const summary = (
    <>
      <ul className="divide-y divide-stone">
        {lines.map((l) => (
          <li key={l.key} className="flex gap-4 py-4">
            <div className="relative aspect-[4/5] w-16 shrink-0 bg-white">
              {l.image && <Image src={l.image} alt={l.name} fill sizes="64px" className="object-cover" />}
              <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-ink text-[10px] text-white">
                {l.quantity}
              </span>
            </div>
            <div className="flex-1 text-[12px]">
              <p className="font-semibold uppercase tracking-[0.1em]">{l.name}</p>
              <p className="mt-1 text-subtle">
                {l.color} · {l.size}
              </p>
            </div>
            <p className="text-[13px] tabular-nums">{formatPrice(l.price * l.quantity)}</p>
          </li>
        ))}
      </ul>
      <div className="mt-6 border-t border-stone pt-6">
        <PromoCodeForm method={method} />
      </div>
      <TotalsTable quote={totals} loading={quoting} className="mt-6" />
    </>
  );

  const hasFieldErrors = Object.keys(errors).length > 0;

  return (
    <div className="grid gap-0 lg:grid-cols-12 lg:gap-16">
      {/* Mobile summary toggle */}
      <div className="-mx-4 border-b border-stone bg-paper px-4 sm:-mx-8 sm:px-8 lg:hidden">
        <button
          type="button"
          onClick={() => setSummaryOpen((o) => !o)}
          aria-expanded={summaryOpen}
          aria-controls="mobile-summary"
          className="flex w-full items-center justify-between py-4"
        >
          <span className="nav-label flex items-center gap-2">
            {summaryOpen ? "Hide" : "Show"} order summary
            <ChevronDown className={cn("size-4 transition-transform", summaryOpen && "rotate-180")} />
          </span>
          <span className="font-display text-[20px] tabular-nums">{formatPrice(totals.total)}</span>
        </button>
        {summaryOpen && (
          <div id="mobile-summary" className="pb-6">
            {summary}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit, () => setSubmitError(null))} noValidate className="lg:col-span-7 lg:col-start-1">
        <h1 className="display pt-8 pb-10 text-[44px] sm:text-[56px]">Checkout</h1>

        <Step n={1} title="Contact information">
          <Field id="email" label="Email" type="email" readOnly className="text-subtle" error={errors.email} registration={register("email")} />
          <p className="mt-3 text-[12px] text-subtle">
            Ordering as <span className="text-ink">{account.email}</span>. Your order will appear in{" "}
            <Link href="/account/orders" className="text-ink underline underline-offset-4">
              My Orders
            </Link>
            .
          </p>
        </Step>

        <Step n={2} title="Shipping address">
          <div className="grid gap-x-6 gap-y-7 sm:grid-cols-2">
            <Field id="firstName" label="First name" autoComplete="given-name" error={errors.firstName} registration={register("firstName")} />
            <Field id="lastName" label="Last name" autoComplete="family-name" error={errors.lastName} registration={register("lastName")} />
            <Field id="address" label="Address" autoComplete="address-line1" className="sm:col-span-2" error={errors.address} registration={register("address")} />
            <Field id="apartment" label="Apartment, suite" optional autoComplete="address-line2" className="sm:col-span-2" error={errors.apartment} registration={register("apartment")} />
            <Field id="city" label="City" autoComplete="address-level2" error={errors.city} registration={register("city")} />
            <Field id="postalCode" label="Postal code" autoComplete="postal-code" error={errors.postalCode} registration={register("postalCode")} />
            <div>
              <label htmlFor="country" className="eyebrow text-subtle">
                Country
              </label>
              <select id="country" autoComplete="country-name" className="field cursor-pointer" {...register("country")}>
                {COUNTRIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <Field id="phone" label="Phone" type="tel" autoComplete="tel" error={errors.phone} registration={register("phone")} />
          </div>
        </Step>

        <Step n={3} title="Shipping method">
          <Controller
            control={control}
            name="shippingMethod"
            render={({ field }) => (
              <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-3" aria-label="Shipping method">
                {SHIPPING_METHODS.map((m) => {
                  const free = m.id === "standard" && totals.subtotal - totals.discount >= FREE_SHIPPING_THRESHOLD;
                  return (
                    <label
                      key={m.id}
                      htmlFor={`ship-${m.id}`}
                      className={cn(
                        "flex cursor-pointer items-center gap-4 border p-5 transition-colors",
                        field.value === m.id ? "border-ink" : "border-stone hover:border-subtle",
                      )}
                    >
                      <RadioGroupItem id={`ship-${m.id}`} value={m.id} />
                      <span className="flex-1">
                        <span className="block text-[13px] font-semibold">{m.name}</span>
                        <span className="block text-[12px] text-subtle">{m.eta}</span>
                      </span>
                      <span className="text-[13px] tabular-nums">
                        {free ? (
                          <>
                            <span className="mr-2 text-subtle line-through">{formatPrice(m.price)}</span>Free
                          </>
                        ) : (
                          formatPrice(m.price)
                        )}
                      </span>
                    </label>
                  );
                })}
              </RadioGroup>
            )}
          />
          <p className="mt-4 text-[12px] text-subtle">Free standard shipping on orders over €150.</p>
        </Step>

        <div className="border-t border-stone pt-8 pb-10">
          {(submitError || quoteError || hasFieldErrors) && (
            <p role="alert" className="mb-4 text-[13px] text-destructive">
              {submitError ?? quoteError ?? "Please review the highlighted fields."}
            </p>
          )}
          {(!session || stale) && (
            <button type="submit" disabled={isSubmitting || quoting} className="btn btn-primary h-14 w-full">
              {isSubmitting ? "Preparing payment…" : stale ? "Update and continue to payment" : "Continue to payment"}
            </button>
          )}
          {stale && <p className="mt-3 text-center text-[12px] text-subtle">Your bag or details changed — confirm them again to pay.</p>}
        </div>
      </form>

      <section ref={paymentRef} aria-labelledby="step-4" className="scroll-mt-32 border-t border-stone py-10 lg:col-span-7 lg:col-start-1">
        <h2 id="step-4" className="flex items-baseline gap-4">
          <span className="font-display text-[22px] italic text-burgundy">04</span>
          <span className="nav-label font-semibold">Payment</span>
        </h2>
        <div className="mt-8">
          {session && !stale ? (
            <>
              <p className="mb-6 text-[12px] text-subtle">
                Order <span className="text-ink">#{session.orderNumber}</span> · your items are held for 30 minutes.
              </p>
              <StripePayment
                key={session.paymentIntentId}
                session={session}
                billing={{
                  name: `${values.firstName} ${values.lastName}`.trim(),
                  email: values.email,
                  phone: values.phone,
                  address: {
                    line1: values.address,
                    line2: values.apartment ?? "",
                    city: values.city,
                    postal_code: values.postalCode,
                    country: COUNTRY_CODES[values.country] ?? "ES",
                    state: "",
                  },
                }}
              />
            </>
          ) : (
            <p className="text-[13px] text-subtle">Complete your details above and continue to payment. Card, Apple Pay, Google Pay, PayPal and other methods are available on the next step.</p>
          )}
        </div>
        <p className="mt-6 text-center text-[11px] text-subtle">By placing your order you agree to our Terms &amp; Conditions and Privacy Policy.</p>
      </section>

      <aside aria-label="Order summary" className="hidden lg:col-span-5 lg:col-start-8 lg:row-span-2 lg:row-start-1 lg:block">
        <div className="sticky top-[140px] mt-8 bg-paper p-10">
          <h2 className="nav-label font-semibold">Order summary</h2>
          <div className="mt-4">{summary}</div>
        </div>
      </aside>
    </div>
  );
}
