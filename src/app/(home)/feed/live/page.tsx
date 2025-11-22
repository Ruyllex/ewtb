import { HydrateClient, trpc, prefetch } from "@/trpc/server";
import { LiveStreamsView } from "@/modules/live/ui/views/live-streams-view";

export const dynamic = "force-dynamic";

const Page = async () => {
  await prefetch(trpc.live.getPublicStreams.infiniteQueryOptions({ limit: 20 }));

  return (
    <HydrateClient>
      <LiveStreamsView publicFeed={true} />
    </HydrateClient>
  );
};

export default Page;
