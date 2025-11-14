import { Redis } from "@upstash/redis";

// Crear instancia de Redis solo si las variables de entorno están configuradas
let redisInstance: Redis | null = null;

try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redisInstance = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (error) {
  console.warn("Redis not available:", error);
}

// Exportar una instancia que puede ser null
export const redis = redisInstance;
