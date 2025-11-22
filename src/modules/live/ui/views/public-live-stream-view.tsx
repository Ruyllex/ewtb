"use client";

import { Suspense } from "react";
import { api as trpc } from "@/trpc/client";
import VideoPlayer from "@/modules/videos/ui/components/video-player";
import { ChatComponent } from "@/modules/chat/ui/components/chat-component";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserIcon, VideoIcon } from "lucide-react";
import Link from "next/link";

interface PublicLiveStreamViewProps {
  streamId: string;
}

const PublicLiveStreamViewSkeleton = () => {
  return (
    <div className="max-w-[2400px] mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="aspect-video bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-24 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="lg:col-span-1 h-[600px] bg-gray-200 rounded-lg animate-pulse" />
      </div>
    </div>
  );
};

export const PublicLiveStreamView = ({ streamId }: PublicLiveStreamViewProps) => {
  return (
    <Suspense fallback={<PublicLiveStreamViewSkeleton />}>
      <PublicLiveStreamViewSuspense streamId={streamId} />
    </Suspense>
  );
};

const PublicLiveStreamViewSuspense = ({ streamId }: PublicLiveStreamViewProps) => {
  const { data: stream, isLoading, error } = trpc.live.getPublicStream.useQuery({ id: streamId });

  if (isLoading) {
    return <PublicLiveStreamViewSkeleton />;
  }

  if (error || !stream) {
    return (
      <div className="max-w-[2400px] mx-auto px-4 py-6">
        <div className="text-center py-20">
          <VideoIcon className="size-16 mx-auto mb-4 opacity-50" />
          <h2 className="text-2xl font-bold mb-2">Stream no encontrado</h2>
          <p className="text-muted-foreground mb-4">
            {error?.message || "Este stream no existe o no está disponible."}
          </p>
          <Link href="/feed/live" className="text-primary hover:underline">
            Ver todos los streams en vivo
          </Link>
        </div>
      </div>
    );
  }

  const isActive = stream.status === "active";

  return (
    <div className="max-w-[2400px] mx-auto px-4 pt-4 lg:pt-6">
      <div className="flex flex-col lg:grid lg:grid-cols-4 gap-6 lg:h-[calc(100vh-100px)]">
        {/* Columna principal: Video e Info */}
        <div className="lg:col-span-3 flex flex-col gap-4 h-full lg:overflow-y-auto scroll-hidden pb-10">
          {/* Reproductor de video */}
          <div className="aspect-video bg-black rounded-xl overflow-hidden shrink-0 shadow-2xl border border-white/5">
            {stream.playbackUrl && isActive ? (
              <VideoPlayer
                playbackId={stream.playbackUrl}
                streamType="live"
                autoPlay={true}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white">
                <div className="text-center">
                  <VideoIcon className="size-12 mx-auto mb-2 opacity-50" />
                  <p className="text-lg mb-2">
                    {isActive ? "Cargando stream..." : "El stream está offline"}
                  </p>
                  <p className="text-sm opacity-75">
                    {isActive ? "Por favor espera un momento" : "Vuelve cuando el streamer esté en vivo"}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Información del Canal y Stream */}
          <div className="space-y-4 pb-10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <Link href={`/channel/${stream.userUsername || stream.userId}`}>
                  <Avatar className="size-12 cursor-pointer hover:opacity-80 transition">
                    <AvatarImage src={stream.userImageUrl || undefined} />
                    <AvatarFallback>
                      <UserIcon className="size-6" />
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="space-y-1">
                  <h1 className="text-2xl font-bold">{stream.title}</h1>
                  <Link 
                    href={`/channel/${stream.userUsername || stream.userId}`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
                  >
                    <span className="font-medium">{stream.userName}</span>
                    {stream.userUsername && (
                      <>
                        <span>•</span>
                        <span>@{stream.userUsername}</span>
                      </>
                    )}
                  </Link>
                  {stream.description && (
                    <p className="text-sm text-muted-foreground mt-2">{stream.description}</p>
                  )}
                </div>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-medium flex items-center gap-2 shrink-0 ${isActive ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400"}`}>
                <div className={`size-2 rounded-full ${isActive ? "bg-red-500 animate-pulse" : "bg-gray-400"}`} />
                {isActive ? "EN VIVO" : "OFFLINE"}
              </div>
            </div>
          </div>
        </div>

        {/* Columna lateral: Chat */}
        <div className="lg:col-span-1 h-[500px] lg:h-full pb-6 lg:pb-0">
          <ChatComponent streamId={streamId} />
        </div>
      </div>
    </div>
  );
};
