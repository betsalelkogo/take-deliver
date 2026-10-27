import { handle, json, parseId } from "@/lib/server/http";
import { deleteStore } from "@/lib/server/stores";

type Params = { params: { communityId: string; storeId: string } };

export function DELETE(_req: Request, { params }: Params) {
  return handle("DELETE /api/communities/:id/stores/:storeId", async () => {
    await deleteStore(parseId(params.communityId), parseId(params.storeId));
    return json({ ok: true });
  });
}
