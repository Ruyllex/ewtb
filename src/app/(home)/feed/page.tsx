import { FeedView } from "@/modules/feed/ui/views/feed-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

const FeedPage = async () => {
  // Prefetch de datos para el feed global
  try {
    await prefetch(trpc.videos.getMany.infiniteQueryOptions({ limit: 20 }));
  } catch (error) {
    // Si el prefetch falla, continuar sin pre-cargar los datos
    console.warn("Failed to prefetch feed data:", error);
  }

  return (
    <HydrateClient>
      <FeedView />
    </HydrateClient>
  );
};

export default FeedPage;

