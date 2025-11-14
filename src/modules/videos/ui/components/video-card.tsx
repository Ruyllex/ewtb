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
  userName: string;
  userImageUrl: string;
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
  userImageUrl,
  createdAt,
}: VideoCardProps) => {
  return (
    <Link href={`/video/${id}`} className="group">
      <div className="flex flex-col gap-3">
        {/* Thumbnail */}
        <div className="relative w-full">
          <VideoThumbnail
            imageUrl={thumbnailUrl}
            previewUrl={previewUrl}
            title={title}
            duration={duration}
          />
        </div>

        {/* Video Info */}
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0">
            <Image
              src={userImageUrl}
              alt={userName}
              fill
              className="object-cover"
            />
          </div>

          {/* Title and metadata */}
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold line-clamp-2 group-hover:text-blue-600 transition-colors">
              {title}
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
              {userName}
            </p>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <span>{formatDistanceToNow(new Date(createdAt), { addSuffix: true })}</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

