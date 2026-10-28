import { z } from "zod";
import { COMMUNITY_NAME_MAX, COMMUNITY_NAME_MIN } from "../communities";
import { MAX_LENGTH } from "../limits";
import { isValidPhone } from "../whatsapp";

const collapse = (value: string) => value.trim().replace(/\s+/g, " ");

const text = (max: number) => z.string().trim().max(max);
const requiredText = (max: number) => z.string().transform(collapse).pipe(z.string().min(1).max(max));
const name = requiredText(MAX_LENGTH.name);
const place = requiredText(MAX_LENGTH.place);
const phone = z.string().trim().max(MAX_LENGTH.phone).refine(isValidPhone);

// Community, package, store and transfer ids (generated or migrated).
export const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

export const newCommunitySchema = z.strictObject({
  name: z
    .string()
    .transform(collapse)
    .pipe(z.string().min(COMMUNITY_NAME_MIN).max(COMMUNITY_NAME_MAX)),
});

export const newPackageSchema = z.strictObject({
  area: place,
  store: z.string().transform(collapse).pipe(z.string().max(MAX_LENGTH.place)),
  description: text(100),
  packageNumber: text(MAX_LENGTH.packageNumber),
  ownerName: name,
  ownerPhone: phone,
  notes: text(MAX_LENGTH.notes),
  urgent: z.boolean(),
});

export const packageActionSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("claim"), courierName: name, courierPhone: phone }),
  z.strictObject({ action: z.literal("release") }),
  z.strictObject({ action: z.literal("note"), note: text(MAX_LENGTH.courierNote) }),
]);

export const newStoreSchema = z.strictObject({
  area: place,
  name: place,
});

export const newTransferSchema = z.strictObject({
  kind: z.enum(["request", "trip"]),
  destination: place,
  description: text(200),
  whenText: text(MAX_LENGTH.whenText),
  forWhom: text(MAX_LENGTH.forWhom),
  notes: text(MAX_LENGTH.notes),
  urgent: z.boolean(),
  ownerName: name,
  ownerPhone: phone,
});

export const transferActionSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("match"), riderName: name, riderPhone: phone }),
  z.strictObject({ action: z.literal("unmatch") }),
  z.strictObject({ action: z.literal("close") }),
]);
