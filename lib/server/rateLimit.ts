import { db } from "./db";
import { HttpError } from "./http";

export interface Limit {
  // Max hits per window.
  max: number;
  windowS: number;
}

export const LIMITS = {
  // New packages, transfers and pinned stores.
  create: { max: 30, windowS: 10 * 60 },
  // Claims, releases, notes, deletes.
  action: { max: 120, windowS: 10 * 60 },
  // Per address, across every device cookie it cycles through.
  ipWrite: { max: 300, windowS: 10 * 60 },
  community: { max: 5, windowS: 60 * 60 },
} satisfies Record<string, Limit>;

const TOO_MANY = "יותר מדי פעולות בזמן קצר. נסו שוב בעוד כמה דקות.";

// Fixed-window counter in Postgres, shared by every serverless instance.
export async function rateLimit(bucket: string, limit: Limit): Promise<void> {
  const sql = db();
  const [row] = await sql`
    INSERT INTO rate_limits (bucket, window_start, hits)
    VALUES (
      ${bucket},
      to_timestamp(floor(extract(epoch FROM now()) / ${limit.windowS}) * ${limit.windowS}),
      1
    )
    ON CONFLICT (bucket, window_start) DO UPDATE SET hits = rate_limits.hits + 1
    RETURNING hits`;
  if (Math.random() < 0.02) {
    sql`DELETE FROM rate_limits WHERE window_start < now() - interval '1 day'`.catch(() => {});
  }
  if (row.hits > limit.max) throw new HttpError(429, TOO_MANY);
}

export async function rateLimitAll(
  checks: Array<[bucket: string, limit: Limit]>
): Promise<void> {
  for (const [bucket, limit] of checks) await rateLimit(bucket, limit);
}
