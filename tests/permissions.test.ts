import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isParty,
  packagePermissions,
  transferPermissions,
  type PackageParties,
  type TransferParties,
} from "../lib/server/permissions";
import { actor } from "./helpers";

const claimed: PackageParties = {
  status: "claimed",
  received: false,
  owner: { key: "d:owner", phone: "050-1111111" },
  courier: { key: "d:courier", phone: "050-2222222" },
};

describe("isParty", () => {
  it("matches by key when the row has one", () => {
    assert.equal(isParty({ key: "d:a", phone: "0501111111" }, actor("d:a")), true);
    assert.equal(isParty({ key: "d:a", phone: "0501111111" }, actor("d:b")), false);
  });

  it("ignores the phone once a row has a key", () => {
    assert.equal(isParty({ key: "d:a", phone: "0501111111" }, actor("d:b", "0501111111")), false);
  });

  it("falls back to the saved phone for rows without a key", () => {
    const legacy = { key: null, phone: "050-1111111" };
    assert.equal(isParty(legacy, actor("d:x", "+972501111111")), true);
    assert.equal(isParty(legacy, actor("d:x", "0509999999")), false);
    assert.equal(isParty(legacy, actor("d:x", "")), false);
  });

  it("never matches an anonymous actor to a keyed row", () => {
    assert.equal(isParty({ key: "d:a", phone: null }, actor(null)), false);
  });
});

describe("packagePermissions", () => {
  it("lets only the owner delete", () => {
    assert.equal(packagePermissions(claimed, actor("d:owner")).delete, true);
    assert.equal(packagePermissions(claimed, actor("d:courier")).delete, false);
    assert.equal(packagePermissions(claimed, actor("d:stranger")).delete, false);
  });

  it("lets the owner or the courier release, nobody else", () => {
    assert.equal(packagePermissions(claimed, actor("d:owner")).release, true);
    assert.equal(packagePermissions(claimed, actor("d:courier")).release, true);
    assert.equal(packagePermissions(claimed, actor("d:stranger")).release, false);
  });

  it("stops releasing once the owner confirmed receipt", () => {
    const received = { ...claimed, received: true };
    assert.equal(packagePermissions(received, actor("d:courier")).release, false);
    assert.equal(packagePermissions(received, actor("d:owner")).receive, false);
  });

  it("lets only the courier write the pickup note", () => {
    assert.equal(packagePermissions(claimed, actor("d:courier")).note, true);
    assert.equal(packagePermissions(claimed, actor("d:owner")).note, false);
  });

  it("lets only the owner confirm receipt", () => {
    assert.equal(packagePermissions(claimed, actor("d:owner")).receive, true);
    assert.equal(packagePermissions(claimed, actor("d:courier")).receive, false);
  });

  it("hides both phones from people outside the package", () => {
    const p = packagePermissions(claimed, actor("d:stranger"));
    assert.equal(p.seeOwnerPhone, false);
    assert.equal(p.seeCourierPhone, false);
    assert.equal(packagePermissions(claimed, actor("d:courier")).seeOwnerPhone, true);
    assert.equal(packagePermissions(claimed, actor("d:owner")).seeCourierPhone, true);
  });

  it("has no courier on an available package", () => {
    const available: PackageParties = { ...claimed, status: "available" };
    const p = packagePermissions(available, actor("d:courier"));
    assert.equal(p.release, false);
    assert.equal(p.seeOwnerPhone, false);
  });
});

describe("transferPermissions", () => {
  const trip: TransferParties = {
    kind: "trip",
    status: "open",
    owner: { key: "d:owner", phone: "0501111111" },
    rider: { key: null, phone: null },
  };
  const matched: TransferParties = {
    kind: "request",
    status: "matched",
    owner: { key: "d:owner", phone: "0501111111" },
    rider: { key: "d:rider", phone: "0502222222" },
  };

  it("shows an open trip's phone to everyone", () => {
    assert.equal(transferPermissions(trip, actor("d:stranger")).seeOwnerPhone, true);
  });

  it("hides a request's phones from strangers", () => {
    const p = transferPermissions(matched, actor("d:stranger"));
    assert.equal(p.seeOwnerPhone, false);
    assert.equal(p.seeRiderPhone, false);
  });

  it("lets owner or rider unmatch, and only the owner delete or close", () => {
    assert.equal(transferPermissions(matched, actor("d:rider")).unmatch, true);
    assert.equal(transferPermissions(matched, actor("d:owner")).unmatch, true);
    assert.equal(transferPermissions(matched, actor("d:stranger")).unmatch, false);
    assert.equal(transferPermissions(matched, actor("d:rider")).delete, false);
    assert.equal(transferPermissions(matched, actor("d:owner")).close, true);
    assert.equal(transferPermissions(matched, actor("d:rider")).close, false);
  });
});
