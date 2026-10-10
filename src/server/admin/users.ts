import "server-only";
import type { Role, UserStatus as DbUserStatus } from "@prisma/client";
import type { InviteInput, UserUpdateInput } from "@/lib/schemas/user";
import { db } from "@/lib/db";
import type { AdminUser, UserRole, UserStatus } from "@/lib/admin-types";
import { ApiError, notFound } from "@/server/http";
import { SOLD_STATUSES } from "./products";

const COUNTRY_NAME: Record<string, string> = {
  ES: "Spain",
  FR: "France",
  IT: "Italy",
  DE: "Germany",
  PT: "Portugal",
  NL: "Netherlands",
  BE: "Belgium",
  AT: "Austria",
  IE: "Ireland",
};

export async function listUsers(): Promise<AdminUser[]> {
  const rows = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      addresses: { orderBy: { isDefault: "desc" }, take: 1 },
      orders: { where: { status: { in: [...SOLD_STATUSES] } }, select: { total: true } },
    },
  });
  return rows.map((u) => ({
    id: u.id,
    name: u.name ?? u.email,
    email: u.email,
    role: u.role.toLowerCase() as UserRole,
    status: u.status.toLowerCase() as UserStatus,
    country: COUNTRY_NAME[u.addresses[0]?.country ?? ""] ?? u.addresses[0]?.country ?? "—",
    orders: u.orders.length,
    spent: Math.round(u.orders.reduce((s, o) => s + Number(o.total), 0) * 100) / 100,
    joined: u.createdAt.toISOString(),
    lastSeen: (u.lastSeenAt ?? u.createdAt).toISOString(),
  }));
}

export { inviteSchema, userUpdateSchema } from "@/lib/schemas/user";

/** Updates role/status, refusing changes that would leave the store without an active admin. */
export async function updateUser(id: string, input: UserUpdateInput) {
  const user = await db.user.findUnique({ where: { id } });
  if (!user) throw notFound("User");

  const losesAdmin =
    user.role === "ADMIN" &&
    user.status === "ACTIVE" &&
    ((input.role && input.role !== "admin") || (input.status && input.status !== "active"));
  if (losesAdmin) {
    const otherAdmins = await db.user.count({ where: { role: "ADMIN", status: "ACTIVE", id: { not: id } } });
    if (otherAdmins === 0) throw new ApiError(409, "There must be at least one active admin");
  }

  await db.user.update({
    where: { id },
    data: {
      ...(input.role && { role: input.role.toUpperCase() as Role }),
      ...(input.status && { status: input.status.toUpperCase() as DbUserStatus }),
    },
  });
  // Blocking ends any open sessions.
  if (input.status === "blocked") await db.session.deleteMany({ where: { userId: id } });
  return (await listUsers()).find((u) => u.id === id)!;
}


/** Creates an INVITED team member. The invitation email is sent once auth/email exist (phase 3/5). */
export async function inviteUser(input: InviteInput) {
  const email = input.email.toLowerCase();
  if (await db.user.findUnique({ where: { email } })) throw new ApiError(409, "A user with this email already exists");
  const user = await db.user.create({
    data: { email, name: input.name, role: input.role.toUpperCase() as Role, status: "INVITED" },
  });
  return (await listUsers()).find((u) => u.id === user.id)!;
}
