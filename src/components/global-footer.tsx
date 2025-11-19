import Link from "next/link";

/**
 * Footer global de la aplicación
 * Incluye enlaces a términos de servicio y política de privacidad
 */
export const GlobalFooter = () => {
  return (
    <footer className="border-t bg-background mt-auto">
      <div className="max-w-[2400px] mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} NewTube. Todos los derechos reservados.
          </div>
          <div className="flex gap-6 text-sm">
            <Link
              href="/terms"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Términos de Servicio
            </Link>
            <Link
              href="/privacy"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Política de Privacidad
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

