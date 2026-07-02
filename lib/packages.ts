import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { getDb } from "./firebase";
import { ADHOC_AREA } from "./locations";

export type PackageStatus = "available" | "claimed" | "delivered";

export interface PackageItem {
  id: string;
  area: string;
  store: string;
  description: string;
  packageNumber: string;
  ownerName: string;
  ownerPhone: string;
  notes: string;
  status: PackageStatus;
  courierName: string | null;
  courierPhone: string | null;
  courierNote: string;
  createdAt: number | null;
  deliveredAt: number | null;
}

export interface NewPackageInput {
  area: string;
  store: string;
  description: string;
  packageNumber: string;
  ownerName: string;
  ownerPhone: string;
  notes: string;
}

const COLLECTION = "packages";

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function subscribeToPackages(
  onData: (items: PackageItem[]) => void,
  onError: (error: Error) => void
): () => void {
  const db = getDb();
  const q = query(collection(db, COLLECTION), orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const items: PackageItem[] = snapshot.docs.map((d) => {
        const data = d.data();
        const created = data.createdAt as Timestamp | null | undefined;
        const delivered = data.deliveredAt as Timestamp | null | undefined;
        // Legacy docs only had `pickupLocation`; map them into the ad-hoc area.
        const legacyLocation = data.pickupLocation ?? "";
        return {
          id: d.id,
          area: data.area ?? (legacyLocation ? ADHOC_AREA : ""),
          store: data.store ?? legacyLocation,
          description: data.description ?? "",
          packageNumber: data.packageNumber ?? "",
          ownerName: data.ownerName ?? "",
          ownerPhone: data.ownerPhone ?? "",
          notes: data.notes ?? "",
          status: (data.status as PackageStatus) ?? "available",
          courierName: data.courierName ?? null,
          courierPhone: data.courierPhone ?? null,
          courierNote: data.courierNote ?? "",
          createdAt: created ? created.toMillis() : null,
          deliveredAt: delivered ? delivered.toMillis() : null,
        };
      });
      onData(items);
    },
    (err) => onError(err as Error)
  );
}

export async function createPackage(input: NewPackageInput): Promise<void> {
  const db = getDb();
  const store = normalizeName(input.store);
  const area = normalizeName(input.area);
  await addDoc(collection(db, COLLECTION), {
    area,
    store,
    // Kept for backward compatibility with any older readers.
    pickupLocation: store ? `${area} · ${store}` : area,
    description: input.description.trim(),
    packageNumber: input.packageNumber.trim(),
    ownerName: input.ownerName.trim(),
    ownerPhone: input.ownerPhone.trim(),
    notes: input.notes.trim(),
    status: "available" as PackageStatus,
    courierName: null,
    courierPhone: null,
    courierNote: "",
    createdAt: serverTimestamp(),
    deliveredAt: null,
  });
}

export async function claimPackage(
  id: string,
  courierName: string,
  courierPhone: string
): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTION, id), {
    status: "claimed" as PackageStatus,
    courierName: courierName.trim(),
    courierPhone: courierPhone.trim(),
  });
}

export async function claimManyPackages(
  ids: string[],
  courierName: string,
  courierPhone: string
): Promise<void> {
  await Promise.all(ids.map((id) => claimPackage(id, courierName, courierPhone)));
}

export async function setCourierNote(id: string, note: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTION, id), {
    courierNote: note.trim(),
  });
}

export async function markDelivered(id: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTION, id), {
    status: "delivered" as PackageStatus,
    deliveredAt: serverTimestamp(),
  });
}

export async function unclaimPackage(id: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTION, id), {
    status: "available" as PackageStatus,
    courierName: null,
    courierPhone: null,
    courierNote: "",
    deliveredAt: null,
  });
}

export async function deletePackage(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, COLLECTION, id));
}
