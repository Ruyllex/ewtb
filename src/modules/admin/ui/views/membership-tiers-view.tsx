"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2Icon, SaveIcon } from "lucide-react";
import { toast } from "sonner";

// Mock data until TRPC is ready
const MOCK_TIERS = [
    { id: "1", level: 1, name: "Nivel 1", price: 1.99 },
    { id: "2", level: 2, name: "Nivel 2", price: 4.99 },
    { id: "3", level: 3, name: "Nivel 3", price: 9.99 },
];

export const MembershipTiersView = () => {
    const [tiers, setTiers] = useState(MOCK_TIERS);
    const [isSaving, setIsSaving] = useState(false);

    const handlePriceChange = (id: string, price: string) => {
        setTiers((prev) =>
            prev.map((tier) => (tier.id === id ? { ...tier, price: parseFloat(price) } : tier))
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsSaving(false);
        toast.success("Precios actualizados exitosamente");
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Niveles de Membresía</h1>
                <p className="text-muted-foreground">Gestiona los precios base de los niveles de membresía</p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {tiers.map((tier) => (
                    <Card key={tier.id}>
                        <CardHeader>
                            <CardTitle>{tier.name}</CardTitle>
                            <CardDescription>Nivel {tier.level}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor={`price-${tier.id}`}>Precio (USD)</Label>
                                <Input
                                    id={`price-${tier.id}`}
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={tier.price}
                                    onChange={(e) => handlePriceChange(tier.id, e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2Icon className="size-4 mr-2 animate-spin" /> : <SaveIcon className="size-4 mr-2" />}
                    Guardar Cambios
                </Button>
            </div>
        </div>
    );
};
