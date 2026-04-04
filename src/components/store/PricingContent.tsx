import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Shield, Lock, HeadphonesIcon, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export const PricingContent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleCheckout = async (planId: string) => {
    // Verificar se usuário está logado
    if (!user) {
      sessionStorage.setItem('pending_checkout_plan', planId);
      toast.info('Faça login para continuar com a compra');
      navigate('/login');
      return;
    }

    if (planId === "flex") {
      try {
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: { price_id: 'price_1SmkDqKHKMPhWHpBqNjYmTPc' }
        });
        
        if (error) throw error;
        if (data?.url) {
          window.open(data.url, '_blank');
        }
      } catch (error) {
        console.error('Erro ao criar checkout:', error);
        toast.error('Erro ao processar pagamento');
      }
    } else if (planId === "power12") {
      try {
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: { price_id: 'price_1SmkCmKHKMPhWHpBTLLT9f3o' }
        });
        
        if (error) throw error;
        if (data?.url) {
          window.open(data.url, '_blank');
        }
      } catch (error) {
        console.error('Erro ao criar checkout:', error);
        toast.error('Erro ao processar pagamento');
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-muted/50 to-background">
        <div className="container max-w-6xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Escolha o Plano Ideal para o Seu Petshop
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              Gerencie agendamentos, controle financeiro e relatórios de forma profissional. 
              <span className="font-semibold text-primary"> Cancele quando quiser, sem multas.</span>
            </p>
          </div>

          {/* Gatilhos Mentais - Badges de Confiança */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              ✅ Mais de 500 petshops confiam
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              ⚡ Implementação imediata
            </Badge>
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              🔒 Dados 100% seguros
            </Badge>
          </div>

          {/* Ancoragem Visual */}
          <div className="text-center mb-12 p-6 bg-muted/50 rounded-2xl border border-border max-w-2xl mx-auto">
            <p className="text-sm text-muted-foreground mb-2">
              Valor tradicional de sistemas similares:
            </p>
            <p className="text-3xl md:text-4xl font-bold line-through text-muted-foreground/60 mb-2">
              R$ 147<span className="text-xl">/mês</span>
            </p>
            <p className="text-sm text-muted-foreground mb-3">
              Com o plano Power 12, você paga apenas:
            </p>
            <p className="text-5xl md:text-6xl font-bold text-primary mb-2">
              R$ 73,92<span className="text-2xl">/mês</span>
            </p>
            <p className="text-sm font-semibold text-accent">
              💰 Economia de 50% com compromisso de 1 ano
            </p>
          </div>

          {/* Cards de Planos - Grid Responsivo */}
          <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
            {/* Plano Offgroom Flex */}
            <Card className="relative flex flex-col transition-all duration-300 hover:scale-105 hover:shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Offgroom Flex</CardTitle>
                <CardDescription>Plano mensal sem compromisso</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="mb-6">
                  <p className="text-4xl font-bold text-foreground">
                    R$ 147<span className="text-lg text-muted-foreground">/mês</span>
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">Cancele quando quiser</p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-sm">Todos os recursos do sistema</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-sm">Agendamentos ilimitados</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-sm">Controle financeiro completo</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-sm">Relatórios gerenciais</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-sm">Suporte por email</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => handleCheckout("flex")}
                  className="w-full py-6 text-lg font-semibold"
                  variant="outline"
                >
                  Assinar mensal
                </Button>
              </CardFooter>
            </Card>

            {/* Plano Offgroom Power 12 - DESTAQUE */}
            <Card className="relative flex flex-col transition-all duration-300 scale-105 shadow-2xl border-[3px] border-amber-500 bg-gradient-to-br from-amber-50/50 to-card md:mt-0 -mt-4">
              {/* Badge "Mais Escolhido" */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                <Badge className="bg-amber-500 text-white px-8 py-2 text-base font-bold shadow-lg whitespace-nowrap">
                  🔥 Mais Escolhido
                </Badge>
              </div>

              <CardHeader className="pt-8">
                <CardTitle className="text-2xl font-bold">Offgroom Power 12</CardTitle>
                <CardDescription>O melhor custo-benefício</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="mb-6">
                  <p className="text-sm text-muted-foreground line-through mb-1">
                    De R$ 1.764 (12 × R$ 147)
                  </p>
                  <p className="text-5xl font-bold text-primary">
                    R$ 887<span className="text-lg text-muted-foreground">/12 meses</span>
                  </p>
                  <p className="text-lg font-semibold text-accent mt-2">
                    R$ 73,92/mês • Economia de R$ 877
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 82% dos clientes escolhem este plano
                  </p>
                </div>
                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-sm font-semibold">Todos os recursos do Flex</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-sm font-semibold">Economia de 50% no valor mensal</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-sm font-semibold">Suporte prioritário</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-sm font-semibold">Atualizações automáticas incluídas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-accent shrink-0 mt-0.5" />
                    <span className="text-sm font-semibold">Treinamento completo online</span>
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  onClick={() => handleCheckout("power12")}
                  className="w-full py-6 text-lg font-semibold bg-primary hover:bg-primary/90 animate-pulse"
                >
                  Quero o plano mais vantajoso
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Seção Copy de Vendas - Por que Power 12? */}
          <div className="bg-gradient-to-br from-amber-50/50 to-muted/30 p-8 md:p-12 rounded-2xl border border-amber-200 mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-6 text-foreground">
              Por que a maioria escolhe o Power 12?
            </h2>
            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              <div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">💰 Economia Real</h3>
                <p className="text-muted-foreground">
                  Com o plano anual, você economiza <span className="font-bold text-primary">R$ 877</span> comparado 
                  ao plano mensal. É como ganhar 6 meses grátis!
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">🚀 Crescimento Garantido</h3>
                <p className="text-muted-foreground">
                  1 ano é o tempo ideal para estabelecer processos eficientes e ver resultados consistentes 
                  no seu petshop com o Offgroom.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">🎯 Foco no Negócio</h3>
                <p className="text-muted-foreground">
                  Sem preocupação com renovações mensais. Foque em crescer seu negócio enquanto 
                  o sistema trabalha por você.
                </p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-3 text-foreground">🏆 Suporte Prioritário</h3>
                <p className="text-muted-foreground">
                  Clientes Power 12 têm prioridade no atendimento e acesso a treinamentos 
                  exclusivos para maximizar os resultados.
                </p>
              </div>
            </div>
          </div>

          {/* Trust Signals - Garantias */}
          <div className="grid md:grid-cols-4 gap-6 mb-16">
            <div className="text-center p-6 bg-muted/30 rounded-xl border border-border">
              <Shield className="h-10 w-10 text-accent mx-auto mb-3" />
              <h3 className="font-semibold mb-2">7 Dias de Garantia</h3>
              <p className="text-sm text-muted-foreground">
                Não gostou? Devolvemos 100% do seu dinheiro
              </p>
            </div>
            <div className="text-center p-6 bg-muted/30 rounded-xl border border-border">
              <CreditCard className="h-10 w-10 text-accent mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Cancele Quando Quiser</h3>
              <p className="text-sm text-muted-foreground">
                Sem multas ou taxas de cancelamento
              </p>
            </div>
            <div className="text-center p-6 bg-muted/30 rounded-xl border border-border">
              <Lock className="h-10 w-10 text-accent mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Dados Seguros</h3>
              <p className="text-sm text-muted-foreground">
                Criptografia SSL e backups diários
              </p>
            </div>
            <div className="text-center p-6 bg-muted/30 rounded-xl border border-border">
              <HeadphonesIcon className="h-10 w-10 text-accent mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Suporte em PT-BR</h3>
              <p className="text-sm text-muted-foreground">
                Time brasileiro para te ajudar
              </p>
            </div>
          </div>

          {/* CTA Final */}
          <div className="text-center bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 p-12 rounded-2xl border-2 border-primary/20">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Pronto para Transformar seu Petshop?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Junte-se a centenas de petshops que já estão economizando tempo e aumentando lucros 
              com o Offgroom.
            </p>
            <Button 
              onClick={() => handleCheckout("power12")}
              size="lg"
              className="text-lg px-12 py-6 bg-primary hover:bg-primary/90 shadow-lg"
            >
              Começar Agora com Power 12
            </Button>
            <p className="text-sm text-muted-foreground mt-4">
              ⚡ Ativação imediata • 🔒 Pagamento 100% seguro
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
