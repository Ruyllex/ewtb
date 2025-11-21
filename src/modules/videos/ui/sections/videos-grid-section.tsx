"use client";

import { api } from "@/trpc/client";
import { VideoCard } from "../components/video-card";
import { InfiniteScroll } from "@/components/infinite-scroll";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorBoundary } from "react-error-boundary";
import { useState, useEffect } from "react";

interface VideosGridSectionProps {
  categoryId?: string;
}

const VideosGridSkeleton = () => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="w-full aspect-video rounded-xl" />
          <div className="flex gap-3">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const VideosGridSection = ({ categoryId }: VideosGridSectionProps) => {
  return (
    <ErrorBoundary
      fallback={
        <div className="text-center py-12">
          <p className="text-muted-foreground">Error al cargar los videos. Por favor, recarga la página.</p>
        </div>
      }
    >
      <VideosGridSectionSuspense categoryId={categoryId} />
    </ErrorBoundary>
  );
};

const VideosGridSectionSuspense = ({ categoryId }: VideosGridSectionProps) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Si no está montado, mostrar skeleton
  if (!mounted) {
    return <VideosGridSkeleton />;
  }

  return <VideosGridSectionContent categoryId={categoryId} />;
};

const VideosGridSectionContent = ({ categoryId }: VideosGridSectionProps) => {
  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
    error,
  } = api.videos.getMany.useInfiniteQuery(
    { categoryId, limit: 20 },
    {
      getNextPageParam(lastPage) {
        return lastPage.nextCursor;
      },
      retry: false, // No reintentar si falla
    }
  );

  // Si hay error, mostrar mensaje
  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Error al cargar los videos. Por favor, recarga la página.
        </p>
        <p className="text-sm text-muted-foreground mt-2">
          {error.message || "Error desconocido"}
        </p>
      </div>
    );
  }

  // Si está cargando, mostrar skeleton
  if (isLoading || !data) {
    return <VideosGridSkeleton />;
  }

  const videos = data.pages.flatMap((page) => page.items);

  if (videos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No hay videos públicos disponibles</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {videos.map((video) => {
          // Lógica unificada para el objeto channel (igual que en ChannelVideos)
          const channelProp = (video as any).channel
            ? {
                username: (video as any).channel.username ?? "",
                name: (video as any).channel.name ?? "",
                avatarUrl: (video as any).channel.avatarUrl ?? null,
              }
            : {
                // Fallback a propiedades planas (Legacy)
                username: (video as any).userUsername ?? "",
                name: (video as any).userName ?? (video as any).uploaderName ?? "",
                avatarUrl: (video as any).userImageUrl ?? (video as any).avatar ?? null,
              };

          return (
            <VideoCard
              key={video.id}
              id={video.id}
              title={video.title}
              description={video.description}
              thumbnailUrl={video.thumbnailUrl}
              previewUrl={video.previewUrl}
              videoUrl={video.s3Url}
              duration={video.duration || 0}
              createdAt={video.createdAt}
              // ✅ Pasamos SOLO la prop 'channel'
              channel={channelProp}
              // OBSOLETO: Se eliminan las props legacy
            />
          );
        })}
      </div>
      <InfiniteScroll
        isManual
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        fetchNextPage={fetchNextPage}
      />
    </>
  );
};