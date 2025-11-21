"use client";

import { VideoCard } from "@/modules/videos/ui/components/video-card";
import { InfiniteScroll } from "@/components/infinite-scroll";
import { api as trpc } from "@/trpc/client";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2Icon, HistoryIcon } from "lucide-react";

const VideoCardSkeleton = () => (
  <div className="flex flex-col gap-3">
    <div className="relative w-full aspect-video bg-gray-200/10 rounded-lg animate-pulse" />
    <div className="flex gap-3">
      <div className="w-10 h-10 rounded-full bg-gray-200/10 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200/10 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-gray-200/10 rounded animate-pulse w-1/2" />
      </div>
    </div>
  </div>
);

export const HistoryView = () => {
  const { isSignedIn, isLoaded } = useAuth();

  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
  } = trpc.playlists.getHistory.useInfiniteQuery(
    { limit: 20 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: !!isSignedIn,
    }
  );

  const videos = data?.pages.flatMap((page) => page.items) || [];

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="max-w-[2400px] mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Historial de reproducciones</h1>
        </div>
        <div className="text-center py-12 flex flex-col items-center">
          <HistoryIcon className="size-16 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-6 text-lg">
            Inicia sesión para ver tu historial de reproducciones.
          </p>
          <Button asChild size="lg">
            <Link href="/sign-in">Iniciar sesión</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[2400px] mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Historial de reproducciones</h1>
        <p className="text-muted-foreground">
          Videos que has visto recientemente
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <VideoCardSkeleton key={i} />
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 flex flex-col items-center">
          <HistoryIcon className="size-16 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-6 text-lg">
            No hay videos en tu historial.
          </p>
          <Button asChild variant="outline">
            <Link href="/">Explorar videos</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((item) => (
              <VideoCard
                key={`${item.viewId}-${item.id}`} // viewId para keys únicas si se repite el video
                id={item.id}
                title={item.title}
                description={item.description}
                thumbnailUrl={item.thumbnailUrl}
                previewUrl={item.previewUrl}
                videoUrl={item.s3Url}
                duration={item.duration}
                createdAt={item.createdAt} // Podríamos mostrar viewedAt si VideoCard lo soportara
                likes={item.likes}
                viewCount={item.viewCount}
                channel={item.channel}
              />
            ))}
          </div>
          <InfiniteScroll
            hasMore={hasNextPage ?? false}
            isFetchingNextPage={isFetchingNextPage}
            fetchNextPage={fetchNextPage}
          />
        </>
      )}
    </div>
  );
};

