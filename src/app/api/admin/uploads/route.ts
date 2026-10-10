import { NextResponse } from "next/server";
import { ApiError } from "@/server/http";
import { STAFF, guarded } from "@/server/auth";
import { saveProductImage } from "@/server/uploads";

/**
 * POST /api/admin/uploads — multipart/form-data with a `file` field (JPG, PNG, WebP or AVIF, ≤ 10 MB).
 * Returns `201 { url, width, height }`; use `url` in a product's `images[]`.
 */
export const POST = guarded(STAFF, async (req: Request) => {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw new ApiError(400, "Send the image as multipart/form-data");
  }
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) throw new ApiError(400, "Attach an image in the `file` field");
  return NextResponse.json(await saveProductImage(file), { status: 201 });
});
