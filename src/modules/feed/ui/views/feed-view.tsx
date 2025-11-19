"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { api as trpc } from "@/trpc/client";
import { VideoCard } from "@/modules/videos/ui/components/video-card";
import { InfiniteScroll } from "@/components/infinite-scroll";

// Skeleton para los videos mientras cargan
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

export const FeedView = () => {
  const { isSignedIn } = useAuth();
  // Inicializar siempre con "global" para evitar problemas de hidratación
  // Luego actualizar a "personal" si el usuario está autenticado
  const [activeTab, setActiveTab] = useState<"personal" | "global">("global");
  const [isMounted, setIsMounted] = useState(false);

  // Actualizar el tab después de la hidratación
  useEffect(() => {
    setIsMounted(true);
    if (isSignedIn) {
      setActiveTab("personal");
    }
  }, [isSignedIn]);

  // Feed personal: videos de canales a los que está suscrito
  const {
    data: personalFeedData,
    hasNextPage: hasNextPersonalPage,
    isFetchingNextPage: isFetchingNextPersonalPage,
    fetchNextPage: fetchNextPersonalPage,
    isLoading: isLoadingPersonal,
  } = trpc.videos.getPersonalFeed.useInfiniteQuery(
    { limit: 20 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: isSignedIn && activeTab === "personal",
    }
  );

  // Feed global: todos los videos públicos
  const {
    data: globalFeedData,
    hasNextPage: hasNextGlobalPage,
    isFetchingNextPage: isFetchingNextGlobalPage,
    fetchNextPage: fetchNextGlobalPage,
    isLoading: isLoadingGlobal,
  } = trpc.videos.getMany.useInfiniteQuery(
    { limit: 20 },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
      enabled: activeTab === "global",
    }
  );

  // Obtener videos según el tab activo
  const videos =
    activeTab === "personal"
      ? personalFeedData?.pages.flatMap((page) => page.items) || []
      : globalFeedData?.pages.flatMap((page) => page.items) || [];

  const isLoading = activeTab === "personal" ? isLoadingPersonal : isLoadingGlobal;
  const hasMore = activeTab === "personal" ? hasNextPersonalPage : hasNextGlobalPage;
  const isFetchingMore =
    activeTab === "personal" ? isFetchingNextPersonalPage : isFetchingNextGlobalPage;

  const loadMore = () => {
    if (activeTab === "personal" && hasNextPersonalPage && !isFetchingNextPersonalPage) {
      fetchNextPersonalPage();
    } else if (activeTab === "global" && hasNextGlobalPage && !isFetchingNextGlobalPage) {
      fetchNextGlobalPage();
    }
  };

  return (
    <div className="max-w-[2400px] mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Feed</h1>
        <p className="text-muted-foreground">
          Descubre videos de tus canales favoritos y explora contenido nuevo
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "personal" | "global")}>
        <TabsList>
          {isSignedIn && (
            <TabsTrigger value="personal">Feed Personal</TabsTrigger>
          )}
          <TabsTrigger value="global">Feed Global</TabsTrigger>
        </TabsList>

        {/* Tab de Feed Personal */}
        <TabsContent value="personal" className="mt-6">
          {!isSignedIn ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                Inicia sesión para ver tu feed personal con videos de los canales a los que estás suscrito
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
          ) : videos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                No hay videos en tu feed personal. Suscríbete a algunos canales para ver sus videos aquí.
              </p>
              <Button asChild variant="outline">
                <Link href="/feed?tab=global">Explorar feed global</Link>
              </Button>
            </div>
          ) : (
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
                    duration={video.duration}
                    createdAt={video.createdAt}
                    channel={video.channel}
                  />
                ))}
              </div>
              <InfiniteScroll
                hasMore={hasMore ?? false}
                isFetchingNextPage={isFetchingMore}
                fetchNextPage={loadMore}
              />
            </>
          )}
        </TabsContent>

        {/* Tab de Feed Global */}
        <TabsContent value="global" className="mt-6">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <VideoCardSkeleton key={i} />
              ))}
            </div>
          ) : videos.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No hay videos disponibles</p>
            </div>
          ) : (
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
                    duration={video.duration}
                    createdAt={video.createdAt}
                    channel={video.channel}
                  />
                ))}
              </div>
              <InfiniteScroll
                hasMore={hasMore ?? false}
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
