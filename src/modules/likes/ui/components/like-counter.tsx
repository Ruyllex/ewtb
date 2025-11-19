"use client";

import { useLike } from "../../hooks/useLike";

export function LikeCounter({ videoId }: { videoId: string }) {
  const { count } = useLike(videoId);
  return <span className="text-sm text-muted-foreground">{count}</span>;
}
