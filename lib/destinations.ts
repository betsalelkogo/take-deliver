export const OTHER_DESTINATION = "יעד אחר";

export function isOtherDestination(value: string): boolean {
  return value === OTHER_DESTINATION;
}

// A community's destinations: its fixed list, then any other destination
// already used on its board.
export function destinationsFor(
  fixedDestinations: string[],
  used: string[]
): string[] {
  const extra = new Set<string>();
  for (const d of used) {
    const dest = d.trim();
    if (dest && !fixedDestinations.includes(dest)) extra.add(dest);
  }
  return [
    ...fixedDestinations,
    ...Array.from(extra).sort((a, b) => a.localeCompare(b, "he")),
  ];
}
