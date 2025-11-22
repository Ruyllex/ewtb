"use client";

// Usamos el alias 'trpc' para el helper tRPC, asumiendo 'api' se exporta desde client.tsx
import { api as trpc } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import VideoPlayer from "../components/video-player";
import { LikeSection } from "@/modules/likes/ui/components/like-section";
import Image from "next/image";
import Link from "next/link";
import { TimeAgo } from "@/components/time-ago";
import { MonetizationModal } from "@/modules/monetization/ui/components/monetization-modal";
import { ReportVideoDialog } from "../components/report-video-dialog";
import { Button } from "@/components/ui/button";
import { HeartIcon, CrownIcon, Bell, BellOff, CheckCircle2, Sparkles } from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { CommentsSection } from "@/modules/comments/ui/components/comments-section";
import { VideoCard } from "../components/video-card";

interface VideoViewProps {
  videoId: string;
}

const VideoViewSkeleton = () => {
  return (
    <div className="bg-transparent">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div className="aspect-video rounded-xl bg-white/10 animate-pulse" />
            <div className="rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm p-4 sm:p-6 space-y-4">
              <div className="h-8 w-3/4 rounded bg-white/10 animate-pulse" />
              <div className="h-4 w-1/2 rounded bg-white/10 animate-pulse" />
              <div className="h-20 rounded bg-white/10 animate-pulse" />
            </div>
            <div className="rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm p-4 sm:p-6 h-64 animate-pulse" />
          </div>
          <div className="lg:sticky lg:top-24">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const VideoView = ({ videoId }: VideoViewProps) => {
  const queryClient = useQueryClient();
  const { isSignedIn, userId } = useAuth();

  // CORRECCIÓN 1: Usar trpc.videos.getPublic.useQuery
  const { data: video, error, isLoading } = trpc.videos.getPublic.useQuery({ id: videoId });

  const [monetizationOpen, setMonetizationOpen] = useState(false);

  // CORRECCIÓN 2: Uso del hook de mutación directamente desde tRPC
  const recordView = trpc.videos.recordView.useMutation();

  // CORRECCIÓN 3: Usar trpc.channels.getByUsername.useQuery
  const { data: channel } = trpc.channels.getByUsername.useQuery(
    { username: video?.userUsername || "" },
    { enabled: !!video?.userUsername }
  );

  // CORRECCIÓN 4: Usar trpc.users.getProfile.useQuery
  const { data: currentUser } = trpc.users.getProfile.useQuery(
    undefined, // No input required for this procedure
    { enabled: isSignedIn }
  );

  // CORRECCIÓN 5: Usar trpc.channels.isSubscribed.useQuery
  const { data: isSubscribed, isLoading: isLoadingSubscription } = trpc.channels.isSubscribed.useQuery(
    { channelId: channel?.id || "" },
    { enabled: isSignedIn && !!channel?.id && currentUser?.id !== video?.userId }
  );

  // CORRECCIÓN 6: Usar trpc.channels.toggleSubscription.useMutation
  const toggleSubscription = trpc.channels.toggleSubscription.useMutation({
    onSuccess: (data) => {
      queryClient.invalidateQueries();
      toast.success(data.subscribed ? "Te has suscrito al canal" : "Te has desuscrito del canal");
    },
    onError: (error) => {
      toast.error(error.message || "Error al suscribirse");
    },
  });

  // Fetch related videos from the same category
  const { data: relatedVideosData } = trpc.videos.getMany.useQuery(
    {
      categoryId: video?.categoryId ?? undefined,
      limit: 10,
    },
    {
      enabled: !!video?.categoryId,
    }
  );

  // Filter out the current video from related videos  
  const relatedVideos = relatedVideosData?.items.filter(v => v.id !== videoId) ?? [];

  // Si está cargando, mostrar skeleton
  if (isLoading) {
    return <VideoViewSkeleton />;
  }

  if (!video) {
    return <div>Video not found</div>;
  }

  return (
    <div className="bg-transparent min-h-screen">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* Main video section */}
          <section className="space-y-6">
            {/* Video player */}
            <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-sm">
              <VideoPlayer
                playbackId={video.s3Url}
                thumbnailUrl={video.thumbnailUrl}
                autoPlay={false}
                streamType="on-demand"
                onPlay={() => {
                  // Record view when user plays the video
                  recordView.mutate({ videoId });
                }}
              />
            </div>

            {/* Video info */}
            <div className="space-y-6 rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm p-4 sm:p-6">
              <div>
                <h1 className="text-2xl font-bold leading-tight text-white">{video.title}</h1>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-white/70">
                    <span>{video.viewCount} views</span>
                    <span className="text-base">•</span>
                    <TimeAgo date={video.createdAt} />
                  </div>
                  <div className="rounded-full border px-3 py-1">
                    <LikeSection videoId={videoId} variant="thumbsUp" />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 border-t pt-4">
                <div className="flex flex-1 min-w-0 items-center gap-4">
                  {video.userUsername ? (
                    <Link
                      href={`/channel/${video.userUsername}`}
                      className="relative h-14 w-14 overflow-hidden rounded-full border hover:opacity-80 transition-opacity"
                    >
                      <Image
                        src={video.userImageUrl}
                        alt={video.userName}
                        fill
                        className="object-cover"
                      />
                    </Link>
                  ) : (
                    <div className="relative h-14 w-14 overflow-hidden rounded-full border">
                      <Image src={video.userImageUrl} alt={video.userName} fill className="object-cover" />
                    </div>
                  )}
                  <div className="min-w-0">
                    {video.userUsername ? (
                      <Link href={`/channel/${video.userUsername}`} className="hover:opacity-80 transition-opacity">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-semibold text-white">{video.userName}</h3>
                          {channel?.isVerified && <CheckCircle2 className="h-5 w-5 text-[#5ADBFD]" />}
                        </div>
                      </Link>
                    ) : (
                      <h3 className="font-semibold text-white">{video.userName}</h3>
                    )}
                    <p className="text-sm text-white/70">Creator</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2">
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
                          <BellOff className="mr-2 h-4 w-4" />
                          Siguiendo
                        </>
                      ) : (
                        <>
                          <Bell className="mr-2 h-4 w-4" />
                          Seguir
                        </>
                      )}
                    </Button>
                  )}
                  {video.userCanMonetize && (
                    <Button variant="outline" onClick={() => setMonetizationOpen(true)} className="gap-2">
                      <Sparkles className="size-4 text-yellow-500" />
                      Donar Stars
                    </Button>
                  )}
                  {isSignedIn && currentUser?.id !== video.userId && <ReportVideoDialog videoId={videoId} />}
                </div>
              </div>

              {/* Description */}
              {video.description && (
                <div className="rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm p-4 text-sm leading-relaxed text-white">
                  <p className="whitespace-pre-wrap">{video.description}</p>
                </div>
              )}
            </div>

            {/* Comments Section */}
            <div className="rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm p-4 sm:p-6">
              <CommentsSection videoId={videoId} />
            </div>
          </section>

          {/* Sidebar - Related videos */}
          <aside className="space-y-4 lg:sticky lg:top-24">
            <div className="rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm p-4">
              <h2 className="text-lg font-semibold text-white mb-4">Videos relacionados</h2>
              {relatedVideos.length > 0 ? (
                <div className="space-y-4">
                  {relatedVideos.map((relatedVideo) => (
                    <VideoCard
                      key={relatedVideo.id}
                      id={relatedVideo.id}
                      title={relatedVideo.title}
                      thumbnailUrl={relatedVideo.thumbnailUrl}
                      videoUrl={relatedVideo.s3Url}
                      duration={relatedVideo.duration}
                      createdAt={relatedVideo.createdAt}
                      viewCount={relatedVideo.viewCount || 0}
                      likes={relatedVideo.likes || 0}
                      channel={relatedVideo.channel}
                      userName={relatedVideo.userName}
                      userUsername={relatedVideo.userUsername}
                      userImageUrl={relatedVideo.userImageUrl}
                    />
                  ))}
                </div>
              ) : video?.categoryId ? (
                <p className="text-sm text-white/70">No hay más videos de esta categoría disponibles.</p>
              ) : (
                <p className="text-sm text-white/70">Este video no tiene categoría asignada.</p>
              )}
            </div>
          </aside>
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
    </div>
  );
};