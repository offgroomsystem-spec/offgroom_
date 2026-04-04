import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, BarChart3, TrendingUp, Calendar, Users, Package, ArrowLeft } from "lucide-react";
import { FilterPanel } from "@/components/relatorios/filters/FilterPanel";
import { DashboardExecutivo } from "@/components/relatorios/dashboard/DashboardExecutivo";
import FluxoDeCaixa from "@/components/relatorios/financeiros/FluxoDeCaixa";
import { DRE } from "@/components/relatorios/financeiros/DRE";
import { Inadimplencia } from "@/components/relatorios/financeiros/Inadimplencia";
import { PacotesProximosVencimento } from "@/components/relatorios/pacotes/PacotesProximosVencimento";
import { PacotesExpirados } from "@/components/relatorios/pacotes/PacotesExpirados";
import { PacotesAtivos } from "@/components/relatorios/pacotes/PacotesAtivos";
import { ClientesEmRisco } from "@/components/relatorios/clientes/ClientesEmRisco";
import ControleFinanceiro from "@/pages/ControleFinanceiro";
import { ReceitaOperacional } from "@/components/relatorios/financeiros/ReceitaOperacional";
import { ReceitaNaoOperacional } from "@/components/relatorios/financeiros/ReceitaNaoOperacional";
import { DespesasFixas } from "@/components/relatorios/financeiros/DespesasFixas";
import { DespesasOperacionais } from "@/components/relatorios/financeiros/DespesasOperacionais";
import { DespesasNaoOperacionais } from "@/components/relatorios/financeiros/DespesasNaoOperacionais";
import { PontoEquilibrio } from "@/components/relatorios/financeiros/PontoEquilibrio";
import { AtendimentosRealizados } from "@/components/relatorios/servicos/AtendimentosRealizados";
import { ProdutosProximosVencimento } from "@/components/relatorios/estoque/ProdutosProximosVencimento";
import GraficosFinanceiros from "@/components/relatorios/financeiros/GraficosFinanceiros";
import { CentralInteligenciaFinanceira } from "@/components/relatorios/financeiros/CentralInteligenciaFinanceira";
import { PerformanceBanhistas } from "@/components/relatorios/banhistas/PerformanceBanhistas";

