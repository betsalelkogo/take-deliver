import { getActor } from "@/lib/server/actor";
import { guardWrite } from "@/lib/server/guard";
import { handle, json, parseBody, parseId } from "@/lib/server/http";
import { newTransferSchema } from "@/lib/server/schemas";
import { createTransfer, listTransfers } from "@/lib/server/transfers";

export const dynamic = "force-dynamic";

type Params = { params: { communityId: string } };

export function GET(req: Request, { params }: Params) {
  return handle("GET /api/communities/:id/transfers", async () => {
    const communityId = parseId(params.communityId);
    return json(await listTransfers(communityId, getActor(req)));
  });
}

export function POST(req: Request, { params }: Params) {
  return handle("POST /api/communities/:id/transfers", async () => {
    const communityId = parseId(params.communityId);
    const actor = await guardWrite(req, "create");
    const input = await parseBody(req, newTransferSchema);
    await createTransfer(communityId, input, actor);
    return json({ ok: true }, 201);
  });
}
