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
    <div className="flex flex-col h-full border border-white/10 bg-[#0F1025] rounded-xl overflow-hidden">
      <div className="p-4 border-b border-white/10 bg-white/5">
        <h3 className="font-semibold text-white flex items-center gap-2">
          <div className="size-2 rounded-full bg-green-500 animate-pulse" />
          Chat en vivo
        </h3>
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-white/40 py-10 space-y-2">
              <span className="text-4xl">💬</span>
              <p className="text-sm">¡Sé el primero en comentar!</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-3 items-start animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Avatar className="size-8 shrink-0 border border-white/10">
                <AvatarImage src={msg.userImage || undefined} />
                <AvatarFallback className="bg-white/10 text-white text-xs">
                  <UserIcon className="size-4" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="font-semibold text-sm text-white/90 truncate">{msg.userName}</span>
                  <span className="text-[10px] text-white/40">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="bg-white/5 rounded-r-lg rounded-bl-lg p-2 text-sm text-white/80 break-words">
                  {msg.message}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-3 border-t border-white/10 bg-white/5">
        <form onSubmit={handleSendMessage} className="flex gap-2 relative">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Di algo..."
            className="flex-1 bg-black/20 border-white/10 text-white placeholder:text-white/30 focus-visible:ring-[#5ADBFD] pr-10"
            disabled={sendMessageMutation.isPending}
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={sendMessageMutation.isPending || !newMessage.trim()}
            className="absolute right-1 top-1 h-8 w-8 bg-transparent hover:bg-white/10 text-[#5ADBFD] disabled:text-white/20"
          >
            <SendIcon className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
};
