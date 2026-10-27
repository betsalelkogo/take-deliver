import { randomBytes } from "node:crypto";
import type { Community, CommunitySummary } from "../communities";
import { db } from "./db";
import { HttpError } from "./http";

export async function listCommunities(): Promise<CommunitySummary[]> {
  const rows = await db()`SELECT id, name FROM communities ORDER BY name`;
  return rows.map((r) => ({ id: r.id, name: r.name }));
}

export async function getCommunity(id: string): Promise<Community | null> {
  const [row] = await db()`
    SELECT id, name, areas, destinations FROM communities WHERE id = ${id}`;
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    areas: row.areas ?? [],
    destinations: row.destinations ?? [],
  };
}

export async function createCommunity(name: string): Promise<string> {
  // Short, URL-safe and unguessable enough for share links.
  const id = randomBytes(8).toString("base64url");
  const rows = await db()`
    INSERT INTO communities (id, name) VALUES (${id}, ${name})
    ON CONFLICT DO NOTHING
    RETURNING id`;
  if (rows.length === 0) throw new HttpError(409, "כבר יש לוח בשם הזה.");
  return id;
}
