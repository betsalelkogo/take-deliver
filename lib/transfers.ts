import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { getDb } from "./firebase";

export type TransferKind = "request" | "trip";
export type TransferStatus = "open" | "matched" | "closed";

export interface TransferItem {
  id: string;
  kind: TransferKind;
  destination: string;
  description: string;
  whenText: string;
  forWhom: string;
  notes: string;
  urgent: boolean;
  status: TransferStatus;
  ownerName: string;
  ownerPhone: string;
  riderName: string | null;
  riderPhone: string | null;
  createdAt: number | null;
  matchedAt: number | null;
}

export interface NewTransferInput {
  kind: TransferKind;
  destination: string;
  description: string;
  whenText: string;
  forWhom: string;
  notes: string;
  urgent: boolean;
  ownerName: string;
  ownerPhone: string;
}

const COLLECTION = "transfers";

export const OPEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const DONE_TTL_MS = 2 * 24 * 60 * 60 * 1000;

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function subscribeToTransfers(
  onData: (items: TransferItem[]) => void,
  onError: (error: Error) => void
): () => void {
  const db = getDb();
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: TransferItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        const created = data.createdAt as Timestamp | null | undefined;
        const matched = data.matchedAt as Timestamp | null | undefined;
        const rawKind = data.kind === "trip" ? "trip" : "request";
        const rawStatus = data.status as string | undefined;
        const status: TransferStatus =
          rawStatus === "matched" || rawStatus === "closed"
            ? rawStatus
            : "open";
        return {
          id: d.id,
          kind: rawKind,
          destination: data.destination ?? "",
          description: data.description ?? "",
          whenText: data.whenText ?? "",
          forWhom: data.forWhom ?? "",
          notes: data.notes ?? "",
          urgent: data.urgent ?? false,
          status,
          ownerName: data.ownerName ?? "",
          ownerPhone: data.ownerPhone ?? "",
          riderName: data.riderName ?? null,
          riderPhone: data.riderPhone ?? null,
          createdAt: created ? created.toMillis() : null,
          matchedAt: matched ? matched.toMillis() : null,
        };
      });
      onData(items);
    },
    (err) => onError(err as Error)
  );
}

export async function createTransfer(input: NewTransferInput): Promise<void> {
  const db = getDb();
  await addDoc(collection(db, COLLECTION), {
    kind: input.kind,
    destination: normalize(input.destination),
    description: input.description.trim(),
    whenText: input.whenText.trim(),
    forWhom: input.forWhom.trim(),
    notes: input.notes.trim(),
    urgent: input.urgent ?? false,
    status: "open" as TransferStatus,
    ownerName: input.ownerName.trim(),
    ownerPhone: input.ownerPhone.trim(),
    riderName: null,
    riderPhone: null,
    matchedAt: null,
    createdAt: serverTimestamp(),
  });
}

export async function matchTransfer(
  id: string,
  riderName: string,
  riderPhone: string
): Promise<boolean> {
  const db = getDb();
  const ref = doc(db, COLLECTION, id);
  const name = riderName.trim();
  const phone = riderPhone.trim();

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    if (!data) throw new Error("המודעה לא נמצאה");
    if (data.status !== "open" || data.kind !== "request") return false;
    tx.update(ref, {
      status: "matched" as TransferStatus,
      riderName: name,
      riderPhone: phone,
      matchedAt: serverTimestamp(),
    });
    return true;
  });
}

export async function unmatchTransfer(id: string): Promise<boolean> {
  const db = getDb();
  const ref = doc(db, COLLECTION, id);

  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const data = snap.data();
    if (!data || data.status !== "matched") return false;
    tx.update(ref, {
      status: "open" as TransferStatus,
      riderName: null,
      riderPhone: null,
      matchedAt: null,
    });
    return true;
  });
}

export async function closeTransfer(id: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTION, id), {
    status: "closed" as TransferStatus,
    matchedAt: serverTimestamp(),
  });
}

export async function deleteTransfer(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, COLLECTION, id));
}

export async function purgeExpiredTransfers(
  items: TransferItem[]
): Promise<void> {
  const now = Date.now();
  const expired = items.filter((it) => {
    const created = it.createdAt ?? Infinity;
    if (it.status === "open") return created < now - OPEN_TTL_MS;
    const doneAt = it.matchedAt ?? created;
    return doneAt < now - DONE_TTL_MS;
  });
  await Promise.all(expired.map((it) => deleteTransfer(it.id)));
}
