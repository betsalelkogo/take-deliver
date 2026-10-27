// One-off copy of all Firestore data into Neon.
//
// Usage:
//   npm run migrate:firestore               # Firestore wins: insert + overwrite
//   npm run migrate:firestore -- --only-new # only add rows Neon doesn't have yet
//
// Use the default mode before switching the live app to Neon. After the switch,
// only use --only-new (it never overwrites changes made on Neon).
//
// Needs NEON_DB_URL, NEXT_PUBLIC_FIREBASE_PROJECT_ID and
// NEXT_PUBLIC_FIREBASE_API_KEY. Reads Firestore over its REST API, which works
// while the Firestore rules still allow public reads.
import { neon } from "@neondatabase/serverless";
import { applySchema } from "./apply-schema.mjs";

const ONLY_NEW = process.argv.includes("--only-new");
const BATCH = 100;

const LEGACY = {
  id: "kerem-reim",
  name: "כרם רעים",
  areas: ["קרית ספר", "שילת", "ישפרו", "מודיעין", "טלמונים", "מכולת טלמון"],
  destinations: ["חומש", "ירושלים", "מודיעין", "קרית ספר", "תל אביב", "אריאל", "נתב״ג"],
};
const ADHOC_AREA = "מיקום מזדמן";

const { NEON_DB_URL, NEXT_PUBLIC_FIREBASE_PROJECT_ID: PROJECT, NEXT_PUBLIC_FIREBASE_API_KEY: API_KEY } =
  process.env;
if (!NEON_DB_URL || !PROJECT || !API_KEY) {
  console.error(
    "Missing NEON_DB_URL / NEXT_PUBLIC_FIREBASE_PROJECT_ID / NEXT_PUBLIC_FIREBASE_API_KEY " +
      "(run with: node --env-file=.env scripts/migrate-from-firestore.mjs)"
  );
  process.exit(1);
}
const sql = neon(NEON_DB_URL);

// --- Firestore REST -------------------------------------------------------

const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(PROJECT)}/databases/(default)/documents`;

function decodeValue(v) {
  if ("stringValue" in v) return v.stringValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("booleanValue" in v) return v.booleanValue;
  if ("timestampValue" in v) return new Date(v.timestampValue);
  if ("nullValue" in v) return null;
  if ("arrayValue" in v) return (v.arrayValue.values ?? []).map(decodeValue);
  if ("mapValue" in v) return decodeFields(v.mapValue.fields ?? {});
  return null;
}

function decodeFields(fields) {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decodeValue(v)]));
}

async function listDocs(path) {
  const docs = [];
  let pageToken = "";
  do {
    const url = new URL(`${FIRESTORE}/${path}`);
    url.searchParams.set("pageSize", "300");
    url.searchParams.set("key", API_KEY);
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(`Firestore ${path}: HTTP ${res.status} ${body.error?.status ?? ""}`);
      err.status = body.error?.status;
      throw err;
    }
    for (const d of body.documents ?? []) {
      docs.push({ id: d.name.split("/").pop(), ...decodeFields(d.fields ?? {}) });
    }
    pageToken = body.nextPageToken ?? "";
  } while (pageToken);
  return docs;
}

// --- Mapping (mirrors how the old Firestore client read each document) -----

const str = (v) => (typeof v === "string" ? v : "");
const date = (v) => (v instanceof Date && !Number.isNaN(v.getTime()) ? v : null);
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);

function toIntlPhone(phone) {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  if (digits.length === 9 && digits.startsWith("5")) return "972" + digits;
  return digits;
}
const personId = (name, phone) => toIntlPhone(phone) || name.trim();

function packageRow(cid, d) {
  const legacyLocation = str(d.pickupLocation);
  const status = (d.status ?? "available") === "available" ? "available" : "claimed";
  const courierName = str(d.courierName) || null;
  const courierPhone = str(d.courierPhone) || null;
  const closeMs = num(d.closeMs);
  return {
    id: d.id,
    community_id: cid,
    area: str(d.area) || ADHOC_AREA,
    store: str(d.store) || legacyLocation,
    description: str(d.description),
    package_number: str(d.packageNumber),
    owner_name: str(d.ownerName),
    owner_phone: str(d.ownerPhone),
    notes: str(d.notes),
    urgent: d.urgent === true,
    status,
    courier_name: courierName,
    courier_phone: courierPhone,
    courier_id:
      status === "claimed" && (courierName || courierPhone)
        ? personId(courierName ?? "", courierPhone ?? "")
        : null,
    courier_note: str(d.courierNote),
    close_ms: closeMs === null ? null : Math.round(closeMs),
    created_at: date(d.createdAt) ?? new Date(),
    claimed_at: date(d.claimedAt),
  };
}

function transferRow(cid, d) {
  return {
    id: d.id,
    community_id: cid,
    kind: d.kind === "trip" ? "trip" : "request",
    destination: str(d.destination) || "—",
    description: str(d.description),
    when_text: str(d.whenText),
    for_whom: str(d.forWhom),
    notes: str(d.notes),
    urgent: d.urgent === true,
    status: d.status === "matched" || d.status === "closed" ? d.status : "open",
    owner_name: str(d.ownerName),
    owner_phone: str(d.ownerPhone),
    rider_name: str(d.riderName) || null,
    rider_phone: str(d.riderPhone) || null,
    created_at: date(d.createdAt) ?? new Date(),
    matched_at: date(d.matchedAt),
  };
}

function storeRows(cid, docs) {
  const seen = new Set();
  const rows = [];
  for (const d of docs) {
    const area = str(d.area).trim();
    const name = str(d.name).trim();
    const key = `${area}\u0000${name.toLowerCase()}`;
    if (!area || !name || seen.has(key)) continue;
    seen.add(key);
    rows.push({ id: d.id, community_id: cid, area, name, created_at: date(d.createdAt) ?? new Date() });
  }
  return rows;
}

const scoreRows = (cid, kind, docs) =>
  docs.map((d) => ({
    community_id: cid,
    kind,
    person_id: d.id,
    name: str(d.name),
    count: Math.max(0, Math.round(num(d.count) ?? 0)),
  }));

// --- Writing ----------------------------------------------------------------

// Table and column names below are constants from this file, never input.
async function write(table, key, rows, { alwaysSkipConflicts = false } = {}) {
  if (rows.length === 0) return;
  const columns = Object.keys(rows[0]);
  const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
  const updates = columns
    .filter((c) => !key.includes(c))
    .map((c) => `${c} = EXCLUDED.${c}`)
    .join(", ");
  const conflict =
    ONLY_NEW || alwaysSkipConflicts
      ? "ON CONFLICT DO NOTHING"
      : `ON CONFLICT (${key.join(", ")}) DO UPDATE SET ${updates}`;
  const text = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders}) ${conflict}`;
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH);
    await sql.transaction(batch.map((r) => sql.query(text, columns.map((c) => r[c]))));
  }
}

