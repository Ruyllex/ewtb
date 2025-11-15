/**
 * Helpers de Sentry para uso manual
 * 
 * Sentry ya está configurado automáticamente en:
 * - sentry.client.config.ts (cliente)
 * - sentry.server.config.ts (servidor)
 * 
 * Este archivo proporciona helpers para usar Sentry manualmente en tu código.
 */

import * as Sentry from "@sentry/nextjs";

// Función helper para capturar errores manualmente
export const captureException = (error: Error, context?: Record<string, any>) => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, {
      extra: context,
    });
  } else {
    console.error("Error (Sentry not configured):", error, context);
  }
};

// Función helper para capturar mensajes
export const captureMessage = (message: string, level: Sentry.SeverityLevel = "info") => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureMessage(message, level);
  } else {
    console.log(`[${level.toUpperCase()}] ${message}`);
  }
};

// Función helper para agregar contexto de usuario
export const setUserContext = (user: { id: string; email?: string; username?: string }) => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  }
};

// Función helper para agregar tags
export const setTag = (key: string, value: string) => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setTag(key, value);
  }
};

// Función helper para agregar contexto adicional
export const setContext = (key: string, context: Record<string, any>) => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setContext(key, context);
  }
};

// Función helper para crear un breadcrumb (rastro de eventos)
export const addBreadcrumb = (message: string, category?: string, level?: Sentry.SeverityLevel, data?: Record<string, any>) => {
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.addBreadcrumb({
      message,
      category: category || "default",
      level: level || "info",
      data,
    });
  }
};

export default Sentry;
