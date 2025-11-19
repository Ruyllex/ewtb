"use client";

import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { useLike } from "../../hooks/useLike";

export function LikeButton({ videoId }: { videoId: string }) {
  const { liked, toggle, isLoading } = useLike(videoId);

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={toggle}
      disabled={isLoading}
      className="flex items-center justify-center p-2 rounded-full"
      aria-pressed={liked}
      title={liked ? "Unlike" : "Like"}
    >
      <Heart
        className={`w-6 h-6 transition-all ${liked ? "text-red-500 fill-red-500" : "text-gray-400"}`}
      />
    </motion.button>
  );
}
