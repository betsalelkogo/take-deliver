import { guardWrite } from "@/lib/server/guard";
import { handle, json, parseBody, parseId } from "@/lib/server/http";
import {
  claimPackage,
  deletePackage,
  receivePackage,
  releasePackage,
  setCourierNote,
} from "@/lib/server/packages";
import { packageActionSchema } from "@/lib/server/schemas";

type Params = { params: { communityId: string; packageId: string } };

export function PATCH(req: Request, { params }: Params) {
  return handle("PATCH /api/communities/:id/packages/:packageId", async () => {
    const communityId = parseId(params.communityId);
    const id = parseId(params.packageId);
    const actor = await guardWrite(req, "action");
    const body = await parseBody(req, packageActionSchema);
    switch (body.action) {
      case "claim":
        return json({ ok: await claimPackage(communityId, id, body, actor) });
      case "release":
        return json({ ok: await releasePackage(communityId, id, actor) });
      case "note":
        await setCourierNote(communityId, id, body.note, actor);
        return json({ ok: true });
      case "received":
        return json({ ok: await receivePackage(communityId, id, actor) });
    }
  });
}

export function DELETE(req: Request, { params }: Params) {
  return handle("DELETE /api/communities/:id/packages/:packageId", async () => {
    const communityId = parseId(params.communityId);
    const actor = await guardWrite(req, "action");
    await deletePackage(communityId, parseId(params.packageId), actor);
    return json({ ok: true });
  });
}
