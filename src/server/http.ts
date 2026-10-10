import "server-only";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";

/** Error with an HTTP status that route handlers turn into `{ error }` JSON. */
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

export const notFound = (what = "Resource") => new ApiError(404, `${what} not found`);

/** Wraps a route handler: maps validation, Prisma and ApiError failures to JSON responses. */
export function handle<Args extends unknown[]>(fn: (...args: Args) => Promise<unknown>) {
  return async (...args: Args) => {
    try {
      const result = await fn(...args);
      return result instanceof Response ? result : NextResponse.json(result);
    } catch (e) {
      if (e instanceof ApiError) return NextResponse.json({ error: e.message, details: e.details }, { status: e.status });
      if (e instanceof z.ZodError)
        return NextResponse.json({ error: "Invalid request", details: z.flattenError(e) }, { status: 400 });
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
        return NextResponse.json({ error: "A record with this value already exists", details: e.meta }, { status: 409 });
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025")
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      console.error(e);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  };
}

export async function readJson<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "Request body must be valid JSON");
  }
  return schema.parse(body);
}
