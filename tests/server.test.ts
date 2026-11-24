import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";
import * as dbModule from "../lib/server/db";
import { HttpError } from "../lib/server/http";
import {
  deletePackage,
  getPackageBoard,
  releasePackage,
  setCourierNote,
} from "../lib/server/packages";
import { LIMITS, rateLimit } from "../lib/server/rateLimit";
import { newStoreSchema, packageActionSchema } from "../lib/server/schemas";
import { actor, fakeSql } from "./helpers";

function useDb(results: unknown[][]) {
  const fake = fakeSql(results);
  mock.method(dbModule, "db", () => fake.sql);
  return fake;
}

afterEach(() => mock.restoreAll());

const row = {
  id: "p1",
  status: "claimed",
  received_at: null,
  owner_name: "Owner",
  owner_phone: "0501111111",
  owner_key: "d:owner",
  courier_name: "Courier",
  courier_phone: "0502222222",
  courier_key: "d:courier",
  description: "",
  area: "A",
  store: "S",
};

async function rejectsWith(promise: Promise<unknown>, status: number) {
  await assert.rejects(promise, (err) => err instanceof HttpError && err.status === status);
}

describe("deletePackage", () => {
  it("refuses someone who isn't the owner, without touching the row", async () => {
    const fake = useDb([[row]]);
    await rejectsWith(deletePackage("c1", "p1", actor("d:stranger")), 403);
    assert.equal(fake.queries.length, 1);
    assert.ok(!fake.queries.some((q) => q.startsWith("DELETE")));
  });

  it("refuses the courier too", async () => {
    useDb([[row]]);
    await rejectsWith(deletePackage("c1", "p1", actor("d:courier")), 403);
  });

  it("deletes for the owner, guarded by the owner key", async () => {
    const fake = useDb([[row], []]);
    await deletePackage("c1", "p1", actor("d:owner"));
    assert.match(fake.queries[1], /^DELETE FROM packages/);
    assert.ok(fake.values[1].includes("d:owner"));
  });

  it("lets a pre-ownership row be deleted by the device with its phone", async () => {
    const fake = useDb([[{ ...row, owner_key: null }], []]);
    await deletePackage("c1", "p1", actor("d:new-device", "050-1111111"));
    assert.match(fake.queries[1], /^DELETE FROM packages/);
  });
});

describe("releasePackage / setCourierNote", () => {
  it("refuses a stranger releasing someone else's claim", async () => {
    const fake = useDb([[row]]);
    await rejectsWith(releasePackage("c1", "p1", actor("d:stranger")), 403);
    assert.equal(fake.queries.length, 1);
  });

  it("refuses the owner editing the courier's note", async () => {
    useDb([[row]]);
    await rejectsWith(setCourierNote("c1", "p1", "hi", actor("d:owner")), 403);
  });
});

describe("getPackageBoard", () => {
  it("hides phones from outsiders and returns opaque leaderboard ids", async () => {
    const pkg = {
      ...row,
      package_number: "",
      notes: "",
      courier_note: "",
      urgent: false,
      created_at: new Date(),
      claimed_at: new Date(),
    };
    useDb([
      [],
      [pkg],
      [],
      [{ collected: 1, close_total_ms: 0, close_count: 0 }],
      [{ kind: "collector", person_id: "972502222222", name: "Courier", count: 4 }],
    ]);

    const outsider = await getPackageBoard("c1", actor("d:stranger"));
    assert.equal(outsider.packages[0].ownerPhone, null);
    assert.equal(outsider.packages[0].courierPhone, null);
    assert.deepEqual(outsider.packages[0].mine, { owner: false, courier: false });
    assert.equal(outsider.packages[0].can.delete, false);
    assert.equal(outsider.champions[0].name, "Courier");
    assert.doesNotMatch(JSON.stringify(outsider), /050|972/);

    useDb([[], [pkg], [], [], []]);
    const owner = await getPackageBoard("c1", actor("d:owner"));
    assert.equal(owner.packages[0].courierPhone, "0502222222");
    assert.equal(owner.packages[0].can.delete, true);
  });
});

describe("rateLimit", () => {
  it("passes under the limit and rejects over it", async () => {
    useDb([[{ hits: LIMITS.create.max }]]);
    await rateLimit("create:d:x", LIMITS.create);
    useDb([[{ hits: LIMITS.create.max + 1 }]]);
    await rejectsWith(rateLimit("create:d:x", LIMITS.create), 429);
  });
});

describe("schemas", () => {
  it("accepts the received action and rejects unknown ones", () => {
    assert.equal(packageActionSchema.safeParse({ action: "received" }).success, true);
    assert.equal(packageActionSchema.safeParse({ action: "steal" }).success, false);
  });

  it("defaults store hours and caps their length", () => {
    assert.equal(newStoreSchema.parse({ area: "A", name: "S" }).hours, "");
    assert.equal(
      newStoreSchema.safeParse({ area: "A", name: "S", hours: "x".repeat(101) }).success,
      false
    );
  });
});