import { confirmationQuerySchema } from "@/lib/schemas/checkout";
import { handle } from "@/server/http";
import { getConfirmation } from "@/server/checkout";

/**
 * GET /api/checkout/confirmation?payment_intent=pi_…&payment_intent_client_secret=…
 * Reconciles the payment with Stripe (works without a webhook) and returns the order summary.
 */
export const GET = handle(async (req: Request) => {
  const query = confirmationQuerySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return { order: await getConfirmation(query.payment_intent, query.payment_intent_client_secret) };
});
