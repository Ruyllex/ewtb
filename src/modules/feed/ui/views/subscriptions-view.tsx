"use client";

import { VideoCard } from "@/modules/videos/ui/components/video-card";
import { InfiniteScroll } from "@/components/infinite-scroll";
import { api as trpc } from "@/trpc/client";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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

export const SubscriptionsView = () => {
    const { isSignedIn } = useAuth();

    const {
        data,
        hasNextPage,
        isFetchingNextPage,
        fetchNextPage,
        isLoading,
    } = trpc.videos.getPersonalFeed.useInfiniteQuery(
        { limit: 20 },
        {
            getNextPageParam: (lastPage) => lastPage.nextCursor,
            enabled: !!isSignedIn,
        }
    );

    const videos = data?.pages.flatMap((page) => page.items) || [];

    if (!isSignedIn) {
        return (
            <div className="max-w-[2400px] mx-auto px-4 py-6">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold mb-2">Subscriptions</h1>
                </div>
                <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                        Sign in to see videos from channels you are subscribed to.
                    </p>
                    <Button asChild>
                        <Link href="/sign-in">Sign In</Link>
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[2400px] mx-auto px-4 py-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Subscriptions</h1>
                <p className="text-muted-foreground">
                    Latest videos from your subscriptions
                </p>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <VideoCardSkeleton key={i} />
                    ))}
                </div>
            ) : videos.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                        No videos from your subscriptions yet.
                    </p>
                    <Button asChild variant="outline">
                        <Link href="/feed/trending">Explore Trending</Link>
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
                                likes={video.likes}
                                viewCount={video.viewCount}
                                channel={video.channel}
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
