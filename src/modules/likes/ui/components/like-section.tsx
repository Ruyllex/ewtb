"use client";

import { LikeButton } from "./like-button";
import { LikeCounter } from "./like-counter";

export function LikeSection({ videoId }: { videoId: string }) {
  return (
    <div className="flex items-center gap-2">
      <LikeButton videoId={videoId} />
      <LikeCounter videoId={videoId} />
    </div>
  );
}
