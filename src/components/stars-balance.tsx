"use client";

import { api } from "@/trpc/client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2Icon } from "lucide-react";
import { StarsPurchaseModal } from "@/modules/monetization/ui/components/stars-purchase-modal";

export const StarsBalance = () => {
  const [mounted, setMounted] = useState(false);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: starsBalance, isLoading, refetch } = api.monetization.getStarsBalance.useQuery(
    undefined,
    {
      enabled: mounted,
      refetchInterval: 30000, // Refrescar cada 30 segundos
    }
  );

  if (!mounted) {
    return null;
  }

  const stars = Math.floor(starsBalance?.stars || 0);
  const usdValue = (stars / 100).toFixed(2);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowPurchaseModal(true)}
        className="gap-2 border-[#5ADBFD] text-[#5ADBFD] hover:bg-[#5ADBFD] hover:text-black transition-colors"
      >
        {isLoading ? (
          <Loader2Icon className="h-4 w-4 animate-spin" />
        ) : (
          <>
            <Sparkles className="h-4 w-4" />
            <span className="font-semibold">{stars.toLocaleString()}</span>
            <span className="text-xs opacity-70 hidden md:inline">Stars</span>
          </>
        )}
      </Button>

      <StarsPurchaseModal
        open={showPurchaseModal}
        onOpenChange={setShowPurchaseModal}
        onSuccess={() => {
          refetch();
        }}
      />
    </>
  );
};

