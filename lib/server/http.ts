import { NextResponse } from "next/server";
import type { z } from "zod";
import { idSchema } from "./schemas";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
  }
}

const NOT_FOUND = "הלוח לא נמצא.";
const GENERIC_ERROR = "משהו השתבש, נסו שוב.";

export function json(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function parseId(raw: string): string {
  const parsed = idSchema.safeParse(raw);
  if (!parsed.success) throw new HttpError(404, NOT_FOUND);
  return parsed.data;
}

export async function parseBody<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new HttpError(400, "בקשה לא תקינה.");
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    throw new HttpError(400, "חלק מהפרטים חסרים או לא תקינים.");
  }
  return parsed.data;
}

// Runs a route body, turning failures into generic JSON errors. Details are
// logged server-side only (code + message; no request data, which holds PII).
export async function handle(
  route: string,
  fn: () => Promise<Response>
): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) return json({ error: err.message }, err.status);
    const code = (err as { code?: unknown }).code;
    // Foreign-key violation: the community in the URL doesn't exist.
    if (code === "23503") return json({ error: NOT_FOUND }, 404);
    console.error(
      JSON.stringify({
        level: "error",
        route,
        code: typeof code === "string" ? code : undefined,
        message: err instanceof Error ? err.message : String(err),
      })
    );
    return json({ error: GENERIC_ERROR }, 500);
  }
}
