import { NextResponse } from "next/server";
import { handle, readJson } from "@/server/http";
import { checkoutSchema, createCheckoutSession } from "@/server/checkout";
import { requireUser } from "@/server/auth";

/**
 * POST /api/checkout — requires a signed-in customer. Creates a PENDING order, holds the stock and opens a Stripe PaymentIntent.
 * Returns `{ orderNumber, paymentIntentId, clientSecret, publishableKey, total }` for the Payment Element.
 */
export const POST = handle(async (req: Request) => {
  const user = await requireUser(); // 401 → the checkout page sends the shopper to sign in
  const input = await readJson(req, checkoutSchema);
  return NextResponse.json(await createCheckoutSession(input, user), { status: 201 });
});
