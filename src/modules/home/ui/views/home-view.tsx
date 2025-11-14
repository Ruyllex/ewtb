import { StripeCheckoutButton } from "@/components/stripe-checkout-button";
import { CategoriesSection } from "../sections/categories-section";

export const dynamic = "force-dynamic";

interface HomeViewProps {
  categoryId?: string;
}

export const HomeView = ({ categoryId }: HomeViewProps) => {
  return (
    <div className="max-w-[2400px] mx-auto mb-10 px-4 pt-2.5 flex flex-col gap-y-6">
      {/* Botón de prueba de Stripe */}
      <div className="flex justify-center">
        <StripeCheckoutButton />
      </div>
      <CategoriesSection categoryId={categoryId} />
    </div>
  );
};
