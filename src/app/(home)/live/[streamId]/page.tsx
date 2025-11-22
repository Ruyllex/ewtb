import { HydrateClient, trpc, prefetch } from "@/trpc/server";
import { PublicLiveStreamView } from "@/modules/live/ui/views/public-live-stream-view";

export const dynamic = "force-dynamic";

interface PageProps {
  params: {
    streamId: string;
  };
}

const Page = async ({ params }: PageProps) => {
  const { streamId } = params;

  return (
    <HydrateClient>
      <PublicLiveStreamView streamId={streamId} />
    </HydrateClient>
  );
};

export default Page;
