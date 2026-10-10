import { z } from "zod";
import { ApiError } from "@/server/http";
import { ADMIN_ONLY, guarded } from "@/server/auth";
import { refundPayment } from "@/server/admin/payments";

/** POST /api/admin/payments/:paymentIntentId/refund — full refund via Stripe (seed payments: database only). Optional body: { reason } */
export const POST = guarded(ADMIN_ONLY, async (req: Request, { params }: { params: Promise<{ id: string }> }) => {
  const text = await req.text();
  let body: unknown = {};
  try {
    if (text) body = JSON.parse(text);
  } catch {
    throw new ApiError(400, "Request body must be valid JSON");
  }
  const { reason } = z.object({ reason: z.string().max(200).optional() }).parse(body);
  return { payment: await refundPayment((await params).id, reason) };
});
