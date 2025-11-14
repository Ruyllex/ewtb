import { VideoView } from "@/modules/videos/ui/views/video-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { notFound } from "next/navigation";

interface VideoPageProps {
  params: Promise<{ videoId: string }>;
}

const VideoPage = async ({ params }: VideoPageProps) => {
  const { videoId } = await params;

  try {
    await prefetch(trpc.videos.getPublic.queryOptions({ id: videoId }));
  } catch (error) {
    notFound();
  }

  return (
    <HydrateClient>
      <VideoView videoId={videoId} />
    </HydrateClient>
  );
};

export default VideoPage;

