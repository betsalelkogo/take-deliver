import { createHash } from "node:crypto";
import { MAX_LENGTH } from "../limits";
import { DEVICE_COOKIE, DEVICE_ID } from "./device";
import { HttpError } from "./http";

export const LEGACY_PHONE_HEADER = "x-td-phone";

export interface Actor {
  // Stored as owner_key / courier_key / rider_key. Null only before the
  // device cookie exists (e.g. cookies blocked).
  key: string | null;
  // The phone this device saved in «מי אני?», only used to recognise rows
  // created before ownership keys existed.
  legacyPhone: string;
}

export type WriteActor = Actor & { key: string };

function hash(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 40);
}

// Reads a cookie from a raw Cookie header (route handlers get a plain Request).
export function readCookie(header: string | null, name: string): string | undefined {
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) {
      try {
        return decodeURIComponent(part.slice(eq + 1).trim());
      } catch {
        return undefined;
      }
    }
  }
  return undefined;
}

export function getActor(req: Request): Actor {
  const device = readCookie(req.headers.get("cookie"), DEVICE_COOKIE);
  const key = device && DEVICE_ID.test(device) ? `d:${hash(`device:${device}`)}` : null;
  const legacyPhone = (req.headers.get(LEGACY_PHONE_HEADER) ?? "").slice(0, MAX_LENGTH.phone);
  return { key, legacyPhone };
}

export function requireKey(actor: Actor): string {
  if (!actor.key) throw new HttpError(401, "רעננו את הדף ונסו שוב.");
  return actor.key;
}

// Hashed client address for rate limiting (never stored in the clear).
export function clientIpKey(req: Request): string {
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return hash(`ip:${ip}`);
}

// Cookie-authenticated writes must come from our own pages.
export function assertSameOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  try {
    if (host && new URL(origin).host === host) return;
  } catch {
    // fall through
  }
  throw new HttpError(403, "בקשה לא מורשית.");
}
