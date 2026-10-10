import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import type { LoginInput, RegisterInput } from "@/lib/schemas/auth";
import { ApiError, handle } from "./http";
import { hashPassword, verifyPassword } from "./password";


export const SESSION_COOKIE = "ph_session";
const SESSION_DAYS = 30;

export type SessionUser = { id: string; email: string; name: string | null; role: Role };

// ─── Rate limiting (per process; enough for a single server) ──

const attempts = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 15 * 60_000;
const MAX_ATTEMPTS = 8;

function checkRateLimit(key: string) {
  const a = attempts.get(key);
  if (a && a.until > Date.now() && a.count >= MAX_ATTEMPTS) {
    throw new ApiError(429, "Too many attempts. Please wait 15 minutes and try again.");
  }
}
function recordFailure(key: string) {
  const a = attempts.get(key);
  attempts.set(key, a && a.until > Date.now() ? { ...a, count: a.count + 1 } : { count: 1, until: Date.now() + WINDOW_MS });
}

// ─── Sessions ─────────────────────────────────────────────────

/** Only a SHA-256 of the token is stored, so a database leak doesn't expose live sessions. */
const tokenHash = (token: string) => createHash("sha256").update(token).digest("base64url");

async function startSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({ data: { sessionToken: tokenHash(token), userId, expires } });
  await db.user.update({ where: { id: userId }, data: { lastSeenAt: new Date() } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIES !== "1",
    sameSite: "lax",
    path: "/",
    expires,
  });
}

/** The signed-in user, or null. Blocked users and expired sessions count as signed out. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { sessionToken: tokenHash(token) },
    include: { user: { select: { id: true, email: true, name: true, role: true, status: true } } },
  });
  if (!session || session.expires < new Date() || session.user.status !== "ACTIVE") return null;
  const { id, email, name, role } = session.user;
  return { id, email, name, role };
}

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "Please sign in to continue.");
  return user;
}

export const STAFF: Role[] = ["ADMIN", "EDITOR"];
export const ADMIN_ONLY: Role[] = ["ADMIN"];

export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) throw new ApiError(403, "You don't have permission to do this.");
  return user;
}

// ─── Account actions ──────────────────────────────────────────

export async function login(input: LoginInput) {
  const email = input.email.toLowerCase();
  checkRateLimit(`login:${email}`);
  const user = await db.user.findUnique({ where: { email } });
  const ok = await verifyPassword(input.password, user?.passwordHash ?? null);
  if (!user || !ok) {
    recordFailure(`login:${email}`);
    throw new ApiError(401, "Incorrect email or password.");
  }
  if (user.status === "BLOCKED") throw new ApiError(403, "This account has been disabled. Please contact us.");
  attempts.delete(`login:${email}`);
  await startSession(user.id);
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

/**
 * Creates an account, or activates one that already exists from a checkout or an invitation.
 * An email with past orders must prove ownership with one of its order numbers.
 */
export async function register(input: RegisterInput) {
  const email = input.email.toLowerCase();
  checkRateLimit(`register:${email}`);
  const name = `${input.firstName.trim()} ${input.lastName.trim()}`;
  const passwordHash = await hashPassword(input.password);
  const existing = await db.user.findUnique({ where: { email }, include: { orders: { select: { number: true } } } });

  if (existing?.passwordHash) throw new ApiError(409, "An account with this email already exists. Sign in instead.");
  if (existing?.status === "BLOCKED") throw new ApiError(403, "This account has been disabled. Please contact us.");
  // Team accounts (admin/editor) can never be claimed through public sign-up — an administrator sets their password.
  if (existing && existing.role !== "CUSTOMER") {
    throw new ApiError(403, "This is a team account. Ask an administrator to activate it.");
  }

  let userId: string;
  if (existing) {
    if (existing.orders.length > 0) {
      const proof = input.orderNumber?.toUpperCase();
      if (!proof) {
        throw new ApiError(409, "This email already has orders. Enter the number of one of them to activate your account.", {
          code: "order_proof_required",
        });
      }
      if (!existing.orders.some((o) => o.number === proof)) {
        recordFailure(`register:${email}`);
        throw new ApiError(422, "That order number doesn't match this email.", { fieldErrors: { orderNumber: ["That order number doesn't match this email."] } });
      }
    }
    const updated = await db.user.update({
      where: { id: existing.id },
      data: { passwordHash, name: existing.name ?? name, status: "ACTIVE", marketingOptIn: input.marketingOptIn ?? false },
    });
    userId = updated.id;
  } else {
    const created = await db.user.create({ data: { email, name, passwordHash, marketingOptIn: input.marketingOptIn ?? false } });
    userId = created.id;
  }
  await startSession(userId);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

export async function logout() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { sessionToken: tokenHash(token) } });
  store.delete(SESSION_COOKIE);
}

/** Route-handler wrapper: like handle(), but only for signed-in users with one of `roles` (401/403 otherwise). */
export function guarded<Args extends unknown[]>(roles: Role[], fn: (...args: Args) => Promise<unknown>) {
  return handle(async (...args: Args) => {
    await requireRole(roles);
    return fn(...args);
  });
}
