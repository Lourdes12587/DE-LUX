import { db } from "@/lib/db";
import { newsletterSchema } from "@/lib/schemas/user";
import { handle, readJson } from "@/server/http";

/** POST /api/newsletter — { email }. Idempotent. */
export const POST = handle(async (req: Request) => {
  const { email } = await readJson(req, newsletterSchema);
  const normalized = email.toLowerCase();
  await db.newsletterSubscriber.upsert({ where: { email: normalized }, update: {}, create: { email: normalized } });
  return { subscribed: true };
});
