"use client";

import { useTRPC } from "@/trpc/client";
import { VideoCard } from "@/modules/videos/ui/components/video-card";
import { InfiniteScroll } from "@/components/infinite-scroll";
import { Skeleton } from "@/components/ui/skeleton";
import { useInfiniteQuery } from "@tanstack/react-query";

interface ChannelVideosProps {
  username: string;
}

const VideoCardSkeleton = () => (
  <div className="flex flex-col gap-3">
    <Skeleton className="aspect-video w-full" />
    <div className="flex gap-3">
      <Skeleton className="h-10 w-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  </div>
);

export const ChannelVideos = ({ username }: ChannelVideosProps) => {
  const trpc = useTRPC();

  const {
    data,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
    isLoading,
    error,
  } = useInfiniteQuery(
    trpc.channels.getVideos.infiniteQueryOptions(
      {
        username,
        limit: 20,
      },
      {
        getNextPageParam(lastPage) {
          return lastPage.nextCursor;
        },
      }
    )
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <VideoCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground">Error al cargar los videos</p>
      </div>
    );
  }

  const videos = data?.pages.flatMap((page) => page.items) || [];

  if (videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground">Este canal no tiene videos</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {videos.map((video) => (
          <VideoCard
            key={video.id}
            id={video.id}
            title={video.title}
            description={video.description}
            thumbnailUrl={video.thumbnailUrl}
            previewUrl={video.previewUrl}
            duration={video.duration || 0}
            userName={""} // No se muestra el nombre del usuario en la tarjeta del canal
            userImageUrl={""} // No se muestra el avatar del usuario en la tarjeta del canal
            createdAt={video.createdAt}
          />
        ))}
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

