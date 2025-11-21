"use client";

import { useEffect, useRef } from "react";
import { THUMBNAIL_FALLBACK } from "../../constants";
import styles from "./video-player.module.css";

interface VideoPlayerProps {
  playbackId?: string | null | undefined; // Para VOD: s3Url, para Live: ivsPlaybackUrl
  thumbnailUrl?: string | null | undefined;
  autoPlay?: boolean;
  onPlay?: () => void;
  onLoadedMetadata?: (duration: number) => void;
  streamType?: "on-demand" | "live" | "ll-live"; // Tipo de stream: VOD o en vivo
}

// Tipos para IVS Player
interface IVSPlayer {
  load: (url: string) => void;
  play: () => Promise<void>;
  pause: () => void;
  attachHTMLVideoElement: (element: HTMLVideoElement) => void;
  addEventListener: (event: string, callback: (event?: any) => void) => void;
  removeEventListener: (event: string, callback: (event?: any) => void) => void;
  delete: () => void;
}

interface IVSPlayerStatic {
  create: (videoElement: HTMLVideoElement) => IVSPlayer;
  PlayerEventType: {
    PLAYING: string;
    ENDED: string;
    ERROR: string;
    BUFFERING: string;
  };
  PlayerState: {
    IDLE: string;
    BUFFERING: string;
    READY: string;
    PLAYING: string;
    ENDED: string;
  };
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
  const playerRef = useRef<IVSPlayer | null>(null);
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

  useEffect(() => {
    if (!videoRef.current || !playbackId) return;

    // Para streams en vivo, usar IVS Player
    if (isLive) {
      let IVSPlayerStatic: IVSPlayerStatic;

      // Cargar el script de IVS Player si no está cargado
      if (!window.IVSPlayer) {
        const script = document.createElement("script");
        script.src = "https://player.live-video.net/1.31.0/amazon-ivs-player.min.js";
        script.async = true;
        script.onload = () => {
          if (window.IVSPlayer && videoRef.current) {
            IVSPlayerStatic = window.IVSPlayer as unknown as IVSPlayerStatic;
            initializeIVSPlayer(IVSPlayerStatic);
          }
        };
        document.head.appendChild(script);
      } else {
        IVSPlayerStatic = window.IVSPlayer as unknown as IVSPlayerStatic;
        initializeIVSPlayer(IVSPlayerStatic);
      }

      function initializeIVSPlayer(IVSPlayer: IVSPlayerStatic) {
        if (!videoRef.current || !IVSPlayer || playerRef.current) return;

        const player = IVSPlayer.create(videoRef.current);
        playerRef.current = player;

        player.attachHTMLVideoElement(videoRef.current);
        player.load(playbackId);

        if (autoPlay) {
          player.play();
        }

        const handlePlaying = () => {
          onPlay?.();
        };

        const handleError = (error: any) => {
          console.warn("IVS Player error:", error);
        };

        player.addEventListener(IVSPlayer.PlayerEventType.PLAYING, handlePlaying);
        player.addEventListener(IVSPlayer.PlayerEventType.ERROR, handleError);

        // Cleanup
        return () => {
          player.removeEventListener(IVSPlayer.PlayerEventType.PLAYING, handlePlaying);
          player.removeEventListener(IVSPlayer.PlayerEventType.ERROR, handleError);
        };
      }
    }

    // Cleanup
    return () => {
      if (playerRef.current) {
        playerRef.current.delete();
        playerRef.current = null;
      }
    };
  }, [playbackId, isLive, autoPlay, onPlay]);

  // Para VOD (videos on demand), usar video tag HTML5 estándar
  if (!isLive) {
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
  }

  // Para Live streams, renderizar el video element para IVS Player
  return (
    <div className={`${styles.shell} aspect-video`}>
      <video
        ref={videoRef}
        playsInline
        className={styles.player}
        autoPlay={autoPlay}
        muted={false}
      />
    </div>
  );
};

// Extender Window interface para incluir IVSPlayer
declare global {
  interface Window {
    IVSPlayer?: unknown;
  }
}

export default VideoPlayer;
