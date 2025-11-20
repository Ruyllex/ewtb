"use client";

import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { useEffect, useState } from "react";

interface TimeAgoProps {
  date: Date | string;
  addSuffix?: boolean;
  className?: string;
  locale?: "es" | "en";
}

/**
 * Componente cliente para mostrar tiempo relativo
 * Evita errores de hidratación renderizando solo en el cliente
 */
export function TimeAgo({ date, addSuffix = true, className, locale = "en" }: TimeAgoProps) {
  const [mounted, setMounted] = useState(false);
  const [timeString, setTimeString] = useState("");

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const dateObj = typeof date === "string" ? new Date(date) : date;
      const localeObj = locale === "es" ? es : undefined;
      setTimeString(formatDistanceToNow(dateObj, { addSuffix, locale: localeObj }));
    };
    
    updateTime();
    // Actualizar cada minuto
    const interval = setInterval(updateTime, 60000);
    
    return () => clearInterval(interval);
  }, [date, addSuffix, locale]);

  // Durante SSR, mostrar un placeholder vacío o el texto sin tiempo relativo
  if (!mounted) {
    return <span className={className}>...</span>;
  }

  return <span className={className}>{timeString}</span>;
}

