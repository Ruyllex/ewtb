"use client";

import { ResponsiveModal } from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { StudioUploader } from "./studio-uploader";
import { VideoPreviewForm } from "./video-preview-form";
import { useState } from "react";

type UploadStep = "idle" | "uploading" | "preview";

export const StudioUploadModal = () => {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<UploadStep>("idle");
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);
  const [videoDuration, setVideoDuration] = useState<number>(0);

  const create = api.videos.create.useMutation({
    onSuccess: (data) => {
      setUploadId(data.uploadId);
      setUploadUrl(data.url);
      setStep("uploading");
    },
    onError: (error) => {
      toast.error(error.message || "Error al crear el upload");
    },
  });

  const handleUploadComplete = (completedUploadId: string) => {
    setStep("preview");
    toast.success("Video subido exitosamente. Completa la información para guardarlo.");
  };

  const handleCancel = () => {
    setStep("idle");
    setUploadId(null);
    setUploadUrl(null);
    setVideoDuration(0);
    create.reset();
  };

  const isOpen = step !== "idle";

  const getModalTitle = () => {
    switch (step) {
      case "uploading":
        return "Subir Video";
      case "preview":
        return "Configurar Video";
      default:
        return "Subir Video";
    }
  };

  const getModalDescription = () => {
    switch (step) {
      case "uploading":
        return "Selecciona el archivo de video que deseas subir a la plataforma";
      case "preview":
        return "Completa la información de tu video y configúralo antes de publicarlo";
      default:
        return "";
    }
  };

  return (
    <>
      <ResponsiveModal
        title={getModalTitle()}
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCancel();
          }
        }}
      >
        <div className="space-y-6">
          {step === "uploading" && (
            <div className="space-y-4">
              <div className="text-center space-y-2 pb-4">
                <p className="text-sm text-muted-foreground">{getModalDescription()}</p>
              </div>
              <StudioUploader
                endpoint={uploadUrl}
                uploadId={uploadId}
                onUploadComplete={handleUploadComplete}
                onFileSelect={(file, duration) => {
                  setVideoDuration(duration || 0);
                  create.mutate({ contentType: file.type || "video/mp4" });
                }}
              />
            </div>
          )}

          {step === "preview" && uploadId && (
            <div className="max-h-[80vh] overflow-y-auto">
              <VideoPreviewForm uploadId={uploadId} duration={videoDuration} onCancel={handleCancel} />
            </div>
          )}

          {step === "idle" && create.isPending && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2Icon className="animate-spin size-8 text-primary" />
              <p className="text-sm text-muted-foreground">Preparando subida...</p>
            </div>
          )}
        </div>
      </ResponsiveModal>

      <Button
        variant={"secondary"}
        onClick={() => setStep("uploading")}
        className="cursor-pointer size-9 p-0 rounded-md bg-white/10 hover:bg-white/20 border border-white/10"
        disabled={create.isPending || isOpen}
        title="Subir video"
      >
        {create.isPending ? (
          <Loader2Icon className="animate-spin size-5 text-white" />
        ) : (
          <PlusIcon className="size-5 text-white" />
        )}
      </Button>
    </>
  );
};