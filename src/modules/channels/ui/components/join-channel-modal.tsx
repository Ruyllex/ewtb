"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/trpc/client";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface JoinChannelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channelId: string; // This is the user_id of the creator
  channelName: string;
  channelAvatar?: string | null;
}

export function JoinChannelModal({ open, onOpenChange, channelId, channelName, channelAvatar }: JoinChannelModalProps) {
  const utils = api.useUtils();
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  
  const offersQuery = api.memberships.getOffers.useQuery({ channelId }, { enabled: open });
  const tiersQuery = api.memberships.getTiers.useQuery(undefined, { enabled: open });
  
  const joinMutation = api.memberships.join.useMutation({
    onSuccess: (data: any) => {
      if (data?.url) {
        toast.loading("Redirecting to PayPal...");
        window.location.href = data.url;
      } else {
        toast.error("Failed to get payment link");
      }
    },
    onError: (error) => {
      toast.error("Error joining", {
        description: error.message,
      });
    }
  });

  const tiers = tiersQuery.data || [];
  const offers = offersQuery.data || [];
  
  // Filter only tiers that have active offers from the creator
  const availableTiers = tiers.filter(tier => offers.some(o => o.level === tier.level));
  
  // Select the highest level available or specifically Level 1 if available
  const activeOffer = offers.find(o => o.level === (selectedLevel || availableTiers[0]?.level));
  
  const handleJoin = () => {
    if (!activeOffer) return;
    joinMutation.mutate({ channelId, level: activeOffer.level });
  };

  const isLoading = offersQuery.isLoading || tiersQuery.isLoading;

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] p-0 overflow-hidden bg-[#0f0f0f] text-white border-0 shadow-2xl">
        <div className="absolute right-4 top-4 z-50">
           <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="rounded-full hover:bg-white/10 text-white">
              <X className="h-6 w-6" />
           </Button>
        </div>

        {/* Header / Banner Area */}
        <div className="relative w-full aspect-video bg-black flex items-center justify-center">
            {activeOffer?.videoUrl ? (
                <iframe 
                    src={activeOffer.videoUrl.replace("watch?v=", "embed/")} 
                    className="w-full h-full" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                />
            ) : (
                <div className="w-full h-full bg-gradient-to-b from-gray-800 to-[#0f0f0f] flex items-center justify-center">
                    <Avatar className="h-24 w-24 border-4 border-[#0f0f0f]">
                        <AvatarImage src={channelAvatar || undefined} />
                        <AvatarFallback className="text-black bg-white text-2xl font-bold">{channelName.substring(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                </div>
            )}
        </div>

        <div className="p-8 pb-10">
            {isLoading ? (
                 <div className="flex h-40 items-center justify-center">
                    <Loader2 className="h-10 w-10 animate-spin text-white/50" />
                 </div>
            ) : availableTiers.length === 0 ? (
                <div className="text-center py-10">
                    <h3 className="text-xl font-medium">Memberships not available</h3>
                    <p className="text-white/60 mt-2">This channel hasn't activated memberships yet.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-[1fr_300px] gap-12">
                     {/* Left Column: Channel Info & Join CTA */}
                    <div className="space-y-6">
                        <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12 border-2 border-white/10 hidden md:block">
                                <AvatarImage src={channelAvatar || undefined} />
                                <AvatarFallback className="text-black">{channelName.substring(0,2).toUpperCase()}</AvatarFallback>
                            </Avatar>
                            <div>
                                <h2 className="text-xl font-bold">{channelName}</h2>
                                <h1 className="text-3xl font-bold mt-1">Join this channel</h1>
                                <p className="text-white/70 text-sm mt-1">Get access to exclusive perks.</p>
                            </div>
                        </div>

                        {activeOffer && (
                            <div className="bg-white/5 rounded-xl p-6 border border-white/10 mt-6">
                                <div className="flex justify-between items-start mb-4">
                                     <div>
                                        <h3 className="font-bold text-lg text-white">{activeOffer.title || `Level ${activeOffer.level}`} Member</h3>
                                        <p className="text-2xl font-bold mt-1 text-blue-400">
                                            ${activeOffer.price}/mo
                                        </p>
                                     </div>
                                </div>
                                <Button 
                                    onClick={handleJoin} 
                                    className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium text-lg h-12 rounded-full"
                                    disabled={joinMutation.isPending}
                                >
                                    {joinMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Processing...
                                        </>
                                    ) : "Join"}
                                </Button>
                                <p className="text-xs text-white/40 text-center mt-3">
                                    Recurring payment. Cancel anytime.
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Benefits List */}
                    <div className="space-y-6 border-l border-white/10 pl-8 md:pl-12">
                        <div>
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                Membership Perks
                            </h3>
                            <ul className="space-y-6">
                                {activeOffer?.benefits?.map((benefit, i) => (
                                    <li key={i} className="flex gap-4">
                                         {/* Placeholder for custom badge/icon per perk if we had them */}
                                        <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center shrink-0">
                                            <span className="text-lg">✨</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm text-white/90">{benefit}</p>
                                            <p className="text-xs text-white/50 mt-1">Included with membership</p>
                                        </div>
                                    </li>
                                ))}
                                {(!activeOffer?.benefits || activeOffer.benefits.length === 0) && (
                                     <li className="text-white/50 italic">Standard channel support perks.</li>
                                )}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
