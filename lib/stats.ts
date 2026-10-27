import { toIntlPhone } from "./whatsapp";

export interface CollectorScore {
  id: string;
  name: string;
  count: number;
}

export interface GlobalStats {
  // Packages ever collected; deleting a package never lowers it.
  collected: number;
  // Running sum/count of publish→claim times, for the average close time.
  closeTotalMs: number;
  closeCount: number;
}

// Leaderboard key: the phone (falls back to name) so the same person always
// maps to the same score.
export function collectorId(name: string, phone: string): string {
  return toIntlPhone(phone) || name.trim();
}

// Average publish→claim time. Prefers the all-time running total, but until
// it has at least as many samples as the packages currently claimed on the
// board (e.g. right after tracking began) uses those live durations instead.
export function averageCloseMs(
  stats: GlobalStats,
  liveDurations: number[]
): number | null {
  if (stats.closeCount > 0 && stats.closeCount >= liveDurations.length) {
    return stats.closeTotalMs / stats.closeCount;
  }
  if (liveDurations.length === 0) return null;
  return liveDurations.reduce((sum, ms) => sum + ms, 0) / liveDurations.length;
}

// Rank by the higher of (all-time stored score, packages currently claimed
// on the board). That way people who collected before per-collector scoring
// existed still appear correctly, without double-counting.
export function rankCollectors(
  stored: CollectorScore[],
  live: CollectorScore[],
  topN: number
): CollectorScore[] {
  const merged = new Map<string, CollectorScore>();
  for (const c of stored) {
    if (!c.id) continue;
    merged.set(c.id, { id: c.id, name: c.name, count: c.count });
  }
  for (const c of live) {
    if (!c.id) continue;
    const prev = merged.get(c.id);
    merged.set(c.id, {
      id: c.id,
      name: prev?.name || c.name,
      count: Math.max(prev?.count ?? 0, c.count),
    });
  }
  return Array.from(merged.values())
    .filter((c) => c.count > 0)
    .sort(
      (a, b) => b.count - a.count || a.name.localeCompare(b.name, "he")
    )
    .slice(0, topN);
}
