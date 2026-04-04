import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { RefreshCw, Filter, ChevronUp, ChevronDown, TrendingUp, TrendingDown, DollarSign, FileText } from "lucide-react";
import { categoriasDescricao2 } from "@/constants/categorias";
import { format } from "date-fns";

interface Filtros {
  periodo: string;
  dataInicio: string;
  dataFim: string;
}

interface DREProps {
  filtros: Filtros;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
};

interface DRERowProps {
  titulo: string;
  valor: number | string;
  nivel: number;
  destaque?: boolean;
  cor?: "default" | "green" | "red";
}

const DRERow = ({ titulo, valor, nivel, destaque, cor = "default" }: DRERowProps) => {
  const indentClass = nivel === 1 ? "" : nivel === 2 ? "pl-6" : "pl-12";
  const fontClass = destaque ? "font-bold text-base" : nivel === 1 ? "font-semibold text-sm" : "text-sm";
  const corClass =
    cor === "green" ? "text-green-600 dark:text-green-400" : cor === "red" ? "text-red-600 dark:text-red-400" : "";

  return (
    <div className={`flex justify-between py-1.5 ${indentClass} ${fontClass} ${corClass}`}>
      <span>{titulo}</span>
      <span className="font-mono">{typeof valor === "number" ? formatCurrency(valor) : valor}</span>
    </div>
  );
};


