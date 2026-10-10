import "server-only";
import Stripe from "stripe";
import { ApiError } from "./http";

// Keys are read at request time (not inlined at build), so editing .env + restarting is enough.
//   STRIPE_SECRET_KEY        sk_test_… / sk_live_…   (server only — never expose)
//   STRIPE_PUBLISHABLE_KEY   pk_test_… / pk_live_…   (sent to the browser with each checkout session)
//   STRIPE_WEBHOOK_SECRET    whsec_…                 (optional locally; required in production)

let client: Stripe | null = null;

const isPlaceholder = (v?: string) => !v || /x{4,}|tu_|your_/i.test(v);

export function stripeConfigured() {
  return !isPlaceholder(process.env.STRIPE_SECRET_KEY) && !isPlaceholder(process.env.STRIPE_PUBLISHABLE_KEY);
}

export function getStripe() {
  if (!stripeConfigured()) {
    throw new ApiError(503, "Payments are not configured yet. Add the Stripe keys to .env and restart the server.");
  }
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY!, { appInfo: { name: "DE LUX" } });
  return client;
}

export function publishableKey() {
  getStripe();
  return process.env.STRIPE_PUBLISHABLE_KEY!;
}

export const toCents = (euros: number) => Math.round(euros * 100);

