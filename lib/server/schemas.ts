import { z } from "zod";
import { COMMUNITY_NAME_MAX, COMMUNITY_NAME_MIN } from "../communities";
import { isValidPhone } from "../whatsapp";

const collapse = (value: string) => value.trim().replace(/\s+/g, " ");

const text = (max: number) => z.string().trim().max(max);
const requiredText = (max: number) => z.string().transform(collapse).pipe(z.string().min(1).max(max));
const name = requiredText(100);
const phone = z.string().trim().max(30).refine(isValidPhone);

// Community, package, store and transfer ids (generated or migrated).
export const idSchema = z.string().regex(/^[A-Za-z0-9_-]{1,64}$/);

export const newCommunitySchema = z.strictObject({
  name: z
    .string()
    .transform(collapse)
    .pipe(z.string().min(COMMUNITY_NAME_MIN).max(COMMUNITY_NAME_MAX)),
});

export const newPackageSchema = z.strictObject({
  area: requiredText(100),
  store: z.string().transform(collapse).pipe(z.string().max(100)),
  description: text(100),
  packageNumber: text(100),
  ownerName: name,
  ownerPhone: phone,
  notes: text(1000),
  urgent: z.boolean(),
});

export const packageActionSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("claim"), courierName: name, courierPhone: phone }),
  z.strictObject({ action: z.literal("release") }),
  z.strictObject({ action: z.literal("note"), note: text(500) }),
]);

export const newStoreSchema = z.strictObject({
  area: requiredText(100),
  name: requiredText(100),
});

export const newTransferSchema = z.strictObject({
  kind: z.enum(["request", "trip"]),
  destination: requiredText(100),
  description: text(200),
  whenText: text(100),
  forWhom: text(100),
  notes: text(1000),
  urgent: z.boolean(),
  ownerName: name,
  ownerPhone: phone,
});

export const transferActionSchema = z.discriminatedUnion("action", [
  z.strictObject({ action: z.literal("match"), riderName: name, riderPhone: phone }),
  z.strictObject({ action: z.literal("unmatch") }),
  z.strictObject({ action: z.literal("close") }),
]);
