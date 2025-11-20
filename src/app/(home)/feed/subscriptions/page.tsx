import { redirect } from "next/navigation";

/**
 * Redirige /feed/subscriptions a /feed con el tab personal activo
 */
export default function SubscriptionsPage() {
  redirect("/feed?tab=personal");
}



