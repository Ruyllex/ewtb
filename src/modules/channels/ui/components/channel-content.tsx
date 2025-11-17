"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChannelVideos } from "./channel-videos";
import { ChannelLiveStreams } from "./channel-live-streams";
import { RadioIcon, VideoIcon } from "lucide-react";

interface ChannelContentProps {
  username: string;
  channelId: string;
}

export const ChannelContent = ({ username, channelId }: ChannelContentProps) => {
  const [activeTab, setActiveTab] = useState<string>("videos");
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return (
      <div className="px-8 pb-8">
        <div className="w-full">
          <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground">
            <div className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium">
              <VideoIcon className="h-4 w-4 mr-2" />
              Videos
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 pb-8">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <VideoIcon className="h-4 w-4" />
            Videos
          </TabsTrigger>
          <TabsTrigger value="live" className="flex items-center gap-2">
            <RadioIcon className="h-4 w-4" />
            En Vivo
          </TabsTrigger>
        </TabsList>

        <TabsContent value="videos" className="mt-6">
          <ChannelVideos username={username} />
        </TabsContent>

        <TabsContent value="live" className="mt-6">
          <ChannelLiveStreams username={username} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

