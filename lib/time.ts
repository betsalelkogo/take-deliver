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
