import { DollarSign, Calendar, PieChart, FileText, TrendingUp, BarChart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { abrirHotmart } from "./StoreLayout";
import financeiroImg from "@/assets/financeiro.png";
import { cn } from "@/lib/utils";

export const FinancialManagementSection = ({ className }: { className?: string }) => {
  const features = [
    {
      icon: DollarSign,
      text: "Contas a pagar e a receber",
    },
    {
      icon: Calendar,
      text: "Agendamentos de pagamentos",
    },
    {
      icon: PieChart,
      text: "Dashboard Financeiro",
    },
    {
      icon: FileText,
      text: "DRE gerencial",
    },
    {
      icon: TrendingUp,
      text: "Fluxo de caixa",
    },
    {
      icon: BarChart,
      text: "Relatórios personalizados",
    },
  ];

  return (
    <section className={cn("py-8 md:py-12 lg:py-16 bg-background", className)}>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-1 lg:gap-1 items-center">
          {/* Coluna Esquerda - Conteúdo */}
          <div className="lg:col-span-3 order-2 lg:order-1">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-1">
              Eficiência e facilidade para você focar no estratégico.
            </h2>

            <p className="text-lg text-muted-foreground mb-3">
              Tenha uma visão clara das suas finanças e tome decisões mais seguras. A Offgroom organiza seus números,
              oferece insights precisos e facilita o planejamento para que sua empresa cresça com confiança.
            </p>

            {/* Grid de 6 Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-2">
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={index}
                    className="flex items-start gap-4 p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-12 h-12 bg-card rounded-lg flex items-center justify-center shrink-0 border border-border">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm text-card-foreground font-medium pt-3">{feature.text}</p>
                  </div>
                );
              })}
            </div>

            {/* Botão CTA */}
            <Button
              onClick={abrirHotmart}
              size="lg"
              className="mt-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-6 text-lg font-semibold rounded-xl shadow-lg"
            >
              Começar Agora
            </Button>
          </div>

          {/* Coluna Direita - Imagem */}
          <div className="lg:col-span-2 order-1 lg:order-2 flex justify-center lg:justify-end">
            <img
              src={financeiroImg}
              alt="Gestão Financeira Offgroom"
              className="w-full h-auto max-h-[350px] md:max-h-[1500px] lg:h-[650px] lg:w-auto object-contain rounded-3xl"
            />
          </div>
        </div>
      </div>
    </section>
  );
};
