// Applies db/schema.sql to the Neon database in NEON_DB_URL.
// Usage: npm run db:schema
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { neon } from "@neondatabase/serverless";

const SCHEMA_PATH = fileURLToPath(new URL("../db/schema.sql", import.meta.url));

export async function applySchema(sql) {
  const text = await readFile(SCHEMA_PATH, "utf8");
  const statements = text
    .split(/;\s*$/m)
    .map((s) => s.replace(/^\s*--.*$/gm, "").trim())
    .filter(Boolean);
  for (const statement of statements) await sql.query(statement);
  return statements.length;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.env.NEON_DB_URL) {
    console.error("NEON_DB_URL is not set (run with: node --env-file=.env ...)");
    process.exit(1);
  }
  const count = await applySchema(neon(process.env.NEON_DB_URL));
  console.log(`Schema applied (${count} statements).`);
}
