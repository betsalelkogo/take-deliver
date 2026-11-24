import {
  DONE_TTL_MS,
  OPEN_TTL_MS,
  type NewTransferInput,
  type TransferItem,
  type TransferKind,
  type TransferStatus,
} from "../transfers";
import type { Actor, WriteActor } from "./actor";
import { db, toMs } from "./db";
import { HttpError } from "./http";
import { transferPermissions, transferRoles, type TransferParties } from "./permissions";

const FORBIDDEN = "רק מי שפרסם או נוסע יכול לעשות את זה.";

type Row = Record<string, any>;

function parties(r: Row): TransferParties {
  return {
    kind: r.kind as TransferKind,
    status: r.status as TransferStatus,
    owner: { key: r.owner_key, phone: r.owner_phone },
    rider: { key: r.rider_key, phone: r.rider_phone },
  };
}

export async function listTransfers(communityId: string, actor: Actor): Promise<TransferItem[]> {
  const sql = db();
  const [, rows] = await sql.transaction([
    sql`
      DELETE FROM transfers
      WHERE community_id = ${communityId}
        AND (
          (status = 'open'
            AND created_at < now() - make_interval(secs => ${OPEN_TTL_MS / 1000}))
          OR (status <> 'open'
            AND COALESCE(matched_at, created_at) < now() - make_interval(secs => ${DONE_TTL_MS / 1000}))
        )`,
    sql`
      SELECT id, kind, destination, description, when_text, for_whom, notes, urgent,
             status, owner_name, owner_phone, owner_key, rider_name, rider_phone,
             rider_key, created_at, matched_at
      FROM transfers
      WHERE community_id = ${communityId}
      ORDER BY created_at DESC`,
  ]);
  return rows.map((r) => {
    const t = parties(r);
    const can = transferPermissions(t, actor);
    return {
      id: r.id,
      kind: t.kind,
      destination: r.destination,
      description: r.description,
      whenText: r.when_text,
      forWhom: r.for_whom,
      notes: r.notes,
      urgent: r.urgent,
      status: t.status,
      ownerName: r.owner_name,
      ownerPhone: can.seeOwnerPhone ? r.owner_phone : null,
      riderName: r.rider_name,
      riderPhone: can.seeRiderPhone ? r.rider_phone : null,
      createdAt: toMs(r.created_at),
      matchedAt: toMs(r.matched_at),
      mine: transferRoles(t, actor),
      can: { delete: can.delete, close: can.close, unmatch: can.unmatch },
    };
  });
}

export async function createTransfer(
  communityId: string,
  input: NewTransferInput,
  actor: WriteActor
): Promise<void> {
  const ownerKey = actor.key;
  const { ownerName, ownerPhone } = input;
  await db()`
    INSERT INTO transfers (community_id, kind, destination, description, when_text,
                           for_whom, notes, urgent, owner_name, owner_phone, owner_key)
    VALUES (${communityId}, ${input.kind}, ${input.destination}, ${input.description},
            ${input.whenText}, ${input.forWhom}, ${input.notes}, ${input.urgent},
            ${ownerName}, ${ownerPhone}, ${ownerKey})`;
}

async function loadTransfer(communityId: string, id: string): Promise<Row | null> {
  const [row] = await db()`
    SELECT id, kind, status, owner_phone, owner_key, rider_phone, rider_key
    FROM transfers
    WHERE id = ${id} AND community_id = ${communityId}`;
  return row ?? null;
}

// Only an open request can be matched, so two riders can't both take it.
export async function matchTransfer(
  communityId: string,
  id: string,
  input: { riderName: string; riderPhone: string },
  actor: WriteActor
): Promise<boolean> {
  const riderKey = actor.key;
  const { riderName, riderPhone } = input;
  const rows = await db()`
    UPDATE transfers
    SET status = 'matched', rider_name = ${riderName}, rider_phone = ${riderPhone},
        rider_key = ${riderKey}, matched_at = now()
    WHERE id = ${id} AND community_id = ${communityId}
      AND status = 'open' AND kind = 'request'
    RETURNING id`;
  return rows.length > 0;
}

export async function unmatchTransfer(
  communityId: string,
  id: string,
  actor: Actor
): Promise<boolean> {
  const row = await loadTransfer(communityId, id);
  if (!row || row.status !== "matched") return false;
  if (!transferPermissions(parties(row), actor).unmatch) throw new HttpError(403, FORBIDDEN);
  const rows = await db()`
    UPDATE transfers
    SET status = 'open', rider_name = NULL, rider_phone = NULL, rider_key = NULL,
        matched_at = NULL
    WHERE id = ${id} AND community_id = ${communityId} AND status = 'matched'
      AND rider_key IS NOT DISTINCT FROM ${row.rider_key}
      AND rider_phone IS NOT DISTINCT FROM ${row.rider_phone}
    RETURNING id`;
  return rows.length > 0;
}

export async function closeTransfer(
  communityId: string,
  id: string,
  actor: Actor
): Promise<void> {
  const row = await loadTransfer(communityId, id);
  if (!row) throw new HttpError(404, "המודעה לא נמצאה.");
  if (!transferPermissions(parties(row), actor).close) throw new HttpError(403, FORBIDDEN);
  await db()`
    UPDATE transfers SET status = 'closed', matched_at = now()
    WHERE id = ${id} AND community_id = ${communityId}
      AND owner_key IS NOT DISTINCT FROM ${row.owner_key}`;
}

export async function deleteTransfer(
  communityId: string,
  id: string,
  actor: Actor
): Promise<void> {
  const row = await loadTransfer(communityId, id);
  if (!row) return;
  if (!transferPermissions(parties(row), actor).delete) throw new HttpError(403, FORBIDDEN);
  await db()`
    DELETE FROM transfers
    WHERE id = ${id} AND community_id = ${communityId}
      AND owner_key IS NOT DISTINCT FROM ${row.owner_key}`;
}
