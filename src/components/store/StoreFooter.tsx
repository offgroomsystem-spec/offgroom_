import { Separator } from "@/components/ui/separator";
import { Instagram, Facebook, Linkedin, Youtube } from "lucide-react";
import logoOffgroom from "@/assets/logo-offgroom.png";

export const StoreFooter = () => {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 md:py-16">
      <div className="container max-w-7xl">
        {/* Grid 4 colunas */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {/* Coluna 1: Sobre */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">Sobre</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Quem somos
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Nossa história
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Carreiras
                </a>
              </li>
            </ul>
          </div>
          
          {/* Coluna 2: Produto */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">Produto</h3>
            <ul className="space-y-3">
              <li>
                <a href="#features" className="hover:text-white transition-colors">
                  Funcionalidades
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-white transition-colors">
                  Planos e preços
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Atualizações
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Demonstração
                </a>
              </li>
            </ul>
          </div>
          
          {/* Coluna 3: Suporte */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">Suporte</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Central de ajuda
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Contato
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  FAQ
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>
          
          {/* Coluna 4: Legal */}
          <div>
            <h3 className="text-white font-semibold text-lg mb-4">Legal</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Termos de uso
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Política de privacidade
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  LGPD
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors">
                  Cookies
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        {/* Separador */}
        <Separator className="bg-gray-800 mb-8" />
        
        {/* Bottom: Logo + Redes + Copyright */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src={logoOffgroom} alt="Offgroom" className="h-8" />
          </div>
          
          {/* Redes sociais */}
          <div className="flex gap-4">
            <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors">
              <Instagram className="h-5 w-5" />
            </a>
            <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors">
              <Facebook className="h-5 w-5" />
            </a>
            <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors">
              <Linkedin className="h-5 w-5" />
            </a>
            <a href="#" className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors">
              <Youtube className="h-5 w-5" />
            </a>
          </div>
          
          {/* Copyright */}
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Offgroom. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};
