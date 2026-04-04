import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Download,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ItemLancamento {
  id: string;
  descricao2: string;
  valor: number;
}

interface LancamentoFinanceiro {
  id: string;
  tipo: string;
  descricao1: string;
  valorTotal: number;
  dataPagamento: string;
  pago: boolean;
  nomeCliente: string;
  nomePet: string;
  nomeBanco: string;
  itens: ItemLancamento[];
  observacao: string;
}

const meses = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

export function PontoEquilibrio() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  
  const [filtros, setFiltros] = useState({
    mes: format(new Date(), "MM"),
    ano: format(new Date(), "yyyy"),
  });

  const anosDisponiveis = useMemo(() => {
    const anoAtual = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => String(anoAtual - i));
  }, []);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, filtros.mes, filtros.ano]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("lancamentos_financeiros")
        .select(`
          *,
          lancamentos_financeiros_itens (*),
          clientes (nome_cliente),
          contas_bancarias (nome)
        `)
        .eq("user_id", user.id)
        .eq("ano", filtros.ano)
        .eq("mes_competencia", filtros.mes)
        .order("data_pagamento", { ascending: true });

      if (error) throw error;

      const lancamentosFormatados = (data || []).map((l: any) => ({
        id: l.id,
        tipo: l.tipo,
        descricao1: l.descricao1,
        valorTotal: Number(l.valor_total || 0),
        dataPagamento: l.data_pagamento,
        pago: l.pago,
        nomeCliente: l.clientes?.nome_cliente || "",
        nomePet: "",
        nomeBanco: l.contas_bancarias?.nome || "",
        observacao: l.observacao || "",
        itens: (l.lancamentos_financeiros_itens || []).map((i: any) => ({
          id: i.id,
          descricao2: i.descricao2,
          valor: Number(i.valor || 0),
        })),
      }));

      setLancamentos(lancamentosFormatados);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast.error("Erro ao carregar dados do relatório");
    } finally {
      setLoading(false);
    }
  };

  // Cálculo do Ponto de Equilíbrio
  const pontoEquilibrio = useMemo(() => {
    const totalDespesasFixas = lancamentos
      .filter((l) => l.tipo === "Despesa" && l.descricao1 === "Despesa Fixa" && l.pago)
      .reduce((acc, l) => acc + l.valorTotal, 0);

    const totalDespesasOperacionais = lancamentos
      .filter((l) => l.tipo === "Despesa" && l.descricao1 === "Despesa Variável" && l.pago)
      .reduce((acc, l) => acc + l.valorTotal, 0);

    const totalDespesasNaoOperacionais = lancamentos
      .filter((l) => l.tipo === "Despesa" && l.descricao1 === "Despesa Não Operacional" && l.pago && l.observacao !== "Transferência entre contas")
      .reduce((acc, l) => acc + l.valorTotal, 0);

    return totalDespesasFixas + totalDespesasOperacionais + totalDespesasNaoOperacionais;
  }, [lancamentos]);

  // Faturamento atual do mês
  const faturamentoMes = useMemo(() => {
    return lancamentos
      .filter((l) => l.tipo === "Receita" && l.descricao1 === "Receita Operacional" && l.pago)
      .reduce((acc, l) => acc + l.valorTotal, 0);
  }, [lancamentos]);

  // Diferença para PE
  const diferencaPE = useMemo(() => {
    return faturamentoMes - pontoEquilibrio;
  }, [faturamentoMes, pontoEquilibrio]);

  // Percentual atingido
  const percentualAtingido = useMemo(() => {
    if (pontoEquilibrio === 0) return 0;
    return (faturamentoMes / pontoEquilibrio) * 100;
  }, [faturamentoMes, pontoEquilibrio]);

  // Data em que o PE foi atingido
  const dataAtingimentoPE = useMemo(() => {
    const receitasOrdenadas = lancamentos
      .filter((l) => l.tipo === "Receita" && l.descricao1 === "Receita Operacional" && l.pago)
      .sort((a, b) => new Date(a.dataPagamento).getTime() - new Date(b.dataPagamento).getTime());

    let acumulado = 0;

    for (const receita of receitasOrdenadas) {
      acumulado += receita.valorTotal;

      if (acumulado >= pontoEquilibrio) {
        return receita.dataPagamento;
      }
    }

    return null;
  }, [lancamentos, pontoEquilibrio]);

  // Receitas diárias acumuladas
  const receitasDiarias = useMemo(() => {
    const receitasPorDia = new Map<string, number>();

    lancamentos
      .filter((l) => l.tipo === "Receita" && l.descricao1 === "Receita Operacional" && l.pago)
      .forEach((l) => {
        const data = l.dataPagamento;
        receitasPorDia.set(data, (receitasPorDia.get(data) || 0) + l.valorTotal);
      });

    const diasOrdenados = Array.from(receitasPorDia.entries()).sort(
      (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
    );

    let acumulado = 0;
    return diasOrdenados.map(([data, valorDia]) => {
      acumulado += valorDia;
      return { data, valorDia, acumulado };
    });
  }, [lancamentos]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string): string => {
    return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
  };

  const aplicarFiltros = () => {
    loadData();
    toast.success("Filtros aplicados com sucesso!");
  };

  const limparFiltros = () => {
    setFiltros({
      mes: format(new Date(), "MM"),
      ano: format(new Date(), "yyyy"),
    });
    toast.success("Filtros limpos!");
  };

  const exportarCSV = () => {
    const headers = [
      "Mês/Ano",
      "Ponto de Equilíbrio (R$)",
      "Faturamento (R$)",
      "Diferença (R$)",
      "Percentual Atingido (%)",
      "Data de Atingimento",
      "Status",
    ];

    const row = [
      `${meses.find((m) => m.value === filtros.mes)?.label}/${filtros.ano}`,
      pontoEquilibrio.toFixed(2),
      faturamentoMes.toFixed(2),
      diferencaPE.toFixed(2),
      percentualAtingido.toFixed(1),
      dataAtingimentoPE ? formatDate(dataAtingimentoPE) : "Não atingido",
      percentualAtingido >= 100 ? "Atingido" : "Não atingido",
    ];

    const csv = [headers, row].map((r) => r.join(";")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ponto-equilibrio-${filtros.mes}-${filtros.ano}.csv`;
    link.click();

    toast.success("Relatório exportado com sucesso!");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Relatório de Ponto de Equilíbrio</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Acompanhe o faturamento necessário para cobrir todas as despesas
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportarCSV} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <Button
            variant="outline"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="w-full justify-between"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span>Filtros</span>
            </div>
            {mostrarFiltros ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardHeader>

        {mostrarFiltros && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Filtro de Mês */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Mês</Label>
                <Select value={filtros.mes} onValueChange={(value) => setFiltros({ ...filtros, mes: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro de Ano */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Ano</Label>
                <Select value={filtros.ano} onValueChange={(value) => setFiltros({ ...filtros, ano: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {anosDisponiveis.map((ano) => (
                      <SelectItem key={ano} value={ano}>
                        {ano}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={aplicarFiltros} className="flex-1">
                Aplicar Filtros
              </Button>
              <Button variant="outline" onClick={limparFiltros}>
                Limpar
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Cards KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ponto de Equilíbrio */}
        <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Ponto de Equilíbrio (PE)</p>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{formatCurrency(pontoEquilibrio)}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400">Meta mensal para cobrir despesas</p>
              </div>
              <DollarSign className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Faturamento Atual */}
        <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-green-700 dark:text-green-300 font-medium">Faturamento do Mês</p>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{formatCurrency(faturamentoMes)}</p>
                <p className="text-xs text-green-600 dark:text-green-400">Receita operacional acumulada</p>
              </div>
              <TrendingUp className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Diferença para PE */}
        <Card
          className={
            diferencaPE >= 0
              ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
              : "bg-orange-50/50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
          }
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p
                  className={`text-sm font-medium ${
                    diferencaPE >= 0
                      ? "text-green-700 dark:text-green-300"
                      : "text-orange-700 dark:text-orange-300"
                  }`}
                >
                  {diferencaPE >= 0 ? "Superávit" : "Falta atingir"}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    diferencaPE >= 0
                      ? "text-green-900 dark:text-green-100"
                      : "text-orange-900 dark:text-orange-100"
                  }`}
                >
                  {formatCurrency(Math.abs(diferencaPE))}
                </p>
                <p
                  className={`text-xs ${
                    diferencaPE >= 0
                      ? "text-green-600 dark:text-green-400"
                      : "text-orange-600 dark:text-orange-400"
                  }`}
                >
                  {diferencaPE >= 0 ? "Acima do ponto de equilíbrio" : "Para atingir o PE"}
                </p>
              </div>
              {diferencaPE >= 0 ? (
                <TrendingUp className="h-10 w-10 text-green-600 dark:text-green-400" />
              ) : (
                <TrendingDown className="h-10 w-10 text-orange-600 dark:text-orange-400" />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Data de Atingimento */}
        <Card
          className={
            dataAtingimentoPE
              ? "bg-purple-50/50 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800"
              : "bg-gray-50/50 dark:bg-gray-950/20 border-gray-200 dark:border-gray-800"
          }
        >
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p
                  className={`text-sm font-medium ${
                    dataAtingimentoPE
                      ? "text-purple-700 dark:text-purple-300"
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {dataAtingimentoPE ? "PE Atingido em" : "PE ainda não atingido"}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    dataAtingimentoPE
                      ? "text-purple-900 dark:text-purple-100"
                      : "text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {dataAtingimentoPE ? formatDate(dataAtingimentoPE) : "—"}
                </p>
                <p
                  className={`text-xs ${
                    dataAtingimentoPE
                      ? "text-purple-600 dark:text-purple-400"
                      : "text-gray-600 dark:text-gray-400"
                  }`}
                >
                  {dataAtingimentoPE ? "Data em que cobriu despesas" : "Continue faturando para atingir"}
                </p>
              </div>
              <Calendar
                className={`h-10 w-10 ${
                  dataAtingimentoPE
                    ? "text-purple-600 dark:text-purple-400"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Progresso */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Progresso do Ponto de Equilíbrio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso</span>
                <span className="font-semibold text-foreground">{percentualAtingido.toFixed(1)}%</span>
              </div>

              <div className="relative w-full h-8 bg-secondary rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    percentualAtingido >= 100 ? "bg-green-500" : "bg-blue-500"
                  }`}
                  style={{ width: `${Math.min(percentualAtingido, 100)}%` }}
                />
              </div>
            </div>

            {/* Indicadores */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center p-4 bg-green-50/50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-xs text-green-700 dark:text-green-300">Faturado</p>
                <p className="text-lg font-bold text-green-900 dark:text-green-100">{formatCurrency(faturamentoMes)}</p>
              </div>
              <div className="text-center p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-700 dark:text-blue-300">Meta PE</p>
                <p className="text-lg font-bold text-blue-900 dark:text-blue-100">{formatCurrency(pontoEquilibrio)}</p>
              </div>
            </div>

            {/* Status */}
            <div className="text-center">
              {percentualAtingido >= 100 ? (
                <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100">
                  ✓ Ponto de Equilíbrio Atingido
                </Badge>
              ) : (
                <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100 dark:bg-orange-900 dark:text-orange-100">
                  Faltam {formatCurrency(pontoEquilibrio - faturamentoMes)}
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Evolução */}
      {receitasDiarias.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução do Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={receitasDiarias}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="data"
                  tickFormatter={(value) => format(new Date(value), "dd/MM")}
                  className="text-xs"
                />
                <YAxis tickFormatter={(value) => formatCurrency(value)} className="text-xs" />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => formatDate(label)}
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Legend />

                {/* Linha do acumulado */}
                <Line
                  type="monotone"
                  dataKey="acumulado"
                  stroke="hsl(217, 91%, 60%)"
                  strokeWidth={2}
                  name="Acumulado"
                  dot={{ fill: "hsl(217, 91%, 60%)" }}
                />

                {/* Linha de referência do PE */}
                <ReferenceLine
                  y={pontoEquilibrio}
                  stroke="hsl(0, 84%, 60%)"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{ value: "Meta PE", position: "insideTopRight", fill: "hsl(0, 84%, 60%)" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Detalhamento */}
      {receitasDiarias.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução Diária do Faturamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Faturamento do Dia</TableHead>
                    <TableHead className="text-right">Acumulado</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receitasDiarias.map((dia) => (
                    <TableRow key={dia.data}>
                      <TableCell>{formatDate(dia.data)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(dia.valorDia)}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(dia.acumulado)}</TableCell>
                      <TableCell>
                        {dia.acumulado >= pontoEquilibrio && (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 dark:bg-green-900 dark:text-green-100">
                            PE Atingido
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
