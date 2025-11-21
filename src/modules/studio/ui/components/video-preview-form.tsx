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
import { Badge } from "@/components/ui/badge";
import { api } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";
import {
  ImageIcon,
  Loader2Icon,
  SaveIcon,
  XIcon,
  GlobeIcon,
  LockIcon,
  UploadIcon,
  VideoIcon,
  FileTextIcon,
  FolderIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import VideoPlayer from "@/modules/videos/ui/components/video-player";
import { useRouter } from "next/navigation";
import { ThumbnailUploadModal } from "./thumbnail-upload-modal";
import Image from "next/image";
import { UploadDropzone } from "@/lib/uploadthing";

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
  const [videoId, setVideoId] = useState<string | null>(null);

  const { data: categories } = api.categories.getMany.useQuery();
  const { data: uploadStatus, isLoading: isLoadingStatus } = api.videos.getUploadStatus.useQuery({
    uploadId,
  });

  // Buscar el videoId basado en el uploadId (s3Key)
  useEffect(() => {
    if (uploadStatus?.assetId) {
      // Si el video ya fue finalizado, buscar su ID
      queryClient.invalidateQueries();
    }
  }, [uploadStatus?.assetId, queryClient]);

  useEffect(() => {
    if (uploadStatus?.ready) return;
    const interval = setInterval(() => {
      queryClient.invalidateQueries();
    }, 3000);
    return () => clearInterval(interval);
  }, [uploadStatus?.ready, uploadId, queryClient]);

  const finalize = api.videos.finalize.useMutation({
    onSuccess: (video) => {
      setVideoId(video.id);
      toast.success("Video guardado exitosamente. Ahora puedes subir una miniatura si lo deseas.");
      queryClient.invalidateQueries();
      // Invalidar queries para actualizar el estado del video
      queryClient.invalidateQueries({ queryKey: ["videos", "getUploadStatus"] });
      // Opcionalmente redirigir después de un delay si el usuario no quiere subir miniatura
      // setTimeout(() => {
      //   router.push(`/studio/videos/${video.id}`);
      // }, 3000);
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

  const handleThumbnailUpload = () => {
    if (!videoId) {
      toast.error("Primero debes guardar el video para subir una miniatura");
      return;
    }
    setThumbnailModalOpen(true);
  };

  if (isLoadingStatus) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <Loader2Icon className="animate-spin size-10 text-primary" />
        <div className="text-center space-y-1">
          <p className="font-semibold text-lg">Cargando video...</p>
          <p className="text-sm text-muted-foreground">Por favor espera un momento</p>
        </div>
      </div>
    );
  }

  if (!uploadStatus) {
    return (
      <div className="text-center py-20 space-y-4">
        <div className="inline-flex items-center justify-center size-16 rounded-full bg-destructive/10">
          <XIcon className="size-8 text-destructive" />
        </div>
        <div className="space-y-2">
          <p className="text-destructive font-semibold text-lg">Error al cargar el video</p>
          <p className="text-sm text-muted-foreground">
            No se pudo cargar el estado del video. Por favor intenta de nuevo.
          </p>
        </div>
        <Button variant="outline" onClick={onCancel} className="mt-6">
          Volver
        </Button>
      </div>
    );
  }

  return (
    <>
      {videoId && (
        <ThumbnailUploadModal
          videoId={videoId}
          open={thumbnailModalOpen}
          onOpenChange={setThumbnailModalOpen}
        />
      )}

      <div className="space-y-8 pb-6">
        {/* Processing Alert */}
        {!uploadStatus.ready && (
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Loader2Icon className="animate-spin size-6 text-blue-600 mt-0.5" />
              </div>
              <div className="space-y-2 flex-1">
                <p className="font-semibold text-blue-900 text-lg">
                  {uploadStatus.status === "waiting"
                    ? "Subiendo video..."
                    : uploadStatus.status === "preparing"
                      ? "Procesando video..."
                      : "Procesando tu video"}
                </p>
                <p className="text-blue-700 text-sm leading-relaxed">
                  Por favor espera mientras procesamos tu video. Esto puede tomar unos minutos.
                  Mientras tanto, puedes completar la información del video.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Video Preview Section */}
          {uploadStatus.ready && uploadStatus.previewUrl && (
            <Card className="p-6 bg-muted/30">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <VideoIcon className="size-5 text-primary" />
                  <h3 className="text-xl font-bold">Vista Previa del Video</h3>
                </div>
                <div className="aspect-video bg-black rounded-lg overflow-hidden shadow-xl border-2 border-border">
                  <VideoPlayer
                    playbackId={uploadStatus.playbackId || undefined}
                    thumbnailUrl={uploadStatus.thumbnailUrl || undefined}
                    autoPlay={false}
                  />
                </div>
                <div className="flex items-center justify-center gap-2 text-green-600 font-medium py-2">
                  <div className="size-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <span className="text-sm">✓</span>
                  </div>
                  <span>Video procesado correctamente</span>
                </div>
              </div>
            </Card>
          )}

          {/* Thumbnail Section */}
          <Card className="p-6">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="size-5 text-primary" />
                <div>
                  <h3 className="text-xl font-bold">Miniatura del Video</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Sube una miniatura personalizada para tu video
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                {/* Thumbnail Preview */}
                <button
                  type="button"
                  onClick={() => {
                    if (videoId) {
                      setThumbnailModalOpen(true);
                    } else {
                      toast.info(
                        "Guarda el video primero para poder subir una miniatura personalizada",
                      );
                    }
                  }}
                  className={`relative w-full sm:w-80 aspect-video rounded-lg overflow-hidden border-2 border-dashed transition-all duration-200 group ${
                    videoId
                      ? "border-muted-foreground/30 hover:border-primary bg-muted/30 hover:bg-muted/50 cursor-pointer"
                      : "border-muted-foreground/20 bg-muted/20 opacity-60 cursor-not-allowed"
                  }`}
                  disabled={!videoId}
                  title={
                    !videoId
                      ? "Guarda el video primero para subir una miniatura"
                      : "Haz clic para subir una miniatura"
                  }
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
                          <UploadIcon className="size-8 mx-auto mb-2" />
                          <p className="text-sm font-semibold">Cambiar miniatura</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted-foreground p-4">
                      <div className="size-16 rounded-full bg-muted flex items-center justify-center">
                        <ImageIcon className="size-8" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold mb-1">Haz clic para subir</p>
                        <p className="text-xs">JPG, PNG o WebP</p>
                      </div>
                    </div>
                  )}
                </button>

                {/* Info Card */}
                <div className="flex-1 space-y-3">
                  <Card className="p-4 bg-muted/50 border-dashed">
                    <div className="space-y-2 text-sm">
                      <p className="font-semibold flex items-center gap-2">
                        <FileTextIcon className="size-4" />
                        Información importante
                      </p>
                      <ul className="space-y-1 text-muted-foreground pl-6 list-disc">
                        <li>La miniatura debe tener al menos 1280x720 píxeles</li>
                        <li>Tamaño máximo: 4MB</li>
                        <li>Formatos soportados: JPG, PNG, WebP</li>
                        <li>
                          Si no subes una miniatura, se generará una automáticamente desde el video
                        </li>
                      </ul>
                    </div>
                  </Card>
                </div>
              </div>
            </div>
          </Card>

          <Separator />

          {/* Details Section */}
          <Card className="p-6">
            <div className="space-y-6">
              <div className="flex items-center gap-2">
                <FileTextIcon className="size-5 text-primary" />
                <div>
                  <h3 className="text-xl font-bold">Detalles del Video</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Completa la información de tu video
                  </p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-base font-semibold flex items-center gap-2">
                    Título <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej: Tutorial de React - Hooks Avanzados"
                    required
                    maxLength={100}
                    className="text-base h-12"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Escribe un título atractivo que capture la atención
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {title.length}/100
                    </Badge>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label
                    htmlFor="description"
                    className="text-base font-semibold flex items-center gap-2"
                  >
                    Descripción
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe de qué trata tu video, qué aprenderán los espectadores, incluye hashtags relevantes, etc."
                    rows={6}
                    maxLength={5000}
                    className="text-base resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Agrega una descripción detallada para mejorar el SEO
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      {description.length}/5000
                    </Badge>
                  </div>
                </div>

                {/* Category and Visibility */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label
                      htmlFor="category"
                      className="text-base font-semibold flex items-center gap-2"
                    >
                      <FolderIcon className="size-4" />
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
                    <p className="text-xs text-muted-foreground">
                      Ayuda a los espectadores a encontrar tu video
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="visibility"
                      className="text-base font-semibold flex items-center gap-2"
                    >
                      Visibilidad <span className="text-destructive">*</span>
                    </Label>
                    <Select
                      value={visibility}
                      onValueChange={(value) => setVisibility(value as "public" | "private")}
                    >
                      <SelectTrigger id="visibility" className="text-base h-12">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="private">
                          <div className="flex items-center gap-2">
                            <LockIcon className="size-4" />
                            <span>Privado</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="public">
                          <div className="flex items-center gap-2">
                            <GlobeIcon className="size-4" />
                            <span>Público</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex items-start gap-2 text-xs text-muted-foreground">
                      {visibility === "public" ? (
                        <>
                          <GlobeIcon className="size-3.5 mt-0.5 flex-shrink-0" />
                          <span>Cualquiera puede ver este video</span>
                        </>
                      ) : (
                        <>
                          <LockIcon className="size-3.5 mt-0.5 flex-shrink-0" />
                          <span>Solo tú puedes ver este video</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6 border-t gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={finalize.isPending}
              size="lg"
              className="px-8"
            >
              <XIcon className="size-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!uploadStatus.ready || finalize.isPending || !title.trim()}
              size="lg"
              className="px-8 min-w-[140px]"
            >
              {finalize.isPending ? (
                <>
                  <Loader2Icon className="animate-spin size-4 mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <SaveIcon className="size-4 mr-2" />
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