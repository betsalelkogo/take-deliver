import type { PackageItem } from "./packages";
import type { TransferItem } from "./transfers";

// Convert a locally-formatted (Israeli) phone number to an international
// digits-only form suitable for wa.me links. Defaults to +972.
export function toIntlPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  // Local mobile typed without a leading 0 (e.g. 501234567).
  if (digits.length === 9 && digits.startsWith("5")) return "972" + digits;
  return digits;
}

// A phone is considered valid if it contains at least 9 digits.
export function isValidPhone(phone: string): boolean {
  return phone.replace(/\D/g, "").length >= 9;
}

export function whatsappLink(phone: string, text: string): string {
  const intl = toIntlPhone(phone);
  return `https://wa.me/${intl}?text=${encodeURIComponent(text)}`;
}

// Message sent to the owner at the moment a neighbour marks a package as taken.
export function takenMessage(item: PackageItem, collectorName: string): string {
  const what = item.description ? ` (${item.description})` : "";
  const place = [item.area, item.store].filter(Boolean).join(" · ");
  const hello = item.ownerName ? `היי ${item.ownerName}, ` : "היי, ";
  const note = item.courierNote ? ` הערה: ${item.courierNote}` : "";
  return (
    `${hello}אני ${collectorName} ואני אוסף לך את החבילה${what}` +
    `${place ? ` מ-${place}` : ""}.${note}`
  );
}

// Message sent from the owner to the collector (to coordinate the handoff).
export function messageToCollector(item: PackageItem): string {
  const what = item.description ? ` (${item.description})` : "";
  const hi = item.courierName ? `היי ${item.courierName}, ` : "היי, ";
  const who = item.ownerName ? `כאן ${item.ownerName}. ` : "";
  return `${hi}${who}תודה שאספת לי את החבילה${what}. אפשר לתאם מסירה?`;
}

function transferWhen(item: TransferItem): string {
  return item.whenText ? ` (${item.whenText})` : "";
}

function transferWhat(item: TransferItem): string {
  return item.description ? ` (${item.description})` : "";
}

export function rideOfferMessage(
  item: TransferItem,
  riderName: string
): string {
  const hello = item.ownerName ? `היי ${item.ownerName}, ` : "היי, ";
  const dest = item.destination ? ` ל${item.destination}` : "";
  return (
    `${hello}אני ${riderName} ונוסע${dest}${transferWhen(item)}.` +
    ` אני יכול לקחת את מה שפרסמת${transferWhat(item)}.`
  );
}

export function rideThanksMessage(item: TransferItem): string {
  const hi = item.riderName ? `היי ${item.riderName}, ` : "היי, ";
  const who = item.ownerName ? `כאן ${item.ownerName}. ` : "";
  const dest = item.destination ? ` ל${item.destination}` : "";
  return `${hi}${who}תודה שאתה לוקח את ההעברה${dest}${transferWhat(item)}. נתאם מסירה?`;
}

export function joinTripMessage(item: TransferItem, senderName: string): string {
  const hello = item.ownerName ? `היי ${item.ownerName}, ` : "היי, ";
  const dest = item.destination ? ` ל${item.destination}` : "";
  const who = senderName ? ` כאן ${senderName}.` : "";
  return (
    `${hello}יש לי משהו להעביר${dest}${transferWhen(item)}.` +
    `${who} אפשר להצטרף לנסיעה שלך?`
  );
}
