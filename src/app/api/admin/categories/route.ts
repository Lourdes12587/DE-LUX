import { STAFF, guarded } from "@/server/auth";
import { listAdminCategories } from "@/server/admin/products";

/** GET /api/admin/categories — real categories with ids (for the product form). */
export const GET = guarded(STAFF, async () => ({ categories: await listAdminCategories() }));
