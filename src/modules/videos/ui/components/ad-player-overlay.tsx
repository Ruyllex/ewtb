
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { SkipForward } from "lucide-react";

interface AdPlayerOverlayProps {
  adUrl: string;
  onComplete: () => void;
}

export function AdPlayerOverlay({ adUrl, onComplete }: AdPlayerOverlayProps) {
  const [timeLeft, setTimeLeft] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setCanSkip(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleSkip = () => {
    onComplete();
  };

  const handleEnded = () => {
    onComplete();
  };

  return (
    <div className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <video
        ref={videoRef}
        src={adUrl}
        className="w-full h-full object-contain"
        autoPlay
        playsInline
        onEnded={handleEnded}
        // Improve playback reliability: muted initially often required for autoplay
        muted={false} 
      />
      
      <div className="absolute bottom-8 right-8 flex flex-col items-end gap-2">
         <div className="bg-black/80 text-white px-3 py-1 rounded text-sm mb-2">
            Anuncio
         </div>
         
        {!canSkip ? (
          <div className="bg-black/60 text-white px-4 py-2 rounded flex items-center gap-2">
             <span className="text-sm">Se puede saltar en {timeLeft}s</span>
          </div>
        ) : (
          <Button 
            onClick={handleSkip} 
            variant="secondary" 
            className="flex items-center gap-2 font-bold px-6 py-6 text-lg hover:scale-105 transition-transform"
          >
            Saltar Anuncio <SkipForward className="h-5 w-5 fill-current" />
          </Button>
        )}
      </div>
      
      {/* Click overlay to prevent pausing via click if desired, or let it be standard controls */}
      <div 
        className="absolute inset-0 bg-transparent pointer-events-none"
        onClick={(e) => e.stopPropagation()} 
      />
    </div>
  );
}
