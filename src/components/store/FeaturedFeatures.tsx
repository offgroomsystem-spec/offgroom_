import { Calendar, DollarSign, BarChart3, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const featuredFeatures = [
  {
    icon: Calendar,
    title: "Agendamentos Inteligentes",
    description:
      "Gerencie seus horários com praticidade. Enxergue rapidamente os intervalos livres pelo Gantt e mantenha sua rotina alinhada e tranquila.",
    benefits: [
      "Lembretes por WhatsApp",
      "Confirmação de presença",
      "Calendário inteligente",
      "Gráfico de Gantt",
      "Visualização simples e objetiva",
    ],
    color: "blue",
  },
  {
    icon: DollarSign,
    title: "Controles Inteligentes",
    description:
      "Tenha uma visão completa das finanças com dashboards detalhados e tome decisões baseadas em dados reais para acompanhar o crescimento do seu negócio",
    benefits: [
      "Fluxo de caixa em tempo real",
      "Contas a pagar e receber",
      "DRE e ponto de equilíbrio",
      "Análise de faturamento com Gráficos",
      "Performance por serviço",
    ],
    color: "green",
  },
  {
    icon: DollarSign,
    title: "Recursos para Recorrência",
    description:
      "Use recursos voltados para atendimentos recorrentes para manter seus clientes sempre ativos e elevar seu faturamento, enviando mensagens estratégicas pelo WhatsApp com frases prontas",
    benefits: [
      "Clientes sem agendamentos futuros",
      "Pacotes vencidos sem agendamentos",
      "Pacotes prestes a vencer convidando o cliente a Renovar imediatamente",
    ],
    color: "green",
  },
];

const colorClasses = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  purple: "bg-purple-50 text-purple-600",
};

export const FeaturedFeatures = ({ className }: { className?: string }) => {
  return (
    <section className={cn("bg-muted py-16 md:py-24", className)}>
      <div className="container max-w-7xl">
        <div className="text-center mb-4">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-1">Tudo que você precisa em um só lugar</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Recursos poderosos para simplificar sua rotina e aumentar seus resultados
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {featuredFeatures.map((feature, index) => (
            <div
              key={index}
              className="bg-card rounded-2xl p-8 shadow-md hover:shadow-xl transition-shadow border border-border"
            >
              <div
                className={`w-12 h-12 ${colorClasses[feature.color as keyof typeof colorClasses]} rounded-xl flex items-center justify-center mb-6`}
              >
                <feature.icon className="h-6 w-6" />
              </div>

              <h3 className="text-xl font-semibold text-card-foreground mb-3">{feature.title}</h3>

              <p className="text-muted-foreground mb-6">{feature.description}</p>

              <ul className="space-y-3">
                {feature.benefits.map((benefit, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-sm text-card-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
