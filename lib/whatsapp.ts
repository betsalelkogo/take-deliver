import type { PackageItem } from "./packages";

// Convert a locally-formatted (Israeli) phone number to an international
// digits-only form suitable for wa.me links. Defaults to +972.
export function toIntlPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  return digits;
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
