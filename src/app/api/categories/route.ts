import { getCategories } from "@/lib/catalog";
import { handle } from "@/server/http";

/** GET /api/categories — real categories plus the virtual New In and Sale collections. */
export const GET = handle(async () => ({ categories: await getCategories() }));
