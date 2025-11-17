"use client";

import { useTRPC } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";
import { getPusherClient } from "@/lib/pusher";
import Link from "next/link";
import { CommentItem } from "./comment-item";

interface CommentsSectionProps {
  videoId: string;
}

export const CommentsSection = ({ videoId }: CommentsSectionProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { isSignedIn } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);
  const pusherRef = useRef<ReturnType<typeof getPusherClient> | null>(null);

  // Obtener comentarios
  const {
    data: commentsData,
    isLoading,
    refetch,
  } = useQuery(trpc.comment.list.queryOptions({ videoId, limit: 50 }));

  // Mutación para agregar comentario
  const addComment = useMutation(
    trpc.comment.add.mutationOptions({
      onSuccess: () => {
        setCommentText("");
        queryClient.invalidateQueries({
          queryKey: [["comment", "list"]],
        });
        // Scroll al final después de un breve delay
        setTimeout(() => {
          commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      },
      onError: (error) => {
        toast.error(error.message || "Error al agregar el comentario");
      },
      onSettled: () => {
        setIsSubmitting(false);
      },
    })
  );

  // Suscribirse a eventos de Pusher para comentarios en tiempo real
  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) {
      // Fallback a polling si Pusher no está configurado
      const interval = setInterval(() => {
        refetch();
      }, 5000); // Poll cada 5 segundos

      return () => clearInterval(interval);
    }

    pusherRef.current = pusher;

    const channel = pusher.subscribe(`video-${videoId}`);

    channel.bind("new-comment", (newComment: any) => {
      // Invalidar la query para refrescar los comentarios
      queryClient.invalidateQueries({
        queryKey: [["comment", "list"]],
      });
      // Scroll al final cuando llega un nuevo comentario
      setTimeout(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, [videoId, queryClient, refetch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || !isSignedIn || isSubmitting) return;

    setIsSubmitting(true);
    addComment.mutate({
      videoId,
      texto: commentText.trim(),
    });
  };

  const comments = commentsData?.items || [];

  return (
    <div className="mt-8 space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-4">
          Comentarios {comments.length > 0 && `(${comments.length})`}
        </h2>

        {/* Formulario para agregar comentario */}
        {isSignedIn ? (
          <form onSubmit={handleSubmit} className="mb-6">
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Agrega un comentario..."
              className="min-h-[100px] mb-2"
              disabled={isSubmitting}
              maxLength={5000}
            />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {commentText.length}/5000
              </span>
              <Button type="submit" disabled={!commentText.trim() || isSubmitting}>
                {isSubmitting ? "Enviando..." : "Comentar"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="mb-6 p-4 border rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">
              <Link href="/sign-in" className="text-primary hover:underline">
                Inicia sesión
              </Link>{" "}
              para comentar
            </p>
          </div>
        )}

        {/* Lista de comentarios */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4" />
                  <div className="h-20 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No hay comentarios aún. ¡Sé el primero en comentar!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem key={comment.id} comment={comment} videoId={videoId} />
            ))}
            <div ref={commentsEndRef} />
          </div>
        )}
      </div>
    </div>
  );
};

