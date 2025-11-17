import Pusher from "pusher";
import PusherClient from "pusher-js";

// Servidor (para emitir eventos)
export const pusherServer = new Pusher({
  appId: process.env.PUSHER_APP_ID || "",
  key: process.env.NEXT_PUBLIC_PUSHER_KEY || "",
  secret: process.env.PUSHER_SECRET || "",
  cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2",
  useTLS: true,
});

// Cliente (para suscribirse a eventos)
export function getPusherClient() {
  if (typeof window === "undefined") {
    return null;
  }

  const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
  const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER || "us2";

  if (!pusherKey) {
    console.warn("PUSHER_KEY no está configurado. Los comentarios en tiempo real no funcionarán.");
    return null;
  }

  return new PusherClient(pusherKey, {
    cluster: pusherCluster,
  });
}

