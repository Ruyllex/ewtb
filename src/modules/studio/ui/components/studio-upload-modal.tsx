"use client";

import { ResponsiveModal } from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, PlusIcon, XIcon } from "lucide-react";
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
    create.reset();
  };

  const handleFinalize = () => {
    queryClient.invalidateQueries({ refetchType: "active" });
    handleCancel();
  };

  const isOpen = step !== "idle";

  return (
    <>
      <ResponsiveModal
        title={
          step === "uploading"
            ? "Subir video"
            : step === "preview"
              ? "Previsualizar y configurar video"
              : "Subir video"
        }
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleCancel();
          }
        }}
      >
        {step === "uploading" && (
          <div className="space-y-4">
            <StudioUploader
              endpoint={uploadUrl}
              uploadId={uploadId}
              onUploadComplete={handleUploadComplete}
              onFileSelect={(file) => create.mutate({ contentType: file.type || "video/mp4" })}
            />
          </div>
        )}

        {step === "preview" && uploadId && (
          <VideoPreviewForm uploadId={uploadId} onCancel={handleCancel} />
        )}

        {step === "idle" && create.isPending && (
          <div className="flex items-center justify-center py-12">
            <Loader2Icon className="animate-spin size-8" />
          </div>
        )}
      </ResponsiveModal>

      <Button
        variant={"secondary"}
        onClick={() => setStep("uploading")}
        className="cursor-pointer"
        disabled={create.isPending || isOpen}
      >
        {create.isPending ? <Loader2Icon className="animate-spin" /> : <PlusIcon />}
        Subir Video
      </Button>
    </>
  );
};
