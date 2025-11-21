import { SubscriptionsView } from "@/modules/feed/ui/views/subscriptions-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

const SubscriptionsPage = async () => {
  try {
    await prefetch(trpc.videos.getPersonalFeed.infiniteQueryOptions({ limit: 20 }));
  } catch (error) {
    // Ignore prefetch errors (e.g. if not logged in)
  }

  return (
    <HydrateClient>
      <SubscriptionsView />
    </HydrateClient>
  );
};

export default SubscriptionsPage;
