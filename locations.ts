import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { getDb } from "./firebase";

// Bucket for one-off locations that don't belong to a known area.
export const ADHOC_AREA = "מיקום מזדמן";

// First-level areas (most pickups are recurring). Editable here.
export const FIXED_AREAS: string[] = [
  "קרית ספר",
  "שילת",
  "ישפרו",
  "מודיעין",
  "טלמונים",
  "מכולת טלמון",
];

export const ALL_AREAS: string[] = [...FIXED_AREAS, ADHOC_AREA];

export function isAdhocArea(area: string): boolean {
  return area === ADHOC_AREA;
}

export interface StoreItem {
  id: string;
  area: string;
  name: string;
}

const COLLECTION = "stores";

export function subscribeToStores(
  onData: (items: StoreItem[]) => void,
  onError: (error: Error) => void
): () => void {
  const db = getDb();
  const q = query(collection(db, COLLECTION), orderBy("name", "asc"));
  return onSnapshot(
    q,
    (snapshot) => {
      onData(
        snapshot.docs.map((d) => ({
          id: d.id,
          area: d.data().area ?? "",
          name: d.data().name ?? "",
        }))
      );
    },
    (err) => onError(err as Error)
  );
}

export async function createStore(area: string, name: string): Promise<void> {
  const db = getDb();
  await addDoc(collection(db, COLLECTION), {
    area: area.trim(),
    name: name.trim(),
    createdAt: serverTimestamp(),
  });
}

export async function deleteStore(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, COLLECTION, id));
}
