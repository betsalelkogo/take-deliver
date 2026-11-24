import { toIntlPhone } from "../whatsapp";
import type { Actor } from "./actor";

// One side of a package or transfer: the owner, the courier or the rider.
export interface Party {
  key: string | null;
  phone: string | null;
}

export function isParty(party: Party, actor: Actor): boolean {
  if (party.key) return party.key === actor.key;
  // Rows created before ownership keys: matched by the device's saved phone
  // until they expire off the board.
  if (!party.phone || !actor.legacyPhone) return false;
  const phone = toIntlPhone(party.phone);
  return !!phone && phone === toIntlPhone(actor.legacyPhone);
}

export interface PackageParties {
  status: "available" | "claimed";
  received: boolean;
  owner: Party;
  courier: Party;
}

export function packageRoles(row: PackageParties, actor: Actor) {
  const owner = isParty(row.owner, actor);
  const courier = row.status === "claimed" && isParty(row.courier, actor);
  return { owner, courier };
}

export function packagePermissions(row: PackageParties, actor: Actor) {
  const { owner, courier } = packageRoles(row, actor);
  const claimed = row.status === "claimed";
  return {
    delete: owner,
    release: claimed && !row.received && (owner || courier),
    note: claimed && courier,
    receive: claimed && !row.received && owner,
    seeOwnerPhone: owner || courier,
    seeCourierPhone: owner || courier,
  };
}

export interface TransferParties {
  kind: "request" | "trip";
  status: "open" | "matched" | "closed";
  owner: Party;
  rider: Party;
}

export function transferRoles(row: TransferParties, actor: Actor) {
  const owner = isParty(row.owner, actor);
  const rider = row.status !== "open" && isParty(row.rider, actor);
  return { owner, rider };
}

export function transferPermissions(row: TransferParties, actor: Actor) {
  const { owner, rider } = transferRoles(row, actor);
  return {
    delete: owner,
    close: owner && row.status !== "closed",
    unmatch: row.status === "matched" && (owner || rider),
    // An open trip is an invitation: anyone in the community can contact it.
    seeOwnerPhone: owner || rider || (row.kind === "trip" && row.status === "open"),
    seeRiderPhone: owner || rider,
  };
}
