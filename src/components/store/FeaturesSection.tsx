import {
  Calendar,
  Users,
  DollarSign,
  Package,
  BarChart3,
  Clock,
  Shield,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Calendar,
    title: "Agendamentos Inteligentes",
    description: "Organize sua agenda com facilidade e evite conflitos",
  },
  {
    icon: Users,
    title: "Gestão de Clientes",
    description: "Histórico completo de cada cliente e pet",
  },
  {
    icon: DollarSign,
    title: "Controle Financeiro",
    description: "Acompanhe receitas, despesas e lucros em tempo real",
  },
  {
    icon: Package,
    title: "Estoque e Produtos",
    description: "Controle de produtos e alertas de estoque baixo",
  },
  {
    icon: BarChart3,
    title: "Relatórios Gerenciais",
    description: "Dashboards completos para tomada de decisão",
  },
  {
    icon: Clock,
    title: "Pacotes e Combos",
    description: "Crie ofertas especiais e fidelize seus clientes",
  },
  {
    icon: Shield,
    title: "Dados Seguros",
    description: "Backup automático e criptografia de dados",
  },
  {
    icon: Smartphone,
    title: "Acesso Multiplataforma",
    description: "Use em qualquer dispositivo, a qualquer momento",
  },
];

export const FeaturesSection = ({ className }: { className?: string }) => {
  return (
    <section className={cn("bg-card py-16 md:py-24", className)}>
      <div className="container max-w-7xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Recursos completos para sua gestão
          </h2>
        </div>
        
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group bg-muted rounded-xl p-6 hover:bg-card hover:shadow-lg border border-transparent hover:border-border transition-all duration-300"
            >
              <div className="w-10 h-10 bg-card rounded-lg flex items-center justify-center mb-4 group-hover:bg-blue-50 transition-colors">
                <feature.icon className="h-5 w-5 text-muted-foreground group-hover:text-primary" />
              </div>
              
              <h3 className="text-base font-semibold text-foreground mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
