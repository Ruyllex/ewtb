"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { VideoThumbnail } from "./video-thumbnail";
import { THUMBNAIL_FALLBACK } from "../../constants";

interface ChannelLite {
  username?: string | null;
  name?: string | null;
  avatarUrl?: string | null;
}

interface VideoCardProps {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  duration: number;
  createdAt: Date;

  // Nuevas / preferidas
  channel?: ChannelLite | null;

  // Legacy (seguimos soportando)
  userName?: string | null;
  userUsername?: string | null;
  userImageUrl?: string | null;

  avatarPriority?: boolean;
}

function normalizeAvatar(src?: string | null) {
  if (!src) return null;
  // Absolute URL?
  try {
    const u = new URL(src);
    if (u.protocol === "http:" || u.protocol === "https:") return src;
  } catch {
    /* no es URL absoluta */
  }

  // UploadThing key heuristic
  const keyRegex = /^[A-Za-z0-9_\-]{8,}$/;
  if (keyRegex.test(src)) return `https://utfs.io/f/${src}`;

  // utfs or clerk without protocol
  if ((src.includes("utfs.io") || src.includes("img.clerk.com")) && !src.startsWith("http")) {
    return `https://${src.replace(/^\/+/, "")}`;
  }

  return null;
}

export const VideoCard = ({
  id,
  title,
  thumbnailUrl,
  previewUrl,
  duration,
  createdAt,
  channel,
  userName,
  userUsername,
  userImageUrl,
  avatarPriority = false,
}: VideoCardProps) => {
  const [avatarBroken, setAvatarBroken] = useState(false);

  // Resolver datos del canal priorizando la prop `channel`
  const finalChannel = channel ?? {
    username: userUsername ?? undefined,
    name: userName ?? undefined,
    avatarUrl: userImageUrl ?? undefined,
  };

  const normalizedAvatar = normalizeAvatar(finalChannel?.avatarUrl ?? null);
  const avatarSrc = !avatarBroken && normalizedAvatar ? normalizedAvatar : THUMBNAIL_FALLBACK;

  // Seguridad: construir href sólo si existe username, si no llevar a "#"
  const channelHref = finalChannel?.username ? `/channel/${finalChannel.username}` : "#";

  return (
    <div className="flex flex-col gap-3">
      {/* Thumbnail */}
      <Link href={`/video/${id}`} className="group">
        <div className="relative w-full">
          <VideoThumbnail
            imageUrl={thumbnailUrl ?? undefined}
            previewUrl={previewUrl ?? undefined}
            title={title}
            duration={duration}
          />
        </div>
      </Link>

      <div className="flex gap-3">
        <Link
          href={channelHref}
          className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 hover:opacity-80 transition-opacity"
          aria-label={finalChannel?.name ? `${finalChannel.name} channel` : "channel"}
        >
          <Image
            src={avatarSrc}
            alt={finalChannel?.name ?? "Usuario"}
            fill
            sizes="40px"
            className="object-cover"
            onError={() => setAvatarBroken(true)}
            priority={avatarPriority}
            // si Next sigue rompiendo por CDN, descomenta `unoptimized`
            // unoptimized
          />
        </Link>

        <div className="flex-1 min-w-0">
          <Link href={`/video/${id}`} className="group">
            <h3 className="font-semibold line-clamp-2 text-white group-hover:text-[#5ADBFD] transition-colors">
              {title}
            </h3>
          </Link>

          {finalChannel?.name ? (
            finalChannel.username ? (
              <Link href={`/channel/${finalChannel.username}`} className="hover:opacity-80 transition-opacity">
                <p className="text-sm text-muted-foreground line-clamp-1 mt-1 cursor-pointer">
                  {finalChannel.name}
                </p>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                {finalChannel.name}
              </p>
            )
          ) : null}

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
