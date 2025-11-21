"use client";

import { LikeButton } from "./like-button";
import { LikeCounter } from "./like-counter";

interface LikeSectionProps {
  videoId: string;
  variant?: "heart" | "thumbsUp";
}

export function LikeSection({ videoId, variant = "heart" }: LikeSectionProps) {
  return (
    <div className="flex items-center gap-2">
      <LikeButton videoId={videoId} variant={variant} />
      <LikeCounter videoId={videoId} />
    </div>
  );
}
