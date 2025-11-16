import Link from "next/link";
import Image from "next/image";
import { formatDistanceToNow } from "date-fns";
import { VideoThumbnail } from "./video-thumbnail";
import { THUMBNAIL_FALLBACK } from "../../constants";

interface VideoCardProps {
  id: string;
  title: string;
  description?: string | null;
  thumbnailUrl?: string | null;
  previewUrl?: string | null;
  duration: number;
  userName?: string;
  userUsername?: string | null;
  userImageUrl?: string;
  createdAt: Date;
}

export const VideoCard = ({
  id,
  title,
  description,
  thumbnailUrl,
  previewUrl,
  duration,
  userName,
  userUsername,
  userImageUrl,
  createdAt,
}: VideoCardProps) => {
  return (
    <div className="flex flex-col gap-3">
      {/* Thumbnail */}
      <Link href={`/video/${id}`} className="group">
        <div className="relative w-full">
          <VideoThumbnail
            imageUrl={thumbnailUrl}
            previewUrl={previewUrl}
            title={title}
            duration={duration}
          />
        </div>
      </Link>

      {/* Video Info */}
      <div className="flex gap-3">
        {/* Avatar - Solo mostrar si se proporciona */}
        {userImageUrl && userUsername ? (
          <Link href={`/channel/${userUsername}`} className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 hover:opacity-80 transition-opacity">
            <Image
              src={userImageUrl}
              alt={userName || "Usuario"}
              fill
              className="object-cover cursor-pointer"
            />
          </Link>
        ) : userImageUrl ? (
          <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0">
            <Image
              src={userImageUrl}
              alt={userName || "Usuario"}
              fill
              className="object-cover"
            />
          </div>
        ) : null}

        {/* Title and metadata */}
        <div className="flex-1 min-w-0">
          <Link href={`/video/${id}`} className="group">
            <h3 className="font-semibold line-clamp-2 group-hover:text-blue-600 transition-colors">
              {title}
            </h3>
          </Link>
          {userName && userUsername ? (
            <Link href={`/channel/${userUsername}`} className="hover:opacity-80 transition-opacity">
              <p className="text-sm text-muted-foreground line-clamp-1 mt-1 cursor-pointer">
                {userName}
              </p>
            </Link>
          ) : userName ? (
            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
              {userName}
            </p>
          ) : null}
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <span>{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

