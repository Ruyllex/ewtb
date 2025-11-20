"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { api } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";
import { ImageIcon, Loader2Icon, SaveIcon, XIcon } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import VideoPlayer from "@/modules/videos/ui/components/video-player";
import { useRouter } from "next/navigation";
import { ThumbnailUploadModal } from "./thumbnail-upload-modal";
import Image from "next/image";

interface VideoPreviewFormProps {
  uploadId: string;
  onCancel: () => void;
}

export const VideoPreviewForm = ({ uploadId, onCancel }: VideoPreviewFormProps) => {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [thumbnailModalOpen, setThumbnailModalOpen] = useState(false);

  const { data: categories } = api.categories.getMany.useQuery();
  const { data: uploadStatus, isLoading: isLoadingStatus } = api.videos.getUploadStatus.useQuery({ uploadId });

  useEffect(() => {
    if (uploadStatus?.ready) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries();
    }, 3000);
    return () => clearInterval(interval);
  }, [uploadStatus?.ready, uploadId, queryClient]);

  const finalize = api.videos.finalize.useMutation({
    onSuccess: (video) => {
      toast.success("Video guardado exitosamente");
      queryClient.invalidateQueries();
      router.push(`/studio/videos/${video.id}`);
    },
    onError: (error) => {
      toast.error(error.message || "Error al guardar el video");
    },
  });

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
      <div className="flex items-center justify-center py-20">
        <Loader2Icon className="animate-spin size-8 text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Cargando...</span>
      </div>
    );
  }

  if (!uploadStatus) {
    return (
      <div className="text-center py-20">
        <p className="text-destructive font-medium text-lg">Error al cargar el estado del video</p>
        <Button variant="outline" onClick={onCancel} className="mt-6">
          Volver
        </Button>
      </div>
    );
  }

  return (
    <>
      <ThumbnailUploadModal
        videoId={uploadId}
        open={thumbnailModalOpen}
        onOpenChange={setThumbnailModalOpen}
      />

      <div className="container max-w-6xl mx-auto px-6 py-10 space-y-10">
        {/* Processing Alert */}
        {!uploadStatus.ready && (
          <Card className="border-blue-200 bg-blue-50 p-6">
            <div className="flex items-start gap-4">
              <Loader2Icon className="animate-spin size-6 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-blue-900 text-lg">
                  {uploadStatus.status === "waiting"
                    ? "Subiendo video..."
                    : uploadStatus.status === "preparing"
                      ? "Procesando video..."
                      : "El video se está procesando"}
                </p>
                <p className="text-blue-700">
                  Por favor espera mientras procesamos tu video. Esto puede tomar unos minutos.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Video Preview Section */}
          {uploadStatus.ready && uploadStatus.playbackId && (
            <div className="space-y-4">
              <div>
                <h2 className="text-2xl font-bold">Vista Previa del Video</h2>
                <p className="text-muted-foreground mt-1">Así se verá tu video publicado</p>
              </div>
              <div className="aspect-video bg-black rounded-xl overflow-hidden shadow-lg">
                <VideoPlayer
                  playbackId={uploadStatus.playbackId}
                  thumbnailUrl={uploadStatus.thumbnailUrl || undefined}
                  autoPlay={false}
                />
              </div>
              <div className="flex items-center justify-center gap-2 text-green-600 font-medium">
                <span className="text-xl">✅</span>
                <span>Video procesado correctamente</span>
              </div>
            </div>
          )}

          <Separator className="my-10" />

          {/* Thumbnail Section */}
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold">Miniatura del Video</h2>
              <p className="text-muted-foreground mt-1">
                Sube una miniatura personalizada o usa el primer fotograma automáticamente
              </p>
            </div>
            <button
              type="button"
              onClick={() => setThumbnailModalOpen(true)}
              className="relative w-full max-w-2xl aspect-video rounded-xl overflow-hidden border-2 border-dashed border-muted-foreground/30 hover:border-primary transition-all duration-200 group bg-muted/30 hover:bg-muted/50"
            >
              {uploadStatus.thumbnailUrl ? (
                <>
                  <Image
                    src={uploadStatus.thumbnailUrl}
                    alt="Thumbnail preview"
                    fill
                    className="object-cover group-hover:opacity-75 transition-opacity"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="text-white text-center">
                      <ImageIcon className="size-10 mx-auto mb-3" />
                      <p className="text-base font-semibold">Cambiar miniatura</p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-muted-foreground">
                  <ImageIcon className="size-16" />
                  <div className="text-center px-6">
                    <p className="text-base font-semibold mb-1">Haz clic para subir una miniatura</p>
                    <p className="text-sm">Si no subes una, se usará el primer fotograma automáticamente</p>
                  </div>
                </div>
              )}
            </button>
          </div>

          <Separator className="my-10" />

          {/* Details Section */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold">Detalles del Video</h2>
              <p className="text-muted-foreground mt-1">Completa la información de tu video</p>
            </div>

            {/* Title */}
            <div className="space-y-3">
              <Label htmlFor="title" className="text-lg font-semibold">
                Título *
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ingresa un título atractivo para tu video"
                required
                maxLength={100}
                className="text-base h-12"
              />
              <p className="text-sm text-muted-foreground">
                {title.length}/100 caracteres
              </p>
            </div>

            {/* Description */}
            <div className="space-y-3">
              <Label htmlFor="description" className="text-lg font-semibold">
                Descripción
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe de qué trata tu video, qué aprenderán los espectadores, etc."
                rows={6}
                maxLength={5000}
                className="text-base resize-none"
              />
              <p className="text-sm text-muted-foreground">
                {description.length}/5000 caracteres
              </p>
            </div>

            {/* Category and Visibility */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <Label htmlFor="category" className="text-lg font-semibold">
                  Categoría
                </Label>
                <Select
                  value={categoryId || undefined}
                  onValueChange={(value) => setCategoryId(value || undefined)}
                >
                  <SelectTrigger id="category" className="text-base h-12">
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

              <div className="space-y-3">
                <Label htmlFor="visibility" className="text-lg font-semibold">
                  Visibilidad
                </Label>
                <Select
                  value={visibility}
                  onValueChange={(value) => setVisibility(value as "public" | "private")}
                >
                  <SelectTrigger id="visibility" className="text-base h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">🔒 Privado</SelectItem>
                    <SelectItem value="public">🌐 Público</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-8 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={finalize.isPending}
              size="lg"
              className="px-8"
            >
              <XIcon className="size-5 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!uploadStatus.ready || finalize.isPending || !title.trim()}
              size="lg"
              className="px-8"
            >
              {finalize.isPending ? (
                <>
                  <Loader2Icon className="animate-spin size-5 mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <SaveIcon className="size-5 mr-2" />
                  Guardar Video
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </>
  );
};
