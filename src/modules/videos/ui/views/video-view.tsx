"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import VideoPlayer from "../components/video-player";
import Image from "next/image";
import Link from "next/link";
import { formatDuration } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { MonetizationModal } from "@/modules/monetization/ui/components/monetization-modal";
import { Button } from "@/components/ui/button";
import { HeartIcon, CrownIcon, Bell, BellOff, CheckCircle2 } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

interface VideoViewProps {
  videoId: string;
}

const VideoViewSkeleton = () => {
  return (
    <div className="max-w-[2400px] mx-auto px-4 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <div className="aspect-video bg-gray-200 rounded-lg animate-pulse" />
          <div className="mt-4 space-y-4">
            <div className="h-8 bg-gray-200 rounded animate-pulse w-3/4" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
            <div className="h-20 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="lg:w-80">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const VideoView = ({ videoId }: VideoViewProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { isSignedIn, userId } = useAuth();
  const { data: video, error, isLoading } = useQuery(trpc.videos.getPublic.queryOptions({ id: videoId }));
  const [monetizationOpen, setMonetizationOpen] = useState(false);

  const recordView = useMutation(trpc.videos.recordView.mutationOptions());

  // Obtener información del canal y suscripción
  const { data: channel } = useQuery({
    ...trpc.channels.getByUsername.queryOptions({ username: video?.userUsername || "" }),
    enabled: !!video?.userUsername,
  });

  // Obtener el usuario actual para comparar
  const { data: currentUser } = useQuery({
    ...trpc.users.getProfile.queryOptions(),
    enabled: isSignedIn,
  });

  const { data: isSubscribed, isLoading: isLoadingSubscription } = useQuery({
    ...trpc.channels.isSubscribed.queryOptions({ channelId: channel?.id || "" }),
    enabled: isSignedIn && !!channel?.id && currentUser?.id !== video?.userId,
  });

  const toggleSubscription = useMutation(
    trpc.channels.toggleSubscription.mutationOptions({
      onSuccess: (data) => {
        queryClient.invalidateQueries();
        toast.success(data.subscribed ? "Te has suscrito al canal" : "Te has desuscrito del canal");
      },
      onError: (error) => {
        toast.error(error.message || "Error al suscribirse");
      },
    })
  );

  // Si está cargando, mostrar skeleton
  if (isLoading) {
    return <VideoViewSkeleton />;
  }

  // Si hay error, mostrar mensaje
  if (error) {
    return (
      <div className="max-w-[2400px] mx-auto px-4 py-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Error al cargar el video. Por favor, recarga la página.</p>
          <p className="text-sm text-muted-foreground mt-2">
            {error.message || "Error desconocido"}
          </p>
        </div>
      </div>
    );
  }

  // Record view when video is played
  useEffect(() => {
    const timer = setTimeout(() => {
      recordView.mutate({ videoId });
    }, 3000); // Record view after 3 seconds

    return () => clearTimeout(timer);
  }, [videoId, recordView]);

  if (!video) {
    return <div>Video not found</div>;
  }

  return (
    <div className="max-w-[2400px] mx-auto px-4 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main video section */}
        <div className="flex-1">
          {/* Video player */}
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <VideoPlayer
              playbackId={video.muxPlaybackId}
              thumbnailUrl={video.thumbnailUrl}
              autoPlay={false}
              onPlay={() => {
                // Record view when user plays the video
                recordView.mutate({ videoId });
              }}
            />
          </div>

          {/* Video info */}
          <div className="mt-4 space-y-4">
            <div>
              <h1 className="text-2xl font-bold">{video.title}</h1>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span>{video.viewCount} views</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}</span>
              </div>
            </div>

            {/* Author info */}
            <div className="flex items-center gap-4 pb-4 border-b">
              {video.userUsername ? (
                <Link href={`/channel/${video.userUsername}`} className="relative w-12 h-12 rounded-full overflow-hidden hover:opacity-80 transition-opacity">
                  <Image
                    src={video.userImageUrl}
                    alt={video.userName}
                    fill
                    className="object-cover cursor-pointer"
                  />
                </Link>
              ) : (
                <div className="relative w-12 h-12 rounded-full overflow-hidden">
                  <Image
                    src={video.userImageUrl}
                    alt={video.userName}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                {video.userUsername ? (
                  <Link href={`/channel/${video.userUsername}`} className="hover:opacity-80 transition-opacity">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold cursor-pointer">{video.userName}</h3>
                      {channel?.isVerified && (
                        <CheckCircle2 className="h-5 w-5 text-blue-500 fill-blue-500" />
                      )}
                    </div>
                  </Link>
                ) : (
                  <h3 className="font-semibold">{video.userName}</h3>
                )}
                <p className="text-sm text-muted-foreground">Creator</p>
              </div>
              <div className="flex gap-2">
                {isSignedIn && currentUser?.id !== video.userId && channel && (
                  <Button
                    onClick={() => toggleSubscription.mutate({ channelId: channel.id })}
                    disabled={isLoadingSubscription || toggleSubscription.isPending}
                    variant={isSubscribed?.subscribed ? "outline" : "default"}
                    className="shrink-0"
                  >
                    {isLoadingSubscription ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : isSubscribed?.subscribed ? (
                      <>
                        <BellOff className="h-4 w-4 mr-2" />
                        Siguiendo
                      </>
                    ) : (
                      <>
                        <Bell className="h-4 w-4 mr-2" />
                        Seguir
                      </>
                    )}
                  </Button>
                )}
                {video.userCanMonetize && (
                  <Button
                    variant="outline"
                    onClick={() => setMonetizationOpen(true)}
                    className="gap-2"
                  >
                    <HeartIcon className="size-4" />
                    <CrownIcon className="size-4" />
                    Apoyar
                  </Button>
                )}
              </div>
            </div>

            {/* Description */}
            {video.description && (
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm whitespace-pre-wrap">{video.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Related videos (placeholder) */}
        <div className="lg:w-80">
          <h2 className="text-lg font-semibold mb-4">Related Videos</h2>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Related videos coming soon...</p>
          </div>
        </div>
      </div>

      {/* Monetization Modal */}
      {video && (
        <MonetizationModal
          videoId={videoId}
          creatorId={video.userId}
          creatorName={video.userName}
          open={monetizationOpen}
          onOpenChange={setMonetizationOpen}
        />
      )}
    </div>
  );
};

