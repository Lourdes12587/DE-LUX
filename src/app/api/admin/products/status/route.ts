import { z } from "zod";
import { readJson } from "@/server/http";
import { STAFF, guarded } from "@/server/auth";
import { setProductsStatus } from "@/server/admin/products";

/** POST /api/admin/products/status — bulk status change: { ids: string[], status: "active" | "draft" | "archived" }. */
export const POST = guarded(STAFF, async (req: Request) => {
  const { ids, status } = await readJson(
    req,
    z.object({ ids: z.array(z.string().min(1)).min(1).max(200), status: z.enum(["active", "draft", "archived"]) }),
  );
  return setProductsStatus(ids, status);
});
