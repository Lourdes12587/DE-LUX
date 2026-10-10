import { ADMIN_ONLY, guarded } from "@/server/auth";
import { listPayments } from "@/server/admin/payments";

/** GET /api/admin/payments — newest first, with customer and items. */
export const GET = guarded(ADMIN_ONLY, async () => ({ payments: await listPayments() }));
