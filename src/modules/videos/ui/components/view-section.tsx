"use client";

import { Eye } from "lucide-react";
import { ViewCounter } from "./view-counter";

interface ViewSectionProps {
  videoId: string;
}

export function ViewSection({ videoId }: ViewSectionProps) {
  return (
    <div className="flex items-center gap-1">
      <Eye className="w-4 h-4" />
      <ViewCounter videoId={videoId} />
    </div>
  );
}
