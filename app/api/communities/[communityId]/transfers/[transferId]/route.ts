import { guardWrite } from "@/lib/server/guard";
import { handle, json, parseBody, parseId } from "@/lib/server/http";
import { transferActionSchema } from "@/lib/server/schemas";
import {
  closeTransfer,
  deleteTransfer,
  matchTransfer,
  unmatchTransfer,
} from "@/lib/server/transfers";

type Params = { params: { communityId: string; transferId: string } };

export function PATCH(req: Request, { params }: Params) {
  return handle("PATCH /api/communities/:id/transfers/:transferId", async () => {
    const communityId = parseId(params.communityId);
    const id = parseId(params.transferId);
    const actor = await guardWrite(req, "action");
    const body = await parseBody(req, transferActionSchema);
    switch (body.action) {
      case "match":
        return json({ ok: await matchTransfer(communityId, id, body, actor) });
      case "unmatch":
        return json({ ok: await unmatchTransfer(communityId, id, actor) });
      case "close":
        await closeTransfer(communityId, id, actor);
        return json({ ok: true });
    }
  });
}

export function DELETE(req: Request, { params }: Params) {
  return handle("DELETE /api/communities/:id/transfers/:transferId", async () => {
    const communityId = parseId(params.communityId);
    const actor = await guardWrite(req, "action");
    await deleteTransfer(communityId, parseId(params.transferId), actor);
    return json({ ok: true });
  });
}
