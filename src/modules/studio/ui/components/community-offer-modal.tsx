"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api } from "@/trpc/client";
import { PlusCircle, Trash2 } from "lucide-react";

interface CommunityOfferModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  level: number;
  initialBenefits?: string[];
  initialPrice?: number;
  initialTitle?: string | null;
  initialDescription?: string | null;
}

export function CommunityOfferModal({ open, onOpenChange, level, initialBenefits = [], initialPrice, initialTitle, initialDescription }: CommunityOfferModalProps) {
  // const { toast } = useToast(); // Removed
  const utils = api.useUtils();
  const [prices, setPrices] = useState<string[]>([]); // Wait, I need to check variable names
  const [loading, setLoading] = useState(false);
  const [benefits, setBenefits] = useState<string[]>(initialBenefits);
  const [price, setPrice] = useState<string>(initialPrice?.toString() || "");
  const [title, setTitle] = useState<string>(initialTitle || "");
  const [description, setDescription] = useState<string>(initialDescription || "");

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setBenefits(initialBenefits.length > 0 ? initialBenefits : [""]);
      setPrice(initialPrice?.toString() || "");
      setTitle(initialTitle || "");
      setDescription(initialDescription || "");
    }
  }, [open, initialBenefits, initialPrice, initialTitle, initialDescription]);

  const upsertOffer = api.memberships.upsertOffer.useMutation({
    onSuccess: () => {
      toast.success("Membership offer updated successfully");
      utils.memberships.getOffers.invalidate();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(error.message || "Error updating offer");
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await upsertOffer.mutateAsync({
        level,
        benefits: benefits.filter(b => b.trim() !== ""),
        price: price ? parseFloat(price) : undefined,
        title: title || undefined,
        description: description || undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddBenefit = () => {
    setBenefits([...benefits, ""]);
  };

  const handleBenefitChange = (index: number, value: string) => {
    const newBenefits = [...benefits];
    newBenefits[index] = value;
    setBenefits(newBenefits);
  };

  const handleRemoveBenefit = (index: number) => {
    const newBenefits = [...benefits];
    newBenefits.splice(index, 1);
    setBenefits(newBenefits);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Configure Level {level} Membership</DialogTitle>
            <DialogDescription>
              Set the benefits and price for subscribers joining at this level.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title (Optional)</Label>
              <Input
                id="title"
                placeholder={`e.g. "Squad Member" (Default: Level ${level} Name)`}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Give this tier a custom name.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description / Message</Label>
              <Textarea
                id="description"
                placeholder="Welcome to the community! Here you'll get..."
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                A short message describing what members get at this level.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Monthly Price (USD)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                placeholder="Leave empty to use system default"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Override the default tier price if allowed.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Benefits</Label>
                <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs"
                    onClick={handleAddBenefit}
                >
                    <PlusCircle className="mr-2 h-3.5 w-3.5" />
                    Add Benefit
                </Button>
              </div>
              
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={benefit}
                      onChange={(e) => handleBenefitChange(index, e.target.value)}
                      placeholder={`Benefit #${index + 1}`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveBenefit(index)}
                      disabled={benefits.length === 1 && benefits[0] === ""}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || upsertOffer.isPending}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
