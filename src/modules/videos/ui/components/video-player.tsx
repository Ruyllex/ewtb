"use client";

import { useEffect, useRef } from "react";
import { THUMBNAIL_FALLBACK } from "../../constants";
import styles from "./video-player.module.css";

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

  // Para streams en vivo, usar Livepeer Web Player (iframe) para máxima compatibilidad
  if (isLive) {
    return (
      <div className={`${styles.shell} aspect-video relative overflow-hidden rounded-xl bg-black`}>
        <iframe
          src={`https://lvpr.tv?v=${playbackId}&autoplay=${autoPlay ? "true" : "false"}&muted=${autoPlay ? "true" : "false"}`} // Autoplay requiere mute a veces
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture"
          className="w-full h-full border-0 absolute inset-0"
          title="Live Stream"
        />
      </div>
    );
  }

  // Para VOD (videos on demand), usar video tag HTML5 estándar
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
