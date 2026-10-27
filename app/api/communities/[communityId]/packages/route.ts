import { handle, json, parseBody, parseId } from "@/lib/server/http";
import { createPackage, getPackageBoard } from "@/lib/server/packages";
import { newPackageSchema } from "@/lib/server/schemas";

export const dynamic = "force-dynamic";

type Params = { params: { communityId: string } };

export function GET(_req: Request, { params }: Params) {
  return handle("GET /api/communities/:id/packages", async () =>
    json(await getPackageBoard(parseId(params.communityId)))
  );
}

export function POST(req: Request, { params }: Params) {
  return handle("POST /api/communities/:id/packages", async () => {
    const communityId = parseId(params.communityId);
    await createPackage(communityId, await parseBody(req, newPackageSchema));
    return json({ ok: true }, 201);
  });
}
