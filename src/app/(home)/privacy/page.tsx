import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Página de Política de Privacidad
 * Contenido placeholder que debe ser reemplazado con la política real
 */
export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Política de Privacidad</CardTitle>
          <CardDescription>Última actualización: {new Date().toLocaleDateString("es-ES")}</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <div className="space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Información que Recopilamos</h2>
              <p className="text-muted-foreground mb-4">
                Recopilamos información que usted nos proporciona directamente, incluyendo:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Información de cuenta (nombre, email, nombre de usuario)</li>
                <li>Contenido que publique (videos, comentarios, etc.)</li>
                <li>Información de perfil y preferencias</li>
                <li>Información de pago (procesada de forma segura a través de proveedores de terceros)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Cómo Utilizamos su Información</h2>
              <p className="text-muted-foreground mb-4">
                Utilizamos la información recopilada para:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Proporcionar, mantener y mejorar nuestros servicios</li>
                <li>Procesar transacciones y enviar notificaciones relacionadas</li>
                <li>Personalizar su experiencia en la plataforma</li>
                <li>Enviar comunicaciones importantes sobre el servicio</li>
                <li>Detectar y prevenir actividades fraudulentas o abusivas</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Compartir Información</h2>
              <p className="text-muted-foreground">
                No vendemos su información personal. Podemos compartir información en las siguientes
                circunstancias:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4 mt-4">
                <li>Con su consentimiento explícito</li>
                <li>Con proveedores de servicios que nos ayudan a operar la plataforma</li>
                <li>Para cumplir con obligaciones legales o responder a solicitudes gubernamentales</li>
                <li>Para proteger nuestros derechos, privacidad, seguridad o propiedad</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Seguridad de los Datos</h2>
              <p className="text-muted-foreground">
                Implementamos medidas de seguridad técnicas y organizativas apropiadas para proteger
                su información personal contra acceso no autorizado, alteración, divulgación o destrucción.
                Sin embargo, ningún método de transmisión por Internet o almacenamiento electrónico es
                100% seguro.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Sus Derechos</h2>
              <p className="text-muted-foreground mb-4">
                Usted tiene derecho a:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Acceder a su información personal</li>
                <li>Corregir información inexacta o incompleta</li>
                <li>Solicitar la eliminación de su información personal</li>
                <li>Oponerse al procesamiento de su información personal</li>
                <li>Solicitar la portabilidad de sus datos</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Cookies y Tecnologías Similares</h2>
              <p className="text-muted-foreground">
                Utilizamos cookies y tecnologías similares para mejorar su experiencia, analizar el
                uso del servicio y personalizar el contenido. Puede configurar su navegador para
                rechazar cookies, pero esto puede afectar la funcionalidad del servicio.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Cambios a esta Política</h2>
              <p className="text-muted-foreground">
                Podemos actualizar esta política de privacidad ocasionalmente. Le notificaremos sobre
                cambios significativos publicando la nueva política en esta página y actualizando la
                fecha de "última actualización".
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Contacto</h2>
              <p className="text-muted-foreground">
                Si tiene preguntas sobre esta política de privacidad o sobre cómo manejamos su
                información personal, por favor contáctenos a través de los canales de soporte
                disponibles en la plataforma.
              </p>
            </section>

            <div className="mt-8 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Nota:</strong> Este es un contenido placeholder. Por favor, reemplace este
                contenido con la política de privacidad real de su plataforma, revisada por un
                abogado especializado y cumpliendo con las regulaciones aplicables (GDPR, CCPA, etc.).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

