export const OTHER_DESTINATION = "יעד אחר";

export const FIXED_DESTINATIONS: string[] = [
  "חומש",
  "ירושלים",
  "מודיעין",
  "קרית ספר",
  "תל אביב",
  "אריאל",
  "נתב״ג",
];

export const ALL_DESTINATIONS: string[] = [
  ...FIXED_DESTINATIONS,
  OTHER_DESTINATION,
];

export function isOtherDestination(value: string): boolean {
  return value === OTHER_DESTINATION;
}
