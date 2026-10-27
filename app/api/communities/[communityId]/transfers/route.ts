import { handle, json, parseBody, parseId } from "@/lib/server/http";
import { newTransferSchema } from "@/lib/server/schemas";
import { createTransfer, listTransfers } from "@/lib/server/transfers";

export const dynamic = "force-dynamic";

type Params = { params: { communityId: string } };

export function GET(_req: Request, { params }: Params) {
  return handle("GET /api/communities/:id/transfers", async () =>
    json(await listTransfers(parseId(params.communityId)))
  );
}

export function POST(req: Request, { params }: Params) {
  return handle("POST /api/communities/:id/transfers", async () => {
    const communityId = parseId(params.communityId);
    await createTransfer(communityId, await parseBody(req, newTransferSchema));
    return json({ ok: true }, 201);
  });
}
