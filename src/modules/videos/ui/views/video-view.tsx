"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery, useMutation } from "@tanstack/react-query";
import { Suspense, useEffect } from "react";
import VideoPlayer from "../components/video-player";
import Image from "next/image";
import { formatDuration } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

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
  return (
    <Suspense fallback={<VideoViewSkeleton />}>
      <VideoViewSuspense videoId={videoId} />
    </Suspense>
  );
};

const VideoViewSuspense = ({ videoId }: VideoViewProps) => {
  const trpc = useTRPC();
  const { data: video } = useSuspenseQuery(trpc.videos.getPublic.queryOptions({ id: videoId }));

  const recordView = useMutation(trpc.videos.recordView.mutationOptions());

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
              <div className="relative w-12 h-12 rounded-full overflow-hidden">
                <Image
                  src={video.userImageUrl}
                  alt={video.userName}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">{video.userName}</h3>
                <p className="text-sm text-muted-foreground">Creator</p>
              </div>
              <button className="px-4 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors">
                Subscribe
              </button>
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
    </div>
  );
};

