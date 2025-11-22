import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDuration = (duration: number) => {
  const seconds = Math.floor((duration % 60000) / 1000);
  const minutes = Math.floor(duration / 60000);

  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

export const formatNumber = (num: number): string => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toString();
};

export const snakeCaseToTitleCase = (str: string) => {
  return str.replace(/_/g, " ").replace(/\b\w/g, (match) => match.toUpperCase());
};

export function normalizeImage(src?: string | null) {
  if (!src) return null;
  try {
    const u = new URL(src);
    if (u.protocol === "http:" || u.protocol === "https:") return src;
  } catch {
    // no es URL absoluta
  }
  // UploadThing key heuristic
  const keyRegex = /^[A-Za-z0-9_\-]{8,}$/;
  if (keyRegex.test(src)) return `https://utfs.io/f/${src}`;

  // utfs or clerk without protocol
  if ((src.includes("utfs.io") || src.includes("img.clerk.com")) && !src.startsWith("http")) {
    return `https://${src.replace(/^\/+/, "")}`;
  }
  // Relative URL (starts with /)
  if (src.startsWith("/")) return src;

  return null;
}