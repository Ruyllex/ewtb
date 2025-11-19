import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Página de Términos de Servicio
 * Contenido placeholder que debe ser reemplazado con los términos reales
 */
export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl">Términos de Servicio</CardTitle>
          <CardDescription>Última actualización: {new Date().toLocaleDateString("es-ES")}</CardDescription>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <div className="space-y-6">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Aceptación de los Términos</h2>
              <p className="text-muted-foreground">
                Al acceder y utilizar este servicio, usted acepta cumplir con estos términos de servicio.
                Si no está de acuerdo con alguna parte de estos términos, no debe utilizar el servicio.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Uso del Servicio</h2>
              <p className="text-muted-foreground mb-4">
                Usted se compromete a utilizar el servicio de manera responsable y de acuerdo con todas
                las leyes y regulaciones aplicables. Está prohibido:
              </p>
              <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
                <li>Subir contenido ilegal, difamatorio o que viole derechos de terceros</li>
                <li>Utilizar el servicio para actividades fraudulentas o maliciosas</li>
                <li>Intentar acceder a áreas restringidas del servicio</li>
                <li>Interferir con el funcionamiento normal del servicio</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Contenido del Usuario</h2>
              <p className="text-muted-foreground">
                Usted es responsable del contenido que publique en el servicio. Al publicar contenido,
                otorga a la plataforma una licencia no exclusiva para mostrar, distribuir y modificar
                dicho contenido dentro del servicio.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Propiedad Intelectual</h2>
              <p className="text-muted-foreground">
                Todo el contenido del servicio, incluyendo pero no limitado a texto, gráficos, logos,
                iconos, imágenes y software, es propiedad de la plataforma o sus proveedores de contenido
                y está protegido por leyes de propiedad intelectual.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Limitación de Responsabilidad</h2>
              <p className="text-muted-foreground">
                El servicio se proporciona "tal cual" sin garantías de ningún tipo. La plataforma no
                será responsable de ningún daño directo, indirecto, incidental o consecuente que resulte
                del uso o la imposibilidad de usar el servicio.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Modificaciones de los Términos</h2>
              <p className="text-muted-foreground">
                Nos reservamos el derecho de modificar estos términos en cualquier momento. Las
                modificaciones entrarán en vigor inmediatamente después de su publicación. El uso
                continuado del servicio después de las modificaciones constituye su aceptación de los
                nuevos términos.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Contacto</h2>
              <p className="text-muted-foreground">
                Si tiene preguntas sobre estos términos de servicio, por favor contáctenos a través
                de los canales de soporte disponibles en la plataforma.
              </p>
            </section>

            <div className="mt-8 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Nota:</strong> Este es un contenido placeholder. Por favor, reemplace este
                contenido con los términos de servicio reales de su plataforma, revisados por un
                abogado especializado.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

