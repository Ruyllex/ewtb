import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VideoIcon, RadioIcon, InfinityIcon } from "lucide-react";

/**
 * Página Acerca de / Para Creadores
 * Información sobre la plataforma para creadores
 */
export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          FacuGo! Plus
        </h1>
        <p className="text-xl md:text-2xl text-white/90 font-medium">
          Plataforma libre para creadores. Subí videos o transmití en vivo sin límites.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <Card className="bg-white/5 backdrop-blur-sm border-white/20">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 rounded-full bg-[#5ADBFD]/20">
                <VideoIcon className="h-8 w-8 text-[#5ADBFD]" />
              </div>
            </div>
            <CardTitle className="text-center text-white">Sube Videos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-white/70">
              Comparte tus videos sin restricciones. Sin límites de duración ni cantidad.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-sm border-white/20">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 rounded-full bg-[#5ADBFD]/20">
                <RadioIcon className="h-8 w-8 text-[#5ADBFD]" />
              </div>
            </div>
            <CardTitle className="text-center text-white">Transmite en Vivo</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-white/70">
              Conecta con tu audiencia en tiempo real. Transmisiones ilimitadas.
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-sm border-white/20">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 rounded-full bg-[#5ADBFD]/20">
                <InfinityIcon className="h-8 w-8 text-[#5ADBFD]" />
              </div>
            </div>
            <CardTitle className="text-center text-white">Sin Límites</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-white/70">
              Libertad total para crear. Sin restricciones, sin barreras.
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-white/5 backdrop-blur-sm border-white/20">
        <CardHeader>
          <CardTitle className="text-white text-2xl">Para Creadores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 text-white/80">
            <p>
              FacuGo! Plus es una plataforma diseñada para creadores que buscan libertad y flexibilidad.
              No imponemos límites en la duración de tus videos, la cantidad de contenido que puedes subir,
              o las horas que puedes transmitir en vivo.
            </p>
            <p>
              Nuestra misión es proporcionar un espacio donde los creadores puedan expresarse libremente,
              compartir su contenido y construir su audiencia sin restricciones artificiales.
            </p>
            <p className="text-[#5ADBFD] font-medium">
              Únete a nuestra comunidad de creadores y comienza a compartir tu contenido hoy mismo.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

