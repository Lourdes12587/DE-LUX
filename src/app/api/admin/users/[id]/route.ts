import { readJson } from "@/server/http";
import { ADMIN_ONLY, guarded } from "@/server/auth";
import { updateUser, userUpdateSchema } from "@/server/admin/users";

/** PATCH /api/admin/users/:id — { role?, status? }. Keeps at least one active admin. */
export const PATCH = guarded(ADMIN_ONLY, async (req: Request, { params }: { params: Promise<{ id: string }> }) => ({
  user: await updateUser((await params).id, await readJson(req, userUpdateSchema)),
}));
