import { PayPalTestButton } from "@/components/paypal-test-button";
import { CategoriesSection } from "../sections/categories-section";
import { VideosGridSection } from "@/modules/videos/ui/sections/videos-grid-section";
import { LiveStreamsView } from "@/modules/live/ui/views/live-streams-view";
import { prefetch, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

interface HomeViewProps {
  categoryId?: string;
}

export const HomeView = async ({ categoryId }: HomeViewProps) => {
  // Prefetch videos for the home page con manejo de errores
  try {
    await prefetch(trpc.videos.getMany.infiniteQueryOptions({ categoryId, limit: 20 }));
  } catch (error) {
    // Si el prefetch falla, simplemente continuamos sin pre-cargar los datos
    // El componente cliente manejará el estado de carga
    console.warn("Failed to prefetch videos:", error);
  }

  return (
    <div className="max-w-[2400px] mx-auto mb-10 px-4 pt-2.5 flex flex-col gap-y-6">
      {/* Botón de prueba de PayPal */}
      <div className="flex justify-center">
        <PayPalTestButton />
      </div>
      <CategoriesSection categoryId={categoryId} />
      {!categoryId && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">En Vivo</h2>
          <LiveStreamsView publicFeed />
        </div>
      )}
      <VideosGridSection categoryId={categoryId} />
    </div>
  );
};
