import { SearchResultsView } from "@/modules/videos/ui/views/search-results-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

const SearchPage = async ({ searchParams }: SearchPageProps) => {
  const { q } = await searchParams;

  // Prefetch de datos de búsqueda si hay query
  if (q) {
    try {
      await prefetch(trpc.videos.search.queryOptions({ query: q, limit: 20 }));
    } catch (error) {
      // Si el prefetch falla, continuar sin pre-cargar los datos
      console.warn("Failed to prefetch search data:", error);
    }
  }

  return (
    <HydrateClient>
      <SearchResultsView query={q} />
    </HydrateClient>
  );
};

export default SearchPage;

