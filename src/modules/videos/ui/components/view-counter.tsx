"use client";

import { api } from "@/trpc/client";
import { formatNumber } from "@/lib/utils";

export function ViewCounter({ videoId }: { videoId: string }) {
  const { data } = api.videos.getViewCount.useQuery(
    { videoId },
    { 
      staleTime: 30000, // Cache por 30 segundos
      refetchInterval: 60000, // Refrescar cada minuto
    }
  );
  
  return <span className="text-sm text-muted-foreground">{formatNumber(data?.count ?? 0)}</span>;
}
