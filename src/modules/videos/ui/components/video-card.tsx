import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { VideoThumbnail } from "./video-thumbnail";
import { THUMBNAIL_FALLBACK } from "../../constants";
import { useChannelsStore } from "@/stores/channels-store";

interface VideoCardProps {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  duration: number;
  createdAt: Date;

  userId: string; // 🔥 Ahora se usa esto en vez de userName/userImageUrl/etc
  avatarPriority?: boolean;
}

function normalizeAvatar(src?: string | null) {
  if (!src) return null;

  try {
    const u = new URL(src);
    if (u.protocol === "http:" || u.protocol === "https:") return src;
  } catch {}

  const keyRegex = /^[A-Za-z0-9_\-]{8,}$/;
  if (keyRegex.test(src)) return `https://utfs.io/f/${src}`;

  if (src.includes("utfs.io") && !src.startsWith("http"))
    return `https://${src.replace(/^\/+/, "")}`;

  if (src.includes("img.clerk.com") && !src.startsWith("http"))
    return `https://${src.replace(/^\/+/, "")}`;

  return null;
}

interface VideoCardProps {
  id: string;
  title: string;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  duration: number;
  createdAt: Date;

  channel: {
    username: string;
    name: string;
    avatarUrl?: string | null;
  };
}

export const VideoCard = ({
  id,
  title,
  thumbnailUrl,
  previewUrl,
  duration,
  createdAt,
  channel,
}: VideoCardProps) => {
  const [avatarBroken, setAvatarBroken] = useState(false);

  const normalizedAvatar = normalizeAvatar(channel?.avatarUrl ?? null);

  const avatarSrc =
    !avatarBroken && normalizedAvatar ? normalizedAvatar : THUMBNAIL_FALLBACK;

  return (
    <div className="flex flex-col gap-3">
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
          href={`/channel/${channel.username}`}
          className="relative w-10 h-10 rounded-full overflow-hidden shrink-0"
        >
          <Image
            src={avatarSrc}
            alt={channel.name}
            fill
            sizes="40px"
            className="object-cover"
            onError={() => setAvatarBroken(true)}
          />
        </Link>

        <div className="flex-1 min-w-0">
          <Link href={`/video/${id}`}>
            <h3 className="font-semibold line-clamp-2">{title}</h3>
          </Link>

          <Link href={`/channel/${channel.username}`}>
            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
              {channel.name}
            </p>
          </Link>

          <p className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
          </p>
        </div>
      </div>
    </div>
  );
};

