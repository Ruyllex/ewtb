"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { THUMBNAIL_FALLBACK } from "../../constants";
import { formatDuration } from "@/lib/utils";

interface SearchResultsViewProps {
  query?: string;
}

const SearchResultsSkeleton = () => {
  return (
    <div className="max-w-[2400px] mx-auto px-4 py-6">
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="w-64 h-36 bg-gray-200 rounded-lg animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SearchResultsView = ({ query }: SearchResultsViewProps) => {
  if (!query) {
    return (
      <div className="max-w-[2400px] mx-auto px-4 py-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-2">Search for videos</h2>
          <p className="text-muted-foreground">Enter a search query to find videos</p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<SearchResultsSkeleton />}>
      <SearchResultsSuspense query={query} />
    </Suspense>
  );
};

const SearchResultsSuspense = ({ query }: { query: string }) => {
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(trpc.videos.search.queryOptions({ query, limit: 20 }));

  if (!data.items.length) {
    return (
      <div className="max-w-[2400px] mx-auto px-4 py-6">
        <h2 className="text-2xl font-semibold mb-4">Search results for &quot;{query}&quot;</h2>
        <div className="text-center py-12">
          <p className="text-muted-foreground">No videos found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[2400px] mx-auto px-4 py-6">
      <h2 className="text-2xl font-semibold mb-6">
        Search results for &quot;{query}&quot;
      </h2>
      <div className="space-y-4">
        {data.items.map((video) => (
          <Link
            key={video.id}
            href={`/video/${video.id}`}
            className="flex gap-4 hover:bg-gray-50 p-4 rounded-lg transition-colors"
          >
            <div className="relative w-64 h-36 shrink-0 rounded-lg overflow-hidden bg-black">
              <Image
                src={video.thumbnailUrl || THUMBNAIL_FALLBACK}
                alt={video.title}
                fill
                className="object-cover"
              />
              <div className="absolute bottom-2 right-2 px-1 py-0.5 rounded bg-black/80 text-white text-xs font-medium">
                {formatDuration(video.duration || 0)}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold line-clamp-2 mb-2">{video.title}</h3>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                <span>{video.userName}</span>
                <span>•</span>
                <span>{formatDistanceToNow(new Date(video.createdAt), { addSuffix: true })}</span>
              </div>
              {video.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">{video.description}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

