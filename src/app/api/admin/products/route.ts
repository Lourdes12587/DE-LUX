import { NextResponse } from "next/server";
import { readJson } from "@/server/http";
import { STAFF, guarded } from "@/server/auth";
import { listAdminProducts, productInputSchema, saveProduct } from "@/server/admin/products";

/** GET /api/admin/products — every product in any status, with SKU base and units sold. */
export const GET = guarded(STAFF, async () => ({ products: await listAdminProducts() }));

/** POST /api/admin/products — create a product with colours, stock per colour × size and images. */
export const POST = guarded(STAFF, async (req: Request) => {
  const product = await saveProduct(null, await readJson(req, productInputSchema));
  return NextResponse.json({ product }, { status: 201 });
});
