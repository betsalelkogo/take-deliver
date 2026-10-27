import { handle, json, parseBody, parseId } from "@/lib/server/http";
import { newStoreSchema } from "@/lib/server/schemas";
import { createStore } from "@/lib/server/stores";

type Params = { params: { communityId: string } };

export function POST(req: Request, { params }: Params) {
  return handle("POST /api/communities/:id/stores", async () => {
    const communityId = parseId(params.communityId);
    const { area, name } = await parseBody(req, newStoreSchema);
    await createStore(communityId, area, name);
    return json({ ok: true }, 201);
  });
}
