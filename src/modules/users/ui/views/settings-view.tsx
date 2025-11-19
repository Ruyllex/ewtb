"use client";

import { api } from "@/trpc/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2Icon, SaveIcon, CalendarIcon, UserIcon, ImageIcon, Image as ImageIcon2 } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale/es";
import { UploadButton } from "@/lib/uploadthing";
import Image from "next/image";
import { THUMBNAIL_FALLBACK } from "@/modules/videos/constants";

export const SettingsView = () => {
  const queryClient = useQueryClient();
  const { data: profile, isLoading } = api.users.getProfile.useQuery();
  const { data: channel, isLoading: isLoadingChannel } = api.channels.getMyChannel.useQuery();
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [username, setUsername] = useState("");
  const [isUpdatingAvatar, setIsUpdatingAvatar] = useState(false);
  const [isUpdatingBanner, setIsUpdatingBanner] = useState(false);

  // Inicializar el campo de fecha de nacimiento cuando se carga el perfil
  useEffect(() => {
    if (profile?.dateOfBirth) {
      // Convertir la fecha a formato dd/mm/aaaa
      const date = new Date(profile.dateOfBirth);
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = date.getFullYear();
      setDateOfBirth(`${day}/${month}/${year}`);
    }
  }, [profile]);

  // Inicializar el campo de username cuando se carga el canal
  useEffect(() => {
    if (channel?.username) {
      setUsername(channel.username);
    }
  }, [channel]);

  const updateDateOfBirthMutation = api.users.updateDateOfBirth.useMutation({
    onSuccess: (data) => {
      toast.success("Fecha de nacimiento actualizada correctamente");
      queryClient.invalidateQueries();
      // También invalidar la verificación de monetización ya que la fecha de nacimiento afecta
      queryClient.invalidateQueries();
      queryClient.invalidateQueries();

      // Si ahora puede monetizar, mostrar mensaje adicional
      if (data.canMonetize) {
        setTimeout(() => {
          toast.success("¡Monetización habilitada! Ahora puedes recibir pagos.");
        }, 500);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar la fecha de nacimiento");
    },
  });

  const updateChannelMutation = api.channels.update.useMutation({
    onSuccess: (data) => {
      toast.success("Canal actualizado correctamente");
      // Invalidar todas las queries relacionadas con el canal
      queryClient.invalidateQueries({ queryKey: api.channels.getMyChannel.queryKey() });
      queryClient.invalidateQueries({ queryKey: api.channels.getByUsername.queryKey() });
      // Si se actualizó el username, también invalidar las queries de usuario
      if (data) {
        queryClient.invalidateQueries({ queryKey: api.users.getProfile.queryKey() });
      }
    },
    onError: (error) => {
      toast.error(error.message || "Error al actualizar el canal");
    },
  });

  const handleUpdateUsername = () => {
    if (!username || username.trim() === "") {
      toast.error("El username no puede estar vacío");
      return;
    }

    // Validar formato del username (solo letras minúsculas, números y guiones bajos)
    const usernameRegex = /^[a-z0-9_]+$/;
    if (!usernameRegex.test(username)) {
      toast.error("El username solo puede contener letras minúsculas, números y guiones bajos");
      return;
    }

    if (username.length < 3 || username.length > 30) {
      toast.error("El username debe tener entre 3 y 30 caracteres");
      return;
    }

    updateChannelMutation.mutate({ username: username.trim() });
  };

  const handleDateChange = (value: string) => {
    // Permitir solo números y barras
    const cleaned = value.replace(/[^\d/]/g, "");
    
    // Limitar la longitud
    if (cleaned.length > 10) return;
    
    // Formatear automáticamente con barras
    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned[2] !== "/") {
      formatted = cleaned.slice(0, 2) + "/" + cleaned.slice(2);
    }
    if (cleaned.length > 5 && cleaned[5] !== "/") {
      formatted = cleaned.slice(0, 5) + "/" + cleaned.slice(5);
    }
    
    setDateOfBirth(formatted);
  };

  const handleSave = () => {
    if (!dateOfBirth) {
      toast.error("Por favor, ingresa una fecha de nacimiento");
      return;
    }

    // Validar formato dd/mm/aaaa
    const dateRegex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const match = dateOfBirth.match(dateRegex);
    
    if (!match) {
      toast.error("Formato de fecha inválido. Usa dd/mm/aaaa");
      return;
    }

    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);

    // Validar rangos
    if (day < 1 || day > 31) {
      toast.error("El día debe estar entre 1 y 31");
      return;
    }
    if (month < 1 || month > 12) {
      toast.error("El mes debe estar entre 1 y 12");
      return;
    }
    if (year < 1900 || year > new Date().getFullYear()) {
      toast.error("El año no es válido");
      return;
    }

    // Crear fecha usando el constructor que evita problemas de zona horaria
    // new Date(year, monthIndex, day) crea la fecha en la zona horaria local
    const date = new Date(year, month - 1, day);
    
    // Verificar que la fecha es válida (ej: 31/02/2001 no es válida)
    if (date.getDate() !== day || date.getMonth() !== month - 1 || date.getFullYear() !== year) {
      toast.error("La fecha ingresada no es válida");
      return;
    }

    updateDateOfBirthMutation.mutate({ dateOfBirth: date });
  };

  if (isLoading || isLoadingChannel) {
    return (
      <div className="px-4 py-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4" />
          <div className="h-64 bg-gray-200 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Configuración del Perfil</h1>
        <p className="text-muted-foreground mt-1">Gestiona tu información personal y preferencias</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="size-5" />
            Información Personal
          </CardTitle>
          <CardDescription>Actualiza tu información personal, incluyendo tu fecha de nacimiento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input id="name" value={profile?.name || ""} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">
              El nombre se actualiza automáticamente desde tu cuenta de Clerk
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="dateOfBirth">Fecha de Nacimiento</Label>
            <Input
              id="dateOfBirth"
              type="text"
              value={dateOfBirth}
              onChange={(e) => handleDateChange(e.target.value)}
              placeholder="dd/mm/aaaa"
              maxLength={10}
              className="max-w-xs"
            />
            <p className="text-xs text-muted-foreground">
              {profile?.dateOfBirth
                ? `Fecha actual: ${format(new Date(profile.dateOfBirth), "dd 'de' MMMM 'de' yyyy", { locale: es })}`
                : "Debes tener al menos 18 años para usar esta plataforma. Formato: dd/mm/aaaa"}
            </p>
            {profile?.dateOfBirth && (
              <p className="text-xs text-muted-foreground">
                Esta información es necesaria para habilitar la monetización
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={updateDateOfBirthMutation.isPending || !dateOfBirth || dateOfBirth === (profile?.dateOfBirth ? (() => {
                const d = new Date(profile.dateOfBirth);
                const day = String(d.getDate()).padStart(2, "0");
                const month = String(d.getMonth() + 1).padStart(2, "0");
                const year = d.getFullYear();
                return `${day}/${month}/${year}`;
              })() : "")}
            >
              {updateDateOfBirthMutation.isPending ? (
                <>
                  <Loader2Icon className="size-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <SaveIcon className="size-4 mr-2" />
                  Guardar Cambios
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Configuración del Canal */}
      {channel && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="size-5" />
              Configuración del Canal
            </CardTitle>
            <CardDescription>
              Personaliza tu canal: cambia tu avatar, banner y nombre de usuario
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Banner */}
            <div className="space-y-2">
              <Label>Banner del Canal</Label>
              <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted border">
                {channel.banner ? (
                  <Image
                    src={channel.banner}
                    alt="Banner del canal"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <ImageIcon2 className="size-12" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <UploadButton
                    endpoint="channelBannerUploader"
                    onUploadBegin={() => {
                      setIsUpdatingBanner(true);
                    }}
                    onClientUploadComplete={(res) => {
                      setIsUpdatingBanner(false);
                      toast.success("Banner actualizado correctamente");
                      // Esperar un poco antes de invalidar para asegurar que el servidor haya procesado
                      setTimeout(() => {
                        queryClient.invalidateQueries({ queryKey: api.channels.getMyChannel.queryKey() });
                        queryClient.invalidateQueries({ queryKey: api.channels.getByUsername.queryKey() });
                      }, 500);
                    }}
                    onUploadError={(error) => {
                      setIsUpdatingBanner(false);
                      const errorMessage = error?.message || error?.toString() || "Error desconocido";
                      toast.error(`Error al subir el banner: ${errorMessage}`);
                      console.error("Upload error:", error);
                    }}
                  />
                </div>
                {isUpdatingBanner && (
                  <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                    <Loader2Icon className="size-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Recomendado: 1920x1080px. Tamaño máximo: 8MB
              </p>
            </div>

            {/* Avatar */}
            <div className="space-y-2">
              <Label>Avatar del Canal</Label>
              <div className="flex items-center gap-4">
                <div className="relative w-24 h-24 rounded-full overflow-hidden bg-muted border-2 shrink-0">
                  {channel.avatar ? (
                    <Image
                      src={channel.avatar}
                      alt="Avatar del canal"
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <UserIcon className="size-8" />
                    </div>
                  )}
                  {isUpdatingAvatar && (
                    <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                      <Loader2Icon className="size-6 text-white animate-spin" />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <UploadButton
                    endpoint="channelAvatarUploader"
                    onUploadBegin={() => {
                      setIsUpdatingAvatar(true);
                    }}
                    onClientUploadComplete={(res) => {
                      setIsUpdatingAvatar(false);
                      toast.success("Avatar actualizado correctamente");
                      // Esperar un poco antes de invalidar para asegurar que el servidor haya procesado
                      setTimeout(() => {
                        queryClient.invalidateQueries({ queryKey: api.channels.getMyChannel.queryKey() });
                        queryClient.invalidateQueries({ queryKey: api.channels.getByUsername.queryKey() });
                      }, 500);
                    }}
                    onUploadError={(error) => {
                      setIsUpdatingAvatar(false);
                      const errorMessage = error?.message || error?.toString() || "Error desconocido";
                      toast.error(`Error al subir el avatar: ${errorMessage}`);
                      console.error("Upload error:", error);
                    }}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Recomendado: 512x512px. Tamaño máximo: 4MB
                  </p>
                </div>
              </div>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <Label htmlFor="username">Nombre de Usuario</Label>
              <div className="flex gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">@</span>
                    <Input
                      id="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value.toLowerCase())}
                      placeholder="nombre-de-usuario"
                      maxLength={30}
                      className="font-mono"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Solo letras minúsculas, números y guiones bajos. Entre 3 y 30 caracteres.
                  </p>
                  {channel.username && (
                    <p className="text-xs text-muted-foreground mt-1">
                      URL actual: /channel/{channel.username}
                    </p>
                  )}
                </div>
                <Button
                  onClick={handleUpdateUsername}
                  disabled={updateChannelMutation.isPending || !username || username === channel?.username}
                >
                  {updateChannelMutation.isPending ? (
                    <>
                      <Loader2Icon className="size-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <SaveIcon className="size-4 mr-2" />
                      Guardar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {profile?.canMonetize && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-900">
          <CardHeader>
            <CardTitle>Estado de Monetización</CardTitle>
            <CardDescription>Tu cuenta está habilitada para monetizar</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-green-800 dark:text-green-200">
              ✅ Tu fecha de nacimiento está registrada y cumples con los requisitos de edad para monetizar.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

