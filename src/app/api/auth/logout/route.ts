import { logout } from "@/server/auth";
import { handle } from "@/server/http";

/** POST /api/auth/logout — ends the session. */
export const POST = handle(async () => {
  await logout();
  return { ok: true };
});
