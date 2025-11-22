"use client";

import { useEffect, useRef } from "react";
import { THUMBNAIL_FALLBACK } from "../../constants";
import styles from "./video-player.module.css";
import * as Player from "@livepeer/react/player";

interface VideoPlayerProps {
  playbackId?: string | null | undefined; // Para VOD: s3Url, para Live: livepeerPlaybackId
  thumbnailUrl?: string | null | undefined;
  autoPlay?: boolean;
  onPlay?: () => void;
  onLoadedMetadata?: (duration: number) => void;
  streamType?: "on-demand" | "live" | "ll-live"; // Tipo de stream: VOD o en vivo
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  playbackId,
  thumbnailUrl,
  autoPlay,
  onPlay,
  onLoadedMetadata,
  streamType = "on-demand", // Por defecto es VOD
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isLive = streamType === "live" || streamType === "ll-live";

  // Si no hay playbackId, mostrar un placeholder
  if (!playbackId) {
    return (
      <div className={`${styles.shell} min-h-[320px]`}>
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>⚠️</div>
          <div>
            <p className="text-base font-medium text-white">Video no disponible</p>
            <p className="text-sm text-white/70">Intenta recargar la página o vuelve más tarde.</p>
          </div>
        </div>
      </div>
    );
  }

  // Para Live streams, usar Livepeer Player
  if (isLive) {
    return (
      <div className={`${styles.shell} aspect-video overflow-hidden rounded-lg`}>
         <Player.Root
            src={[{ type: 'hls', src: `https://livepeercdn.com/hls/${playbackId}/index.m3u8`, mime: 'application/x-mpegURL' } as any]}
            autoPlay={autoPlay}
            aspectRatio={16/9}
         >
            <Player.Container>
               <Player.Video title="Live stream" className="h-full w-full object-cover" />
               <Player.Controls />
            </Player.Container>
         </Player.Root>
      </div>
    );
  }

  // Para VOD (videos on demand), usar video tag HTML5 estándar (por ahora)
  return (
    <div className={`${styles.shell} aspect-video`}>
      <video
        ref={videoRef}
        src={playbackId || undefined}
        poster={thumbnailUrl || THUMBNAIL_FALLBACK}
        controls
        className={styles.player}
        autoPlay={autoPlay}
        preload="metadata"
        onPlay={onPlay}
        onLoadedMetadata={(e) => {
          const duration = e.currentTarget.duration;
          if (duration && !isNaN(duration) && duration !== Infinity) {
            onLoadedMetadata?.(Math.floor(duration * 1000));
          }
        }}
        onError={(error) => {
          console.warn("Video player error:", error);
        }}
      />
    </div>
  );
};

export default VideoPlayer;
