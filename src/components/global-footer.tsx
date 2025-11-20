import Link from "next/link";
import { Facebook, Twitter, Instagram, Youtube, Mail, HelpCircle } from "lucide-react";

/**
 * Footer global de la aplicación
 * Incluye redes sociales, soporte y enlaces legales
 */
export const GlobalFooter = () => {
  return (
    <footer className="border-t border-white/20 bg-transparent mt-auto">
      <div className="max-w-[2400px] mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-6">
          {/* Redes Sociales */}
          <div>
            <h3 className="text-white font-semibold mb-4">Síguenos</h3>
            <div className="flex gap-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/5 hover:bg-[#5ADBFD]/20 border border-white/20 hover:border-[#5ADBFD] transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5 text-white hover:text-[#5ADBFD] transition-colors" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/5 hover:bg-[#5ADBFD]/20 border border-white/20 hover:border-[#5ADBFD] transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5 text-white hover:text-[#5ADBFD] transition-colors" />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/5 hover:bg-[#5ADBFD]/20 border border-white/20 hover:border-[#5ADBFD] transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5 text-white hover:text-[#5ADBFD] transition-colors" />
              </a>
              <a
                href="https://youtube.com"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/5 hover:bg-[#5ADBFD]/20 border border-white/20 hover:border-[#5ADBFD] transition-colors"
                aria-label="YouTube"
              >
                <Youtube className="h-5 w-5 text-white hover:text-[#5ADBFD] transition-colors" />
              </a>
            </div>
          </div>

          {/* Soporte */}
          <div>
            <h3 className="text-white font-semibold mb-4">Soporte</h3>
            <div className="flex flex-col gap-2">
              <a
                href="mailto:soporte@facugoplus.com"
                className="flex items-center gap-2 text-white/70 hover:text-[#5ADBFD] transition-colors text-sm"
              >
                <Mail className="h-4 w-4" />
                soporte@facugoplus.com
              </a>
              <Link
                href="/about"
                className="flex items-center gap-2 text-white/70 hover:text-[#5ADBFD] transition-colors text-sm"
              >
                <HelpCircle className="h-4 w-4" />
                Acerca de
              </Link>
            </div>
          </div>

          {/* Legales */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <div className="flex flex-col gap-2">
              <Link
                href="/terms"
                className="text-white/70 hover:text-[#5ADBFD] transition-colors text-sm"
              >
                Términos de Servicio
              </Link>
              <Link
                href="/privacy"
                className="text-white/70 hover:text-[#5ADBFD] transition-colors text-sm"
              >
                Política de Privacidad
              </Link>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-white/20 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="text-sm text-white/70">
              © {new Date().getFullYear()} FacuGo! Plus. Todos los derechos reservados.
            </div>
            <div className="text-sm text-white/70">
              Plataforma libre para creadores
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

