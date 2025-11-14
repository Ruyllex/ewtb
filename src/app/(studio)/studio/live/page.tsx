import { LiveStreamsView } from "@/modules/live/ui/views/live-streams-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic";

const Page = async () => {
  // Prefetch con manejo de errores - si falla, simplemente no pre-cargamos los datos
  try {
    await prefetch(trpc.live.getMany.infiniteQueryOptions({ limit: 20 }));
  } catch (error) {
    // Si el prefetch falla (por ejemplo, tabla no existe o usuario no autenticado), 
    // simplemente continuamos sin pre-cargar los datos
    // El componente cliente manejará el estado de carga
    console.warn("Failed to prefetch live streams data:", error);
  }

  return (
    <HydrateClient>
      <LiveStreamsView />
    </HydrateClient>
  );
};

export default Page;

