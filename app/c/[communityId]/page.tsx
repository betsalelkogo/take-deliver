import CommunityHome from "@/components/CommunityHome";

export default function CommunityPage({
  params,
}: {
  params: { communityId: string };
}) {
  return <CommunityHome communityId={params.communityId} />;
}
