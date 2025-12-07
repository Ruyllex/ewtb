"use client";

import { useEffect, useRef } from "react";
import { THUMBNAIL_FALLBACK } from "../../constants";
import styles from "./video-player.module.css";

import MuxPlayer from "@mux/mux-player-react";
import { AdPlayerOverlay } from "./ad-player-overlay";
import { api } from "@/trpc/client";
import { useState } from "react";

interface VideoPlayerProps {
  playbackId?: string | null | undefined; // Para VOD: s3Url, para Live: muxPlaybackId
  thumbnailUrl?: string | null | undefined;
  autoPlay?: boolean;
  onPlay?: () => void;
  onLoadedMetadata?: (duration: number) => void;
  streamType?: "on-demand" | "live" | "ll-live"; // Tipo de stream: VOD o en vivo
  adsEnabled?: boolean;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  playbackId,
  thumbnailUrl,
  autoPlay,
  onPlay,
  onLoadedMetadata,
  streamType = "on-demand", // Por defecto es VOD
  adsEnabled = false,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const isLive = streamType === "live" || streamType === "ll-live";
  const [adCompleted, setAdCompleted] = useState(false);

  // Fetch random ad if ads are enabled and not completed yet
  // We use enabled: false if adCompleted is true to stop fetching
  const { data: adData } = api.ads.getRandom.useQuery(undefined, {
    enabled: adsEnabled && !adCompleted,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const showAd = adsEnabled && !adCompleted && !!adData;

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

  // Placeholder VAST Tag for testing ads
  const VAST_TAG_URL = "https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=";

  // Determine source type
  const isUrl = playbackId?.startsWith("http");
  
  if (showAd && adData) {
    return (
      <div className={`${styles.shell} aspect-video bg-black relative`}>
        <AdPlayerOverlay 
          adUrl={adData.videoUrl} 
          onComplete={() => setAdCompleted(true)} 
        />
        {/* Preload main video if possible or keep query logic simple */}
      </div>
    );
  }
  
  return (
    <div className={`${styles.shell} aspect-video relative overflow-hidden rounded-xl bg-black`}>
      <MuxPlayer
        playbackId={!isUrl ? playbackId : undefined}
        src={isUrl ? playbackId : undefined}
        streamType={streamType === "live" ? "live" : "on-demand"}
        autoPlay={autoPlay}
        muted={autoPlay}
        className="w-full h-full"
        accentColor="#FF0000"
        onPlay={onPlay}
        onLoadedMetadata={onLoadedMetadata ? (e: any) => {
             // MuxPlayer logic for metadata might differ, but basic event works
             const duration = e.target.duration;
             if (duration && !isNaN(duration) && duration !== Infinity) {
                onLoadedMetadata(Math.floor(duration * 1000));
              }
        } : undefined}
        // Enable Ads
        // @ts-ignore - MuxPlayer types might be slightly outdated in the project or using different version
        advertising={{
            tagUrl: VAST_TAG_URL,
            skipOffset: 5, // Allow skip after 5s
        }}
      />
    </div>
  );
};

export default VideoPlayer;
