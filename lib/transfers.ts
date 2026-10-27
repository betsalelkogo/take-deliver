import { api, poll, requestRefresh } from "./api";

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

// Open posts leave after OPEN_TTL_MS; matched/closed ones after DONE_TTL_MS.
export const OPEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const DONE_TTL_MS = 2 * 24 * 60 * 60 * 1000;

function transfersPath(communityId: string, id?: string): string {
  const base = `/api/communities/${encodeURIComponent(communityId)}/transfers`;
  return id ? `${base}/${encodeURIComponent(id)}` : base;
}

export function subscribeToTransfers(
  communityId: string,
  onData: (items: TransferItem[]) => void,
  onError: (error: Error) => void
): () => void {
  return poll(
    () => api<TransferItem[]>(transfersPath(communityId)),
    onData,
    onError
  );
}

export async function createTransfer(
  communityId: string,
  input: NewTransferInput
): Promise<void> {
  await api(transfersPath(communityId), { method: "POST", body: input });
  requestRefresh();
}

// Resolves false if the request was already taken.
export async function matchTransfer(
  communityId: string,
  id: string,
  riderName: string,
  riderPhone: string
): Promise<boolean> {
  const { ok } = await api<{ ok: boolean }>(transfersPath(communityId, id), {
    method: "PATCH",
    body: { action: "match", riderName, riderPhone },
  });
  requestRefresh();
  return ok;
}

export async function unmatchTransfer(
  communityId: string,
  id: string
): Promise<boolean> {
  const { ok } = await api<{ ok: boolean }>(transfersPath(communityId, id), {
    method: "PATCH",
    body: { action: "unmatch" },
  });
  requestRefresh();
  return ok;
}

export async function closeTransfer(communityId: string, id: string): Promise<void> {
  await api(transfersPath(communityId, id), {
    method: "PATCH",
    body: { action: "close" },
  });
  requestRefresh();
}

export async function deleteTransfer(communityId: string, id: string): Promise<void> {
  await api(transfersPath(communityId, id), { method: "DELETE" });
  requestRefresh();
}
