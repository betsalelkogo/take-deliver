import { getActor } from "@/lib/server/actor";
import { guardWrite } from "@/lib/server/guard";
import { handle, json, parseBody, parseId } from "@/lib/server/http";
import { createPackage, getPackageBoard } from "@/lib/server/packages";
import { newPackageSchema } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

type Params = { params: { communityId: string } };

export function GET(req: Request, { params }: Params) {
  return handle("GET /api/communities/:id/packages", async () => {
    const communityId = parseId(params.communityId);
    return json(await getPackageBoard(communityId, getActor(req)));
  });
}

export function POST(req: Request, { params }: Params) {
  return handle("POST /api/communities/:id/packages", async () => {
    const communityId = parseId(params.communityId);
    const actor = await guardWrite(req, "create");
    const input = await parseBody(req, newPackageSchema);
    await createPackage(communityId, input, actor);
    return json({ ok: true }, 201);
  });
}
