import { assertSameOrigin, clientIpKey, getActor, requireKey, type WriteActor } from "./actor";
import { LIMITS, rateLimitAll } from "./rateLimit";

// Every write: same-origin, identified, and within both the per-device and
// the per-address rate limits.
export async function guardWrite(req: Request, kind: "create" | "action"): Promise<WriteActor> {
  assertSameOrigin(req);
  const actor = getActor(req);
  const key = requireKey(actor);
  await rateLimitAll([
    [`${kind}:${key}`, LIMITS[kind]],
    [`ip:${clientIpKey(req)}`, LIMITS.ipWrite],
  ]);
  return { ...actor, key };
}
