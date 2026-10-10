import { ADMIN_ONLY, guarded } from "@/server/auth";
import { getDashboard } from "@/server/admin/dashboard";

/** GET /api/admin/dashboard — KPIs (last 30 days vs previous 30), revenue series, category split, lists. */
export const GET = guarded(ADMIN_ONLY, async () => getDashboard());
