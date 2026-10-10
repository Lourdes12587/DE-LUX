import { readProductImage } from "@/server/uploads";

/** GET /media/:file — serves uploaded product images. Names are random UUIDs, so they can be cached forever. */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const data = await readProductImage((await params).file);
  if (!data) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
