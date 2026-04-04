import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useFinancialData, formatCurrency } from "@/hooks/useFinancialData";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

const CORES_RECEITA = ["#22c55e", "#16a34a", "#15803d", "#166534", "#a3e635", "#84cc16", "#4ade80"];
const CORES_DESPESA = ["#ef4444", "#dc2626", "#b91c1c", "#991b1b", "#f97316", "#fb923c", "#fbbf24"];

const VariationBadge = ({ value, suffix = "%", invertColors = false }: { value: number; suffix?: string; invertColors?: boolean }) => {
  const isPositive = value > 0;
  const colorClass = invertColors
    ? (isPositive ? "text-red-600" : "text-green-600")
    : (isPositive ? "text-green-600" : "text-red-600");
  const Icon = value === 0 ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${colorClass}`}>
      <Icon className="h-4 w-4" />
      {value > 0 ? "+" : ""}{value.toFixed(1)}{suffix}
    </span>
  );
};

const ChartTooltip = ({ children }: { children: React.ReactNode }) => (
  <div className="bg-background border rounded-lg p-3 shadow-lg text-sm">{children}</div>
);

const PieChartCard = ({ title, data, colors }: { title: string; data: { name: string; value: number }[]; colors: string[] }) => {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  if (total === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
        <CardContent><p className="text-xs text-muted-foreground text-center py-8">Sem dados</p></CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
              {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
            </Pie>
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0].payload;
              return (
                <ChartTooltip>
                  <p className="font-semibold">{d.name}</p>
                  <p>{formatCurrency(d.value)}</p>
                  <p className="text-muted-foreground">{total > 0 ? ((d.value / total) * 100).toFixed(1) : 0}%</p>
                </ChartTooltip>
              );
            }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-2 mt-2">
          {data.map((d, i) => (
            <span key={d.name} className="flex items-center gap-1 text-xs">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: colors[i % colors.length] }} />
              {d.name}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const getTooltipText = (tipo: string, comparativo: any, periodo: "atual" | "anterior" = "atual"): string => {
  if (!comparativo) return "";
  const label = periodo === "atual" ? "mês atual" : "mês anterior";
  switch (tipo) {
    case "receita": {
      const base = `💰 Receita do ${label}. Todo o dinheiro que entrou no seu negócio neste período.`;
      if (comparativo.varReceita > 0) return `${base}\n📈 Seu faturamento aumentou! Você vendeu mais ou gerou mais receita neste período.`;
      if (comparativo.varReceita < 0) return `${base}\n📉 Você faturou menos que no período anterior. Pode indicar menos vendas ou menor ticket médio.`;
      return `${base}\n➡️ Faturamento estável em relação ao período anterior.`;
    }
    case "despesas": {
      const base = `💸 Despesas do ${label}. Todos os gastos do negócio (aluguel, funcionários, insumos, etc.).`;
      const v = comparativo.varDespesa;
      if (v < 0) return `${base}\n✅ Redução de despesas melhora diretamente a rentabilidade.`;
      if (v <= 15) return `${base}\n🔹 Os gastos tiveram um leve crescimento, exigindo apenas acompanhamento.`;
      if (v <= 50) return `${base}\n🔸 Os custos cresceram de forma perceptível e merecem atenção.`;
      if (v <= 100) return `${base}\n🔴 Os gastos aumentaram significativamente, impactando o resultado.`;
      return `${base}\n🔥 Os gastos mais que dobraram em relação ao período anterior!`;
    }
    case "lucro": {
      const base = `💰 Lucro do ${label}. Quanto realmente sobrou após todas as despesas.`;
      if (comparativo.lucro < 0) return `${base}\n🚨 O negócio operou no prejuízo. As despesas superaram a receita.`;
      if (comparativo.varLucro > 0) return `${base}\n📈 Seu negócio ficou mais lucrativo neste período.`;
      if (comparativo.varLucro < 0) return `${base}\n📉 O lucro caiu. Pode ser por queda de receita ou aumento de despesas.`;
      return `${base}\n➡️ Lucro estável em relação ao período anterior.`;
    }
    case "margem": {
      const base = `📊 Margem de lucro do ${label}. Mostra qual % do faturamento virou lucro.\n💡 Ex: margem de 60% = a cada R$1,00, R$0,60 virou lucro.`;
      let texto = base;
      if (comparativo.diffMargem > 0) texto += "\n📈 Você está lucrando mais proporcionalmente.";
      else if (comparativo.diffMargem < 0) texto += "\n📉 Mesmo faturando, uma parte menor virou lucro.";
      return `${texto}\nℹ️ Variação medida em pontos percentuais (pp).`;
    }
    default: return "";
  }
};

const GraficosFinanceiros = () => {
  const {
    loading, dadosMensais, dadosFluxoCaixa30d, categoriasPorMes,
    topCategorias, caixaAcumulado, sazonalidade, ticketMedio,
    comparativo, pontoEquilibrio, metaFaturamentoMensal,
  } = useFinancialData();

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)}</div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-80" />)}</div>
      </div>
    );
  }

  const mesLabels = [0, 1, 2].map((i) => {
    const d = subMonths(new Date(), i);
    return format(d, "MMMM/yyyy", { locale: ptBR });
  });

  // Compute previous month comparativo from dadosMensais
  const comparativoAnterior = (() => {
    if (dadosMensais.length < 3) return null;
    const anterior = dadosMensais[dadosMensais.length - 2];
    const doisAtras = dadosMensais[dadosMensais.length - 3];
    const varReceita = doisAtras.receitas > 0 ? ((anterior.receitas - doisAtras.receitas) / doisAtras.receitas) * 100 : 0;
    const varDespesa = doisAtras.despesas > 0 ? ((anterior.despesas - doisAtras.despesas) / doisAtras.despesas) * 100 : 0;
    const varLucro = doisAtras.lucro !== 0 ? ((anterior.lucro - doisAtras.lucro) / Math.abs(doisAtras.lucro)) * 100 : 0;
    const diffMargem = anterior.margem - doisAtras.margem;
    return {
      receita: anterior.receitas,
      despesa: anterior.despesas,
      lucro: anterior.lucro,
      margem: anterior.margem,
      varReceita,
      varDespesa,
      varLucro,
      diffMargem,
    };
  })();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-foreground">Gráficos Financeiros</h2>

      {/* Cards Mês Anterior */}
      {comparativoAnterior && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-help">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Receita</p>
                    <p className="text-[10px] text-muted-foreground">Mês Anterior</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(comparativoAnterior.receita)}</p>
                    <VariationBadge value={comparativoAnterior.varReceita} />
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-sm whitespace-pre-line">
                <p>{getTooltipText("receita", comparativoAnterior, "anterior")}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>

          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-help">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Despesas</p>
                    <p className="text-[10px] text-muted-foreground">Mês Anterior</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(comparativoAnterior.despesa)}</p>
                    <VariationBadge value={comparativoAnterior.varDespesa} invertColors />
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-sm whitespace-pre-line">
                <p>{getTooltipText("despesas", comparativoAnterior, "anterior")}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>

          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-help">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Lucro</p>
                    <p className="text-[10px] text-muted-foreground">Mês Anterior</p>
                    <p className={`text-lg font-bold ${comparativoAnterior.lucro >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(comparativoAnterior.lucro)}</p>
                    <VariationBadge value={comparativoAnterior.varLucro} />
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-sm whitespace-pre-line">
                <p>{getTooltipText("lucro", comparativoAnterior, "anterior")}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>

          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-help">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Margem</p>
                    <p className="text-[10px] text-muted-foreground">Mês Anterior</p>
                    <p className={`text-lg font-bold ${comparativoAnterior.margem >= 0 ? "text-green-600" : "text-red-600"}`}>{comparativoAnterior.margem.toFixed(1)}%</p>
                    <VariationBadge value={comparativoAnterior.diffMargem} suffix="pp" />
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-sm whitespace-pre-line">
                <p>{getTooltipText("margem", comparativoAnterior, "anterior")}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Cards Mês Atual */}
      {comparativo && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-help">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Receita</p>
                    <p className="text-[10px] text-muted-foreground">Mês Atual</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(comparativo.receita)}</p>
                    <VariationBadge value={comparativo.varReceita} />
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-sm whitespace-pre-line">
                <p>{getTooltipText("receita", comparativo)}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>

          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-help">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Despesas</p>
                    <p className="text-[10px] text-muted-foreground">Mês Atual</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(comparativo.despesa)}</p>
                    <VariationBadge value={comparativo.varDespesa} invertColors />
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-sm whitespace-pre-line">
                <p>{getTooltipText("despesas", comparativo)}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>

          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-help">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Lucro</p>
                    <p className="text-[10px] text-muted-foreground">Mês Atual</p>
                    <p className={`text-lg font-bold ${comparativo.lucro >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(comparativo.lucro)}</p>
                    <VariationBadge value={comparativo.varLucro} />
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-sm whitespace-pre-line">
                <p>{getTooltipText("lucro", comparativo)}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>

          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-help">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Margem</p>
                    <p className="text-[10px] text-muted-foreground">Mês Atual</p>
                    <p className={`text-lg font-bold ${comparativo.margem >= 0 ? "text-green-600" : "text-red-600"}`}>{comparativo.margem.toFixed(1)}%</p>
                    <VariationBadge value={comparativo.diffMargem} suffix="pp" />
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-sm whitespace-pre-line">
                <p>{getTooltipText("margem", comparativo)}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Row 1: Comparativo + Faturamento/Despesas 12m + Faturamento Médio */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Comparativo Receitas x Despesas */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Comparativo Receitas x Despesas</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosMensais} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis width={50} tick={{ fontSize: 11 }} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <ChartTooltip>
                      <p className="font-semibold">{d.mes}</p>
                      <p className="text-green-600">Receitas: {formatCurrency(d.receitas)}</p>
                      <p className="text-red-600">Despesas: {formatCurrency(d.despesas)}</p>
                      <p className={d.lucro >= 0 ? "text-green-600" : "text-red-600"}>Resultado: {formatCurrency(d.lucro)}</p>
                    </ChartTooltip>
                  );
                }} />
                <Legend />
                <Bar dataKey="receitas" fill="#22c55e" name="Receitas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" fill="#ef4444" name="Despesas" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Faturamento/Despesas 12 Meses (Line) */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Faturamento/Despesas - 12 Meses</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosMensais} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis width={50} tick={{ fontSize: 11 }} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <ChartTooltip>
                      <p className="font-semibold">{d.mes}</p>
                      <p className="text-green-600">Receitas: {formatCurrency(d.receitas)}</p>
                      {d.varReceitas !== 0 && <p className={d.varReceitas > 0 ? "text-green-600" : "text-red-600"}>{d.varReceitas > 0 ? "+" : ""}{d.varReceitas.toFixed(1)}% vs anterior</p>}
                      <p className="text-red-600">Despesas: {formatCurrency(d.despesas)}</p>
                      {metaFaturamentoMensal > 0 && <p className="text-muted-foreground border-t pt-1 mt-1">Meta: {formatCurrency(metaFaturamentoMensal)}</p>}
                    </ChartTooltip>
                  );
                }} />
                <Legend />
                {metaFaturamentoMensal > 0 && (
                  <ReferenceLine y={metaFaturamentoMensal} stroke="#9ca3af" strokeDasharray="5 5" strokeWidth={2} label={{ value: "Meta", position: "insideTopRight", fill: "#9ca3af", fontSize: 12 }} />
                )}
                <Line type="monotone" dataKey="receitas" stroke="#22c55e" name="Receitas" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="despesas" stroke="#ef4444" name="Despesas" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Faturamento Médio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Faturamento Médio do Mês</CardTitle>
            <p className="text-xs text-muted-foreground">Média diária considerando dias úteis</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosMensais} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis width={50} tick={{ fontSize: 11 }} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <ChartTooltip>
                      <p className="font-semibold">{d.mes}</p>
                      <p className="text-green-600">Média Diária: {formatCurrency(d.mediaReceita)}</p>
                      <p className="text-xs text-muted-foreground">({d.diasUteisAteAgora} dias úteis)</p>
                      {d.metaMedia > 0 && <p className="text-muted-foreground border-t pt-1 mt-1">Meta Média: {formatCurrency(d.metaMedia)}/dia</p>}
                    </ChartTooltip>
                  );
                }} />
                <Legend />
                <Line type="monotone" dataKey="mediaReceita" stroke="#22c55e" name="Média Diária" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                {metaFaturamentoMensal > 0 && (
                  <Line type="monotone" dataKey="metaMedia" stroke="#9ca3af" name="Meta Média" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Fluxo de Caixa + Resultado Líquido + Margem */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Fluxo de Caixa 30d */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Fluxo de Caixa - Últimos 30 Dias</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosFluxoCaixa30d} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="data" tick={{ fontSize: 11 }} />
                <YAxis width={40} tick={{ fontSize: 11 }} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <ChartTooltip>
                      <p className="font-semibold">{d.data}</p>
                      <p className="text-green-600">Receitas: {formatCurrency(d.receitas)}</p>
                      <p className="text-red-600">Despesas: {formatCurrency(d.despesas)}</p>
                      {d.metaDiaria > 0 && <p className="text-muted-foreground border-t pt-1 mt-1">Meta Diária: {formatCurrency(d.metaDiaria)}</p>}
                    </ChartTooltip>
                  );
                }} />
                <Legend />
                {metaFaturamentoMensal > 0 && (
                  <Line type="monotone" dataKey="metaDiaria" stroke="#9ca3af" name="Meta Diária" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                )}
                <Line type="monotone" dataKey="receitas" stroke="#22c55e" name="Receitas" strokeWidth={2} />
                <Line type="monotone" dataKey="despesas" stroke="#ef4444" name="Despesas" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Resultado Líquido Mensal */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Resultado Líquido Mensal</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosMensais} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis width={50} tick={{ fontSize: 11 }} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <ChartTooltip>
                      <p className="font-semibold">{d.mes}</p>
                      <p className="text-green-600">Receitas: {formatCurrency(d.receitas)}</p>
                      <p className="text-red-600">Despesas: {formatCurrency(d.despesas)}</p>
                      <p className={`font-semibold ${d.lucro >= 0 ? "text-green-600" : "text-red-600"}`}>Resultado: {formatCurrency(d.lucro)}</p>
                    </ChartTooltip>
                  );
                }} />
                <ReferenceLine y={0} stroke="#9ca3af" />
                <Bar dataKey="lucro" name="Resultado" radius={[4, 4, 0, 0]}>
                  {dadosMensais.map((entry, i) => (
                    <Cell key={i} fill={entry.lucro >= 0 ? "#22c55e" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Margem de Lucro */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Margem de Lucro (%) por Mês</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosMensais} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis width={40} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <ChartTooltip>
                      <p className="font-semibold">{d.mes}</p>
                      <p className={d.margem >= 0 ? "text-green-600" : "text-red-600"}>Margem: {d.margem.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">Receitas: {formatCurrency(d.receitas)}</p>
                      <p className="text-xs text-muted-foreground">Despesas: {formatCurrency(d.despesas)}</p>
                    </ChartTooltip>
                  );
                }} />
                <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" label={{ value: "Equilíbrio", position: "insideRight", fill: "#9ca3af", fontSize: 11 }} />
                <Line type="monotone" dataKey="margem" stroke="#8b5cf6" name="Margem %" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 3: Pie Charts - Receitas */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Receitas por Categoria</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <PieChartCard
              key={i}
              title={`${mesLabels[i]} ${i === 0 ? "(Atual)" : i === 1 ? "(Anterior)" : "(2 meses)"}`}
              data={categoriasPorMes[i]?.receitas || []}
              colors={CORES_RECEITA}
            />
          ))}
        </div>
      </div>

      {/* Row 4: Pie Charts - Despesas */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">Despesas por Categoria</h3>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <PieChartCard
              key={i}
              title={`${mesLabels[i]} ${i === 0 ? "(Atual)" : i === 1 ? "(Anterior)" : "(2 meses)"}`}
              data={categoriasPorMes[i]?.despesas || []}
              colors={CORES_DESPESA}
            />
          ))}
        </div>
      </div>

      {/* Row 5: Caixa Acumulado + Top 5 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Evolução do Caixa Acumulado */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Evolução do Caixa Acumulado</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={caixaAcumulado} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis width={50} tick={{ fontSize: 11 }} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return (
                    <ChartTooltip>
                      <p className="font-semibold">{d.mes}</p>
                      <p className={d.acumulado >= 0 ? "text-green-600" : "text-red-600"}>Acumulado: {formatCurrency(d.acumulado)}</p>
                    </ChartTooltip>
                  );
                }} />
                <ReferenceLine y={0} stroke="#9ca3af" />
                <Area type="monotone" dataKey="acumulado" stroke="#3b82f6" fill="#3b82f680" name="Caixa Acumulado" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top 5 Receita */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Top 5 Categorias - Receita</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCategorias.receitas} layout="vertical" margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return <ChartTooltip><p>{payload[0].payload.name}: {formatCurrency(Number(payload[0].value))}</p></ChartTooltip>;
                }} />
                <Bar dataKey="value" fill="#22c55e" name="Receita" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top 5 Despesa */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Top 5 Categorias - Despesa</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topCategorias.despesas} layout="vertical" margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 10 }} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  return <ChartTooltip><p>{payload[0].payload.name}: {formatCurrency(Number(payload[0].value))}</p></ChartTooltip>;
                }} />
                <Bar dataKey="value" fill="#ef4444" name="Despesa" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 6: Ponto Equilíbrio + Ticket Médio + Sazonalidade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Ponto de Equilíbrio - Últimos 3 Meses */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Ponto de Equilíbrio - Últimos 3 Meses</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            {Array.isArray(pontoEquilibrio) && pontoEquilibrio.map((pe, idx) => (
              <div key={idx} className={`space-y-2 p-3 rounded-lg ${pe.isAtual ? "border-2 border-primary bg-primary/5" : "border border-border"}`}>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold capitalize">{pe.mesLabel}</p>
                  {pe.isAtual && (
                    <span className="text-[10px] bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">Mês Atual</span>
                  )}
                </div>
                <div className="text-center">
                  <p className={`text-2xl font-bold ${pe.percentual >= 100 ? "text-green-600" : "text-red-600"}`}>
                    {pe.percentual.toFixed(0)}%
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {pe.percentual >= 100 ? "Acima do equilíbrio" : "Abaixo do equilíbrio"}
                  </p>
                </div>
                <Progress value={Math.min(pe.percentual, 100)} className="h-3" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Receitas: {formatCurrency(pe.receitas)}</span>
                  <span>Despesas: {formatCurrency(pe.despesas)}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Ticket Médio */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Ticket Médio Mensal</CardTitle>
            <p className="text-xs text-muted-foreground">Receita total / nº de lançamentos</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={ticketMedio} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis width={50} tick={{ fontSize: 11 }} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return <ChartTooltip><p className="font-semibold">{d.mes}</p><p>Ticket Médio: {formatCurrency(d.ticket)}</p></ChartTooltip>;
                }} />
                <Line type="monotone" dataKey="ticket" stroke="#f59e0b" name="Ticket Médio" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sazonalidade */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Sazonalidade Financeira</CardTitle>
            <p className="text-xs text-muted-foreground">Receita dos últimos 12 meses</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sazonalidade} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis width={50} tick={{ fontSize: 11 }} />
                <Tooltip content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload;
                  return <ChartTooltip><p className="font-semibold">{d.name}</p><p>Total: {formatCurrency(d.total)}</p></ChartTooltip>;
                }} />
                <Bar dataKey="total" name="Receita Total" radius={[4, 4, 0, 0]}>
                  {sazonalidade.map((entry, i) => {
                    const max = Math.max(...sazonalidade.map((s) => s.total));
                    const intensity = max > 0 ? entry.total / max : 0;
                    return <Cell key={i} fill={`hsl(142, ${40 + intensity * 40}%, ${55 - intensity * 20}%)`} />;
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default GraficosFinanceiros;
