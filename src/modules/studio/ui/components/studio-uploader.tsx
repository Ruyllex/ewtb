"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { UploadIcon, Loader2Icon, CheckCircleIcon } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";

interface StudioUploaderProps {
  endpoint?: string | null; // URL firmada de S3
  uploadId?: string | null; // s3Key
  onUploadComplete: (uploadId: string) => void;
  onFileSelect?: (file: File) => void;
}

export const StudioUploader = ({ endpoint, uploadId, onUploadComplete, onFileSelect }: StudioUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = useCallback(async (file: File) => {
    if (!endpoint) {
      setError("No hay URL de subida disponible. Por favor, intenta de nuevo.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setError(null);
    setIsComplete(false);

    try {
      // Subir directamente a S3 usando la URL firmada
      const xhr = new XMLHttpRequest();

      // Manejar progreso de subida
      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          setUploadProgress(percentComplete);
        }
      });

      // Manejar finalización
      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setIsComplete(true);
          setIsUploading(false);
          setUploadProgress(100);
          // Llamar al callback después de un breve delay para mostrar el estado de completado
          setTimeout(() => {
            if (uploadId) {
              onUploadComplete(uploadId);
            }
          }, 500);
        } else {
          setError(`Error al subir el archivo: ${xhr.statusText}`);
          setIsUploading(false);
        }
      });

      // Manejar errores
      xhr.addEventListener("error", () => {
        setError("Error de red al subir el archivo. Por favor, intenta de nuevo.");
        setIsUploading(false);
      });

      // Abrir y enviar
      xhr.open("PUT", endpoint);
      xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
      xhr.send(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido al subir el archivo");
      setIsUploading(false);
    }
  }, [endpoint, uploadId, onUploadComplete]);

  const handleFileSelect = useCallback((file: File) => {
    // Validar que sea un archivo de video
    if (!file.type.startsWith("video/")) {
      setError("Por favor, selecciona un archivo de video válido.");
      return;
    }

    setSelectedFile(file);
    if (onFileSelect) {
      onFileSelect(file);
    }

    if (endpoint) {
      uploadFile(file);
    }
  }, [uploadFile, endpoint, onFileSelect]);

  // Efecto para iniciar la subida cuando el endpoint esté disponible
  useEffect(() => {
    if (endpoint && selectedFile && !isUploading && !isComplete && !error) {
      uploadFile(selectedFile);
    }
  }, [endpoint, selectedFile, isUploading, isComplete, error, uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`group/drop border-2 border-dashed rounded-lg p-12 transition-colors ${isDragOver
          ? "border-primary bg-primary/5"
          : isUploading
            ? "border-muted bg-muted/5"
            : "border-muted hover:border-primary/50"
          }`}
      >
        <div className="flex flex-col items-center gap-6">
          {isComplete ? (
            <CheckCircleIcon className="size-12 text-green-500" />
          ) : isUploading ? (
            <Loader2Icon className="size-12 text-primary animate-spin" />
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-full bg-muted size-32">
              <UploadIcon
                className={`size-10 text-muted-foreground transition-all duration-300 ${isDragOver ? "animate-bounce" : ""
                  }`}
              />
            </div>
          )}

          <div className="flex flex-col gap-2 text-center">
            {isComplete ? (
              <>
                <p className="text-sm font-medium">¡Video subido exitosamente!</p>
                <p className="text-xs text-muted-foreground">Completa la información para guardar tu video</p>
              </>
            ) : isUploading ? (
              <>
                <p className="text-sm font-medium">Subiendo video...</p>
                <p className="text-xs text-muted-foreground">Por favor, no cierres esta ventana</p>
              </>
            ) : (
              <>
                <p className="text-sm">Arrastra y suelta un archivo de video aquí</p>
                <p className="text-xs text-muted-foreground">
                  Tu video será privado hasta que lo publiques
                </p>
              </>
            )}
          </div>

          {!isUploading && !isComplete && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
              <Button
                className="rounded-full"
                type="button"
                onClick={handleButtonClick}
                disabled={false}
              >
                Seleccionar archivo
              </Button>
            </>
          )}

          {isUploading && (
            <div className="w-full max-w-md space-y-2">
              <Progress value={uploadProgress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                {Math.round(uploadProgress)}% completado
              </p>
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-destructive/10 border border-destructive/20 p-3 w-full max-w-md">
              <p className="text-sm text-destructive text-center">{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
