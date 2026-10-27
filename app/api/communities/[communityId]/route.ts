import { getCommunity } from "@/lib/server/communities";
import { HttpError, handle, json, parseId } from "@/lib/server/http";

export const dynamic = "force-dynamic";

type Params = { params: { communityId: string } };

export function GET(_req: Request, { params }: Params) {
  return handle("GET /api/communities/:id", async () => {
    const community = await getCommunity(parseId(params.communityId));
    if (!community) throw new HttpError(404, "הלוח לא נמצא.");
    return json(community);
  });
}
