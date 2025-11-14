import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "./redis";

// Crear rate limiter solo si Redis está configurado
let ratelimitInstance: Ratelimit | null = null;

try {
  if (redis && process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    ratelimitInstance = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "10s"),
    });
  }
} catch (error) {
  // Silenciar errores de inicialización de rate limiting
  // La app funcionará sin rate limiting si Redis no está configurado
}

// Exportar un rate limiter que siempre retorna success si no está configurado
export const ratelimit = {
  limit: async (identifier: string) => {
    if (!ratelimitInstance || !redis) {
      // Si Redis no está configurado, siempre permitir
      return { success: true };
    }
    try {
      return await ratelimitInstance.limit(identifier);
    } catch (error) {
      // Si hay un error al hacer rate limiting, permitir la petición
      console.warn("Rate limiting error:", error);
      return { success: true };
    }
  },
};
