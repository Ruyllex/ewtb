"use client";

import { api } from "@/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { RadioIcon } from "lucide-react";
import MuxPlayer from "@mux/mux-player-react";

interface ChannelLiveStreamsProps {
  username: string;
}

const LiveStreamCardSkeleton = () => (
  <Card>
    <Skeleton className="aspect-video w-full rounded-t-lg" />
    <CardContent className="p-4">
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-4 w-1/2" />
    </CardContent>
  </Card>
);

export const ChannelLiveStreams = ({ username }: ChannelLiveStreamsProps) => {
  const { data: streams, isLoading, error } = api.channels.getLiveStreams.useQuery({ username });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <LiveStreamCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px]">
        <p className="text-muted-foreground">Error al cargar los streams</p>
      </div>
    );
  }

  if (!streams || streams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px]">
        <RadioIcon className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No hay transmisiones en vivo en este momento</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {streams.map((stream) => (
        <Link key={stream.id} href={`/studio/live/${stream.id}`}>
          <Card className="group hover:shadow-lg transition-shadow">
            <div className="relative aspect-video w-full bg-black rounded-t-lg overflow-hidden">
              {stream.playbackId ? (
                <MuxPlayer
                  streamType="live"
                  playbackId={stream.playbackId}
                  metadata={{
                    video_id: stream.id,
                    video_title: stream.title,
                  }}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-muted">
                  <RadioIcon className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <Badge
                variant="destructive"
                className="absolute top-2 left-2 flex items-center gap-1"
              >
                <div className="h-2 w-2 rounded-full bg-white animate-pulse" />
                EN VIVO 🔴
              </Badge>
            </div>
            <CardContent className="p-4">
              <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors mb-2">
                {stream.title}
              </h3>
              {stream.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{stream.description}</p>
              )}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};

