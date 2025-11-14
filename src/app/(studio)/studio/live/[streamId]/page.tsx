import { LiveStreamView } from "@/modules/live/ui/views/live-stream-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { notFound } from "next/navigation";

interface LiveStreamPageProps {
  params: Promise<{ streamId: string }>;
}

const Page = async ({ params }: LiveStreamPageProps) => {
  const { streamId } = await params;

  try {
    await prefetch(trpc.live.getOne.queryOptions({ id: streamId }));
  } catch (error) {
    // Si el prefetch falla, mostrar 404
    console.warn("Failed to prefetch live stream data:", error);
    notFound();
  }

  return (
    <HydrateClient>
      <LiveStreamView streamId={streamId} />
    </HydrateClient>
  );
};

export default Page;

