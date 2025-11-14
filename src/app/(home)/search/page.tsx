import { SearchResultsView } from "@/modules/videos/ui/views/search-results-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

const SearchPage = async ({ searchParams }: SearchPageProps) => {
  const { q } = await searchParams;

  if (q) {
    prefetch(trpc.videos.search.queryOptions({ query: q, limit: 20 }));
  }

  return (
    <HydrateClient>
      <SearchResultsView query={q} />
    </HydrateClient>
  );
};

export default SearchPage;

