import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { MEDIA_FILE_RE, MEDIA_PREFIX } from "@/lib/schemas/product";
import { ApiError } from "./http";

/** Uploaded product images live outside /public (Next only serves files present at build time). */
export const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif"];

/**
 * Validates and normalises an uploaded image: decodes it with sharp (rejects anything that isn't really an image),
 * applies EXIF rotation, caps it at 2000×2500, strips metadata and stores it as WebP under a random name.
 */
export async function saveProductImage(file: File) {
  if (!ACCEPTED.includes(file.type)) throw new ApiError(415, "Use a JPG, PNG, WebP or AVIF image");
  if (file.size > MAX_UPLOAD_BYTES) throw new ApiError(413, "Images must be 10 MB or smaller");

  let output: { data: Buffer; info: { width: number; height: number } };
  try {
    output = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({ width: 2000, height: 2500, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new ApiError(422, "This file could not be read as an image");
  }

  const name = `${randomUUID()}.webp`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(UPLOAD_DIR, name), output.data);
  return { url: `${MEDIA_PREFIX}${name}`, width: output.info.width, height: output.info.height };
}

/** Reads a stored image; returns null for unknown or malformed names (no path traversal possible). */
export async function readProductImage(name: string) {
  if (!MEDIA_FILE_RE.test(name)) return null;
  try {
    return await readFile(path.join(UPLOAD_DIR, name));
  } catch {
    return null;
  }
}
