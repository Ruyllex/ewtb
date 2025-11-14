import { DEFAULT_LIMIT } from "@/constants";
import { StudioView } from "@/modules/studio/ui/views/studio-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const dynamic = "force-dynamic"; // Force dynamic rendering

const Page = async () => {
  // Prefetch con manejo de errores - si falla, simplemente no pre-cargamos los datos
  try {
    await prefetch(trpc.studio.getMany.infiniteQueryOptions({ limit: DEFAULT_LIMIT }));
  } catch (error) {
    // Si el prefetch falla (por ejemplo, usuario no autenticado), 
    // simplemente continuamos sin pre-cargar los datos
    // El componente cliente manejará el estado de carga
    console.warn("Failed to prefetch studio data:", error);
  }

  return (
    <HydrateClient>
      <StudioView />
    </HydrateClient>
  );
};

export default Page;
