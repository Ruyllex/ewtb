"use client";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { videoUpdateSchema } from "@/db/schema";
import VideoPlayer from "@/modules/videos/ui/components/video-player";
import { api } from "@/trpc/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeftIcon,
  EyeIcon,
  EyeOffIcon,
  ImageIcon,
  Loader2Icon,
  SaveIcon,
  TrashIcon,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FC, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { ThumbnailUploadModal } from "../components/thumbnail-upload-modal";

interface FormSectionProps {
  videoId: string;
}

export const FormSection: FC<FormSectionProps> = ({ videoId }) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [thumbnailModalOpen, setThumbnailModalOpen] = useState(false);

  // Fetch video data
  const { data: video, isLoading } = api.studio.getOne.useQuery({ id: videoId });
  const { data: categories } = api.categories.getMany.useQuery();

  // Update mutation
  const update = api.videos.update.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Video actualizado exitosamente");
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar el video");
    },
  });

  // Delete mutation
  const remove = api.videos.remove.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast.success("Video eliminado exitosamente");
      router.push("/studio");
    },
    onError: (error) => {
      toast.error(error.message || "Error al eliminar el video");
    },
  });

  // Form setup
  const form = useForm<z.infer<typeof videoUpdateSchema>>({
    resolver: zodResolver(videoUpdateSchema),
    values: video
      ? {
        id: video.id,
        title: video.title,
        description: video.description ?? "",
        categoryId: video.categoryId ?? undefined,
        visibility: video.visibility,
      }
      : undefined,
  });

  const onSubmit = (data: z.infer<typeof videoUpdateSchema>) => {
    update.mutate(data);
  };

  const handleDelete = () => {
    if (confirm("¿Estás seguro de que quieres eliminar este video? Esta acción no se puede deshacer.")) {
      remove.mutate({ id: videoId });
    }
  };

  if (isLoading || !video) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="animate-spin size-8 text-muted-foreground" />
        <span className="ml-3 text-muted-foreground">Cargando video...</span>
      </div>
    );
  }

  return (
    <>
      <ThumbnailUploadModal
        videoId={videoId}
        open={thumbnailModalOpen}
        onOpenChange={setThumbnailModalOpen}
      />

      <div className="container max-w-7xl mx-auto py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/studio")}>
              <ArrowLeftIcon className="size-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Editar Video</h1>
              <p className="text-muted-foreground">Modifica los detalles de tu video</p>
            </div>
          </div>
          <Badge variant={video.visibility === "public" ? "default" : "secondary"} className="text-sm px-3 py-1">
            {video.visibility === "public" ? (
              <>
                <EyeIcon className="size-4 mr-2" />
                Público
              </>
            ) : (
              <>
                <EyeOffIcon className="size-4 mr-2" />
                Privado
              </>
            )}
          </Badge>
        </div>

        <Separator />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Detalles del Video</CardTitle>
                <CardDescription>Actualiza la información de tu video</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    {/* Title */}
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Título *</FormLabel>
                          <FormControl>
                            <Input placeholder="Mi video increíble" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Description */}
                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripción</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe tu video..."
                              rows={5}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Category */}
                      <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoría</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              value={field.value ?? undefined}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar categoría" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories?.map((category) => (
                                  <SelectItem key={category.id} value={category.id}>
                                    {category.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Visibility */}
                      <FormField
                        control={form.control}
                        name="visibility"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Visibilidad</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="private">Privado</SelectItem>
                                <SelectItem value="public">Público</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between pt-4">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={remove.isPending}
                      >
                        {remove.isPending ? (
                          <>
                            <Loader2Icon className="animate-spin size-4 mr-2" />
                            Eliminando...
                          </>
                        ) : (
                          <>
                            <TrashIcon className="size-4 mr-2" />
                            Eliminar Video
                          </>
                        )}
                      </Button>
                      <Button type="submit" disabled={update.isPending}>
                        {update.isPending ? (
                          <>
                            <Loader2Icon className="animate-spin size-4 mr-2" />
                            Guardando...
                          </>
                        ) : (
                          <>
                            <SaveIcon className="size-4 mr-2" />
                            Guardar Cambios
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Preview Section */}
          <div className="space-y-6">
            {/* Video Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Vista Previa</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="aspect-video bg-black">
                  {video.s3Url && (
                    <VideoPlayer
                      playbackId={video.s3Url}
                      thumbnailUrl={video.thumbnailUrl ?? undefined}
                      streamType="on-demand"
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Thumbnail */}
            <Card>
              <CardHeader>
                <CardTitle>Miniatura</CardTitle>
                <CardDescription>Haz clic para cambiar la miniatura</CardDescription>
              </CardHeader>
              <CardContent>
                <button
                  type="button"
                  onClick={() => setThumbnailModalOpen(true)}
                  className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-dashed border-muted-foreground/25 hover:border-primary transition-colors group"
                >
                  {video.thumbnailUrl ? (
                    <>
                      <Image
                        src={video.thumbnailUrl}
                        alt={video.title}
                        fill
                        className="object-cover group-hover:opacity-75 transition-opacity"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                        <ImageIcon className="size-8 text-white" />
                      </div>
                    </>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                      <ImageIcon className="size-8" />
                      <span className="text-sm">Subir miniatura</span>
                    </div>
                  )}
                </button>
              </CardContent>
            </Card>

            {/* Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Estadísticas</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Vistas</span>
                  <span className="font-medium">{video.viewCount ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Me gusta</span>
                  <span className="font-medium">{video.likeCount ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Comentarios</span>
                  <span className="font-medium">{video.commentCount ?? 0}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
};
