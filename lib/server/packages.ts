import {
  AVAILABLE_TTL_MS,
  CLAIMED_TTL_MS,
  type NewPackageInput,
  type PackageBoardData,
  type PackageStatus,
} from "../packages";
import { collectorId, type CollectorScore } from "../stats";
import { db, toMs } from "./db";

const TOP_SCORES = 10;

export async function getPackageBoard(communityId: string): Promise<PackageBoardData> {
  const sql = db();
  const [, packages, stores, stats, scores] = await sql.transaction([
    // Claimed packages leave after CLAIMED_TTL_MS, untaken ones after
    // AVAILABLE_TTL_MS (legacy claimed rows without claimed_at use created_at).
    sql`
      DELETE FROM packages
      WHERE community_id = ${communityId}
        AND (
          (status = 'claimed'
            AND COALESCE(claimed_at, created_at) < now() - make_interval(secs => ${CLAIMED_TTL_MS / 1000}))
          OR (status = 'available'
            AND created_at < now() - make_interval(secs => ${AVAILABLE_TTL_MS / 1000}))
        )`,
    sql`
      SELECT id, area, store, description, package_number, owner_name, owner_phone,
             notes, status, courier_name, courier_phone, courier_note, urgent,
             created_at, claimed_at
      FROM packages
      WHERE community_id = ${communityId}
      ORDER BY created_at DESC`,
    sql`SELECT id, area, name FROM stores WHERE community_id = ${communityId} ORDER BY name`,
    sql`
      SELECT collected, close_total_ms::float8 AS close_total_ms, close_count
      FROM community_stats WHERE community_id = ${communityId}`,
    // The top few per board are enough: see rankCollectors.
    sql`
      SELECT kind, person_id, name, count
      FROM (
        SELECT *, row_number() OVER (PARTITION BY kind ORDER BY count DESC) AS rank
        FROM scores
        WHERE community_id = ${communityId} AND count > 0
      ) ranked
      WHERE rank <= ${TOP_SCORES}`,
  ]);

  const toScores = (kind: string): CollectorScore[] =>
    scores
      .filter((s) => s.kind === kind)
      .map((s) => ({ id: s.person_id, name: s.name, count: s.count }));

  return {
    packages: packages.map((r) => ({
      id: r.id,
      area: r.area,
      store: r.store,
      description: r.description,
      packageNumber: r.package_number,
      ownerName: r.owner_name,
      ownerPhone: r.owner_phone,
      notes: r.notes,
      status: r.status as PackageStatus,
      courierName: r.courier_name,
      courierPhone: r.courier_phone,
      courierNote: r.courier_note,
      urgent: r.urgent,
      createdAt: toMs(r.created_at),
      claimedAt: toMs(r.claimed_at),
    })),
    stores: stores.map((r) => ({ id: r.id, area: r.area, name: r.name })),
    stats: {
      collected: stats[0]?.collected ?? 0,
      closeTotalMs: stats[0]?.close_total_ms ?? 0,
      closeCount: stats[0]?.close_count ?? 0,
    },
    topCollectors: toScores("collector"),
    topPublishers: toScores("publisher"),
  };
}

export async function createPackage(
  communityId: string,
  input: NewPackageInput
): Promise<void> {
  const publisherId = collectorId(input.ownerName, input.ownerPhone);
  await db()`
    WITH created AS (
      INSERT INTO packages (community_id, area, store, description, package_number,
                            owner_name, owner_phone, notes, urgent)
      VALUES (${communityId}, ${input.area}, ${input.store}, ${input.description},
              ${input.packageNumber}, ${input.ownerName}, ${input.ownerPhone},
              ${input.notes}, ${input.urgent})
      RETURNING id
    )
    INSERT INTO scores (community_id, kind, person_id, name, count)
    SELECT ${communityId}, 'publisher', ${publisherId}, ${input.ownerName}, 1 FROM created
    ON CONFLICT (community_id, kind, person_id)
      DO UPDATE SET count = scores.count + 1, name = EXCLUDED.name`;
}

// One statement, so the claim, the stats and the collector's score change
// together, and a package already taken by someone else is left alone.
export async function claimPackage(
  communityId: string,
  id: string,
  courierName: string,
  courierPhone: string
): Promise<boolean> {
  const courierId = collectorId(courierName, courierPhone);
  const [row] = await db()`
    WITH claimed AS (
      UPDATE packages
      SET status = 'claimed',
          courier_name = ${courierName},
          courier_phone = ${courierPhone},
          courier_id = ${courierId},
          claimed_at = now(),
          close_ms = GREATEST(0, (extract(epoch FROM now() - created_at) * 1000)::bigint)
      WHERE id = ${id} AND community_id = ${communityId} AND status = 'available'
      RETURNING close_ms
    ), stats AS (
      INSERT INTO community_stats (community_id, collected, close_total_ms, close_count)
      SELECT ${communityId}, 1, close_ms, 1 FROM claimed
      ON CONFLICT (community_id) DO UPDATE SET
        collected = community_stats.collected + 1,
        close_total_ms = community_stats.close_total_ms + EXCLUDED.close_total_ms,
        close_count = community_stats.close_count + 1
    ), score AS (
      INSERT INTO scores (community_id, kind, person_id, name, count)
      SELECT ${communityId}, 'collector', ${courierId}, ${courierName}, 1 FROM claimed
      ON CONFLICT (community_id, kind, person_id)
        DO UPDATE SET count = scores.count + 1, name = EXCLUDED.name
    )
    SELECT count(*)::int AS n FROM claimed`;
  return row.n > 0;
}

// Reverses a claim: frees the package and rolls back the total, the average
// close time (if this claim was counted in it) and the collector's score.
export async function releasePackage(communityId: string, id: string): Promise<boolean> {
  const [row] = await db()`
    WITH released AS (
      UPDATE packages
      SET status = 'available', courier_name = NULL, courier_phone = NULL,
          courier_id = NULL, courier_note = '', claimed_at = NULL, close_ms = NULL
      WHERE id = ${id} AND community_id = ${communityId} AND status = 'claimed'
      RETURNING old.courier_id, old.close_ms
    ), stats AS (
      UPDATE community_stats s
      SET collected = GREATEST(0, s.collected - 1),
          close_total_ms = GREATEST(0, s.close_total_ms - COALESCE(r.close_ms, 0)),
          close_count = GREATEST(0, s.close_count - (r.close_ms IS NOT NULL)::int)
      FROM released r
      WHERE s.community_id = ${communityId}
    ), score AS (
      UPDATE scores sc
      SET count = GREATEST(0, sc.count - 1)
      FROM released r
      WHERE sc.community_id = ${communityId}
        AND sc.kind = 'collector'
        AND sc.person_id = r.courier_id
    )
    SELECT count(*)::int AS n FROM released`;
  return row.n > 0;
}

export async function setCourierNote(
  communityId: string,
  id: string,
  note: string
): Promise<void> {
  await db()`
    UPDATE packages SET courier_note = ${note}
    WHERE id = ${id} AND community_id = ${communityId}`;
}

export async function deletePackage(communityId: string, id: string): Promise<void> {
  await db()`DELETE FROM packages WHERE id = ${id} AND community_id = ${communityId}`;
}
