"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { UploadIcon, Loader2Icon, CheckCircleIcon, VideoIcon, XIcon } from "lucide-react";
import { useState, useRef, useCallback, useEffect } from "react";

interface StudioUploaderProps {
  endpoint?: string | null; // URL firmada de S3
  uploadId?: string | null; // s3Key
  onUploadComplete: (uploadId: string) => void;
  onFileSelect?: (file: File) => void;
}

export const StudioUploader = ({
  endpoint,
  uploadId,
  onUploadComplete,
  onFileSelect,
}: StudioUploaderProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isComplete, setIsComplete] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
  };

  const uploadFile = useCallback(
    async (file: File) => {
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
            }, 800);
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
    },
    [endpoint, uploadId, onUploadComplete],
  );

  const handleFileSelect = useCallback(
    (file: File) => {
      // Validar que sea un archivo de video
      if (!file.type.startsWith("video/")) {
        setError("Por favor, selecciona un archivo de video válido (MP4, WebM, MOV, etc.)");
        return;
      }

      // Validar tamaño (opcional, por ejemplo máximo 2GB)
      const maxSize = 2 * 1024 * 1024 * 1024; // 2GB
      if (file.size > maxSize) {
        setError("El archivo es demasiado grande. El tamaño máximo es 2GB.");
        return;
      }

      setSelectedFile(file);
      setError(null);
      if (onFileSelect) {
        onFileSelect(file);
      }

      if (endpoint) {
        uploadFile(file);
      }
    },
    [uploadFile, endpoint, onFileSelect],
  );

  // Efecto para iniciar la subida cuando el endpoint esté disponible
  useEffect(() => {
    if (endpoint && selectedFile && !isUploading && !isComplete && !error) {
      uploadFile(selectedFile);
    }
  }, [endpoint, selectedFile, isUploading, isComplete, error, uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleReset = () => {
    setSelectedFile(null);
    setIsUploading(false);
    setUploadProgress(0);
    setIsComplete(false);
    setError(null);
    setIsDragOver(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="w-full space-y-4">
      <Card
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative overflow-hidden transition-all duration-300 ${isDragOver
            ? "border-primary bg-primary/5 shadow-lg scale-[1.02]"
            : isUploading
              ? "border-muted bg-white/20"
              : isComplete
                ? "border-green-500/50 bg-green-50/50"
                : "border-muted hover:border-primary/50 hover:bg-white/20"
          } ${isComplete ? "pointer-events-none" : ""}`}
      >
        <div className="p-8 md:p-12">
          <div className="flex flex-col items-center gap-6 text-center">
            {/* Icon Section */}
            {isComplete ? (
              <div className="flex items-center justify-center size-20 rounded-full bg-green-100 dark:bg-green-900/30">
                <CheckCircleIcon className="size-12 text-green-600 dark:text-green-500" />
              </div>
            ) : isUploading ? (
              <div className="flex items-center justify-center size-20 rounded-full bg-primary/10">
                <Loader2Icon className="size-12 text-primary animate-spin" />
              </div>
            ) : (
              <div
                className={`flex items-center justify-center size-24 rounded-full transition-all duration-300 ${isDragOver
                    ? "bg-primary/10 scale-110"
                    : "bg-white/20 hover:bg-white/20"
                  }`}
              >
                <UploadIcon
                  className={`size-12 transition-all duration-300 ${isDragOver ? "text-primary animate-bounce" : "text-muted-foreground"
                    }`}
                />
              </div>
            )}

            {/* Text Section */}
            <div className="space-y-2 max-w-md">
              {isComplete ? (
                <>
                  <h3 className="text-xl font-bold text-green-600 dark:text-green-500">
                    ¡Video subido exitosamente!
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    El video se está procesando. Completa la información para finalizar.
                  </p>
                </>
              ) : isUploading ? (
                <>
                  <h3 className="text-xl font-bold">Subiendo video...</h3>
                  <p className="text-sm text-muted-foreground">
                    Por favor, no cierres esta ventana. El proceso puede tardar unos minutos.
                  </p>
                  {selectedFile && (
                    <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
                      <VideoIcon className="size-4" />
                      <span className="font-medium">{selectedFile.name}</span>
                      <span className="text-xs">({formatFileSize(selectedFile.size)})</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-xl font-bold">
                    {isDragOver ? "Suelta el archivo aquí" : "Arrastra tu video aquí"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    O haz clic para seleccionar un archivo desde tu computadora
                  </p>
                  <div className="flex items-center justify-center gap-4 pt-2 text-xs text-muted-foreground">
                    <span>MP4, WebM, MOV</span>
                    <span>•</span>
                    <span>Máx. 2GB</span>
                  </div>
                </>
              )}
            </div>

            {/* Progress Bar */}
            {isUploading && (
              <div className="w-full max-w-md space-y-2">
                <Progress value={uploadProgress} className="h-2" />
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progreso</span>
                  <span className="font-semibold text-primary">{Math.round(uploadProgress)}%</span>
                </div>
              </div>
            )}

            {/* Selected File Info */}
            {selectedFile && !isUploading && !isComplete && (
              <Card className="w-full max-w-md p-4 bg-white/20">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center size-12 rounded-lg bg-primary/10">
                    <VideoIcon className="size-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{selectedFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleReset}
                    className="flex-shrink-0"
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
              </Card>
            )}

            {/* Action Buttons */}
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
                  type="button"
                  onClick={handleButtonClick}
                  size="lg"
                  className="rounded-full px-8"
                  disabled={isComplete}
                >
                  <UploadIcon className="size-4 mr-2" />
                  Seleccionar archivo
                </Button>
              </>
            )}

            {/* Error Message */}
            {error && (
              <Card className="w-full max-w-md p-4 bg-destructive/10 border-destructive/20">
                <div className="flex items-start gap-3">
                  <XIcon className="size-5 text-destructive flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-semibold text-destructive text-sm mb-1">Error</p>
                    <p className="text-sm text-destructive/90">{error}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleReset}
                    className="flex-shrink-0 size-8"
                  >
                    <XIcon className="size-4" />
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};