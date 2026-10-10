import { getCurrentUser } from "@/server/auth";
import { handle } from "@/server/http";

/** GET /api/auth/me — `{ user }` or `{ user: null }` when signed out. */
export const GET = handle(async () => ({ user: await getCurrentUser() }));
