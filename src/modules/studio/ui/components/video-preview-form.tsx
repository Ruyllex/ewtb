"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PlayIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import VideoPlayer from "@/modules/videos/ui/components/video-player";
import { useRouter } from "next/navigation";

interface VideoPreviewFormProps {
  uploadId: string;
  onCancel: () => void;
}

export const VideoPreviewForm = ({ uploadId, onCancel }: VideoPreviewFormProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [visibility, setVisibility] = useState<"public" | "private">("private");

  // Obtener categorías
  const { data: categories } = useQuery(trpc.categories.getMany.queryOptions());

  // Obtener estado del upload
  const { data: uploadStatus, isLoading: isLoadingStatus } = useQuery(
    trpc.videos.getUploadStatus.queryOptions({ uploadId })
  );

  // Polling para verificar cuando el video esté listo
  useEffect(() => {
    if (uploadStatus?.ready) return;

    const interval = setInterval(() => {
      queryClient.invalidateQueries({
        queryKey: trpc.videos.getUploadStatus.queryKey({ uploadId }),
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [uploadStatus?.ready, uploadId, queryClient, trpc.videos.getUploadStatus]);

  // Finalizar video
  const finalize = useMutation(
    trpc.videos.finalize.mutationOptions({
      onSuccess: (video) => {
        toast.success("Video guardado exitosamente");
        queryClient.invalidateQueries({ refetchType: "active" });
        router.push(`/studio/videos/${video.id}`);
      },
      onError: (error) => {
        toast.error(error.message || "Error al guardar el video");
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("El título es requerido");
      return;
    }
    finalize.mutate({
      uploadId,
      title: title.trim(),
      description: description.trim() || undefined,
      categoryId: categoryId || undefined,
      visibility,
    });
  };

  if (isLoadingStatus) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="animate-spin size-8" />
      </div>
    );
  }

  if (!uploadStatus) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Error al cargar el estado del video</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estado del procesamiento */}
      {!uploadStatus.ready && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2Icon className="animate-spin size-5 text-blue-600" />
            <div>
              <p className="font-medium text-blue-900">
                {uploadStatus.status === "waiting"
                  ? "Subiendo video..."
                  : uploadStatus.status === "preparing"
                    ? "Procesando video..."
                    : "El video se está procesando"}
              </p>
              <p className="text-sm text-blue-700">
                Por favor espera mientras procesamos tu video. Esto puede tomar unos minutos.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Reproductor de video */}
      {uploadStatus.ready && uploadStatus.playbackId && (
        <div className="space-y-4">
          <div className="aspect-video bg-black rounded-lg overflow-hidden">
            <VideoPlayer
              playbackId={uploadStatus.playbackId}
              thumbnailUrl={uploadStatus.thumbnailUrl || undefined}
              autoPlay={false}
            />
          </div>
          <p className="text-sm text-muted-foreground text-center">
            ✅ Video procesado correctamente. Completa la información a continuación para guardarlo.
          </p>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Mi video increíble"
            required
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe tu video..."
            rows={4}
            maxLength={5000}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="category">Categoría</Label>
            <Select
              value={categoryId || undefined}
              onValueChange={(value) => setCategoryId(value || undefined)}
            >
              <SelectTrigger id="category">
                <SelectValue placeholder="Selecciona una categoría (opcional)" />
              </SelectTrigger>
              <SelectContent>
                {categories?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Visibilidad</Label>
            <Select
              value={visibility}
              onValueChange={(value) => setVisibility(value as "public" | "private")}
            >
              <SelectTrigger id="visibility">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">Privado</SelectItem>
                <SelectItem value="public">Público</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={finalize.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!uploadStatus.ready || finalize.isPending || !title.trim()}>
            {finalize.isPending ? (
              <>
                <Loader2Icon className="animate-spin size-4 mr-2" />
                Guardando...
              </>
            ) : (
              <>
                <PlayIcon className="size-4 mr-2" />
                Guardar Video
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

