// Short Hebrew "time ago" label for a millisecond timestamp.
export function timeAgo(ms: number | null | undefined): string {
  if (!ms) return "";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "עכשיו";

  const min = Math.floor(diff / 60_000);
  if (min < 60) return `לפני ${min} דק׳`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return `לפני ${hr} שע׳`;

  const days = Math.floor(hr / 24);
  if (days === 1) return "אתמול";
  if (days < 7) return `לפני ${days} ימים`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `לפני ${weeks} שב׳`;

  const months = Math.floor(days / 30);
  return `לפני ${months} חוד׳`;
}

// Short Hebrew label for a duration, e.g. "40 דק׳", "3 שע׳ ו-20 דק׳".
export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60_000);
  if (min < 1) return "פחות מדקה";
  if (min < 60) return `${min} דק׳`;

  const hr = Math.floor(min / 60);
  const restMin = min % 60;
  if (hr < 24) return restMin ? `${hr} שע׳ ו-${restMin} דק׳` : `${hr} שע׳`;

  const days = Math.floor(hr / 24);
  const restHr = hr % 24;
  const dayLabel = days === 1 ? "יום" : `${days} ימים`;
  return restHr ? `${dayLabel} ו-${restHr} שע׳` : dayLabel;
}
