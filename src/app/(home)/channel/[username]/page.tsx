import { ChannelView } from "@/modules/channels/ui/views/channel-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { notFound } from "next/navigation";

interface ChannelPageProps {
  params: Promise<{ username: string }>;
}

const ChannelPage = async ({ params }: ChannelPageProps) => {
  const { username } = await params;

  try {
    await prefetch(trpc.channels.getByUsername.queryOptions({ username }));
  } catch (error) {
    notFound();
  }

  return (
    <HydrateClient>
      <ChannelView username={username} />
    </HydrateClient>
  );
};

export default ChannelPage;

