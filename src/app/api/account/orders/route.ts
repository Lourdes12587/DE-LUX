import { listMyOrders } from "@/server/account";
import { requireUser } from "@/server/auth";
import { handle } from "@/server/http";

/** GET /api/account/orders — the signed-in customer's orders, newest first. 401 when signed out. */
export const GET = handle(async () => ({ orders: await listMyOrders((await requireUser()).id) }));