const Relatorios = () => {
  const location = useLocation();
  const [filtros, setFiltros] = useState({
    periodo: "mes",
    dataInicio: "",
    dataFim: "",
    bancosSelecionados: [],
  });

  const [relatorioAtivo, setRelatorioAtivo] = useState<string | null>(null);
  const [versaoFiltro, setVersaoFiltro] = useState(0);
  const [filtrosControleFinanceiro, setFiltrosControleFinanceiro] = useState<any>(null);

  // Suportar navegação direta do dashboard
  useEffect(() => {
    if (location.state?.tab) {
      setRelatorioAtivo(location.state.tab);
    }
  }, [location]);

  const handleCardClick = (nomeRelatorio: string, filtrosIniciais?: any) => {
    setRelatorioAtivo(nomeRelatorio);

    if (nomeRelatorio === "controle-financeiro" && filtrosIniciais) {
      setFiltrosControleFinanceiro(filtrosIniciais);
    } else {
      setFiltrosControleFinanceiro(null);
    }
  };

  const handleVoltar = () => {
    setRelatorioAtivo(null);
  };

  const handleAplicarFiltros = () => {
    setVersaoFiltro((v) => v + 1);
  };

  const handleLimparFiltros = () => {
    setFiltros({ periodo: "mes", dataInicio: "", dataFim: "", bancosSelecionados: [] });
  };

  if (relatorioAtivo) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={handleVoltar}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        {/* Filtros agora são integrados em cada relatório */}

        {relatorioAtivo === "dashboard" && (
          <DashboardExecutivo key={versaoFiltro} filtros={filtros} onNavigateToReport={handleCardClick} />
        )}
        {relatorioAtivo === "controle-financeiro" && <ControleFinanceiro filtrosIniciais={filtrosControleFinanceiro} />}
        {relatorioAtivo === "fluxo-caixa" && <FluxoDeCaixa key={versaoFiltro} />}
        {relatorioAtivo === "dre" && <DRE filtros={filtros} />}
        {relatorioAtivo === "graficos-financeiros" && <GraficosFinanceiros />}
        {relatorioAtivo === "inadimplencia" && <Inadimplencia />}
      {relatorioAtivo === "receita-operacional" && <ReceitaOperacional />}
      {relatorioAtivo === "receita-nao-operacional" && <ReceitaNaoOperacional />}
      {relatorioAtivo === "despesas-fixas" && <DespesasFixas />}
      {relatorioAtivo === "despesas-operacionais" && <DespesasOperacionais />}
      {relatorioAtivo === "despesas-nao-operacionais" && <DespesasNaoOperacionais />}
      {relatorioAtivo === "ponto-equilibrio" && <PontoEquilibrio />}
      {relatorioAtivo === "central-inteligencia" && <CentralInteligenciaFinanceira />}
      {relatorioAtivo === "atendimentos-realizados" && <AtendimentosRealizados />}
        {relatorioAtivo === "pacotes-vencimento" && <PacotesProximosVencimento key={versaoFiltro} />}
        {relatorioAtivo === "pacotes-expirados" && <PacotesExpirados key={versaoFiltro} />}
        {relatorioAtivo === "pacotes-ativos" && <PacotesAtivos />}
        {relatorioAtivo === "clientes-risco" && <ClientesEmRisco />}
        {relatorioAtivo === "produtos-vencimento" && <ProdutosProximosVencimento />}
        {relatorioAtivo === "performance-banhistas" && <PerformanceBanhistas />}

      {![
        "graficos-financeiros",
        "dashboard",
        "controle-financeiro",
        "fluxo-caixa",
        "dre",
        "inadimplencia",
        "receita-operacional",
        "receita-nao-operacional",
    "despesas-fixas",
    "despesas-operacionais",
    "despesas-nao-operacionais",
    "ponto-equilibrio",
    "central-inteligencia",
    "pacotes-vencimento",
        "pacotes-expirados",
        "clientes-risco",
        "produtos-vencimento",
        "atendimentos-realizados",
        "pacotes-ativos",
        "performance-banhistas",
      ].includes(relatorioAtivo) && (
          <Card>
            <CardHeader>
              <CardTitle>Relatório em Desenvolvimento</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Este relatório está sendo desenvolvido e estará disponível em breve.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="h-5 w-5 text-primary" />
        <h1 className="font-bold text-foreground">Relatórios</h1>
      </div>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Dashboard Executivo</span>
            <span className="sm:hidden">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="financeiro" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Relatórios Financeiros</span>
            <span className="sm:hidden">Financeiro</span>
          </TabsTrigger>
          <TabsTrigger value="clientes" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Clientes e Pacotes</span>
            <span className="sm:hidden">Clientes</span>
          </TabsTrigger>
          <TabsTrigger value="estoque" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            <span className="hidden sm:inline">Estoque e Compras</span>
            <span className="sm:hidden">Estoque</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
              onClick={() => handleCardClick("dashboard")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Dashboard Principal - Visão Rápida
                </CardTitle>
                <CardDescription>Visão 360° da saúde do negócio em uma única tela</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Clique para visualizar KPIs, alertas importantes e gráficos de tendência
                </p>
              </CardContent>
            </Card>
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
              onClick={() => handleCardClick("performance-banhistas")}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Performance dos Banhistas
                </CardTitle>
                <CardDescription>Produtividade, eficiência e rentabilidade da equipe</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Ranking, gráficos avançados e indicadores em tempo real
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="financeiro" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { id: "graficos-financeiros", titulo: "📊 Gráficos Financeiros", desc: "Painel completo de análise visual da saúde financeira da empresa" },
              { id: "fluxo-caixa", titulo: "Fluxo de Caixa", desc: "Entradas e saídas detalhadas por período" },
              {
                id: "dre",
                titulo: "Demonstrativo de Resultado (DRE)",
                desc: "Análise de receitas, custos e lucro líquido",
              },
              { id: "despesas-fixas", titulo: "Despesas Fixas", desc: "Análise detalhada de despesas fixas mensais" },
              { id: "despesas-operacionais", titulo: "Despesas Operacionais", desc: "Análise detalhada de despesas operacionais do negócio" },
              { id: "receita-operacional", titulo: "Receita Operacional", desc: "Análise detalhada de receitas operacionais" },
              { id: "inadimplencia", titulo: "Inadimplência e Contas a Receber", desc: "Contas vencidas e gestão de inadimplência" },
              { id: "ponto-equilibrio", titulo: "Ponto de Equilíbrio (PE)", desc: "Calcule o valor necessário para cobrir todas as despesas" },
              { id: "despesas-nao-operacionais", titulo: "Despesas Não Operacionais", desc: "Análise de despesas não operacionais (manutenção, etc.)" },
              { id: "receita-nao-operacional", titulo: "Receita Não Operacional", desc: "Análise detalhada de receitas não operacionais" },
              { id: "central-inteligencia", titulo: "🧠 Central de Inteligência Financeira", desc: "Previsões, tendências e score de saúde do negócio" },
            ].map((rel) => (
              <Card
                key={rel.id}
                className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
                onClick={() => handleCardClick(rel.id)}
              >
                <CardHeader>
                  <CardTitle className="text-sm">{rel.titulo}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">{rel.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>


        <TabsContent value="clientes" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card
              key="pacotes-ativos"
              className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
              onClick={() => handleCardClick("pacotes-ativos")}
            >
              <CardHeader>
                <CardTitle className="text-sm">Pacotes Ativos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Análise completa de pacotes ativos, consumo e vencimentos
                </p>
              </CardContent>
            </Card>
            <Card
              key="Pacotes Próximos do Vencimento"
              className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
              onClick={() => handleCardClick("pacotes-vencimento")}
            >
              <CardHeader>
                <CardTitle className="text-sm">Pacotes Próximos do Vencimento</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Visualize pacotes que vencem nos próximos 7 dias</p>
              </CardContent>
            </Card>
            <Card
              key="clientes-risco"
              className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
              onClick={() => handleCardClick("clientes-risco")}
            >
              <CardHeader>
                <CardTitle className="text-sm">Clientes em Risco (Sem Agendamento)</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Clientes sem agendamentos ativos, classificados por tempo de inatividade
                </p>
              </CardContent>
            </Card>
            <Card
              key="Pacotes Expirados"
              className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
              onClick={() => handleCardClick("pacotes-expirados")}
            >
              <CardHeader>
                <CardTitle className="text-sm">Pacotes Expirados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Pacotes vencidos sem agendamentos futuros</p>
              </CardContent>
            </Card>
            <Card
              key="atendimentos-realizados"
              className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
              onClick={() => handleCardClick("atendimentos-realizados")}
            >
              <CardHeader>
                <CardTitle className="text-sm">Atendimentos Realizados</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Análise completa de todos os atendimentos: avulsos e pacotes
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="estoque" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary opacity-50">
              <CardHeader>
                <CardTitle className="text-sm">Giro de Estoque e Curva ABC</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Em desenvolvimento</p>
              </CardContent>
            </Card>
            
            {/* CARD CLICÁVEL - Produtos Próximos ao Vencimento */}
            <Card
              className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary"
              onClick={() => handleCardClick("produtos-vencimento")}
            >
              <CardHeader>
                <CardTitle className="text-sm">Produtos Próximos ao Vencimento</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Controle de validade por lote com alertas de vencimento
                </p>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary opacity-50">
              <CardHeader>
                <CardTitle className="text-sm">Sugestão de Compra Inteligente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Em desenvolvimento</p>
              </CardContent>
            </Card>
            
            <Card className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary opacity-50">
              <CardHeader>
                <CardTitle className="text-sm">Margem de Lucro por Produto</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">Em desenvolvimento</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Relatorios;
