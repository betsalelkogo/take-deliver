import { api, poll, requestRefresh } from "./api";
import type { StoreItem } from "./locations";
import type { CollectorScore, GlobalStats } from "./stats";

export type PackageStatus = "available" | "claimed";

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
  urgent: boolean;
  createdAt: number | null;
  claimedAt: number | null;
}

// Everything the pickup board shows, fetched in one request.
export interface PackageBoardData {
  packages: PackageItem[];
  stores: StoreItem[];
  stats: GlobalStats;
  topCollectors: CollectorScore[];
  topPublishers: CollectorScore[];
}

// Taken packages are auto-removed this long after being claimed.
export const CLAIMED_TTL_MS = 2 * 24 * 60 * 60 * 1000; // 2 days
// Untaken packages leave the board after this long.
export const AVAILABLE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 1 month

export interface NewPackageInput {
  area: string;
  store: string;
  description: string;
  packageNumber: string;
  ownerName: string;
  ownerPhone: string;
  notes: string;
  urgent: boolean;
}

function packagesPath(communityId: string, id?: string): string {
  const base = `/api/communities/${encodeURIComponent(communityId)}/packages`;
  return id ? `${base}/${encodeURIComponent(id)}` : base;
}

export function subscribeToPackageBoard(
  communityId: string,
  onData: (data: PackageBoardData) => void,
  onError: (error: Error) => void
): () => void {
  return poll(
    () => api<PackageBoardData>(packagesPath(communityId)),
    onData,
    onError
  );
}

export async function createPackage(
  communityId: string,
  input: NewPackageInput
): Promise<void> {
  await api(packagesPath(communityId), { method: "POST", body: input });
  requestRefresh();
}

// Resolves false if someone else already took the package.
export async function claimPackage(
  communityId: string,
  id: string,
  courierName: string,
  courierPhone: string
): Promise<boolean> {
  const { ok } = await api<{ ok: boolean }>(packagesPath(communityId, id), {
    method: "PATCH",
    body: { action: "claim", courierName, courierPhone },
  });
  requestRefresh();
  return ok;
}

export async function unclaimPackage(
  communityId: string,
  id: string
): Promise<boolean> {
  const { ok } = await api<{ ok: boolean }>(packagesPath(communityId, id), {
    method: "PATCH",
    body: { action: "release" },
  });
  requestRefresh();
  return ok;
}

export async function setCourierNote(
  communityId: string,
  id: string,
  note: string
): Promise<void> {
  await api(packagesPath(communityId, id), {
    method: "PATCH",
    body: { action: "note", note },
  });
  requestRefresh();
}

export async function deletePackage(communityId: string, id: string): Promise<void> {
  await api(packagesPath(communityId, id), { method: "DELETE" });
  requestRefresh();
}
