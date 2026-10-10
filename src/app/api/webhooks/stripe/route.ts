import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { fulfillPayment } from "@/server/checkout";
import { getStripe } from "@/server/stripe";

const HANDLED = new Set(["payment_intent.succeeded", "payment_intent.payment_failed", "payment_intent.canceled", "payment_intent.processing"]);

/**
 * POST /api/webhooks/stripe — Stripe's server-to-server notifications.
 * Production: add this URL in Stripe Dashboard → Developers → Webhooks and put its signing secret in
 * STRIPE_WEBHOOK_SECRET. Locally: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
 * Unsigned requests are rejected, so this endpoint cannot be used to forge payments.
 */
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || /x{4,}|tu_|your_/i.test(secret)) {
    return NextResponse.json({ error: "Webhook signing secret is not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await req.text(), req.headers.get("stripe-signature") ?? "", secret);
  } catch (e) {
    return NextResponse.json({ error: `Invalid signature: ${e instanceof Error ? e.message : "unknown"}` }, { status: 400 });
  }

  if (HANDLED.has(event.type)) {
    const intent = event.data.object as Stripe.PaymentIntent;
    try {
      // fulfillPayment re-reads the PaymentIntent from Stripe and is idempotent, so retries and
      // out-of-order deliveries are safe.
      await fulfillPayment(intent.id);
    } catch (e) {
      console.error("Stripe webhook failed", event.id, e);
      return NextResponse.json({ error: "Processing failed" }, { status: 500 }); // Stripe will retry
    }
  }
  return NextResponse.json({ received: true });
}
