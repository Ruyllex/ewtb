import { SettingsView } from "@/modules/users/ui/views/settings-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

const Page = async () => {
  try {
    await prefetch(trpc.users.getProfile.queryOptions());
  } catch (error) {
    console.warn("Failed to prefetch user profile:", error);
  }

  return (
    <HydrateClient>
      <SettingsView />
    </HydrateClient>
  );
};

export default Page;

