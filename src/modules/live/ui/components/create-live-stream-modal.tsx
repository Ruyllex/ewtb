"use client";

import { ResponsiveModal } from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, VideoIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface CreateLiveStreamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const CreateLiveStreamModal = ({ open, onOpenChange }: CreateLiveStreamModalProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const create = useMutation(
    trpc.live.create.mutationOptions({
      onSuccess: (stream) => {
        toast.success("Stream creado exitosamente");
        queryClient.invalidateQueries({ refetchType: "active" });
        onOpenChange(false);
        setTitle("");
        setDescription("");
        router.push(`/studio/live/${stream.id}`);
      },
      onError: (error) => {
        toast.error(error.message || "Error al crear el stream");
      },
    })
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("El título es requerido");
      return;
    }
    create.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
    });
  };

  return (
    <ResponsiveModal
      title="Crear transmisión en vivo"
      open={open}
      onOpenChange={onOpenChange}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Título *</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Mi transmisión en vivo"
            required
            maxLength={100}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Descripción</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe tu transmisión..."
            rows={4}
            maxLength={5000}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={create.isPending}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={create.isPending || !title.trim()}>
            {create.isPending ? (
              <>
                <Loader2Icon className="animate-spin size-4 mr-2" />
                Creando...
              </>
            ) : (
              <>
                <VideoIcon className="size-4 mr-2" />
                Crear Stream
              </>
            )}
          </Button>
        </div>
      </form>
    </ResponsiveModal>
  );
};

