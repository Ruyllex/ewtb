import { FeedView } from "@/modules/feed/ui/views/feed-view";
import { HydrateClient } from "@/trpc/server";

const FeedPage = () => {
  return (
    <HydrateClient>
      <FeedView />
    </HydrateClient>
  );
};

export default FeedPage;

