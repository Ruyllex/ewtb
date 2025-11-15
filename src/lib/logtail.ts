/**
 * Configuración de Logtail para logging estructurado
 * 
 * Logtail es útil para:
 * - Logs estructurados
 * - Búsqueda y análisis de logs
 * - Alertas basadas en logs
 * 
 * Nota: Logtail es opcional. Si no está configurado, los logs se envían a console.
 */

import { Logtail } from "@logtail/node";
import { Logtail as BrowserLogtail } from "@logtail/browser";

// Cliente de Logtail para servidor
export const logtail = process.env.NEXT_PUBLIC_LOGTALL_SOURCE_TOKEN
  ? new Logtail(process.env.NEXT_PUBLIC_LOGTALL_SOURCE_TOKEN)
  : null;

// Cliente de Logtail para navegador
export const browserLogtail = process.env.NEXT_PUBLIC_LOGTALL_SOURCE_TOKEN
  ? new BrowserLogtail(process.env.NEXT_PUBLIC_LOGTALL_SOURCE_TOKEN)
  : null;

// Función helper para logging en servidor
export const logServer = {
  info: (message: string, context?: Record<string, any>) => {
    if (logtail) {
      logtail.info(message, context);
    } else {
      console.log(`[INFO] ${message}`, context || "");
    }
  },
  warn: (message: string, context?: Record<string, any>) => {
    if (logtail) {
      logtail.warn(message, context);
    } else {
      console.warn(`[WARN] ${message}`, context || "");
    }
  },
  error: (message: string, error?: Error | any, context?: Record<string, any>) => {
    if (logtail) {
      logtail.error(message, {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        ...context,
      });
    } else {
      console.error(`[ERROR] ${message}`, error, context || "");
    }
  },
  debug: (message: string, context?: Record<string, any>) => {
    if (logtail) {
      logtail.debug(message, context);
    } else {
      if (process.env.NODE_ENV === "development") {
        console.debug(`[DEBUG] ${message}`, context || "");
      }
    }
  },
};

// Función helper para logging en navegador
export const logBrowser = {
  info: (message: string, context?: Record<string, any>) => {
    if (browserLogtail) {
      browserLogtail.info(message, context);
    } else {
      console.log(`[INFO] ${message}`, context || "");
    }
  },
  warn: (message: string, context?: Record<string, any>) => {
    if (browserLogtail) {
      browserLogtail.warn(message, context);
    } else {
      console.warn(`[WARN] ${message}`, context || "");
    }
  },
  error: (message: string, error?: Error | any, context?: Record<string, any>) => {
    if (browserLogtail) {
      browserLogtail.error(message, {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        ...context,
        url: typeof window !== "undefined" ? window.location.href : undefined,
        userAgent: typeof window !== "undefined" ? window.navigator.userAgent : undefined,
      });
    } else {
      console.error(`[ERROR] ${message}`, error, context || "");
    }
  },
  debug: (message: string, context?: Record<string, any>) => {
    if (browserLogtail) {
      browserLogtail.debug(message, context);
    } else {
      if (process.env.NODE_ENV === "development") {
        console.debug(`[DEBUG] ${message}`, context || "");
      }
    }
  },
};
