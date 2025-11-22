import { HomeView } from "@/modules/home/ui/views/home-view";
import { HydrateClient } from "@/trpc/server";

interface PageProps {
  searchParams: Promise<{ categoryId?: string }>;
}

const Page = async ({ searchParams }: PageProps) => {
  const { categoryId } = await searchParams;

  return (
    <HydrateClient>
      <HomeView categoryId={categoryId} />
    </HydrateClient>
  );
};

export default Page;
