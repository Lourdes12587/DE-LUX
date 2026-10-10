import { readJson } from "@/server/http";
import { STAFF, guarded } from "@/server/auth";
import { deleteProduct, getAdminProduct, productInputSchema, saveProduct } from "@/server/admin/products";

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/products/:id */
export const GET = guarded(STAFF, async (_req: Request, { params }: Ctx) => ({ product: await getAdminProduct((await params).id) }));

/** PUT /api/admin/products/:id — full update (same body as POST /api/admin/products). */
export const PUT = guarded(STAFF, async (req: Request, { params }: Ctx) => ({
  product: await saveProduct((await params).id, await readJson(req, productInputSchema)),
}));

/** DELETE /api/admin/products/:id — only for products without orders (409 otherwise). */
export const DELETE = guarded(STAFF, async (_req: Request, { params }: Ctx) => deleteProduct((await params).id));
