import { loginSchema } from "@/lib/schemas/auth";
import { login } from "@/server/auth";
import { handle, readJson } from "@/server/http";

/** POST /api/auth/login — { email, password }. Sets the httpOnly session cookie. 401 wrong credentials · 429 too many attempts. */
export const POST = handle(async (req: Request) => ({ user: await login(await readJson(req, loginSchema)) }));
