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
    const body = await parseBody(req, transferActionSchema);
    switch (body.action) {
      case "match":
        return json({
          ok: await matchTransfer(communityId, id, body.riderName, body.riderPhone),
        });
      case "unmatch":
        return json({ ok: await unmatchTransfer(communityId, id) });
      case "close":
        await closeTransfer(communityId, id);
        return json({ ok: true });
    }
  });
}

export function DELETE(_req: Request, { params }: Params) {
  return handle("DELETE /api/communities/:id/transfers/:transferId", async () => {
    await deleteTransfer(parseId(params.communityId), parseId(params.transferId));
    return json({ ok: true });
  });
}
