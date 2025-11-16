"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChannelVideos } from "./channel-videos";
import { ChannelLiveStreams } from "./channel-live-streams";
import { RadioIcon, VideoIcon } from "lucide-react";

interface ChannelContentProps {
  username: string;
  channelId: string;
}

export const ChannelContent = ({ username, channelId }: ChannelContentProps) => {
  return (
    <div className="px-8 pb-8">
      <Tabs defaultValue="videos" className="w-full">
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

