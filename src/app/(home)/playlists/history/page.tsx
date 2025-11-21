import { HistoryView } from "@/modules/playlists/ui/views/history-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

const HistoryPage = async () => {
  try {
    await prefetch(trpc.playlists.getHistory.infiniteQueryOptions({ limit: 20 }));
  } catch (error) {
    console.error("Error prefetching history:", error);
  }

  return (
    <HydrateClient>
      <HistoryView />
    </HydrateClient>
  );
};

export default HistoryPage;

