"use client";

import { useTRPC } from "@/trpc/client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoCard } from "@/modules/videos/ui/components/video-card";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { InfiniteScroll } from "@/components/infinite-scroll";
import { VideoThumbnail } from "@/modules/videos/ui/components/video-thumbnail";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

const VideoCardSkeleton = () => (
  <div className="flex flex-col gap-3">
    <div className="relative w-full aspect-video bg-gray-200 rounded-lg animate-pulse" />
    <div className="flex gap-3">
      <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2" />
      </div>
    </div>
  </div>
);

const StreamCard = ({ stream }: { stream: any }) => {
  return (
    <Link href={`/studio/live/${stream.id}`} className="group">
      <div className="flex flex-col gap-3">
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden">
          {stream.playbackId ? (
            <VideoThumbnail
              imageUrl={`https://image.mux.com/${stream.playbackId}/thumbnail.png`}
              title={stream.title}
              duration={0}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              <div className="text-center">
                <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse mx-auto mb-2" />
                <p className="text-sm">En vivo</p>
              </div>
            </div>
          )}
          <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-semibold flex items-center gap-1">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            EN VIVO
          </div>
        </div>
        <div className="flex gap-3">
          {stream.userUsername ? (
            <Link
              href={`/channel/${stream.userUsername}`}
              className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 hover:opacity-80 transition-opacity"
            >
              <Image
                src={stream.userImageUrl || "/user-placeholder.svg"}
                alt={stream.userName}
                fill
                className="object-cover"
              />
            </Link>
          ) : (
            <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0">
              <Image
                src={stream.userImageUrl || "/user-placeholder.svg"}
                alt={stream.userName}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold line-clamp-2 group-hover:text-blue-600 transition-colors">
              {stream.title}
            </h3>
            {stream.userName && (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                {stream.userName}
              </p>
            )}
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>{formatDistanceToNow(new Date(stream.createdAt), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export const FeedView = () => {
  const { isSignedIn } = useAuth();
  const trpc = useTRPC();
  const [activeTab, setActiveTab] = useState<"personal" | "global">(
    isSignedIn ? "personal" : "global"
  );

  // Feed personal de videos
  const {
    data: personalVideosData,
    hasNextPage: hasNextPersonalVideos,
    isFetchingNextPage: isFetchingNextPersonalVideos,
    fetchNextPage: fetchNextPersonalVideos,
    isLoading: isLoadingPersonalVideos,
  } = useInfiniteQuery(
    trpc.videos.getPersonalFeed.infiniteQueryOptions(
      { limit: 20 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        enabled: isSignedIn && activeTab === "personal",
      }
    )
  );

  // Feed global de videos
  const {
    data: globalVideosData,
    hasNextPage: hasNextGlobalVideos,
    isFetchingNextPage: isFetchingNextGlobalVideos,
    fetchNextPage: fetchNextGlobalVideos,
    isLoading: isLoadingGlobalVideos,
  } = useInfiniteQuery(
    trpc.videos.getMany.infiniteQueryOptions(
      { limit: 20 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        enabled: activeTab === "global",
      }
    )
  );

  // Feed personal de streams
  const {
    data: personalStreamsData,
    hasNextPage: hasNextPersonalStreams,
    isFetchingNextPage: isFetchingNextPersonalStreams,
    fetchNextPage: fetchNextPersonalStreams,
    isLoading: isLoadingPersonalStreams,
  } = useInfiniteQuery(
    trpc.live.getPersonalFeed.infiniteQueryOptions(
      { limit: 20 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        enabled: isSignedIn && activeTab === "personal",
      }
    )
  );

  // Feed global de streams
  const {
    data: globalStreamsData,
    hasNextPage: hasNextGlobalStreams,
    isFetchingNextPage: isFetchingNextGlobalStreams,
    fetchNextPage: fetchNextGlobalStreams,
    isLoading: isLoadingGlobalStreams,
  } = useInfiniteQuery(
    trpc.live.getPublicStreams.infiniteQueryOptions(
      { limit: 20 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        enabled: activeTab === "global",
      }
    )
  );

  const personalVideos = personalVideosData?.pages.flatMap((page) => page.items) || [];
  const globalVideos = globalVideosData?.pages.flatMap((page) => page.items) || [];
  const personalStreams = personalStreamsData?.pages.flatMap((page) => page.items) || [];
  const globalStreams = globalStreamsData?.pages.flatMap((page) => page.items) || [];

  const isLoading =
    (activeTab === "personal" && (isLoadingPersonalVideos || isLoadingPersonalStreams)) ||
    (activeTab === "global" && (isLoadingGlobalVideos || isLoadingGlobalStreams));

  // Calcular items basándose en el tab activo
  const allItems =
    activeTab === "personal"
      ? [
          ...personalStreams.map((s) => ({ type: "stream" as const, data: s })),
          ...personalVideos.map((v) => ({ type: "video" as const, data: v })),
        ].sort((a, b) => {
          const dateA = new Date(a.data.createdAt).getTime();
          const dateB = new Date(b.data.createdAt).getTime();
          return dateB - dateA;
        })
      : [
          ...globalStreams.map((s) => ({ type: "stream" as const, data: s })),
          ...globalVideos.map((v) => ({ type: "video" as const, data: v })),
        ].sort((a, b) => {
          const dateA = new Date(a.data.createdAt).getTime();
          const dateB = new Date(b.data.createdAt).getTime();
          return dateB - dateA;
        });

  const hasMore =
    activeTab === "personal"
      ? hasNextPersonalVideos || hasNextPersonalStreams
      : hasNextGlobalVideos || hasNextGlobalStreams;

  const isFetchingMore =
    activeTab === "personal"
      ? isFetchingNextPersonalVideos || isFetchingNextPersonalStreams
      : isFetchingNextGlobalVideos || isFetchingNextGlobalStreams;

  const loadMore = () => {
    if (activeTab === "personal") {
      if (hasNextPersonalVideos && !isFetchingNextPersonalVideos) fetchNextPersonalVideos();
      if (hasNextPersonalStreams && !isFetchingNextPersonalStreams) fetchNextPersonalStreams();
    } else {
      if (hasNextGlobalVideos && !isFetchingNextGlobalVideos) fetchNextGlobalVideos();
      if (hasNextGlobalStreams && !isFetchingNextGlobalStreams) fetchNextGlobalStreams();
    }
  };

  return (
    <div className="max-w-[2400px] mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Feed</h1>
        <p className="text-muted-foreground">
          Descubre videos y streams en vivo de tus canales favoritos
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "personal" | "global")}>
        <TabsList>
          {isSignedIn && (
            <TabsTrigger value="personal">Feed Personal</TabsTrigger>
          )}
          <TabsTrigger value="global">Feed Global</TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-6">
          {!isSignedIn ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Inicia sesión para ver tu feed personal
              </p>
              <Button asChild>
                <Link href="/sign-in">Iniciar sesión</Link>
              </Button>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <VideoCardSkeleton key={i} />
              ))}
            </div>
          ) : allItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No hay contenido en tu feed personal. Suscríbete a algunos canales para ver sus videos y streams.
              </p>
              <Button asChild variant="outline">
                <Link href="/feed">Explorar feed global</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {allItems.map((item) =>
                  item.type === "stream" ? (
                    <StreamCard key={`stream-${item.data.id}`} stream={item.data} />
                  ) : (
                    <VideoCard
                      key={`video-${item.data.id}`}
                      id={item.data.id}
                      title={item.data.title}
                      description={item.data.description}
                      thumbnailUrl={item.data.thumbnailUrl}
                      previewUrl={item.data.previewUrl}
                      duration={item.data.duration}
                      createdAt={item.data.createdAt}
                      channel={item.data.channel}
                    />
                  )
                )}
              </div>
              <InfiniteScroll
                hasMore={hasMore}
                isFetchingNextPage={isFetchingMore}
                fetchNextPage={loadMore}
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="global" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <VideoCardSkeleton key={i} />
              ))}
            </div>
          ) : allItems.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No hay contenido disponible</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {allItems.map((item) =>
                  item.type === "stream" ? (
                    <StreamCard key={`stream-${item.data.id}`} stream={item.data} />
                  ) : (
                    <VideoCard
                      key={`video-${item.data.id}`}
                      id={item.data.id}
                      title={item.data.title}
                      description={item.data.description}
                      thumbnailUrl={item.data.thumbnailUrl}
                      previewUrl={item.data.previewUrl}
                      duration={item.data.duration}
                      createdAt={item.data.createdAt}
                      channel={item.data.channel}
                    />
                  )
                )}
              </div>
              <InfiniteScroll
                hasMore={hasMore}
                isFetchingNextPage={isFetchingMore}
                fetchNextPage={loadMore}
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

