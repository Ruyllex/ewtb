"use client";

import { Heart, ThumbsUp } from "lucide-react";
import { motion } from "framer-motion";
import { useLike } from "../../hooks/useLike";

interface LikeButtonProps {
  videoId: string;
  variant?: "heart" | "thumbsUp";
}

export function LikeButton({ videoId, variant = "heart" }: LikeButtonProps) {
  const { liked, toggle, isLoading } = useLike(videoId);

  const Icon = variant === "thumbsUp" ? ThumbsUp : Heart;
  const likedColor = variant === "thumbsUp" ? "text-[#5ADBFD] fill-[#5ADBFD]" : "text-red-500 fill-red-500";

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={toggle}
      disabled={isLoading}
      className="flex items-center justify-center p-2 rounded-full"
      aria-pressed={liked}
      title={liked ? "Unlike" : "Like"}
    >
      <Icon
        className={`w-6 h-6 transition-all ${liked ? likedColor : "text-gray-400"}`}
      />
    </motion.button>
  );
}
