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

export type PackageStatus = "available" | "claimed" | "delivered";

export interface PackageItem {
  id: string;
  description: string;
  pickupLocation: string;
  packageNumber: string;
  ownerName: string;
  ownerPhone: string;
  notes: string;
  status: PackageStatus;
  courierName: string | null;
  courierPhone: string | null;
  createdAt: number | null;
}

export interface NewPackageInput {
  description: string;
  pickupLocation: string;
  packageNumber: string;
  ownerName: string;
  ownerPhone: string;
  notes: string;
}

const COLLECTION = "packages";

function normalizeLocation(value: string): string {
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
        return {
          id: d.id,
          description: data.description ?? "",
          pickupLocation: data.pickupLocation ?? "",
          packageNumber: data.packageNumber ?? "",
          ownerName: data.ownerName ?? "",
          ownerPhone: data.ownerPhone ?? "",
          notes: data.notes ?? "",
          status: (data.status as PackageStatus) ?? "available",
          courierName: data.courierName ?? null,
          courierPhone: data.courierPhone ?? null,
          createdAt: created ? created.toMillis() : null,
        };
      });
      onData(items);
    },
    (err) => onError(err as Error)
  );
}

export async function createPackage(input: NewPackageInput): Promise<void> {
  const db = getDb();
  await addDoc(collection(db, COLLECTION), {
    description: input.description.trim(),
    pickupLocation: normalizeLocation(input.pickupLocation),
    packageNumber: input.packageNumber.trim(),
    ownerName: input.ownerName.trim(),
    ownerPhone: input.ownerPhone.trim(),
    notes: input.notes.trim(),
    status: "available" as PackageStatus,
    courierName: null,
    courierPhone: null,
    createdAt: serverTimestamp(),
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

export async function markDelivered(id: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTION, id), {
    status: "delivered" as PackageStatus,
  });
}

export async function unclaimPackage(id: string): Promise<void> {
  const db = getDb();
  await updateDoc(doc(db, COLLECTION, id), {
    status: "available" as PackageStatus,
    courierName: null,
    courierPhone: null,
  });
}

export async function deletePackage(id: string): Promise<void> {
  const db = getDb();
  await deleteDoc(doc(db, COLLECTION, id));
}
