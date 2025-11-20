"use client";

import { api } from "@/trpc/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Edit2Icon, EyeIcon, HeartIcon, MessageSquareIcon, Loader2Icon } from "lucide-react";
import Image from "next/image";

const THUMBNAIL_FALLBACK = "/placeholder-thumbnail.jpg";

export const VideosSection = () => {
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    api.studio.getMany.useInfiniteQuery(
      { limit: 10 },
      {
        getNextPageParam: (lastPage) => lastPage.nextCursor,
      }
    );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="animate-spin size-8 text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Cargando videos...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive font-medium">Error al cargar videos</p>
        <p className="text-sm text-muted-foreground mt-2">{error.message}</p>
      </div>
    );
  }

  const allVideos = data?.pages.flatMap((page) => page.items) ?? [];

  if (allVideos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">No tienes videos subidos aún</p>
        <p className="text-sm text-muted-foreground mt-2">
          Haz clic en "Subir Video" para comenzar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Tus Videos</h2>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Video</TableHead>
              <TableHead>Visibilidad</TableHead>
              <TableHead className="text-center">Vistas</TableHead>
              <TableHead className="text-center">Me gusta</TableHead>
              <TableHead className="text-center">Comentarios</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allVideos.map((video) => (
              <TableRow key={video.id} className="cursor-pointer hover:bg-muted/50">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="relative w-24 h-16 flex-shrink-0 rounded overflow-hidden bg-muted">
                      {video.thumbnailUrl ? (
                        <Image
                          src={video.thumbnailUrl}
                          alt={video.title}
                          fill
                          className="object-cover"
                          sizes="96px"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                          <EyeIcon className="size-6" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{video.title}</p>
                      {video.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {video.description}
                        </p>
                      )}
                    </div>
                  </div>
                </TableCell>

                <TableCell>
                  <Badge variant={video.visibility === "public" ? "default" : "secondary"}>
                    {video.visibility === "public" ? "Público" : "Privado"}
                  </Badge>
                </TableCell>

                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <EyeIcon className="size-4 text-muted-foreground" />
                    <span>{video.viewCount ?? 0}</span>
                  </div>
                </TableCell>

                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <HeartIcon className="size-4 text-muted-foreground" />
                    <span>{video.likeCount ?? 0}</span>
                  </div>
                </TableCell>

                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <MessageSquareIcon className="size-4 text-muted-foreground" />
                    <span>{video.commentCount ?? 0}</span>
                  </div>
                </TableCell>

                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(video.updatedAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </span>
                </TableCell>

                <TableCell className="text-right">
                  <Link href={`/studio/videos/${video.id}`}>
                    <Button variant="ghost" size="sm">
                      <Edit2Icon className="size-4 mr-2" />
                      Editar
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {hasNextPage && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            {isFetchingNextPage ? (
              <>
                <Loader2Icon className="animate-spin size-4 mr-2" />
                Cargando...
              </>
            ) : (
              "Cargar más"
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
