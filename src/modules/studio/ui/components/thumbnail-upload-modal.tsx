import { ResponsiveModal } from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { UploadIcon, XIcon, Loader2Icon } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";
import Image from "next/image";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`/api/videos/${videoId}/thumbnail`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload thumbnail");
      }

      toast.success("Thumbnail uploaded successfully");
      queryClient.invalidateQueries();
      onOpenChange(false);
      // Reset state
      setFile(null);
      setPreviewUrl(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload thumbnail");
    } finally {
      setIsUploading(false);
    }
  };

  const handleCancel = () => {
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <ResponsiveModal title="Upload Thumbnail" open={open} onOpenChange={onOpenChange}>
      <div className="flex flex-col gap-4 p-4">
        {!file ? (
          <div
            className="border-2 border-dashed border-neutral-700 rounded-lg p-8 flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-neutral-800/50 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <UploadIcon className="w-10 h-10 text-neutral-400" />
            <div className="text-center">
              <p className="font-medium">Click to upload</p>
              <p className="text-sm text-neutral-500">JPG, PNG, WEBP up to 5MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800">
              {previewUrl && (
                <Image
                  src={previewUrl}
                  alt="Thumbnail preview"
                  fill
                  className="object-cover"
                />
              )}
              <button
                onClick={handleCancel}
                className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70 transition-colors"
                disabled={isUploading}
              >
                <XIcon className="w-4 h-4 text-white" />
              </button>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={handleCancel} disabled={isUploading}>
                Cancel
              </Button>
              <Button onClick={handleUpload} disabled={isUploading}>
                {isUploading ? (
                  <>
                    <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </ResponsiveModal>
  );
};
