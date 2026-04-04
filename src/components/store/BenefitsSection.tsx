import { Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { abrirHotmart } from "./StoreLayout";

const benefits = [
  {
    title: "Interface intuitiva",
    description: "Design pensado para facilitar o dia a dia, sem complicações",
  },
  {
    title: "Dados 100% seguros",
    description: "Backup automático e criptografia de ponta a ponta",
  },
  {
    title: "Suporte em português",
    description: "Equipe brasileira pronta para ajudar quando você precisar",
  },
  {
    title: "Sem instalação",
    description: "Acesse de qualquer lugar, basta ter internet",
  },
  {
    title: "Atualizações constantes",
    description: "Novos recursos e melhorias sem custo adicional",
  },
  {
    title: "Multiplataforma",
    description: "Funciona em computador, tablet e celular",
  },
];

export const BenefitsSection = () => {
  return (
    <section className="bg-blue-50 py-16 md:py-24">
      <div className="container max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Texto à esquerda */}
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-6">Por que escolher o Offgroom?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Desenvolvido especialmente para petshops que querem crescer de forma profissional e organizada.
            </p>

            <Button
              onClick={abrirHotmart}
              size="lg"
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              Começar Agora
              <ArrowRight className="ml-2" />
            </Button>
          </div>

          {/* Lista à direita */}
          <div className="space-y-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-4 bg-card rounded-lg p-4 shadow-sm">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                  <Check className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold text-card-foreground mb-1">{benefit.title}</h3>
                  <p className="text-sm text-muted-foreground">{benefit.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