async function migrateCommunity(cid, prefix) {
  const [packages, stores, transfers, stats, collectors, publishers] = await Promise.all([
    listDocs(`${prefix}packages`),
    listDocs(`${prefix}stores`),
    listDocs(`${prefix}transfers`),
    listDocs(`${prefix}stats`),
    listDocs(`${prefix}collectors`),
    listDocs(`${prefix}publishers`),
  ]);

  await write("packages", ["id"], packages.map((d) => packageRow(cid, d)));
  // Stores never change once created, and duplicates by name are skipped.
  await write("stores", ["id"], storeRows(cid, stores), { alwaysSkipConflicts: true });
  await write("transfers", ["id"], transfers.map((d) => transferRow(cid, d)));

  const global = stats.find((d) => d.id === "global");
  if (global) {
    await write("community_stats", ["community_id"], [
      {
        community_id: cid,
        collected: Math.max(0, Math.round(num(global.collected) ?? 0)),
        close_total_ms: Math.max(0, Math.round(num(global.closeTotalMs) ?? 0)),
        close_count: Math.max(0, Math.round(num(global.closeCount) ?? 0)),
      },
    ]);
  }
  await write("scores", ["community_id", "kind", "person_id"], [
    ...scoreRows(cid, "collector", collectors),
    ...scoreRows(cid, "publisher", publishers),
  ]);

  return {
    packages: packages.length,
    stores: stores.length,
    transfers: transfers.length,
    collectors: collectors.length,
    publishers: publishers.length,
    collected: global ? num(global.collected) ?? 0 : 0,
  };
}

// --- Run ------------------------------------------------------------------

console.log(`Mode: ${ONLY_NEW ? "only add missing rows" : "Firestore overwrites Neon"}`);
console.log(`Applied schema (${await applySchema(sql)} statements).`);

// If the published rules never allowed `communities`, none could be created.
const communityDocs = await listDocs("communities").catch((err) => {
  if (err.status !== "PERMISSION_DENIED") throw err;
  console.log("Firestore rules don't allow `communities`, so there are none to copy.");
  return [];
});
const firestoreCommunities = communityDocs
  .map((d) => ({ id: d.id, name: str(d.name).trim().replace(/\s+/g, " "), created_at: date(d.createdAt) ?? new Date() }))
  .filter((c) => c.name.length >= 2 && c.id !== LEGACY.id);

await sql`
  INSERT INTO communities (id, name, areas, destinations)
  VALUES (${LEGACY.id}, ${LEGACY.name}, ${LEGACY.areas}, ${LEGACY.destinations})
  ON CONFLICT DO NOTHING`;
await write(
  "communities",
  ["id"],
  firestoreCommunities.map((c) => ({ id: c.id, name: c.name.slice(0, 60), created_at: c.created_at })),
  { alwaysSkipConflicts: true }
);

// A community may have been skipped (e.g. a duplicate name); don't copy its data.
const existing = new Set((await sql`SELECT id FROM communities`).map((r) => r.id));
const report = {};
report[LEGACY.name] = await migrateCommunity(LEGACY.id, "");
for (const c of firestoreCommunities) {
  if (!existing.has(c.id)) {
    report[c.name] = "skipped (name already taken)";
    continue;
  }
  report[c.name] = await migrateCommunity(c.id, `communities/${c.id}/`);
}

console.table(report);
console.log("Done.");
