import {
  collection,
  doc,
  increment,
  onSnapshot,
  runTransaction,
  setDoc,
  type DocumentReference,
  type DocumentSnapshot,
  type Transaction,
} from "firebase/firestore";
import { getDb } from "./firebase";
import { toIntlPhone } from "./whatsapp";

// A single persistent counter of all packages ever collected. Because packages
// can be deleted, we track this separately so the total never regresses.
const STATS_COLLECTION = "stats";
const STATS_DOC = "global";
const COLLECTORS_COLLECTION = "collectors";

export interface CollectorScore {
  id: string;
  name: string;
  count: number;
}

export function collectorId(name: string, phone: string): string {
  return toIntlPhone(phone) || name.trim();
}

export type CollectTxState = {
  statsRef: DocumentReference;
  collectorRef: DocumentReference | null;
  statsSnap: DocumentSnapshot;
  collectorSnap: DocumentSnapshot | null;
};

// Must be called before any writes in the same transaction.
export async function readCollectState(
  tx: Transaction,
  name: string,
  phone: string
): Promise<CollectTxState> {
  const db = getDb();
  const statsRef = doc(db, STATS_COLLECTION, STATS_DOC);
  const id = collectorId(name, phone);
  const collectorRef = id ? doc(db, COLLECTORS_COLLECTION, id) : null;
  const statsSnap = await tx.get(statsRef);
  const collectorSnap = collectorRef ? await tx.get(collectorRef) : null;
  return { statsRef, collectorRef, statsSnap, collectorSnap };
}

export function writeCollectDelta(
  tx: Transaction,
  state: CollectTxState,
  name: string,
  by: number
): void {
  const collected = Math.max(
    0,
    ((state.statsSnap.data()?.collected as number) ?? 0) + by
  );
  tx.set(state.statsRef, { collected }, { merge: true });

  if (!state.collectorRef) return;
  if (by < 0 && !state.collectorSnap?.exists()) return;

  const count = Math.max(
    0,
    ((state.collectorSnap?.data()?.count as number) ?? 0) + by
  );
  tx.set(
    state.collectorRef,
    {
      name: name.trim() || (state.collectorSnap?.data()?.name as string) || "",
      count,
    },
    { merge: true }
  );
}

export function subscribeToCollectedCount(
  onData: (count: number) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getDb();
  return onSnapshot(
    doc(db, STATS_COLLECTION, STATS_DOC),
    (snap) => onData((snap.data()?.collected as number) ?? 0),
    (err) => onError?.(err as Error)
  );
}

export async function incrementCollectedCount(by = 1): Promise<void> {
  const db = getDb();
  await setDoc(
    doc(db, STATS_COLLECTION, STATS_DOC),
    { collected: increment(by) },
    { merge: true }
  );
}

// Per-collector running total, keyed by the collector's phone (falls back to
// name) so the same person always maps to the same score doc. Floors at 0 so
// releasing a package that was claimed before scoring existed cannot go negative.
export async function bumpCollectorScore(
  name: string,
  phone: string,
  by = 1
): Promise<void> {
  const id = collectorId(name, phone);
  if (!id) return;
  const db = getDb();
  const ref = doc(db, COLLECTORS_COLLECTION, id);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const current = (snap.data()?.count as number) ?? 0;
    const next = Math.max(0, current + by);
    tx.set(
      ref,
      {
        name: name.trim() || (snap.data()?.name as string) || "",
        count: next,
      },
      { merge: true }
    );
  });
}

export function subscribeCollectors(
  onData: (list: CollectorScore[]) => void
): () => void {
  const db = getDb();
  return onSnapshot(
    collection(db, COLLECTORS_COLLECTION),
    (snap) =>
      onData(
        snap.docs.map((d) => ({
          id: d.id,
          name: (d.data().name as string) ?? "",
          count: (d.data().count as number) ?? 0,
        }))
      ),
    () => {}
  );
}

// Rank by the higher of (all-time stored score, packages currently claimed
// on the board). That way people who collected before per-collector scoring
// existed still appear correctly, without double-counting.
export function rankCollectors(
  stored: CollectorScore[],
  live: CollectorScore[],
  topN: number
): CollectorScore[] {
  const merged = new Map<string, CollectorScore>();
  for (const c of stored) {
    if (!c.id) continue;
    merged.set(c.id, { id: c.id, name: c.name, count: c.count });
  }
  for (const c of live) {
    if (!c.id) continue;
    const prev = merged.get(c.id);
    merged.set(c.id, {
      id: c.id,
      name: prev?.name || c.name,
      count: Math.max(prev?.count ?? 0, c.count),
    });
  }
  return Array.from(merged.values())
    .filter((c) => c.count > 0)
    .sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, "he")
    )
    .slice(0, topN);
}
