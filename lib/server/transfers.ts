import {
  DONE_TTL_MS,
  OPEN_TTL_MS,
  type NewTransferInput,
  type TransferItem,
  type TransferKind,
  type TransferStatus,
} from "../transfers";
import { db, toMs } from "./db";

export async function listTransfers(communityId: string): Promise<TransferItem[]> {
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
             status, owner_name, owner_phone, rider_name, rider_phone,
             created_at, matched_at
      FROM transfers
      WHERE community_id = ${communityId}
      ORDER BY created_at DESC`,
  ]);
  return rows.map((r) => ({
    id: r.id,
    kind: r.kind as TransferKind,
    destination: r.destination,
    description: r.description,
    whenText: r.when_text,
    forWhom: r.for_whom,
    notes: r.notes,
    urgent: r.urgent,
    status: r.status as TransferStatus,
    ownerName: r.owner_name,
    ownerPhone: r.owner_phone,
    riderName: r.rider_name,
    riderPhone: r.rider_phone,
    createdAt: toMs(r.created_at),
    matchedAt: toMs(r.matched_at),
  }));
}

export async function createTransfer(
  communityId: string,
  input: NewTransferInput
): Promise<void> {
  await db()`
    INSERT INTO transfers (community_id, kind, destination, description, when_text,
                           for_whom, notes, urgent, owner_name, owner_phone)
    VALUES (${communityId}, ${input.kind}, ${input.destination}, ${input.description},
            ${input.whenText}, ${input.forWhom}, ${input.notes}, ${input.urgent},
            ${input.ownerName}, ${input.ownerPhone})`;
}

// Only an open request can be matched, so two riders can't both take it.
export async function matchTransfer(
  communityId: string,
  id: string,
  riderName: string,
  riderPhone: string
): Promise<boolean> {
  const rows = await db()`
    UPDATE transfers
    SET status = 'matched', rider_name = ${riderName}, rider_phone = ${riderPhone},
        matched_at = now()
    WHERE id = ${id} AND community_id = ${communityId}
      AND status = 'open' AND kind = 'request'
    RETURNING id`;
  return rows.length > 0;
}

export async function unmatchTransfer(communityId: string, id: string): Promise<boolean> {
  const rows = await db()`
    UPDATE transfers
    SET status = 'open', rider_name = NULL, rider_phone = NULL, matched_at = NULL
    WHERE id = ${id} AND community_id = ${communityId} AND status = 'matched'
    RETURNING id`;
  return rows.length > 0;
}

export async function closeTransfer(communityId: string, id: string): Promise<void> {
  await db()`
    UPDATE transfers SET status = 'closed', matched_at = now()
    WHERE id = ${id} AND community_id = ${communityId}`;
}

export async function deleteTransfer(communityId: string, id: string): Promise<void> {
  await db()`DELETE FROM transfers WHERE id = ${id} AND community_id = ${communityId}`;
}
