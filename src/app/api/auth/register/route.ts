import { NextResponse } from "next/server";
import { registerSchema } from "@/lib/schemas/auth";
import { register } from "@/server/auth";
import { handle, readJson } from "@/server/http";

/**
 * POST /api/auth/register — { firstName, lastName, email, password, marketingOptIn?, orderNumber? }.
 * 409 `order_proof_required` when the email already has orders: resend with one of its order numbers.
 */
export const POST = handle(async (req: Request) =>
  NextResponse.json({ user: await register(await readJson(req, registerSchema)) }, { status: 201 }),
);
