import { getMyOrder } from "@/server/account";
import { requireUser } from "@/server/auth";
import { handle } from "@/server/http";

/** GET /api/account/orders/:number — one of the signed-in customer's orders (404 if it isn't theirs). */
export const GET = handle(async (_req: Request, { params }: { params: Promise<{ number: string }> }) => ({
  order: await getMyOrder((await requireUser()).id, decodeURIComponent((await params).number)),
}));
