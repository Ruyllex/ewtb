"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2Icon, SaveIcon, PlusIcon, TrashIcon, UploadIcon } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";

// Mock data until TRPC is ready
const MOCK_OFFERS = [
    { id: "1", level: 1, name: "Nivel 1", price: 1.99, benefits: ["Acceso a emojis", "Insignia de fan"], imageUrl: null },
    { id: "2", level: 2, name: "Nivel 2", price: 4.99, benefits: ["Todo lo anterior", "Videos exclusivos"], imageUrl: null },
    { id: "3", level: 3, name: "Nivel 3", price: 9.99, benefits: ["Todo lo anterior", "Chat privado"], imageUrl: null },
];

export const MembershipSettingsView = () => {
    const [offers, setOffers] = useState(MOCK_OFFERS);
    const [isSaving, setIsSaving] = useState(false);

    const handleBenefitChange = (levelId: string, index: number, value: string) => {
        setOffers((prev) =>
            prev.map((offer) => {
                if (offer.id === levelId) {
                    const newBenefits = [...offer.benefits];
                    newBenefits[index] = value;
                    return { ...offer, benefits: newBenefits };
                }
                return offer;
            })
        );
    };

    const addBenefit = (levelId: string) => {
        setOffers((prev) =>
            prev.map((offer) =>
                offer.id === levelId ? { ...offer, benefits: [...offer.benefits, ""] } : offer
            )
        );
    };

    const removeBenefit = (levelId: string, index: number) => {
        setOffers((prev) =>
            prev.map((offer) => {
                if (offer.id === levelId) {
                    const newBenefits = offer.benefits.filter((_, i) => i !== index);
                    return { ...offer, benefits: newBenefits };
                }
                return offer;
            })
        );
    };

    const handleSave = async () => {
        setIsSaving(true);
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 1000));
        setIsSaving(false);
        toast.success("Configuración de membresías guardada");
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Membresías del Canal</h1>
                <p className="text-muted-foreground">Configura los beneficios para tus suscriptores</p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {offers.map((offer) => (
                    <Card key={offer.id} className="flex flex-col">
                        <CardHeader>
                            <div className="flex justify-between items-start">
                                <div>
                                    <CardTitle>{offer.name}</CardTitle>
                                    <CardDescription>Precio fijo: ${offer.price}/mes</CardDescription>
                                </div>
                                <div className="relative size-12 bg-muted rounded-full overflow-hidden border border-border">
                                    {offer.imageUrl ? (
                                        <Image src={offer.imageUrl} alt="Badge" fill className="object-cover" />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                                            Badge
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 flex-1">
                            <div className="space-y-2">
                                <Label>Imagen / Insignia</Label>
                                <Button variant="outline" size="sm" className="w-full">
                                    <UploadIcon className="size-4 mr-2" />
                                    Subir Imagen
                                </Button>
                            </div>

                            <div className="space-y-2">
                                <Label>Beneficios</Label>
                                <div className="space-y-2">
                                    {offer.benefits.map((benefit, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                value={benefit}
                                                onChange={(e) => handleBenefitChange(offer.id, index, e.target.value)}
                                                placeholder="Describe un beneficio..."
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeBenefit(offer.id, index)}
                                                className="shrink-0 text-muted-foreground hover:text-destructive"
                                            >
                                                <TrashIcon className="size-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button variant="outline" size="sm" onClick={() => addBenefit(offer.id)} className="w-full">
                                        <PlusIcon className="size-4 mr-2" />
                                        Agregar Beneficio
                                    </Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? <Loader2Icon className="size-4 mr-2 animate-spin" /> : <SaveIcon className="size-4 mr-2" />}
                    Guardar Configuración
                </Button>
            </div>
        </div>
    );
};
