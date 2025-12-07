"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api as trpc } from "@/trpc/client";
import { CopyIcon, CopyCheckIcon, Loader2Icon, TrashIcon, VideoIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import VideoPlayer from "@/modules/videos/ui/components/video-player";
import { ChatComponent } from "@/modules/chat/ui/components/chat-component";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";

interface LiveStreamViewProps {
  streamId: string;
}

const LiveStreamViewSkeleton = () => {
  return (
    <div className="max-w-[2400px] mx-auto px-4 py-6">
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3" />
        <div className="aspect-video bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-24 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
};

export const LiveStreamView = ({ streamId }: LiveStreamViewProps) => {
  return (
    <Suspense fallback={<LiveStreamViewSkeleton />}>
      <LiveStreamViewSuspense streamId={streamId} />
    </Suspense>
  );
};

const LiveStreamViewSuspense = ({ streamId }: LiveStreamViewProps) => {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [stream] = trpc.live.getOne.useSuspenseQuery({ id: streamId });
  const [isCopied, setIsCopied] = useState(false);
  const [showStreamKey, setShowStreamKey] = useState(false);

  // Polling para obtener el estado del stream
  const { data: status } = trpc.live.getStatus.useQuery(
    { id: streamId },
    {
      refetchInterval: 5000, // Actualizar cada 5 segundos
    }
  );

  const deleteStream = trpc.live.delete.useMutation({
    onSuccess: () => {
      toast.success("Stream eliminado exitosamente");
      utils.live.getMany.invalidate(); // Invalidate list
      router.push("/studio/live");
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar el stream");
    },
  });

  const handleCopyStreamKey = async () => {
    if (stream.muxStreamKey) {
      await navigator.clipboard.writeText(stream.muxStreamKey);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast.success("Stream key copiado al portapapeles");
    }
  };

  const handleCopyPlaybackId = async () => {
    if (stream.muxPlaybackId) {
      await navigator.clipboard.writeText(stream.muxPlaybackId);
      toast.success("Playback ID copiado al portapapeles");
    }
  };

  const isActive = status?.status === "active";

  return (
    <div className="max-w-[2400px] mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Studio Live</h1>
          <p className="text-sm text-muted-foreground">Gestiona tu transmisión en vivo</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        {/* Columna principal: Video e Info */}
        <div className="lg:col-span-3 flex flex-col gap-4 h-full overflow-y-auto">
          {/* Reproductor de video */}
          <div className="aspect-video bg-black rounded-lg overflow-hidden shrink-0">
            {stream.muxPlaybackId ? (
              <VideoPlayer
                playbackId={stream.muxPlaybackId}
                streamType="live"
                autoPlay={false}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-white">
                <div className="text-center">
                  <VideoIcon className="size-12 mx-auto mb-2 opacity-50" />
                  <p>El stream aún no está disponible</p>
                </div>
              </div>
            )}
          </div>

          {/* Información del Canal y Stream */}
          <div className="space-y-4 pb-10">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <Avatar className="size-10">
                  <AvatarImage src={stream.user.imageUrl || undefined} />
                  <AvatarFallback>
                    <UserIcon className="size-5" />
                  </AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <h2 className="text-xl font-bold">{stream.title}</h2>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{stream.user.name}</span>
                    <span>•</span>
                    <span>{stream.description || "Sin descripción"}</span>
                  </div>
                </div>
              </div>
              <div className={`rounded-full px-3 py-1 text-xs font-medium flex items-center gap-2 ${isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"}`}>
                <div className={`size-2 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-gray-400"}`} />
                {isActive ? "EN VIVO" : "OFFLINE"}
              </div>
            </div>
          </div>

          {/* Configuración (Solo visible para el dueño) */}
          <div className="space-y-4">
            <div className="bg-card border rounded-lg p-6 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg">Configuración de Transmisión</h2>
                <div className="flex gap-2">
                   <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => {
                       if (confirm("¿Estás seguro de que quieres eliminar este stream?")) {
                          deleteStream.mutate({ id: streamId });
                       }
                    }}
                    disabled={deleteStream.isPending}
                  >
                    {deleteStream.isPending ? (
                      <Loader2Icon className="animate-spin size-4 mr-2" />
                    ) : (
                      <TrashIcon className="size-4 mr-2" />
                    )}
                    Eliminar Stream
                  </Button>
                </div>
              </div>

              <div className="grid gap-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Servidor RTMP (Ingest Endpoint)</Label>
                  <div className="flex gap-2">
                    <Input value={stream.muxIngestUrl || "rtmps://global-live.mux.com:443/app"} readOnly className="font-mono text-sm bg-muted/50" />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        const url = stream.muxIngestUrl || "rtmps://global-live.mux.com:443/app";
                        navigator.clipboard.writeText(url);
                        toast.success("Servidor copiado");
                      }}
                    >
                      <CopyIcon className="size-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-muted-foreground">Stream Key</Label>
                  <div className="flex gap-2">
                    <Input
                      value={stream.muxStreamKey || ""}
                      readOnly
                      className="font-mono text-sm bg-muted/50"
                      type={showStreamKey ? "text" : "password"}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setShowStreamKey(!showStreamKey)}
                      title={showStreamKey ? "Ocultar Stream Key" : "Mostrar Stream Key"}
                    >
                      {showStreamKey ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleCopyStreamKey}
                      title="Copiar Stream Key"
                    >
                      {isCopied ? <CopyCheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
                    </Button>
                  </div>
                </div>

                {stream.muxPlaybackId && (
                  <div className="space-y-2">
                    <Label className="text-muted-foreground">Playback ID</Label>
                    <div className="flex gap-2">
                      <Input value={stream.muxPlaybackId} readOnly className="font-mono text-sm bg-muted/50" />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleCopyPlaybackId}
                      >
                        <CopyIcon className="size-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-muted/30 rounded-lg p-4 space-y-3 border border-dashed">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <VideoIcon className="size-4" />
                  Cómo transmitir con OBS Studio
                </h3>
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <div className="flex gap-2">
                    <span className="font-mono bg-muted px-1.5 rounded text-xs flex items-center h-5">1</span>
                    <span>Abre OBS y ve a <strong>Ajustes &gt; Emisión</strong></span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono bg-muted px-1.5 rounded text-xs flex items-center h-5">2</span>
                    <span>En Servicio elige <strong>Personalizado</strong></span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono bg-muted px-1.5 rounded text-xs flex items-center h-5">3</span>
                    <span>Copia el <strong>Servidor</strong> y la <strong>Clave de transmisión</strong> de arriba</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono bg-muted px-1.5 rounded text-xs flex items-center h-5">4</span>
                    <span>Recomendado: En Salida, pon <strong>Intervalo de fotogramas clave</strong> en <strong>2s</strong></span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-mono bg-muted px-1.5 rounded text-xs flex items-center h-5">5</span>
                    <span>¡Dale a <strong>Iniciar transmisión</strong>!</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Columna lateral: Chat */}
        <div className="lg:col-span-1 h-full">
          <ChatComponent streamId={streamId} />
        </div>
      </div>
    </div>
  );
};
