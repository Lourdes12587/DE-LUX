import { getProduct } from "@/lib/catalog";
import { handle, notFound } from "@/server/http";

/** GET /api/products/:slug — one active product with live stock per variant. */
export const GET = handle(async (_req: Request, { params }: { params: Promise<{ slug: string }> }) => {
  const product = await getProduct((await params).slug);
  if (!product) throw notFound("Product");
  return { product };
});
