import {
  AVAILABLE_TTL_MS,
  CLAIMED_TTL_MS,
  type NewPackageInput,
  type PackageBoardData,
  type PackageItem,
  type PackageStatus,
} from "../packages";
import { collectorId, rankCollectors, type CollectorScore } from "../stats";
import type { Actor, WriteActor } from "./actor";
import { db, toMs } from "./db";
import { HttpError } from "./http";
import { packagePermissions, packageRoles, type PackageParties } from "./permissions";

const TOP_SCORES = 10;
const PODIUM = 3;
const FORBIDDEN = "רק מי שפרסם או אוסף את החבילה יכול לעשות את זה.";

type Row = Record<string, any>;

function parties(r: Row): PackageParties {
  return {
    status: r.status as PackageStatus,
    received: r.received_at != null,
    owner: { key: r.owner_key, phone: r.owner_phone },
    courier: { key: r.courier_key, phone: r.courier_phone },
  };
}

function toItem(r: Row, actor: Actor): PackageItem {
  const p = parties(r);
  const can = packagePermissions(p, actor);
  return {
    id: r.id,
    area: r.area,
    store: r.store,
    description: r.description,
    packageNumber: r.package_number,
    ownerName: r.owner_name,
    ownerPhone: can.seeOwnerPhone ? r.owner_phone : null,
    notes: r.notes,
    status: p.status,
    courierName: r.courier_name,
    courierPhone: can.seeCourierPhone ? r.courier_phone : null,
    courierNote: r.courier_note,
    urgent: r.urgent,
    createdAt: toMs(r.created_at),
    claimedAt: toMs(r.claimed_at),
    receivedAt: toMs(r.received_at),
    mine: packageRoles(p, actor),
    can: { delete: can.delete, release: can.release, note: can.note, receive: can.receive },
  };
}

// Leaderboards merge stored scores with what's on the board right now. Done
// here because it keys people by phone, which the browser no longer gets.
function podium(stored: CollectorScore[], live: Map<string, CollectorScore>): CollectorScore[] {
  return rankCollectors(stored, Array.from(live.values()), PODIUM).map((c, i) => ({
    id: String(i),
    name: c.name,
    count: c.count,
  }));
}

function addLive(map: Map<string, CollectorScore>, name: string | null, phone: string | null) {
  const id = collectorId(name || "", phone || "");
  if (!id) return;
  const prev = map.get(id);
  map.set(id, { id, name: (name || prev?.name || "").trim(), count: (prev?.count ?? 0) + 1 });
}

