// Longest values the API accepts. Forms use the same numbers as `maxLength`,
// so the browser never sends something the server will reject.
export const MAX_LENGTH = {
  name: 100,
  phone: 30,
  // Areas, stores and transfer destinations.
  place: 100,
  // People often paste the courier's whole SMS here.
  packageNumber: 1000,
  notes: 1000,
  courierNote: 500,
  whenText: 100,
  forWhom: 100,
} as const;
