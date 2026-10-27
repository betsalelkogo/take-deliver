import { db } from "./db";

// Duplicate names in the same area are ignored.
export async function createStore(
  communityId: string,
  area: string,
  name: string
): Promise<void> {
  await db()`
    INSERT INTO stores (community_id, area, name)
    VALUES (${communityId}, ${area}, ${name})
    ON CONFLICT DO NOTHING`;
}

export async function deleteStore(communityId: string, id: string): Promise<void> {
  await db()`DELETE FROM stores WHERE id = ${id} AND community_id = ${communityId}`;
}
