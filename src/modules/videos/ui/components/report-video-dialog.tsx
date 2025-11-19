"use client";

import React, { useState } from "react"; // <-- IMPORTAR React
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@clerk/nextjs";
import { api as trpc } from "@/trpc/client";

interface ReportVideoDialogProps {
  videoId: string;
  trigger?: React.ReactNode; // puede quedarse así
}

/**
 * Diálogo para reportar un video
 */
export const ReportVideoDialog = ({ videoId, trigger }: ReportVideoDialogProps) => {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isSignedIn, userId: clerkUserId } = useAuth();

  const { data: currentUser } = trpc.users.getProfile.useQuery(
    undefined,
    { enabled: isSignedIn }
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSignedIn) {
      toast.error("Debes iniciar sesión para reportar un video");
      return;
    }
    if (!reason.trim()) {
      toast.error("Por favor, proporciona una razón para el reporte");
      return;
    }
    if (reason.trim().length < 10) {
      toast.error("La razón del reporte debe tener al menos 10 caracteres");
      return;
    }
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/reportVideo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_id: videoId,
          reason: reason.trim(),
          user_id: currentUser?.id,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Error al reportar el video");
      toast.success("Video reportado exitosamente. Gracias por ayudarnos a mantener la comunidad segura.");
      setReason("");
      setOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Error desconocido al reportar el video";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <AlertTriangle className="h-4 w-4" />
      Reportar
    </Button>
  );

  // <-- aquí nos aseguramos de pasar EXACTAMENTE un ReactElement a DialogTrigger
  const triggerElement = React.isValidElement(trigger) ? trigger : defaultTrigger;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerElement}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Reportar Video
          </DialogTitle>
          <DialogDescription>
            Si este video viola nuestras políticas o contiene contenido inapropiado, por favor repórtalo.
            Tu reporte será revisado por nuestro equipo de moderación.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason">Razón del reporte *</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe por qué estás reportando este video (mínimo 10 caracteres)..."
                className="min-h-[120px]"
                disabled={isSubmitting}
                maxLength={1000}
                required
              />
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Mínimo 10 caracteres</span>
                <span>{reason.length}/1000</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setReason("");
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!reason.trim() || reason.trim().length < 10 || isSubmitting}>
              {isSubmitting ? "Enviando..." : "Enviar Reporte"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
