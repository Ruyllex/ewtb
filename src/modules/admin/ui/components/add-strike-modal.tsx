"use client";

import { api } from "@/trpc/client";
import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Loader2Icon, UserIcon } from "lucide-react";

interface AddStrikeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: any;
  onSuccess: () => void;
}

export const AddStrikeModal = ({ open, onOpenChange, user, onSuccess }: AddStrikeModalProps) => {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addStrike = api.admin.addStrike.useMutation({
    onSuccess: () => {
      toast.success("Strike agregado exitosamente");
      setReason("");
      setIsSubmitting(false);
      onSuccess();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Error al agregar strike");
      setIsSubmitting(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      toast.error("Por favor, ingresa una razón para el strike");
      return;
    }

    setIsSubmitting(true);
    addStrike.mutate({
      userId: user.id,
      reason: reason.trim(),
    });
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setReason("");
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Agregar Strike a Usuario
          </DialogTitle>
          <DialogDescription>
            Agrega una advertencia (strike) a este usuario. El usuario recibirá una notificación sobre esta acción.
          </DialogDescription>
        </DialogHeader>

        {/* User Info */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="relative w-10 h-10 rounded-full overflow-hidden bg-white/20 shrink-0">
            <img
              src={user.imageUrl || "/user-placeholder.svg"}
              alt={user.name}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium">{user.name}</p>
            <p className="text-sm text-muted-foreground">@{user.username || "sin-username"}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Razón del Strike</Label>
            <Textarea
              id="reason"
              placeholder="Describe la razón por la cual se está agregando este strike..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              rows={3}
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Esta razón será visible para el usuario en la notificación.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !reason.trim()}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2Icon className="h-4 w-4 mr-2 animate-spin" />
                  Agregando Strike...
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Agregar Strike
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
