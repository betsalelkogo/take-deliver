import { api, requestRefresh } from "./api";

// Bucket for one-off locations that don't belong to a known area.
export const ADHOC_AREA = "מיקום מזדמן";

export function isAdhocArea(area: string): boolean {
  return area === ADHOC_AREA;
}

export interface StoreItem {
  id: string;
  area: string;
  name: string;
}

// A community's first-level areas: its fixed list, then every other area that
// has at least one pinned store.
export function areasFor(fixedAreas: string[], stores: StoreItem[]): string[] {
  const extra = new Set<string>();
  for (const s of stores) {
    const area = s.area.trim();
    if (area && !isAdhocArea(area) && !fixedAreas.includes(area)) extra.add(area);
  }
  return [
    ...fixedAreas,
    ...Array.from(extra).sort((a, b) => a.localeCompare(b, "he")),
  ];
}

function storesPath(communityId: string, id?: string): string {
  const base = `/api/communities/${encodeURIComponent(communityId)}/stores`;
  return id ? `${base}/${encodeURIComponent(id)}` : base;
}

export async function createStore(
  communityId: string,
  area: string,
  name: string
): Promise<void> {
  await api(storesPath(communityId), { method: "POST", body: { area, name } });
  requestRefresh();
}

export async function deleteStore(communityId: string, id: string): Promise<void> {
  await api(storesPath(communityId, id), { method: "DELETE" });
  requestRefresh();
}
