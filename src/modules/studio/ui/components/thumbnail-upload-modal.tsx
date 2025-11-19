import { ResponsiveModal } from "@/components/responsive-dialog";
import { UploadDropzone } from "@/lib/uploadthing";
import { api } from "@/trpc/client";
import { useQueryClient } from "@tanstack/react-query";

interface ThumbnailUploadModalProps {
  videoId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ThumbnailUploadModal = ({
  videoId,
  open,
  onOpenChange,
}: ThumbnailUploadModalProps) => {
  const queryClient = useQueryClient();

  const onUploadComplete = () => {
    // Invalidar la cache del video específico para que el thumbnail se actualice
    queryClient.invalidateQueries();
    onOpenChange(false);
  };

  return (
    <ResponsiveModal title="Upload Thumbnail" open={open} onOpenChange={onOpenChange}>
      <UploadDropzone
        endpoint="thumbnailUploader"
        input={{ videoId }}
        onClientUploadComplete={onUploadComplete}
      />
    </ResponsiveModal>
  );
};
