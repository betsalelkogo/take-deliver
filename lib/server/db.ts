import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

let client: NeonQueryFunction<false, false> | null = null;

// Only import from server code (route handlers): NEON_DB_URL is a secret and
// is intentionally not NEXT_PUBLIC_, so it never reaches the browser bundle.
export function db(): NeonQueryFunction<false, false> {
  if (!client) {
    const url = process.env.NEON_DB_URL;
    if (!url) throw new Error("NEON_DB_URL is not set");
    client = neon(url);
  }
  return client;
}

// Epoch milliseconds for a timestamptz column (null stays null).
export function toMs(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const ms = value instanceof Date ? value.getTime() : new Date(String(value)).getTime();
  return Number.isNaN(ms) ? null : ms;
}
