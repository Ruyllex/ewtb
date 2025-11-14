import MuxPlayer from "@mux/mux-player-react";
import { THUMBNAIL_FALLBACK } from "../../constants";

interface VideoPlayerProps {
  playbackId?: string | null | undefined;
  thumbnailUrl?: string | null | undefined;
  autoPlay?: boolean;
  onPlay?: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  playbackId,
  thumbnailUrl,
  autoPlay,
  onPlay,
}) => {
  // Si no hay playbackId, mostrar un placeholder
  if (!playbackId) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black text-white">
        <div className="text-center">
          <p className="text-sm">Video no disponible</p>
        </div>
      </div>
    );
  }

  return (
    <MuxPlayer
      playbackId={playbackId}
      poster={thumbnailUrl || THUMBNAIL_FALLBACK}
      playerInitTime={0}
      autoPlay={autoPlay}
      className="w-full h-full object-contain"
      accentColor="#FF2056"
      onPlay={onPlay}
      onError={(error) => {
        // Silenciar errores de HLS para evitar ruido en la consola
        console.warn("Video player error:", error);
      }}
    />
  );
};

export default VideoPlayer;
