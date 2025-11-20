"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { PayPalCheckoutButton } from "./paypal-checkout-button";

interface PayPalCheckoutButtonProps {
  orderId?: string;
  approvalUrl?: string;
  successUrl?: string;
  cancelUrl?: string;
  className?: string;
  amount?: number;
}

// Mantener el nombre del componente para compatibilidad, pero usar PayPal
export function StripeCheckoutButton({
  orderId,
  approvalUrl,
  successUrl,
  cancelUrl,
  className,
  amount,
}: PayPalCheckoutButtonProps) {
  return (
    <PayPalCheckoutButton
      orderId={orderId}
      approvalUrl={approvalUrl}
      successUrl={successUrl}
      cancelUrl={cancelUrl}
      className={className}
      amount={amount}
    />
  );
}