export async function getPackageBoard(
  communityId: string,
  actor: Actor
): Promise<PackageBoardData> {
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
             owner_key, notes, status, courier_name, courier_phone, courier_key,
             courier_note, urgent, created_at, claimed_at, received_at
      FROM packages
      WHERE community_id = ${communityId}
      ORDER BY created_at DESC`,
    sql`SELECT id, area, name, hours FROM stores WHERE community_id = ${communityId} ORDER BY name`,
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

  const liveCollectors = new Map<string, CollectorScore>();
  const livePublishers = new Map<string, CollectorScore>();
  for (const r of packages) {
    if (r.status === "claimed") addLive(liveCollectors, r.courier_name, r.courier_phone);
    addLive(livePublishers, r.owner_name, r.owner_phone);
  }

  return {
    packages: packages.map((r) => toItem(r, actor)),
    stores: stores.map((r) => ({ id: r.id, area: r.area, name: r.name, hours: r.hours ?? "" })),
    stats: {
      collected: stats[0]?.collected ?? 0,
      closeTotalMs: stats[0]?.close_total_ms ?? 0,
      closeCount: stats[0]?.close_count ?? 0,
    },
    champions: podium(toScores("collector"), liveCollectors),
    publisherChampions: podium(toScores("publisher"), livePublishers),
  };
}

export async function createPackage(
  communityId: string,
  input: NewPackageInput,
  actor: WriteActor
): Promise<void> {
  const ownerKey = actor.key;
  const { ownerName, ownerPhone } = input;
  const publisherId = collectorId(ownerName, ownerPhone);
  await db()`
    WITH created AS (
      INSERT INTO packages (community_id, area, store, description, package_number,
                            owner_name, owner_phone, owner_key, notes, urgent)
      VALUES (${communityId}, ${input.area}, ${input.store}, ${input.description},
              ${input.packageNumber}, ${ownerName}, ${ownerPhone}, ${ownerKey},
              ${input.notes}, ${input.urgent})
      RETURNING id
    )
    INSERT INTO scores (community_id, kind, person_id, name, count)
    SELECT ${communityId}, 'publisher', ${publisherId}, ${ownerName}, 1 FROM created
    ON CONFLICT (community_id, kind, person_id)
      DO UPDATE SET count = scores.count + 1, name = EXCLUDED.name`;
}

async function loadPackage(communityId: string, id: string): Promise<Row | null> {
  const [row] = await db()`
    SELECT id, status, received_at, owner_phone, owner_key, courier_phone, courier_key
    FROM packages
    WHERE id = ${id} AND community_id = ${communityId}`;
  return row ?? null;
}

// One statement, so the claim, the stats and the collector's score change
// together, and a package already taken by someone else is left alone.
export async function claimPackage(
  communityId: string,
  id: string,
  input: { courierName: string; courierPhone: string },
  actor: WriteActor
): Promise<boolean> {
  const courierKey = actor.key;
  const { courierName, courierPhone } = input;
  const courierId = collectorId(courierName, courierPhone);
  const [row] = await db()`
    WITH claimed AS (
      UPDATE packages
      SET status = 'claimed',
          courier_name = ${courierName},
          courier_phone = ${courierPhone},
          courier_id = ${courierId},
          courier_key = ${courierKey},
          claimed_at = now(),
          received_at = NULL,
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
// The courier/owner match guards against the claim changing hands meanwhile.
export async function releasePackage(
  communityId: string,
  id: string,
  actor: Actor
): Promise<boolean> {
  const row = await loadPackage(communityId, id);
  if (!row || row.status !== "claimed") return false;
  if (!packagePermissions(parties(row), actor).release) throw new HttpError(403, FORBIDDEN);

  const [result] = await db()`
    WITH released AS (
      UPDATE packages
      SET status = 'available', courier_name = NULL, courier_phone = NULL,
          courier_id = NULL, courier_key = NULL,
          courier_note = '', claimed_at = NULL, close_ms = NULL
      WHERE id = ${id} AND community_id = ${communityId} AND status = 'claimed'
        AND received_at IS NULL
        AND courier_key IS NOT DISTINCT FROM ${row.courier_key}
        AND courier_phone IS NOT DISTINCT FROM ${row.courier_phone}
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
  return result.n > 0;
}

export async function setCourierNote(
  communityId: string,
  id: string,
  note: string,
  actor: Actor
): Promise<void> {
  const row = await loadPackage(communityId, id);
  if (!row) throw new HttpError(404, "החבילה לא נמצאה.");
  if (!packagePermissions(parties(row), actor).note) throw new HttpError(403, FORBIDDEN);
  await db()`
    UPDATE packages SET courier_note = ${note}
    WHERE id = ${id} AND community_id = ${communityId}
      AND courier_key IS NOT DISTINCT FROM ${row.courier_key}
      AND courier_phone IS NOT DISTINCT FROM ${row.courier_phone}`;
}

export async function receivePackage(
  communityId: string,
  id: string,
  actor: Actor
): Promise<boolean> {
  const row = await loadPackage(communityId, id);
  if (!row || row.status !== "claimed" || row.received_at != null) return false;
  if (!packagePermissions(parties(row), actor).receive) throw new HttpError(403, FORBIDDEN);
  const rows = await db()`
    UPDATE packages SET received_at = now()
    WHERE id = ${id} AND community_id = ${communityId}
      AND status = 'claimed' AND received_at IS NULL
      AND courier_key IS NOT DISTINCT FROM ${row.courier_key}
      AND courier_phone IS NOT DISTINCT FROM ${row.courier_phone}
    RETURNING id`;
  return rows.length > 0;
}

export async function deletePackage(
  communityId: string,
  id: string,
  actor: Actor
): Promise<void> {
  const row = await loadPackage(communityId, id);
  if (!row) return;
  if (!packagePermissions(parties(row), actor).delete) throw new HttpError(403, FORBIDDEN);
  await db()`
    DELETE FROM packages
    WHERE id = ${id} AND community_id = ${communityId}
      AND owner_key IS NOT DISTINCT FROM ${row.owner_key}`;
}
