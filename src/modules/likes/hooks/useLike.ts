"use client";

import { api } from "@/trpc/client";
import { useCallback } from "react";

export function useLike(videoId: string) {
  const utils = api.useContext();

  const { data: likedData } = api.likes.isLikedByMe.useQuery({ videoId }, { staleTime: Infinity });
  const { data: countData } = api.likes.getCount.useQuery({ videoId }, { staleTime: Infinity });

  const toggleMutation = api.likes.toggle.useMutation({
    async onMutate() {
      await utils.likes.getCount.cancel();
      await utils.likes.isLikedByMe.cancel();

      const prevLiked = likedData;
      const prevCount = countData;

      // optimistic updates
      utils.likes.isLikedByMe.setData({ videoId }, () => ({ liked: !prevLiked?.liked }));
      utils.likes.getCount.setData({ videoId }, () => ({
        count: prevLiked?.liked ? (prevCount?.count ?? 0) - 1 : (prevCount?.count ?? 0) + 1,
      }));

      return { prevLiked, prevCount };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prevLiked) {
        utils.likes.isLikedByMe.setData({ videoId }, ctx.prevLiked);
      }
      if (ctx?.prevCount) {
        utils.likes.getCount.setData({ videoId }, ctx.prevCount);
      }
    },
    onSettled: () => {
      utils.likes.getCount.invalidate({ videoId });
      utils.likes.isLikedByMe.invalidate({ videoId });
    },
  });

  const toggle = useCallback(() => {
    toggleMutation.mutate({ videoId });
  }, [videoId, toggleMutation]);

  return {
    liked: likedData?.liked ?? false,
    count: countData?.count ?? 0,
    isLoading: toggleMutation.isLoading,
    toggle,
  };
}
