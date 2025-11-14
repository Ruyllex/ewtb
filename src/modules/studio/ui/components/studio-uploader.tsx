"use client";

import { Button } from "@/components/ui/button";
import MuxUploader, {
  MuxUploaderDrop,
  MuxUploaderFileSelect,
  MuxUploaderProgress,
  MuxUploaderStatus,
} from "@mux/mux-uploader-react";
import { UploadIcon } from "lucide-react";
import { useEffect, useRef } from "react";

interface StudioUploaderProps {
  endpoint?: string | null;
  uploadId: string;
  onUploadComplete: (uploadId: string) => void;
}

const UPLOADER_ID = "video-uploader";

export const StudioUploader = ({ endpoint, uploadId, onUploadComplete }: StudioUploaderProps) => {
  const uploaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!uploaderRef.current) return;

    const uploader = uploaderRef.current.querySelector(`#${UPLOADER_ID}`) as any;
    if (!uploader) return;

    const handleSuccess = () => {
      // Cuando el upload termine, llamar al callback con el uploadId
      onUploadComplete(uploadId);
    };

    uploader.addEventListener("success", handleSuccess);

    return () => {
      uploader.removeEventListener("success", handleSuccess);
    };
  }, [uploadId, onUploadComplete]);

  return (
    <div ref={uploaderRef}>
      <MuxUploader
        endpoint={endpoint || undefined}
        id={UPLOADER_ID}
        className="hidden group/uploader"
      />

      <MuxUploaderDrop muxUploader={UPLOADER_ID} className="group/drop">
        <div slot="heading" className="flex flex-col items-center gap-6">
          <div className="flex items-center justify-center gap-2 rounded-full bg-muted  size-32">
            <UploadIcon className="size-10 text-muted-foreground group/drop-[&[active]]:animate-bounce transition-all duration-300 " />
          </div>
          <div className="flex flex-col gap-2 text-center">
            <p className="text-sm ">Drag and drop video files to upload</p>
            <p className="text-xs text-muted-foreground">
              Tu video será privado hasta que lo publiques
            </p>
          </div>
          <MuxUploaderFileSelect muxUploader={UPLOADER_ID}>
            <Button className="rounded-full" type="button">
              Seleccionar archivo
            </Button>
          </MuxUploaderFileSelect>
        </div>
        <span slot="separator" className="hidden" />
        <MuxUploaderStatus muxUploader={UPLOADER_ID} className="text-sm" />
        <MuxUploaderProgress
          muxUploader={UPLOADER_ID}
          className="text-sm"
          type="percentage"
        />
        <MuxUploaderProgress muxUploader={UPLOADER_ID} className="text-sm" type="bar" />
      </MuxUploaderDrop>
    </div>
  );
};
