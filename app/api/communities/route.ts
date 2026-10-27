import { createCommunity, listCommunities } from "@/lib/server/communities";
import { handle, json, parseBody } from "@/lib/server/http";
import { newCommunitySchema } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

export function GET() {
  return handle("GET /api/communities", async () => json(await listCommunities()));
}

export function POST(req: Request) {
  return handle("POST /api/communities", async () => {
    const { name } = await parseBody(req, newCommunitySchema);
    return json({ id: await createCommunity(name) }, 201);
  });
}
