"use client";

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, XCircle, ShieldCheckIcon } from "lucide-react";
import { toast } from "sonner";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface ReportModerationDialogProps {
  report: {
    id: string;
    status: string;
    reason: string;
    video: {
      id: string;
      title: string;
      visibility: string;
    } | null;
    user: {
      id: string;
      name: string;
      username: string | null;
    } | null;
  };
  trigger?: React.ReactNode;
}

/**
 * Diálogo para moderar un reporte
 * Permite a los administradores revisar reportes y tomar acciones
 */
export const ReportModerationDialog = ({ report, trigger }: ReportModerationDialogProps) => {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"valid" | "invalid" | "resolved">(
    (report.status as "valid" | "invalid" | "resolved") || "pending"
  );
  const [adminAction, setAdminAction] = useState<string>("no_action");
  const [adminNotes, setAdminNotes] = useState("");
  const [videoAction, setVideoAction] = useState<"keep" | "hide" | "delete" | "restrict">("keep");
  const [userAction, setUserAction] = useState<"warning" | "suspension" | "ban" | "none">("none");
  const [userActionReason, setUserActionReason] = useState("");
  const [suspensionDays, setSuspensionDays] = useState<number>(7);
  const [penalizeReporter, setPenalizeReporter] = useState(false);

  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const reviewReport = useMutation(
    trpc.reports.reviewReport.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries();
        toast.success("Reporte revisado exitosamente");
        setOpen(false);
        // Resetear formulario
        setStatus("pending");
        setAdminAction("no_action");
        setAdminNotes("");
        setVideoAction("keep");
        setUserAction("none");
        setUserActionReason("");
        setSuspensionDays(7);
        setPenalizeReporter(false);
      },
      onError: (error) => {
        toast.error(error.message || "Error al revisar el reporte");
      },
    })
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar que si el status es invalid, no se tomen acciones sobre el video/usuario
    if (status === "invalid" && (videoAction !== "keep" || userAction !== "none")) {
      toast.error("Si el reporte es inválido, no se deben tomar acciones sobre el video o usuario");
      return;
    }

    // Validar que si hay acción sobre usuario, se proporcione razón
    if (userAction !== "none" && !userActionReason.trim()) {
      toast.error("Debes proporcionar una razón para la acción sobre el usuario");
      return;
    }

    const adminActionValue =
      status === "invalid"
        ? "no_action"
        : videoAction === "keep" && userAction === "none"
        ? "no_action"
        : videoAction !== "keep"
        ? `video_${videoAction === "delete" ? "deleted" : videoAction === "hide" ? "hidden" : "restricted"}`
        : userAction !== "none"
        ? `user_${userAction === "warning" ? "warned" : userAction === "suspension" ? "suspended" : "banned"}`
        : "no_action";

    reviewReport.mutate({
      reportId: report.id,
      status,
      adminAction: adminActionValue as any,
      adminNotes: adminNotes.trim() || undefined,
      videoAction:
        videoAction !== "keep"
          ? {
              action: videoAction,
            }
          : undefined,
      userAction:
        userAction !== "none"
          ? {
              action: userAction,
              reason: userActionReason.trim(),
              duration: userAction === "suspension" ? suspensionDays : undefined,
            }
          : undefined,
      penalizeReporter: status === "invalid" && penalizeReporter ? true : undefined,
    });
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm" className="gap-2">
      <ShieldCheckIcon className="h-4 w-4" />
      Moderar
    </Button>
  );

  const isPending = report.status === "pending";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheckIcon className="h-5 w-5 text-blue-500" />
            Moderar Reporte
          </DialogTitle>
          <DialogDescription>
            Revisa el reporte y toma las acciones apropiadas sobre el contenido y usuarios involucrados.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Información del reporte */}
            <div className="space-y-2">
              <Label>Razón del reporte</Label>
              <div className="p-3 bg-muted rounded-md text-sm">{report.reason}</div>
            </div>

            {/* Estado del reporte */}
            <div className="space-y-2">
              <Label htmlFor="status">Estado del reporte *</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as "valid" | "invalid" | "resolved")}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="valid">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Válido - El contenido infringe las normas
                    </div>
                  </SelectItem>
                  <SelectItem value="invalid">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Inválido - Reporte infundado
                    </div>
                  </SelectItem>
                  <SelectItem value="resolved">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-blue-500" />
                      Resuelto - Ya se tomó acción
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Acciones sobre el video (solo si el reporte es válido) */}
            {status === "valid" && (
              <div className="space-y-2">
                <Label htmlFor="videoAction">Acción sobre el video</Label>
                <Select
                  value={videoAction}
                  onValueChange={(value) =>
                    setVideoAction(value as "keep" | "hide" | "delete" | "restrict")
                  }
                >
                  <SelectTrigger id="videoAction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="keep">Mantener publicado</SelectItem>
                    <SelectItem value="hide">Ocultar temporalmente</SelectItem>
                    <SelectItem value="restrict">Restringir visibilidad (solo mayores de edad)</SelectItem>
                    <SelectItem value="delete">Eliminar permanentemente</SelectItem>
                  </SelectContent>
                </Select>
                {report.video && (
                  <p className="text-xs text-muted-foreground">
                    Estado actual: <Badge variant="outline">{report.video.visibility}</Badge>
                  </p>
                )}
              </div>
            )}

            {/* Acciones sobre el usuario denunciado (solo si el reporte es válido) */}
            {status === "valid" && (
              <div className="space-y-2">
                <Label htmlFor="userAction">Acción sobre el usuario denunciado</Label>
                <Select
                  value={userAction}
                  onValueChange={(value) => setUserAction(value as "warning" | "suspension" | "ban" | "none")}
                >
                  <SelectTrigger id="userAction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Ninguna acción</SelectItem>
                    <SelectItem value="warning">Advertencia</SelectItem>
                    <SelectItem value="suspension">Suspensión temporal</SelectItem>
                    <SelectItem value="ban">Bloqueo permanente</SelectItem>
                  </SelectContent>
                </Select>

                {userAction !== "none" && (
                  <div className="space-y-2 mt-2">
                    <Label htmlFor="userActionReason">Razón de la acción *</Label>
                    <Textarea
                      id="userActionReason"
                      value={userActionReason}
                      onChange={(e) => setUserActionReason(e.target.value)}
                      placeholder="Explica la razón de esta acción..."
                      className="min-h-[80px]"
                      required
                    />
                    {userAction === "suspension" && (
                      <div className="space-y-2">
                        <Label htmlFor="suspensionDays">Duración (días)</Label>
                        <Input
                          id="suspensionDays"
                          type="number"
                          min="1"
                          max="365"
                          value={suspensionDays}
                          onChange={(e) => setSuspensionDays(parseInt(e.target.value) || 7)}
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Penalizar reportero (solo si el reporte es inválido) */}
            {status === "invalid" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="penalizeReporter"
                    checked={penalizeReporter}
                    onChange={(e) => setPenalizeReporter(e.target.checked)}
                    className="rounded"
                  />
                  <Label htmlFor="penalizeReporter" className="cursor-pointer">
                    Penalizar al reportero (reporte abusivo o spam)
                  </Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  Se registrará una advertencia para el usuario que reportó
                </p>
              </div>
            )}

            {/* Notas del admin */}
            <div className="space-y-2">
              <Label htmlFor="adminNotes">Notas internas (opcional)</Label>
              <Textarea
                id="adminNotes"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Notas internas para otros administradores..."
                className="min-h-[100px]"
                maxLength={1000}
              />
              <p className="text-xs text-muted-foreground">{adminNotes.length}/1000</p>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
              }}
              disabled={reviewReport.isPending}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={reviewReport.isPending}>
              {reviewReport.isPending ? "Procesando..." : "Aplicar Acciones"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

