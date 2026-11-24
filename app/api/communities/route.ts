import { assertSameOrigin, clientIpKey } from "@/lib/server/actor";
import { createCommunity, listCommunities } from "@/lib/server/communities";
import { handle, json, parseBody } from "@/lib/server/http";
import { LIMITS, rateLimit } from "@/lib/server/rateLimit";
import { newCommunitySchema } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

export function GET() {
  return handle("GET /api/communities", async () => json(await listCommunities()));
}

export function POST(req: Request) {
  return handle("POST /api/communities", async () => {
    assertSameOrigin(req);
    await rateLimit(`community:${clientIpKey(req)}`, LIMITS.community);
    const { name } = await parseBody(req, newCommunitySchema);
    return json({ id: await createCommunity(name) }, 201);
  });
}
