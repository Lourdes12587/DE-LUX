import { NextResponse } from "next/server";
import { STAFF, guarded } from "@/server/auth";
import { duplicateProduct } from "@/server/admin/products";

/** POST /api/admin/products/:id/duplicate — copy as DRAFT with zero stock. */
export const POST = guarded(STAFF, async (_req: Request, { params }: { params: Promise<{ id: string }> }) =>
  NextResponse.json({ product: await duplicateProduct((await params).id) }, { status: 201 }),
);
