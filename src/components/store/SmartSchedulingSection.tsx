import { MessageSquare, CheckCircle, FileText, BarChart3, Package, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { abrirHotmart } from "./StoreLayout";
import agendamentoImg from "@/assets/agendamento.png";
import { cn } from "@/lib/utils";

export const SmartSchedulingSection = ({ className }: { className?: string }) => {
  const features = [
    {
      icon: MessageSquare,
      text: "Venda automática para renovação de pacotes via Whatsapp",
    },
    {
      icon: CheckCircle,
      text: "Confirmação de Serviço pelo Whatsapp",
    },
    {
      icon: FileText,
      text: "Relatório de agendamentos facilitado",
    },
    {
      icon: BarChart3,
      text: "Gráfico de Gantt de horários agendados e disponíveis",
    },
    {
      icon: Package,
      text: "Controle de Pacotes",
    },
    {
      icon: Car,
      text: "Controle de Taxi Dog",
    },
  ];

  return (
    <section className={cn("py-2 md:py-3 lg:py-4 bg-background", className)}>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-1 lg:gap-1 items-center">
          {/* Coluna Esquerda - Imagem */}
          <div className="lg:col-span-2 flex justify-center lg:justify-start">
            <img
              src={agendamentoImg}
              alt="Agendamentos Inteligentes Offgroom"
              className="w-full h-auto max-h-[350px] md:max-h-[1500px] lg:h-[650px] lg:w-auto object-contain rounded-3xl"
            />
          </div>

          {/* Coluna Direita - Conteúdo */}
          <div className="lg:col-span-3">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-1">
              Agendamentos inteligentes que eliminam conflitos e impulsionam sua rotina.
            </h2>

            <p className="text-lg text-muted-foreground mb-3">
              Tenha controle total da sua agenda com a Offgroom. Visualize horários preenchidos e disponíveis com o
              gráfico de Gantt, tome decisões em segundos e mantenha uma operação organizada, rápida e sem estresse.
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
        </div>
      </div>
    </section>
  );
};
