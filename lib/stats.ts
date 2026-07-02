import { doc, increment, onSnapshot, setDoc } from "firebase/firestore";
import { getDb } from "./firebase";

// A single persistent counter of all packages ever collected. Because packages
// can be deleted, we track this separately so the total never regresses.
const STATS_COLLECTION = "stats";
const STATS_DOC = "global";

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
