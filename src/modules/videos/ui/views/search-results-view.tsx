"use client";

import { api } from "@/trpc/client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { TimeAgo } from "@/components/time-ago";
import { THUMBNAIL_FALLBACK } from "../../constants";
import { formatDuration } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";

interface SearchResultsViewProps {
  query?: string;
}

const SearchResultsSkeleton = () => {
  return (
    <div className="max-w-[2400px] mx-auto px-4 py-6">
      <div className="space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="w-64 h-36 bg-gray-200 rounded-lg animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
              <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SearchResultsView = ({ query }: SearchResultsViewProps) => {
  const router = useRouter();
  
  if (!query) {
    return (
      <div className="max-w-[2400px] mx-auto px-4 py-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-2">Search for videos</h2>
          <p className="text-muted-foreground">Enter a search query to find videos</p>
        </div>
      </div>
    );
  }

  // Usar useQuery en lugar de useSuspenseQuery para mejor control del estado
  const { data, error, isLoading } = api.videos.search.useQuery({ query, limit: 20 });

  // Mostrar skeleton mientras carga
  if (isLoading) {
    return <SearchResultsSkeleton />;
  }

  // Manejar errores
  if (error) {
    return (
      <div className="max-w-[2400px] mx-auto px-4 py-6">
        <h2 className="text-2xl font-semibold mb-4">Search results for &quot;{query}&quot;</h2>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Error al buscar: {error.message || "Error desconocido"}</p>
        </div>
      </div>
    );
  }

  // Validación defensiva: asegurar que data existe y tiene la estructura esperada
  if (!data) {
    return (
      <div className="max-w-[2400px] mx-auto px-4 py-6">
        <h2 className="text-2xl font-semibold mb-4">Search results for &quot;{query}&quot;</h2>
        <div className="text-center py-12">
          <p className="text-muted-foreground">No se pudieron cargar los resultados</p>
        </div>
      </div>
    );
  }

  const hasVideos = data.videos && Array.isArray(data.videos) && data.videos.length > 0;
  const hasChannels = data.channels && Array.isArray(data.channels) && data.channels.length > 0;

  if (!hasVideos && !hasChannels) {
    return (
      <div className="max-w-[2400px] mx-auto px-4 py-6">
        <h2 className="text-2xl font-semibold mb-4">Search results for &quot;{query}&quot;</h2>
        <div className="text-center py-12">
          <p className="text-muted-foreground">No results found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[2400px] mx-auto px-4 py-6">
      <h2 className="text-2xl font-semibold mb-6">
        Search results for &quot;{query}&quot;
      </h2>

      {/* Canales */}
      {hasChannels && (
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Canales</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.channels.map((channel) => (
              <Link
                key={channel.id}
                href={`/channel/${channel.userUsername || ""}`}
                className="flex gap-4 hover:bg-gray-50 p-4 rounded-lg transition-colors border"
              >
                <div className="relative w-16 h-16 shrink-0 rounded-full overflow-hidden bg-muted">
                  <Image
                    src={channel.avatar || channel.userImageUrl || THUMBNAIL_FALLBACK}
                    alt={channel.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold line-clamp-1">{channel.name}</h4>
                    {channel.isVerified && (
                      <CheckCircle2 className="h-4 w-4 text-blue-500 fill-blue-500 shrink-0" />
                    )}
                  </div>
                  {channel.userUsername && (
                    <p className="text-sm text-muted-foreground">@{channel.userUsername}</p>
                  )}
                  {channel.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{channel.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Videos */}
      {hasVideos && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Videos</h3>
          <div className="space-y-4">
            {data.videos.map((video) => (
              <Link
                key={video.id}
                href={`/video/${video.id}`}
                className="flex gap-4 hover:bg-gray-50 p-4 rounded-lg transition-colors"
              >
                <div className="relative w-64 h-36 shrink-0 rounded-lg overflow-hidden bg-black">
                  <Image
                    src={video.thumbnailUrl || THUMBNAIL_FALLBACK}
                    alt={video.title}
                    fill
                    className="object-cover"
                  />
                  <div className="absolute bottom-2 right-2 px-1 py-0.5 rounded bg-black/80 text-white text-xs font-medium">
                    {formatDuration(video.duration || 0)}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold line-clamp-2 mb-2">{video.title}</h3>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    {video.userUsername ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          router.push(`/channel/${video.userUsername}`);
                        }}
                        className="hover:text-foreground transition-colors text-left"
                      >
                        {video.userName}
                      </button>
                    ) : (
                      <span>{video.userName}</span>
                    )}
                    <span>•</span>
                    <TimeAgo date={video.createdAt} />
                  </div>
                  {video.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">{video.description}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

