import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { abrirHotmart } from "./StoreLayout";
import heroImage from "@/assets/hero-offgroom.png";
import { cn } from "@/lib/utils";

export const HeroSection = ({ className }: { className?: string }) => {
  return (
    <section className={cn("bg-card py-16 md:py-24 lg:py-32", className)}>
      <div className="container max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Lado esquerdo: Conteúdo */}
          <div className="order-2 lg:order-1">
            {/* Título principal */}
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight mb-6">
              <span className="text-foreground">Tecnologia feita por quem realmente sabe o que aumenta</span>

              <span className="block">
                <span className="text-primary">recorrência</span>
                <span className="text-foreground"> e </span>
                <span className="text-primary">faturamento</span>
                <span className="text-foreground">.</span>
              </span>
            </h1>

            {/* Subtítulo */}
            <p className="text-xl md:text-1xl text-muted-foreground mb-8 leading-relaxed">
              Organize sua operação inteira em um só lugar, reduzindo custos e aumentando seu faturamento de forma
              contínua.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button
                size="lg"
                onClick={abrirHotmart}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
              >
                Começar Agora
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Stats mini */}
            <div className="flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" />
                <span>Teste gratuito sem compromisso</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-accent" />
                <span>Suporte dedicado, pronto para ajudar</span>
              </div>
            </div>
          </div>

          {/* Lado direito: Imagem do sistema */}
          <div className="order-1 lg:order-2 flex items-start justify-start w-full overflow-hidden">
            <img
              src={heroImage}
              alt="Offgroom - Sistema de gestão para petshops"
              className="w-full h-auto max-h-[300px] md:max-h-[450px] lg:h-[550px] lg:w-auto rounded-2xl object-contain lg:object-left"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
