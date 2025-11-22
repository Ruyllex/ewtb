"use client";

import { useEffect, useState, useRef } from "react";
import { getPusherClient } from "@/lib/pusher";
import { api as trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SendIcon, UserIcon } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  userId: string;
  userName: string;
  userImage?: string | null;
  message: string;
  timestamp: string;
}

interface ChatComponentProps {
  streamId: string;
}

export const ChatComponent = ({ streamId }: ChatComponentProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const sendMessageMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      setNewMessage("");
    },
    onError: (error: any) => {
      toast.error("Error al enviar mensaje: " + error.message);
    },
  });

  useEffect(() => {
    const pusher = getPusherClient();
    if (!pusher) return;

    const channel = pusher.subscribe(`chat-${streamId}`);

    channel.bind("new-message", (data: Message) => {
      setMessages((prev) => [...prev, data]);
      // Scroll to bottom
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => {
      pusher.unsubscribe(`chat-${streamId}`);
    };
  }, [streamId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    sendMessageMutation.mutate({
      streamId,
      message: newMessage,
    });
  };

  return (
    <div className="flex flex-col h-full border border-border rounded-lg bg-card shadow-sm">
      <div className="p-3 border-b border-border bg-muted/50">
        <h3 className="font-semibold text-sm">Chat en vivo</h3>
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-10">
              ¡Sé el primero en comentar!
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-2 items-start">
              <Avatar className="size-8">
                <AvatarImage src={msg.userImage || undefined} />
                <AvatarFallback>
                  <UserIcon className="size-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold text-sm truncate">{msg.userName}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm break-words">{msg.message}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-border bg-muted/30">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="flex-1"
            disabled={sendMessageMutation.isPending}
          />
          <Button type="submit" size="icon" disabled={sendMessageMutation.isPending || !newMessage.trim()}>
            <SendIcon className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
