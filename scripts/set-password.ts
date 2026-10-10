/**
 * Sets (or resets) a user's password and activates the account. Needed for team accounts (admin/editor),
 * which can't be claimed through public sign-up, and as a manual reset until password-reset emails exist.
 *
 *   npm run user:password -- <email>         (asks for the password)
 *   npm run user:password -- <email> admin   (also changes the role: customer | editor | admin)
 *
 * The role is a plain word on purpose: on Windows, npm swallows flags like --role before they reach the script.
 */
import { createInterface } from "node:readline/promises";
import { PrismaClient, type Role } from "@prisma/client";
import { hashPassword } from "../src/server/password";

const db = new PrismaClient();

async function main() {
  const args = process.argv.slice(2).filter((a) => a !== "--role");
  const email = args.find((a) => a.includes("@"));
  const roleArg = args.find((a) => !a.includes("@"));
  if (!email) throw new Error("Usage: npm run user:password -- <your@email.com> [customer|editor|admin]");
  const role = roleArg ? (roleArg.replace(/^-+/, "").toUpperCase() as Role) : undefined;
  if (role && !["CUSTOMER", "EDITOR", "ADMIN"].includes(role)) throw new Error(`Unknown role "${roleArg}". Use customer, editor or admin`);

  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) throw new Error(`No user with email ${email}`);

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const password = (await rl.question(`New password for ${user.email}: `)).trim();
  rl.close();
  if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error("Use at least 8 characters, with letters and at least one number");
  }

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(password), status: "ACTIVE", ...(role && { role }) },
  });
  // A new password signs the user out on every device.
  await db.session.deleteMany({ where: { userId: user.id } });
  console.log(`Password set for ${user.email} (${role ?? user.role}). Sign in at /account.`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
