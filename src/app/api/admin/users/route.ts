import { NextResponse } from "next/server";
import { readJson } from "@/server/http";
import { ADMIN_ONLY, guarded } from "@/server/auth";
import { inviteSchema, inviteUser, listUsers } from "@/server/admin/users";

/** GET /api/admin/users — customers and team with order count and total spent. */
export const GET = guarded(ADMIN_ONLY, async () => ({ users: await listUsers() }));

/** POST /api/admin/users — invite a team member: { name, email, role: "editor" | "admin" }. */
export const POST = guarded(ADMIN_ONLY, async (req: Request) =>
  NextResponse.json({ user: await inviteUser(await readJson(req, inviteSchema)) }, { status: 201 }),
);
