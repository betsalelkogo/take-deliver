import { ApiError, api } from "./api";

export interface CommunitySummary {
  id: string;
  name: string;
}

export interface Community extends CommunitySummary {
  // Offered up front in the forms. Other areas/destinations come from use.
  areas: string[];
  destinations: string[];
}

// The community everyone used before communities existed.
export const LEGACY_COMMUNITY_ID = "kerem-reim";

export const COMMUNITY_NAME_MIN = 2;
export const COMMUNITY_NAME_MAX = 60;

const SAVED_KEY = "td_community_v1";
// Device keys written by the app before communities existed.
const PRE_COMMUNITY_KEYS = ["td_identity_v1", "td_board_v1", "td_intro_dismissed_v2"];

export function normalizeCommunityName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function sameCommunityName(a: string, b: string): boolean {
  return (
    normalizeCommunityName(a).toLowerCase() ===
    normalizeCommunityName(b).toLowerCase()
  );
}

export async function listCommunities(): Promise<CommunitySummary[]> {
  const list = await api<CommunitySummary[]>("/api/communities");
  return list.sort((a, b) => a.name.localeCompare(b.name, "he"));
}

export async function getCommunity(id: string): Promise<Community | null> {
  try {
    return await api<Community>(`/api/communities/${encodeURIComponent(id)}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}

export async function createCommunity(name: string): Promise<string> {
  const { id } = await api<{ id: string }>("/api/communities", {
    method: "POST",
    body: { name: normalizeCommunityName(name) },
  });
  return id;
}

// The community this device last opened. Devices that used the app before
// communities existed belonged to Kerem Reim.
export function readSavedCommunityId(): string | null {
  try {
    const saved = localStorage.getItem(SAVED_KEY);
    if (saved) return saved;
    return PRE_COMMUNITY_KEYS.some((k) => localStorage.getItem(k))
      ? LEGACY_COMMUNITY_ID
      : null;
  } catch {
    return null;
  }
}

export function saveCommunityId(id: string): void {
  try {
    localStorage.setItem(SAVED_KEY, id);
  } catch {
    // ignore storage errors
  }
}

export function forgetCommunityId(id: string): void {
  try {
    if (localStorage.getItem(SAVED_KEY) === id) localStorage.removeItem(SAVED_KEY);
  } catch {
    // ignore storage errors
  }
}
