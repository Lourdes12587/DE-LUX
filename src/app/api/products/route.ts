import { z } from "zod";
import { getProducts, getProductsByIds, searchProducts } from "@/lib/catalog";
import { handle } from "@/server/http";

const query = z.object({
  q: z.string().trim().max(100).optional(),
  ids: z.string().max(2000).optional(),
  collection: z.string().max(60).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

/**
 * GET /api/products
 *   ?q=trench          full-text-ish search (name, description, category, colour)
 *   ?ids=a,b,c         products by id, in that order (wishlist)
 *   ?collection=coats  category slug or virtual collection (new-in, sale)
 *   &limit=n
 */
export const GET = handle(async (req: Request) => {
  const { q, ids, collection, limit } = query.parse(Object.fromEntries(new URL(req.url).searchParams));
  if (ids != null) return { products: await getProductsByIds(ids.split(",").filter(Boolean).slice(0, 100)) };
  if (q != null) return { products: await searchProducts(q, limit) };
  return { products: await getProducts({ collection, limit }) };
});
