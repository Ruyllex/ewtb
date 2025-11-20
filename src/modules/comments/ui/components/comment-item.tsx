"use client";
import { api } from "@/trpc/client";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TimeAgo } from "@/components/time-ago";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import Link from "next/link";
import Image from "next/image";
import { MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { getPusherClient } from "@/lib/pusher";

interface Comment {
  id: string;
  videoId: string;
  userId: string;
  texto: string;
  fecha: Date;
  parentId?: string | null;
  replyCount?: number;
  user: {
    id: string;
    name: string;
    username?: string | null;
    imageUrl: string;
  };
}

interface CommentItemProps {
  comment: Comment;
  videoId: string;
  level?: number; // Nivel de anidación (0 = comentario principal)
}

export const CommentItem = ({ comment, videoId, level = 0 }: CommentItemProps) => {
  const queryClient = useQueryClient();
  const { isSignedIn } = useAuth();
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Obtener respuestas del comentario
  const {
    data: repliesData,
    isLoading: isLoadingReplies,
    refetch: refetchReplies,
  } = api.comment.getReplies.useQuery({ parentId: comment.id, limit: 50 }, {
    enabled: showReplies,
  });

  const replies = repliesData?.items || [];
  // Usar replyCount del comentario si está disponible, sino usar el conteo de respuestas cargadas
  const replyCount = comment.replyCount ?? replies.length;
  const hasReplies = replyCount > 0;

  // Suscribirse a eventos de Pusher para respuestas en tiempo real
  useEffect(() => {
    if (!showReplies) return;

    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(`video-${videoId}`);

    channel.bind("new-comment", (newComment: any) => {
      // Si el nuevo comentario es una respuesta a este comentario
      if (newComment.parentId === comment.id) {
        refetchReplies();
      }
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
    };
  }, [showReplies, videoId, comment.id, refetchReplies]);

  // Mutación para agregar respuesta
  const addReply = api.comment.add.useMutation({
      onSuccess: () => {
        setReplyText("");
        setShowReplyForm(false);
        queryClient.invalidateQueries({
          queryKey: [["comment", "getReplies"]],
        });
        queryClient.invalidateQueries({
          queryKey: [["comment", "list"]],
        });
        // Si no estaba mostrando respuestas, mostrarlas ahora
        if (!showReplies) {
          setShowReplies(true);
        }
        refetchReplies();
      },
      onError: (error) => {
        toast.error(error.message || "Error al agregar la respuesta");
      },
      onSettled: () => {
        setIsSubmitting(false);
      },
    });

  const handleReplySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !isSignedIn || isSubmitting) return;

    setIsSubmitting(true);
    addReply.mutate({
      videoId,
      texto: replyText.trim(),
      parentId: comment.id,
    });
  };

  const maxLevel = 2; // Máximo 2 niveles de anidación (comentario principal + 1 nivel de respuestas)

  return (
    <div className={level > 0 ? "ml-8 mt-3 border-l-2 border-muted pl-4" : ""}>
      <div className="flex gap-3">
        {comment.user.username ? (
          <Link
            href={`/channel/${comment.user.username}`}
            className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 hover:opacity-80 transition-opacity"
          >
            <Image
              src={comment.user.imageUrl || "/user-placeholder.svg"}
              alt={comment.user.name}
              fill
              className="object-cover"
            />
          </Link>
        ) : (
          <Avatar className="w-10 h-10 shrink-0">
            <AvatarImage
              src={comment.user.imageUrl || "/user-placeholder.svg"}
              alt={comment.user.name}
            />
            <AvatarFallback>
              {comment.user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {comment.user.username ? (
              <Link
                href={`/channel/${comment.user.username}`}
                className="font-semibold text-sm hover:underline"
              >
                {comment.user.name}
              </Link>
            ) : (
              <span className="font-semibold text-sm">{comment.user.name}</span>
            )}
            <span className="text-xs text-muted-foreground">
              <TimeAgo date={comment.fecha} locale="es" />
            </span>
          </div>
          <p className="text-sm whitespace-pre-wrap break-words">{comment.texto}</p>

          {/* Botones de acción */}
          <div className="flex items-center gap-4 mt-2">
            {isSignedIn && level < maxLevel && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setShowReplyForm(!showReplyForm)}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Responder
              </Button>
            )}
            {hasReplies && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setShowReplies(!showReplies)}
              >
                {showReplies ? (
                  <>
                    <ChevronUp className="h-3 w-3 mr-1" />
                    Ocultar {replyCount} {replyCount === 1 ? "respuesta" : "respuestas"}
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3 w-3 mr-1" />
                    Ver {replyCount} {replyCount === 1 ? "respuesta" : "respuestas"}
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Formulario de respuesta */}
          {showReplyForm && isSignedIn && (
            <form onSubmit={handleReplySubmit} className="mt-3">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder={`Responder a ${comment.user.name}...`}
                className="min-h-[80px] mb-2"
                disabled={isSubmitting}
                maxLength={5000}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowReplyForm(false);
                    setReplyText("");
                  }}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={!replyText.trim() || isSubmitting}>
                  {isSubmitting ? "Enviando..." : "Responder"}
                </Button>
              </div>
            </form>
          )}

          {/* Lista de respuestas */}
          {showReplies && (
            <div className="mt-4 space-y-3">
              {isLoadingReplies ? (
                <div className="text-sm text-muted-foreground">Cargando respuestas...</div>
              ) : replies.length === 0 ? (
                <div className="text-sm text-muted-foreground">No hay respuestas aún</div>
              ) : (
                replies.map((reply) => (
                  <CommentItem
                    key={reply.id}
                    comment={reply}
                    videoId={videoId}
                    level={level + 1}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

