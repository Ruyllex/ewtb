import { HydrateClient, trpc, prefetch } from "@/trpc/server";
import { StudioCommunityView } from "@/modules/studio/ui/views/studio-community-view";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function Page() {
  void prefetch(trpc.memberships.getTiers.queryOptions());
  void prefetch(trpc.memberships.getMyOffers.queryOptions());

  return (
    <HydrateClient>
      <Suspense fallback={<div className="flex items-center justify-center p-10"><Loader2 className="animate-spin text-muted-foreground" /></div>}>
        <StudioCommunityView />
      </Suspense>
    </HydrateClient>
  );
}
