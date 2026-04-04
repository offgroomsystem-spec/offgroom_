import { useFinancialIntelligence } from "@/hooks/useFinancialIntelligence";
import { KPICard } from "@/components/relatorios/shared/KPICard";
import { AlertCard } from "@/components/relatorios/shared/AlertCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Brain, Activity, Target, Zap, AlertTriangle, Lightbulb } from "lucide-react";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const formatCurrencyShort = (v: number) => {
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return `R$ ${v.toFixed(0)}`;
};

const TendenciaIcon = ({ tendencia }: { tendencia: string }) => {
  if (tendencia === "crescimento") return <TrendingUp className="h-5 w-5 text-green-600" />;
  if (tendencia === "queda") return <TrendingDown className="h-5 w-5 text-red-600" />;
  return <Minus className="h-5 w-5 text-yellow-600" />;
};

export const CentralInteligenciaFinanceira = () => {
  const data = useFinancialIntelligence();

  if (data.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const scoreColors = {
    red: "from-red-500 to-red-700",
    yellow: "from-yellow-500 to-yellow-600",
    green: "from-green-500 to-green-600",
    blue: "from-blue-500 to-blue-600",
  };

  const scoreEmoji = {
    red: "🔴",
    yellow: "🟡",
    green: "🟢",
    blue: "🔵",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Brain className="h-7 w-7 text-primary" />
          <div>
            <h2 className="text-xl font-bold text-foreground">Central de Inteligência Financeira</h2>
            <p className="text-sm text-muted-foreground">Previsões, tendências e score de saúde do negócio</p>
            <p className="text-sm text-destructive mt-1">
              Este relatório é baseado 100% nos dados dos últimos 30, 60 e 90 dias. Para garantir maior precisão na previsão de faturamento, mantenha sempre seus lançamentos de receitas atualizados.
            </p>
          </div>
        </div>
        <Select
          value={String(data.periodoDias)}
          onValueChange={(v) => data.setPeriodoDias(Number(v) as any)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Últimos 30 dias</SelectItem>
            <SelectItem value="60">Últimos 60 dias</SelectItem>
            <SelectItem value="90">Últimos 90 dias</SelectItem>
            <SelectItem value="120">Últimos 120 dias</SelectItem>
            <SelectItem value="180">Últimos 180 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Score de Saúde */}
      <HoverCard openDelay={200} closeDelay={100}>
        <HoverCardTrigger asChild>
          <Card className="border-2 cursor-pointer transition-shadow hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative">
                  <div
                    className={`w-28 h-28 rounded-full bg-gradient-to-br ${scoreColors[data.scoreCor]} flex items-center justify-center shadow-lg`}
                  >
                    <div className="text-center">
                      <div className="text-3xl font-black text-white">{data.score}</div>
                      <div className="text-xs text-white/80">/ 100</div>
                    </div>
                  </div>
                </div>
                <div className="text-center sm:text-left">
                  <div className="flex items-center gap-2 justify-center sm:justify-start">
                    <span className="text-2xl">{scoreEmoji[data.scoreCor]}</span>
                    <h3 className="text-lg font-bold text-foreground">{data.scoreLabel}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Score baseado em crescimento, estabilidade, atividade recente e volatilidade do faturamento.
                  </p>
                  <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                    <span>Volatilidade: {data.classificacaoVolatilidade}</span>
                    <span>•</span>
                    <span>
                      Tendência: {data.tendencia === "crescimento" ? "Alta" : data.tendencia === "queda" ? "Baixa" : "Estável"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 italic">Passe o mouse para ver os detalhes do cálculo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </HoverCardTrigger>
        <HoverCardContent className="w-80" side="bottom" align="start">
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-foreground">Como o Score é calculado</h4>
            <p className="text-xs text-muted-foreground">O score é composto por 4 componentes, cada um valendo até 25 pontos:</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">📈 Crescimento (últimos 30d vs anterior)</span>
                <span className="font-semibold text-foreground">{data.scoreDetalhes.crescimento}/25</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">📊 Estabilidade (volatilidade diária)</span>
                <span className="font-semibold text-foreground">{data.scoreDetalhes.estabilidade}/25</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">⚡ Atividade Recente (fat. 30d vs média)</span>
                <span className="font-semibold text-foreground">{data.scoreDetalhes.atividadeRecente}/25</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">🏦 Base (há faturamento no período?)</span>
                <span className="font-semibold text-foreground">{data.scoreDetalhes.base}/25</span>
              </div>
              <div className="border-t pt-2 flex justify-between items-center font-semibold">
                <span className="text-foreground">Total</span>
                <span className="text-foreground">{data.score}/100</span>
              </div>
            </div>
          </div>
        </HoverCardContent>
      </HoverCard>

      {/* Alertas Inteligentes */}
      {data.alertas.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.alertas.map((alerta, i) => (
            <AlertCard
              key={i}
              tipo={alerta.cor === "red" ? "error" : "warning"}
              titulo={alerta.texto}
              icone={<AlertTriangle className="h-4 w-4" />}
            />
          ))}
        </div>
      )}

      {/* KPIs Principais */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Activity className="h-4 w-4" /> Indicadores Principais
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard titulo="Faturamento 30 dias" valor={data.faturamento30d} cor="default" />
          <KPICard titulo="Faturamento 60 dias" valor={data.faturamento60d} cor="default" />
          <KPICard titulo="Faturamento 90 dias" valor={data.faturamento90d} cor="default" />
          <KPICard
            titulo="Taxa de Crescimento"
            valor={`${(data.taxaCrescimento * 100).toFixed(1)}%`}
            cor={data.taxaCrescimento > 0 ? "green" : data.taxaCrescimento < 0 ? "red" : "yellow"}
            icon={<TendenciaIcon tendencia={data.tendencia} />}
          />
          <KPICard titulo="Média Diária" valor={data.mediaDiaria} cor="default" />
          <KPICard titulo="Média Semanal" valor={data.mediaSemanal} cor="default" />
          <KPICard titulo="Média Mensal Estimada" valor={data.mediaMensal} cor="default" />
          <KPICard
            titulo="Tendência"
            valor={data.tendencia === "crescimento" ? "📈 Alta" : data.tendencia === "queda" ? "📉 Baixa" : "➡️ Estável"}
            cor={data.tendencia === "crescimento" ? "green" : data.tendencia === "queda" ? "red" : "yellow"}
          />
        </div>
      </div>

      {/* Previsões Curto Prazo */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Target className="h-4 w-4" /> Previsões de Curto Prazo
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.previsoesCurtoPrazo.map((p) => (
            <Card key={p.dias} className="border">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-xs font-semibold text-muted-foreground">
                  Próximos {p.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1 space-y-1">
                <div className="text-lg font-bold text-foreground">{formatCurrency(p.cenarios.realista)}</div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-red-500">▼ {formatCurrencyShort(p.cenarios.conservador)}</span>
                  <span className="text-green-500">▲ {formatCurrencyShort(p.cenarios.otimista)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Previsões Médio Prazo */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4" /> Previsões de Médio Prazo
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {data.previsoesMedioPrazo.map((p) => (
            <Card key={p.dias} className="border">
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-xs font-semibold text-muted-foreground">
                  Próximos {p.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-1 space-y-1">
                <div className="text-lg font-bold text-foreground">{formatCurrency(p.cenarios.realista)}</div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-red-500">▼ {formatCurrencyShort(p.cenarios.conservador)}</span>
                  <span className="text-green-500">▲ {formatCurrencyShort(p.cenarios.otimista)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Gráfico 1 - Evolução Faturamento */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">📊 Evolução do Faturamento Diário</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dadosDiarios}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis
                  dataKey="data"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => v.slice(5)}
                  className="fill-muted-foreground"
                />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={formatCurrencyShort} className="fill-muted-foreground" />
                <Tooltip formatter={(v: number) => formatCurrency(v)} labelFormatter={(l) => `Data: ${l}`} />
                <Line type="monotone" dataKey="valor" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico 2 & 3 side by side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Receita por Dia da Semana */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold">📅 Receita por Dia da Semana</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dadosDiaSemana}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="dia" tick={{ fontSize: 10 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={formatCurrencyShort} className="fill-muted-foreground" />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="media" name="Média" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Receita por Semana do Mês */}
        <Card>
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm font-semibold">📆 Receita por Semana do Mês</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dadosSemanaMes}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="semana" tick={{ fontSize: 9 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={formatCurrencyShort} className="fill-muted-foreground" />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="media" name="Média" fill="hsl(var(--chart-2, var(--primary)))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico 4 - Projeção 3 Cenários */}
      <Card>
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-semibold">🔮 Projeção de Faturamento — 3 Cenários</CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.dadosProjecao}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="dia" tick={{ fontSize: 10 }} label={{ value: "Dias", position: "insideBottom", offset: -5, fontSize: 10 }} className="fill-muted-foreground" />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={formatCurrencyShort} className="fill-muted-foreground" />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Legend />
                <Line type="monotone" dataKey="conservador" name="Conservador" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                <Line type="monotone" dataKey="realista" name="Realista" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="otimista" name="Otimista" stroke="#22c55e" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Insights Automáticos */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
          <Lightbulb className="h-4 w-4" /> Insights Automáticos
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.insights.map((insight, i) => (
            <Card
              key={i}
              className={`border-l-4 ${
                insight.cor === "green"
                  ? "border-l-green-500"
                  : insight.cor === "red"
                    ? "border-l-red-500"
                    : insight.cor === "yellow"
                      ? "border-l-yellow-500"
                      : "border-l-blue-500"
              }`}
            >
              <CardContent className="p-4 flex items-start gap-3">
                <span className="text-xl">{insight.icone}</span>
                <p className="text-sm text-foreground">{insight.texto}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};
