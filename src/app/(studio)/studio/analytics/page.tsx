import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { AnalyticsView } from "@/modules/studio/ui/views/analytics-view";

export const dynamic = "force-dynamic";

const AnalyticsPage = async () => {
  try {
    await prefetch(trpc.studio.getAnalytics.queryOptions());
  } catch (error) {
    console.warn("Failed to prefetch analytics data:", error);
  }

  return (
    <HydrateClient>
      <AnalyticsView />
    </HydrateClient>
  );
};

export default AnalyticsPage;