export const DRE = ({ filtros }: DREProps) => {
  const { user, ownerId } = useAuth();
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [atualizandoSaldo, setAtualizandoSaldo] = useState(false);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtrosLocais, setFiltrosLocais] = useState({
    periodo: filtros.periodo || "mes",
    dataInicio: filtros.dataInicio || "",
    dataFim: filtros.dataFim || "",
    bancosSelecionados: [] as string[],
    pago: null as boolean | null,
  });

  useEffect(() => {
    loadData();
  }, [user, filtrosLocais]);

  const loadData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      let dataInicio = new Date();
      let dataFim = new Date();

      switch (filtrosLocais.periodo) {
        case "hoje":
          break;
        case "semana":
          dataInicio.setDate(dataInicio.getDate() - dataInicio.getDay());
          dataFim.setDate(dataInicio.getDate() + 6);
          break;
        case "mes":
          dataInicio = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);
          dataFim = new Date(dataInicio.getFullYear(), dataInicio.getMonth() + 1, 0);
          break;
        case "trimestre":
          const mesAtual = dataInicio.getMonth();
          const trimestreInicio = Math.floor(mesAtual / 3) * 3;
          dataInicio = new Date(dataInicio.getFullYear(), trimestreInicio, 1);
          dataFim = new Date(dataInicio.getFullYear(), trimestreInicio + 3, 0);
          break;
        case "ano":
          dataInicio = new Date(dataInicio.getFullYear(), 0, 1);
          dataFim = new Date(dataInicio.getFullYear(), 11, 31);
          break;
        case "customizado":
          if (filtrosLocais.dataInicio && filtrosLocais.dataFim) {
            dataInicio = new Date(filtrosLocais.dataInicio);
            dataFim = new Date(filtrosLocais.dataFim);
          }
          break;
      }

      let query = supabase
        .from("lancamentos_financeiros")
        .select(`*, lancamentos_financeiros_itens (*)`)
        .eq("user_id", user.id)
        .gte("data_pagamento", dataInicio.toISOString().split("T")[0])
        .lte("data_pagamento", dataFim.toISOString().split("T")[0]);

      if (filtrosLocais.pago !== null) {
        query = query.eq("pago", filtrosLocais.pago);
      }

      const { data: lancamentosData, error: lancamentosError } = await query;
      if (lancamentosError) throw lancamentosError;

      const { data: contasData, error: contasError } = await supabase
        .from("contas_bancarias")
        .select("*")
        .eq("user_id", ownerId);
      if (contasError) throw contasError;

      const lancamentosComBanco = (lancamentosData || []).map((l) => {
        const conta = contasData?.find((c) => c.id === l.conta_id);
        return { ...l, nomeBanco: conta?.nome || "Sem conta", itens: l.lancamentos_financeiros_itens || [] };
      });

      let lancamentosFiltrados = lancamentosComBanco;
      if (filtrosLocais.bancosSelecionados.length > 0) {
        lancamentosFiltrados = lancamentosComBanco.filter((l) =>
          filtrosLocais.bancosSelecionados.includes(l.nomeBanco),
        );
      }

      setLancamentos(lancamentosFiltrados);
      setContas(contasData || []);
    } catch (error) {
      console.error("Erro ao carregar dados financeiros:", error);
      toast.error("Erro ao carregar dados financeiros");
    } finally {
      setLoading(false);
    }
  };

  const atualizarSaldoContas = async () => {
    if (!user) return;
    try {
      setAtualizandoSaldo(true);
      for (const conta of contas) {
        const { data: lancamentosConta, error } = await supabase
          .from("lancamentos_financeiros")
          .select("tipo, valor_total")
          .eq("user_id", user.id)
          .eq("conta_id", conta.id)
          .eq("pago", true);
        if (error) throw error;
        const receitas = (lancamentosConta || []).filter((l) => l.tipo === "Receita").reduce((acc, l) => acc + Number(l.valor_total), 0);
        const despesas = (lancamentosConta || []).filter((l) => l.tipo === "Despesa").reduce((acc, l) => acc + Number(l.valor_total), 0);
        const { error: updateError } = await supabase.from("contas_bancarias").update({ saldo: receitas - despesas }).eq("id", conta.id);
        if (updateError) throw updateError;
      }
      toast.success("Saldo das contas atualizado com sucesso!");
      await loadData();
    } catch (error) {
      console.error("Erro ao atualizar saldo:", error);
      toast.error("Erro ao atualizar saldo das contas");
    } finally {
      setAtualizandoSaldo(false);
    }
  };

  const dre = useMemo(() => {
    const somarSubcategoria = (subcategoria: string) => {
      return lancamentos
        .filter((l) => l.pago && l.observacao !== "Transferência entre contas")
        .reduce((acc, l) => {
          const valorItem = (l.itens || [])
            .filter((item: any) => item.descricao2 === subcategoria)
            .reduce((sum: number, item: any) => sum + Number(item.valor), 0);
          return acc + valorItem;
        }, 0);
    };

    // Build dynamic maps from categoriasDescricao2
    const buildSection = (descricao1Key: string): { total: number; subcategorias: Record<string, number> } => {
      const subs = categoriasDescricao2[descricao1Key] || [];
      const subcategorias: Record<string, number> = {};
      let total = 0;
      for (const sub of subs) {
        const val = somarSubcategoria(sub);
        subcategorias[sub] = val;
        total += val;
      }
      return { total, subcategorias };
    };

    const receitaOp = buildSection("Receita Operacional");
    const receitaNaoOp = buildSection("Receita Não Operacional");
    const despesaOp = buildSection("Despesa Operacional");
    const despesaFixa = buildSection("Despesa Fixa");
    const despesaNaoOp = buildSection("Despesa Não Operacional");

    const lucroBruto = receitaOp.total;
    const lucroOperacional = lucroBruto - despesaOp.total - despesaFixa.total;
    const resultadoNaoOperacional = receitaNaoOp.total - despesaNaoOp.total;
    const lucroLiquido = lucroOperacional + resultadoNaoOperacional;

    const receitaTotal = receitaOp.total + receitaNaoOp.total;
    const despesasTotal = despesaOp.total + despesaFixa.total + despesaNaoOp.total;
    const margemBruta = receitaOp.total > 0 ? (lucroBruto / receitaOp.total) * 100 : 0;
    const margemOperacional = receitaTotal > 0 ? (lucroOperacional / receitaTotal) * 100 : 0;
    const margemLiquida = receitaTotal > 0 ? (lucroLiquido / receitaTotal) * 100 : 0;

    return {
      receitaOp,
      receitaNaoOp,
      despesaOp,
      despesaFixa,
      despesaNaoOp,
      lucroBruto,
      lucroOperacional,
      resultadoNaoOperacional,
      lucroLiquido,
      receitaTotal,
      despesasTotal,
      margemBruta,
      margemOperacional,
      margemLiquida,
    };
  }, [lancamentos]);

  const getPeriodoTexto = () => {
    const hoje = new Date();
    switch (filtrosLocais.periodo) {
      case "hoje":
        return hoje.toLocaleDateString("pt-BR");
      case "semana":
        return "Esta Semana";
      case "mes":
        return `${hoje.toLocaleString("pt-BR", { month: "long" })} de ${hoje.getFullYear()}`;
      case "trimestre":
        const trimestre = Math.floor(hoje.getMonth() / 3) + 1;
        return `${trimestre}º Trimestre de ${hoje.getFullYear()}`;
      case "ano":
        return `Ano de ${hoje.getFullYear()}`;
      case "customizado":
        if (filtrosLocais.dataInicio && filtrosLocais.dataFim) {
          return `${new Date(filtrosLocais.dataInicio).toLocaleDateString("pt-BR")} - ${new Date(filtrosLocais.dataFim).toLocaleDateString("pt-BR")}`;
        }
        return "Período Personalizado";
      default:
        return "Período selecionado";
    }
  };

  const exportarPDF = () => {
    const fc = formatCurrency;
    const periodo = getPeriodoTexto();

    // Build DRE rows for PDF
    const rows: { titulo: string; valor: string; bold?: boolean; indent?: number; cor?: string }[] = [];

    const addRow = (titulo: string, valor: number | string, opts?: { bold?: boolean; indent?: number; cor?: string }) => {
      rows.push({
        titulo,
        valor: typeof valor === "number" ? fc(valor) : valor,
        bold: opts?.bold,
        indent: opts?.indent || 0,
        cor: opts?.cor,
      });
    };

    const addSeparator = () => rows.push({ titulo: "---", valor: "", indent: 0 });

    // Receita Operacional
    addRow("(+) Receita Operacional Bruta", dre.receitaOp.total, { bold: true });
    for (const [sub, val] of Object.entries(dre.receitaOp.subcategorias)) {
      if (val !== 0) addRow(sub, val, { indent: 1 });
    }

    addSeparator();

    // Lucro Bruto
    addRow("(=) Lucro Bruto", dre.lucroBruto, { bold: true, cor: dre.lucroBruto >= 0 ? "green" : "red" });
    addRow("Margem Bruta", `${dre.margemBruta.toFixed(2)}%`, { indent: 2 });

    addSeparator();

    // Despesas Operacionais
    addRow("(-) Despesas Operacionais", dre.despesaOp.total);
    for (const [sub, val] of Object.entries(dre.despesaOp.subcategorias)) {
      if (val !== 0) addRow(sub, val, { indent: 1 });
    }

    addSeparator();

    // Despesas Fixas
    addRow("(-) Despesas Fixas", dre.despesaFixa.total);
    for (const [sub, val] of Object.entries(dre.despesaFixa.subcategorias)) {
      if (val !== 0) addRow(sub, val, { indent: 1 });
    }

    addSeparator();

    // Lucro Operacional
    addRow("(=) Lucro Operacional", dre.lucroOperacional, { bold: true, cor: dre.lucroOperacional >= 0 ? "green" : "red" });
    addRow("Margem Operacional", `${dre.margemOperacional.toFixed(2)}%`, { indent: 2, cor: dre.margemOperacional >= 0 ? "green" : "red" });

    addSeparator();

    // Resultado Não Operacional
    addRow("(+/-) Resultado Não Operacional", dre.resultadoNaoOperacional, { cor: dre.resultadoNaoOperacional >= 0 ? "green" : "red" });
    addRow("(+) Receita Não Operacional", dre.receitaNaoOp.total, { indent: 1 });
    for (const [sub, val] of Object.entries(dre.receitaNaoOp.subcategorias)) {
      if (val !== 0) addRow(sub, val, { indent: 2 });
    }
    addRow("(-) Despesa Não Operacional", dre.despesaNaoOp.total, { indent: 1 });
    for (const [sub, val] of Object.entries(dre.despesaNaoOp.subcategorias)) {
      if (val !== 0) addRow(sub, val, { indent: 2 });
    }

    addSeparator();

    // Lucro Líquido
    addRow("(=) LUCRO LÍQUIDO DO EXERCÍCIO", dre.lucroLiquido, { bold: true, cor: dre.lucroLiquido >= 0 ? "green" : "red" });
    addRow("Margem Líquida", `${dre.margemLiquida.toFixed(2)}%`, { indent: 2, cor: dre.margemLiquida >= 0 ? "green" : "red" });

    const rowsHtml = rows
      .map((r) => {
        if (r.titulo === "---") return '<tr><td colspan="2" style="border-bottom:1px solid #d1d5db;padding:6px 0;"></td></tr>';
        const pl = (r.indent || 0) * 24;
        const fw = r.bold ? "700" : "400";
        const fs = r.bold ? "13px" : "12px";
        const color = r.cor === "green" ? "#16a34a" : r.cor === "red" ? "#dc2626" : "#111";
        return `<tr>
          <td style="padding:4px 6px 4px ${6 + pl}px;font-weight:${fw};font-size:${fs};color:${color};">${r.titulo}</td>
          <td style="padding:4px 6px;text-align:right;font-family:monospace;font-weight:${fw};font-size:${fs};color:${color};">${r.valor}</td>
        </tr>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>DRE - Demonstrativo de Resultado</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 0; }
    h1 { font-size: 18px; margin: 0 0 4px 0; }
    p { font-size: 11px; color: #555; margin: 0 0 12px 0; }
    table { width: 100%; border-collapse: collapse; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <h1>DRE - Demonstrativo de Resultado do Exercício</h1>
  <p>Período: ${periodo} | Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
  <table>${rowsHtml}</table>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Bloqueador de pop-ups ativo. Permita pop-ups para exportar o PDF.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
    toast.success("PDF gerado com sucesso!");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // Helper to render subcategory rows dynamically
  const renderSubcategorias = (subs: Record<string, number>, exclude?: string[]) => {
    return Object.entries(subs)
      .filter(([key]) => !(exclude || []).includes(key))
      .map(([key, val]) => <DRERow key={key} titulo={key} valor={val} nivel={2} />);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-bold">DRE - Demonstrativo de Resultado</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportarPDF}>
            <FileText className="h-4 w-4 mr-2" />
            Baixar PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
            <Filter className="h-4 w-4 mr-2" />
            {mostrarFiltros ? "Ocultar" : "Filtros"}
          </Button>
          <Button size="sm" onClick={atualizarSaldoContas} disabled={atualizandoSaldo}>
            <RefreshCw className={`h-4 w-4 mr-2 ${atualizandoSaldo ? "animate-spin" : ""}`} />
            Atualizar Saldo
          </Button>
        </div>
      </div>

      {/* Filtros */}
      {mostrarFiltros && (
        <Card>
          <CardHeader onClick={() => setMostrarFiltros(!mostrarFiltros)} className="cursor-pointer py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                <CardTitle className="text-lg">Filtros</CardTitle>
              </div>
              {mostrarFiltros ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Período</Label>
                <Select value={filtrosLocais.periodo} onValueChange={(value) => setFiltrosLocais({ ...filtrosLocais, periodo: value })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hoje">Hoje</SelectItem>
                    <SelectItem value="semana">Esta Semana</SelectItem>
                    <SelectItem value="mes">Este Mês</SelectItem>
                    <SelectItem value="trimestre">Este Trimestre</SelectItem>
                    <SelectItem value="ano">Este Ano</SelectItem>
                    <SelectItem value="customizado">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filtrosLocais.periodo === "customizado" && (
                <>
                  <div className="space-y-2">
                    <Label>Data Início</Label>
                    <Input type="date" value={filtrosLocais.dataInicio} onChange={(e) => setFiltrosLocais({ ...filtrosLocais, dataInicio: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Data Fim</Label>
                    <Input type="date" value={filtrosLocais.dataFim} onChange={(e) => setFiltrosLocais({ ...filtrosLocais, dataFim: e.target.value })} />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filtrosLocais.pago === null ? "todos" : filtrosLocais.pago ? "pago" : "nao-pago"}
                  onValueChange={(value) => setFiltrosLocais({ ...filtrosLocais, pago: value === "todos" ? null : value === "pago" })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="pago">Pagos</SelectItem>
                    <SelectItem value="nao-pago">Não Pagos</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {contas.length > 0 && (
              <div className="space-y-2">
                <Label>Filtrar por Banco</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 border rounded">
                  {contas.map((conta) => (
                    <div key={conta.id} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`banco-${conta.id}`}
                        checked={filtrosLocais.bancosSelecionados.includes(conta.nome)}
                        onChange={(e) => {
                          const novosBancos = e.target.checked
                            ? [...filtrosLocais.bancosSelecionados, conta.nome]
                            : filtrosLocais.bancosSelecionados.filter((b) => b !== conta.nome);
                          setFiltrosLocais({ ...filtrosLocais, bancosSelecionados: novosBancos });
                        }}
                        className="h-4 w-4"
                      />
                      <Label htmlFor={`banco-${conta.id}`} className="text-xs cursor-pointer font-normal">{conta.nome}</Label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Receita Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCurrency(dre.receitaTotal)}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-red-600" />
              Despesas Totais
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(dre.despesasTotal)}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              Lucro Operacional
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${dre.lucroOperacional >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}`}>
              {formatCurrency(dre.lucroOperacional)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Margem: {dre.margemOperacional.toFixed(1)}%</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${dre.lucroLiquido >= 0 ? "border-l-emerald-500" : "border-l-red-500"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className={`h-4 w-4 ${dre.lucroLiquido >= 0 ? "text-emerald-600" : "text-red-600"}`} />
              Lucro Líquido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${dre.lucroLiquido >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
              {formatCurrency(dre.lucroLiquido)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Margem: {dre.margemLiquida.toFixed(1)}%</p>
          </CardContent>
        </Card>
      </div>

      {/* DRE Detalhado */}
      <Card>
        <CardHeader>
          <CardTitle>Demonstrativo de Resultado do Exercício</CardTitle>
          <CardDescription>{getPeriodoTexto()}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {/* RECEITA OPERACIONAL BRUTA */}
            <DRERow titulo="(+) Receita Operacional Bruta" valor={dre.receitaOp.total} nivel={1} destaque />
            {renderSubcategorias(dre.receitaOp.subcategorias)}

            <Separator className="my-3" />

            {/* LUCRO BRUTO */}
            <DRERow titulo="(=) Lucro Bruto" valor={dre.lucroBruto} nivel={1} destaque cor={dre.lucroBruto >= 0 ? "green" : "red"} />
            <DRERow titulo="    Margem Bruta" valor={`${dre.margemBruta.toFixed(2)}%`} nivel={3} />

            <div className="pt-4" />

            {/* DESPESAS OPERACIONAIS */}
            <DRERow titulo="(-) Despesas Operacionais" valor={dre.despesaOp.total} nivel={1} />
            {renderSubcategorias(dre.despesaOp.subcategorias)}

            <Separator className="my-3" />

            {/* DESPESAS FIXAS */}
            <DRERow titulo="(-) Despesas Fixas" valor={dre.despesaFixa.total} nivel={1} />
            {renderSubcategorias(dre.despesaFixa.subcategorias)}

            <Separator className="my-3" />

            {/* LUCRO OPERACIONAL */}
            <DRERow titulo="(=) Lucro Operacional" valor={dre.lucroOperacional} nivel={1} destaque cor={dre.lucroOperacional >= 0 ? "green" : "red"} />
            <DRERow titulo="    Margem Operacional" valor={`${dre.margemOperacional.toFixed(2)}%`} nivel={3} cor={dre.margemOperacional >= 0 ? "green" : "red"} />

            <div className="pt-4" />

            {/* RESULTADO NÃO OPERACIONAL */}
            <DRERow titulo="(+/-) Resultado Não Operacional" valor={dre.resultadoNaoOperacional} nivel={1} cor={dre.resultadoNaoOperacional >= 0 ? "green" : "red"} />
            <DRERow titulo="(+) Receita Não Operacional" valor={dre.receitaNaoOp.total} nivel={2} />
            {renderSubcategorias(dre.receitaNaoOp.subcategorias)}
            <DRERow titulo="(-) Despesa Não Operacional" valor={dre.despesaNaoOp.total} nivel={2} />
            {renderSubcategorias(dre.despesaNaoOp.subcategorias)}

            <Separator className="my-3" />

            {/* LUCRO LÍQUIDO */}
            <DRERow titulo="(=) LUCRO LÍQUIDO DO EXERCÍCIO" valor={dre.lucroLiquido} nivel={1} destaque cor={dre.lucroLiquido >= 0 ? "green" : "red"} />
            <DRERow titulo="    Margem Líquida" valor={`${dre.margemLiquida.toFixed(2)}%`} nivel={3} cor={dre.margemLiquida >= 0 ? "green" : "red"} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
