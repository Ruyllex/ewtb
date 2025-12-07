"use client";

import { api } from "@/trpc/client";
import { Loader2, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function StudioCommunityView() {
  const [level] = useState(1); // Default to Level 1 for now
  const utils = api.useUtils();
  
  const [offersQuery] = api.useSuspenseQueries((t) => [
    t.memberships.getMyOffers(undefined),
  ]);

  const offers = offersQuery.data || [];
  const currentOffer = offers.find(o => o.level === level);

  const [price, setPrice] = useState<string>("");
  const [videoUrl, setVideoUrl] = useState<string>("");
  const [benefits, setBenefits] = useState<string>("");

  useEffect(() => {
    if (currentOffer) {
      setPrice(currentOffer.price?.toString() || "");
      setVideoUrl(currentOffer.videoUrl || "");
      setBenefits(currentOffer.benefits?.join("\n") || "");
    }
  }, [currentOffer]);

  const upsertOffer = api.memberships.upsertOffer.useMutation({
    onSuccess: () => {
      toast.success("Membership settings saved successfully");
      utils.memberships.getMyOffers.invalidate();
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const handleSave = () => {
    upsertOffer.mutate({
      level,
      price: parseFloat(price) || 0,
      videoUrl,
      benefits: benefits.split("\n").filter(line => line.trim() !== ""),
      title: currentOffer?.title || undefined, // Keep existing title if any
      description: currentOffer?.description || undefined, // Keep existing description if any
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Community & Memberships</h1>
        <p className="text-muted-foreground">
          Manage your channel membership offer and perks.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Membership Details</CardTitle>
          <CardDescription>
            Set the price and content for your channel members.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="price">Monthly Price ($ USD)</Label>
            <Input 
              id="price" 
              type="number" 
              min="0" 
              step="0.01"
              value={price} 
              onChange={(e) => setPrice(e.target.value)} 
              placeholder="e.g. 5.00"
            />
            <p className="text-sm text-muted-foreground">The amount users will pay monthly to join your channel.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="videoUrl">Welcome Video URL</Label>
            <Input 
              id="videoUrl" 
              type="url" 
              value={videoUrl} 
              onChange={(e) => setVideoUrl(e.target.value)} 
              placeholder="https://..."
            />
            <p className="text-sm text-muted-foreground">A direct link to a video shown in the membership modal.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="benefits">Benefits (Perks)</Label>
            <Textarea 
              id="benefits" 
              value={benefits} 
              onChange={(e) => setBenefits(e.target.value)} 
              placeholder="Early access to videos&#10;Exclusive discord role&#10;Member-only streams"
              className="min-h-[150px]"
            />
            <p className="text-sm text-muted-foreground">List the benefits members get, one per line.</p>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button onClick={handleSave} disabled={upsertOffer.isPending}>
            {upsertOffer.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
