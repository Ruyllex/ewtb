import { TrendingView } from "@/modules/feed/ui/views/trending-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

const TrendingPage = async () => {
    try {
        await prefetch(trpc.videos.getTrending.infiniteQueryOptions({ limit: 20 }));
    } catch (error) {
        console.warn("Failed to prefetch trending data:", error);
    }

    return (
        <HydrateClient>
            <TrendingView />
        </HydrateClient>
    );
};

export default TrendingPage;
