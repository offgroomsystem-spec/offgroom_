import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { abrirHotmart } from "./StoreLayout";

export const CTASection = () => {
  return (
    <section className="bg-gradient-to-br from-primary to-primary/90 py-16 md:py-20">
      <div className="container max-w-4xl text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-6">
          Pronto para transformar seu petshop?
        </h2>
        <p className="text-xl text-primary-foreground/80 mb-8">
          Junte-se a centenas de petshops que já confiam no Offgroom
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={abrirHotmart}
            size="lg"
            className="bg-card text-primary hover:bg-card/90 px-8 py-6 text-lg font-semibold rounded-xl shadow-xl"
          >
            Começar Agora
            <ArrowRight className="ml-2" />
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="bg-card text-primary hover:bg-card/90 px-8 py-6 text-lg font-semibold rounded-xl shadow-xl"
          >
            Falar com especialista
            <ArrowRight className="ml-2" />
          </Button>
        </div>

        <p className="mt-6 text-sm text-primary-foreground/70">⚡ Projete sua empresa para crescer ainda mais.</p>
      </div>
    </section>
  );
};
