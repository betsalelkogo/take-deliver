import {
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
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
// name) so the same person always maps to the same score doc.
export async function bumpCollectorScore(
  name: string,
  phone: string,
  by = 1
): Promise<void> {
  const id = toIntlPhone(phone) || name.trim();
  if (!id) return;
  const db = getDb();
  await setDoc(
    doc(db, COLLECTORS_COLLECTION, id),
    { name: name.trim(), count: increment(by) },
    { merge: true }
  );
}

export function subscribeTopCollectors(
  topN: number,
  onData: (list: CollectorScore[]) => void
): () => void {
  const db = getDb();
  const q = query(
    collection(db, COLLECTORS_COLLECTION),
    orderBy("count", "desc"),
    limit(topN)
  );
  return onSnapshot(
    q,
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
