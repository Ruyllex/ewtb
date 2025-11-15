"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CopyIcon, CopyCheckIcon, Loader2Icon, TrashIcon, VideoIcon, EyeIcon, EyeOffIcon } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import VideoPlayer from "@/modules/videos/ui/components/video-player";
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
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { data: stream } = useSuspenseQuery(trpc.live.getOne.queryOptions({ id: streamId }));
  const [isCopied, setIsCopied] = useState(false);
  const [showStreamKey, setShowStreamKey] = useState(false);

  // Polling para obtener el estado del stream
  const { data: status } = useQuery(trpc.live.getStatus.queryOptions({ id: streamId }));

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: trpc.live.getStatus.queryKey({ id: streamId }),
      });
    }, 5000); // Actualizar cada 5 segundos

    return () => clearInterval(interval);
  }, [streamId, queryClient, trpc.live.getStatus]);

  const deleteStream = useMutation(
    trpc.live.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Stream eliminado exitosamente");
        queryClient.invalidateQueries({ refetchType: "active" });
        router.push("/studio/live");
      },
      onError: (error) => {
        toast.error(error.message || "Error al eliminar el stream");
      },
    })
  );

  const handleCopyStreamKey = async () => {
    if (stream.streamKey) {
      await navigator.clipboard.writeText(stream.streamKey);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast.success("Stream key copiado al portapapeles");
    }
  };

  const handleCopyPlaybackId = async () => {
    if (stream.playbackId) {
      await navigator.clipboard.writeText(stream.playbackId);
      toast.success("Playback ID copiado al portapapeles");
    }
  };

  const isActive = status?.status === "active";

  return (
    <div className="max-w-[2400px] mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{stream.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{stream.description || "Sin descripción"}</p>
        </div>
        <Button
          variant="destructive"
          onClick={() => deleteStream.mutate({ id: streamId })}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reproductor de video */}
        <div className="lg:col-span-2 space-y-4">
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            {stream.playbackId ? (
              <VideoPlayer
                playbackId={stream.playbackId}
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

          {/* Estado del stream */}
          <div className={`rounded-lg p-4 ${isActive ? "bg-green-50 border border-green-200" : "bg-yellow-50 border border-yellow-200"}`}>
            <div className="flex items-center gap-2">
              <div className={`size-3 rounded-full ${isActive ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
              <p className="font-medium">
                {isActive ? "Transmitiendo en vivo" : "Esperando transmisión"}
              </p>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {isActive
                ? "Tu stream está activo y los espectadores pueden verlo"
                : "Inicia la transmisión desde OBS para comenzar"}
            </p>
          </div>
        </div>

        {/* Información de configuración */}
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-4">
            <h2 className="font-semibold">Configuración de OBS</h2>

            <div className="space-y-2">
              <Label>Servidor RTMP</Label>
              <div className="flex gap-2">
                <Input value="rtmp://live.mux.com/app" readOnly className="font-mono text-sm" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText("rtmp://live.mux.com/app");
                    toast.success("Servidor copiado");
                  }}
                >
                  <CopyIcon className="size-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Stream Key</Label>
              <div className="flex gap-2">
                <Input
                  value={stream.streamKey}
                  readOnly
                  className="font-mono text-sm"
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

            {stream.playbackId && (
              <div className="space-y-2">
                <Label>Playback ID</Label>
                <div className="flex gap-2">
                  <Input value={stream.playbackId} readOnly className="font-mono text-sm" />
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

            <div className="pt-4 border-t">
              <h3 className="font-semibold text-sm mb-2">Instrucciones paso a paso:</h3>
              <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                <li>
                  <strong>Abre OBS Studio</strong> (descárgalo en obsproject.com si no lo tienes)
                </li>
                <li>
                  <strong>Ve a Settings → Stream</strong> (o Ajustes → Emisión)
                </li>
                <li>
                  <strong>Service:</strong> Selecciona "Custom" o "Personalizado"
                </li>
                <li>
                  <strong>Server:</strong> Copia y pega: <code className="bg-gray-100 px-1 rounded">rtmp://live.mux.com/app</code>
                </li>
                <li>
                  <strong>Stream Key:</strong> Copia el Stream Key de arriba y pégalo aquí
                </li>
                <li>
                  <strong>Haz clic en OK</strong> para guardar la configuración
                </li>
                <li>
                  <strong>Agrega fuentes</strong> en OBS (pantalla, cámara, micrófono, etc.)
                </li>
                <li>
                  <strong>Haz clic en "Start Streaming"</strong> en OBS
                </li>
                <li>
                  <strong>Espera 10-30 segundos</strong> y el stream aparecerá arriba
                </li>
              </ol>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-900">
                  💡 <strong>Tip:</strong> Si el stream no aparece, verifica que OBS esté transmitiendo (indicador rojo) y recarga esta página.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

