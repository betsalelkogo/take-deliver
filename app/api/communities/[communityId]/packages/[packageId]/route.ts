import { handle, json, parseBody, parseId } from "@/lib/server/http";
import {
  claimPackage,
  deletePackage,
  releasePackage,
  setCourierNote,
} from "@/lib/server/packages";
import { packageActionSchema } from "@/lib/server/schemas";

type Params = { params: { communityId: string; packageId: string } };

export function PATCH(req: Request, { params }: Params) {
  return handle("PATCH /api/communities/:id/packages/:packageId", async () => {
    const communityId = parseId(params.communityId);
    const id = parseId(params.packageId);
    const body = await parseBody(req, packageActionSchema);
    switch (body.action) {
      case "claim":
        return json({
          ok: await claimPackage(communityId, id, body.courierName, body.courierPhone),
        });
      case "release":
        return json({ ok: await releasePackage(communityId, id) });
      case "note":
        await setCourierNote(communityId, id, body.note);
        return json({ ok: true });
    }
  });
}

export function DELETE(_req: Request, { params }: Params) {
  return handle("DELETE /api/communities/:id/packages/:packageId", async () => {
    await deletePackage(parseId(params.communityId), parseId(params.packageId));
    return json({ ok: true });
  });
}
