import { guardWrite } from "@/lib/server/guard";
import { handle, json, parseId } from "@/lib/server/http";
import { deleteStore } from "@/lib/server/stores";

type Params = { params: { communityId: string; storeId: string } };

// Pinned stores are shared by the whole community, so any member may unpin
// one; the rate limit is what stops mass removal.
export function DELETE(req: Request, { params }: Params) {
  return handle("DELETE /api/communities/:id/stores/:storeId", async () => {
    const communityId = parseId(params.communityId);
    await guardWrite(req, "action");
    await deleteStore(communityId, parseId(params.storeId));
    return json({ ok: true });
  });
}
