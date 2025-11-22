import { formatDuration } from "@/lib/utils";
import Image from "next/image";
import { THUMBNAIL_FALLBACK } from "../../constants";
import { useState, useRef, useEffect } from "react";

interface VideoThumbnailProps {
  imageUrl?: string | null;
  previewUrl?: string | null;
  videoUrl?: string | null;
  title: string;
  duration: number;
}

export const VideoThumbnail = ({ imageUrl, previewUrl, videoUrl, title, duration }: VideoThumbnailProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [shouldPlay, setShouldPlay] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Manejar el delay para evitar reproducir videos si solo se pasa el mouse rápidamente
  useEffect(() => {
    let timeout: NodeJS.Timeout;

    if (isHovered && videoUrl) {
      timeout = setTimeout(() => {
        setShouldPlay(true);
      }, 600); // 600ms de delay
    } else {
      setShouldPlay(false);
    }

    return () => clearTimeout(timeout);
  }, [isHovered, videoUrl]);

  // Manejar reproducción
  useEffect(() => {
    if (shouldPlay && videoRef.current) {
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          // Auto-play was prevented
          console.warn("Video playback failed", error);
        });
      }
    } else if (!shouldPlay && videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  }, [shouldPlay]);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thumbnail wrapper */}
      <div className="relative w-full overflow-hidden rounded-xl aspect-video bg-muted">
        {/* Static Thumbnail */}
        <Image
          src={imageUrl || THUMBNAIL_FALLBACK}
          alt={title}
          fill
          className={`object-cover size-full transition-opacity duration-300 ${shouldPlay || (isHovered && previewUrl && !videoUrl) ? "opacity-0" : "opacity-100"
            }`}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />

        {/* GIF/Image Preview (Fallback logic if no videoUrl but previewUrl exists) */}
        {!videoUrl && previewUrl && (
          <Image
            src={previewUrl}
            alt={title}
            unoptimized={!!previewUrl}
            fill
            className={`object-cover size-full transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"
              }`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
        )}

        {/* Video Playback on Hover */}
        {videoUrl && shouldPlay && (
          <div className="absolute inset-0 bg-black animate-in fade-in duration-300">
            <video
              ref={videoRef}
              src={videoUrl}
              muted
              playsInline
              loop
              className="object-cover size-full"
            />
          </div>
        )}
      </div>

      {/* Video duration box - Hide when playing */}
      <div className={`absolute bottom-2 right-2 px-1 py-0.5 rounded bg-black/80 text-white text-xs font-medium transition-opacity duration-200 ${shouldPlay ? "opacity-0" : "opacity-100"}`}>
        {formatDuration(duration)}
      </div>
    </div>
  );
};

