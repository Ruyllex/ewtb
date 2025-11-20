import MuxPlayer from "@mux/mux-player-react";
import { THUMBNAIL_FALLBACK } from "../../constants";
import styles from "./video-player.module.css";

interface VideoPlayerProps {
  playbackId?: string | null | undefined;
  thumbnailUrl?: string | null | undefined;
  autoPlay?: boolean;
  onPlay?: () => void;
  streamType?: "on-demand" | "live" | "ll-live"; // Tipo de stream: VOD o en vivo
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  playbackId,
  thumbnailUrl,
  autoPlay,
  onPlay,
  streamType = "on-demand", // Por defecto es VOD
}) => {
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

  // Para streams en vivo, usar streamType="live"
  // Para VOD, no especificar streamType (o usar "on-demand")
  const isLive = streamType === "live" || streamType === "ll-live";

  return (
    <div className={`${styles.shell} aspect-video`}>
      <MuxPlayer
        playbackId={playbackId}
        streamType={isLive ? streamType : undefined}
        poster={!isLive ? (thumbnailUrl || THUMBNAIL_FALLBACK) : undefined}
        playerInitTime={0}
        autoPlay={autoPlay}
        className={styles.player}
        accentColor="#ff0033"
        onPlay={onPlay}
        onError={(error) => {
          // Silenciar errores de HLS para evitar ruido en la consola
          console.warn("Video player error:", error);
        }}
      />
    </div>
  );
};

export default VideoPlayer;
