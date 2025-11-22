"use client";

import { Button } from "@/components/ui/button";
import { api as trpc } from "@/trpc/client";
import { Suspense, useState } from "react";
import { CreateLiveStreamModal } from "../components/create-live-stream-modal";
import { VideoCard } from "@/modules/videos/ui/components/video-card";
import { VideoIcon, PlusIcon, CopyIcon, CopyCheckIcon } from "lucide-react";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { toast } from "sonner";
import { ErrorBoundary } from "react-error-boundary";

const LiveStreamsSkeleton = () => {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="border rounded-lg p-4">
          <Skeleton className="h-6 w-1/3 mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  );
};

interface LiveStreamsViewProps {
  publicFeed?: boolean;
}

export const LiveStreamsView = ({ publicFeed = false }: LiveStreamsViewProps) => {
  return (
    <ErrorBoundary
      fallback={
        <div className="flex flex-col gap-y-6 pt-2.5">
          <div className="px-4">
            <h1 className="text-2xl font-bold">Transmisiones en Vivo</h1>
            <p className="text-xs text-muted-foreground">Gestiona tus transmisiones en vivo</p>
          </div>
          <div className="px-4 text-center py-12 border rounded-lg">
            <p className="text-muted-foreground">
              Error al cargar las transmisiones. Por favor, recarga la página.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Si el problema persiste, asegúrate de que la tabla live_streams existe en la base de datos.
            </p>
          </div>
        </div>
      }
    >
      <Suspense fallback={<LiveStreamsSkeleton />}>
        <LiveStreamsViewSuspense publicFeed={publicFeed} />
      </Suspense>
    </ErrorBoundary>
  );
};

const LiveStreamsViewSuspense = ({ publicFeed }: LiveStreamsViewProps) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Usar useInfiniteQuery en lugar de useSuspenseInfiniteQuery para mejor manejo de errores
  const query = publicFeed
    ? trpc.live.getPublicStreams.useInfiniteQuery({ limit: 20 }, { getNextPageParam: (lastPage) => lastPage?.nextCursor, retry: false })
    : trpc.live.getMany.useInfiniteQuery({ limit: 20 }, { getNextPageParam: (lastPage) => lastPage?.nextCursor, retry: false });

  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
    error,
  } = query;

  // Si hay error, mostrar mensaje
  if (error) {
    return (
      <div className="flex flex-col gap-y-6 pt-2.5">
        <div className="px-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Transmisiones en Vivo</h1>
            <p className="text-xs text-muted-foreground">
              {publicFeed ? "Explora transmisiones en vivo" : "Gestiona tus transmisiones en vivo"}
            </p>
          </div>
          {!publicFeed && (
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <PlusIcon className="size-4 mr-2" />
              Nueva Transmisión
            </Button>
          )}
        </div>
        <div className="px-4 text-center py-12 border rounded-lg">
          <VideoIcon className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No se pudieron cargar las transmisiones</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {error.message || "Error desconocido. Por favor, recarga la página."}
          </p>
          {error.message?.includes("live_streams") && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4 text-left">
              <p className="text-sm font-semibold text-yellow-900 mb-2">⚠️ Tabla no encontrada</p>
              <p className="text-xs text-yellow-800 mb-3">
                La tabla <code className="bg-yellow-100 px-1 rounded">live_streams</code> no existe en la base de datos.
              </p>
              <p className="text-xs text-yellow-800 mb-3">
                Para solucionarlo, ejecuta en tu terminal:
              </p>
              <code className="block bg-yellow-100 px-3 py-2 rounded text-xs font-mono text-yellow-900">
                npm run drizzle:push
              </code>
            </div>
          )}
        </div>
        <CreateLiveStreamModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
      </div>
    );
  }

  // Si está cargando, mostrar skeleton
  if (isLoading || !data) {
    return <LiveStreamsSkeleton />;
  }

  const streams = data.pages.flatMap((page) => page.items) as any[];

  const handleCopyStreamKey = async (streamKey: string) => {
    if (!streamKey) return;
    await navigator.clipboard.writeText(streamKey);
    setCopiedId(streamKey);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Stream key copiado");
  };

  return (
    <div className="flex flex-col gap-y-6 pt-2.5">
      <div className="px-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Transmisiones en Vivo</h1>
          <p className="text-xs text-muted-foreground">
            {publicFeed ? "Explora transmisiones en vivo" : "Gestiona tus transmisiones en vivo"}
          </p>
        </div>
        {!publicFeed && (
          <Button onClick={() => setIsCreateModalOpen(true)} size="sm">
            <PlusIcon className="size-4 mr-2" />
            Nueva Transmisión
          </Button>
        )}
      </div>

      <div className="px-4">
        {streams.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <VideoIcon className="size-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h3 className="text-lg font-semibold mb-2">
              {publicFeed ? "No hay transmisiones en vivo" : "No tienes transmisiones en vivo"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {publicFeed ? "Vuelve más tarde para ver contenido en vivo" : "Crea una nueva transmisión para comenzar"}
            </p>
            {!publicFeed && (
              <Button onClick={() => setIsCreateModalOpen(true)}>
                <PlusIcon className="size-4 mr-2" />
                Crear Transmisión
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {streams.map((stream: any) => (
              <VideoCard
                key={stream.id}
                id={stream.id}
                title={stream.title}
                description={stream.description}
                thumbnailUrl={null} // Live streams don't have a static thumbnail yet
                previewUrl={null}
                videoUrl={stream.playbackUrl ? `https://livepeercdn.studio/hls/${stream.playbackUrl}/index.m3u8` : null}
                duration={0}
                createdAt={new Date(stream.createdAt)}
                isLive={true}
                viewerCount={0} // Mock viewer count as it's not in DB yet
                channel={{
                  name: stream.userName,
                  avatarUrl: stream.userImageUrl,
                  username: stream.userUsername,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <CreateLiveStreamModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
    </div>
  );
};

