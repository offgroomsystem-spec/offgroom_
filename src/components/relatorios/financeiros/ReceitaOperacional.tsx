import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  DollarSign,
  Filter,
  Calendar,
  BarChart3,
  Download,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { KPICard } from "@/components/relatorios/shared/KPICard";

interface ItemLancamento {
  id: string;
  descricao2: string;
  produtoServico: string;
  valor: number;
}

interface LancamentoFinanceiro {
  id: string;
  ano: string;
  mesCompetencia: string;
  tipo: string;
  descricao1: string;
  nomeCliente: string;
  nomePet: string;
  itens: ItemLancamento[];
  valorTotal: number;
  dataPagamento: string;
  nomeBanco: string;
  pago: boolean;
  dataCadastro: string;
}

interface ContaBancaria {
  id: string;
  nome: string;
}

export const ReceitaOperacional = () => {
  const { user, ownerId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState<LancamentoFinanceiro | null>(null);

  const [filtros, setFiltros] = useState({
    dataInicio: "",
    dataFim: "",
    descricao2: "all",
    nomeBanco: "all",
    busca: "",
    pago: "all" as "all" | "true" | "false",
  });

  const loadLancamentos = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("lancamentos_financeiros")
        .select(`
          *,
          lancamentos_financeiros_itens (*)
        `)
        .eq("user_id", user.id)
        .eq("tipo", "Receita")
        .eq("descricao1", "Receita Operacional")
        .order("data_pagamento", { ascending: false });

      if (error) throw error;

      const lancamentosFormatados = (data || []).map((l: any) => ({
        id: l.id,
        ano: l.ano,
        mesCompetencia: l.mes_competencia,
        tipo: l.tipo,
        descricao1: l.descricao1,
        nomeCliente: "",
        nomePet: "",
        itens: (l.lancamentos_financeiros_itens || []).map((i: any) => ({
          id: i.id,
          descricao2: i.descricao2,
          produtoServico: i.produto_servico || "",
          valor: Number(i.valor),
        })),
        valorTotal: Number(l.valor_total),
        dataPagamento: l.data_pagamento,
        nomeBanco: "",
        pago: l.pago,
        dataCadastro: l.data_cadastro || l.created_at,
      }));

      // Carregar dados relacionados
      const [clientesData, petsData, contasData] = await Promise.all([
        supabase.from("clientes").select("*").eq("user_id", ownerId),
        supabase.from("pets").select("*").eq("user_id", ownerId),
        supabase.from("contas_bancarias").select("*").eq("user_id", ownerId),
      ]);

      if (clientesData.data && petsData.data && contasData.data) {
        const clientesMap = new Map(clientesData.data.map((c: any) => [c.id, c.nome_cliente]));
        const petsMap = new Map(petsData.data.map((p: any) => [p.cliente_id, p.nome_pet]));
        const contasMap = new Map(contasData.data.map((c: any) => [c.id, c.nome]));

        lancamentosFormatados.forEach((l: any) => {
          const lancOriginal = data?.find((lo: any) => lo.id === l.id);
          if (lancOriginal) {
            l.nomeCliente = clientesMap.get(lancOriginal.cliente_id) || "";
            l.nomePet = petsMap.get(lancOriginal.cliente_id) || "";
            l.nomeBanco = contasMap.get(lancOriginal.conta_id) || "";
          }
        });
      }

      setLancamentos(lancamentosFormatados);
    } catch (error) {
      console.error("Erro ao carregar lançamentos:", error);
      toast.error("Erro ao carregar lançamentos");
    } finally {
      setLoading(false);
    }
  };

  const loadContas = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("contas_bancarias")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;

      setContas(
        (data || []).map((c: any) => ({
          id: c.id,
          nome: c.nome,
        }))
      );
    } catch (error) {
      console.error("Erro ao carregar contas:", error);
    }
  };

  useEffect(() => {
    if (user) {
      loadLancamentos();
      loadContas();
    }
  }, [user]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString + "T00:00:00");
    return date.toLocaleDateString("pt-BR");
  };

  const setPeriodoRapido = (tipo: string) => {
    const hoje = new Date();
    let dataInicio = "";
    let dataFim = "";

    switch (tipo) {
      case "hoje":
        dataInicio = dataFim = hoje.toISOString().split("T")[0];
        break;
      case "7dias":
        const seteDiasAtras = new Date(hoje);
        seteDiasAtras.setDate(hoje.getDate() - 7);
        dataInicio = seteDiasAtras.toISOString().split("T")[0];
        dataFim = hoje.toISOString().split("T")[0];
        break;
      case "30dias":
        const trintaDiasAtras = new Date(hoje);
        trintaDiasAtras.setDate(hoje.getDate() - 30);
        dataInicio = trintaDiasAtras.toISOString().split("T")[0];
        dataFim = hoje.toISOString().split("T")[0];
        break;
      case "mesAtual":
        dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split("T")[0];
        dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split("T")[0];
        break;
      case "anoAtual":
        dataInicio = new Date(hoje.getFullYear(), 0, 1).toISOString().split("T")[0];
        dataFim = new Date(hoje.getFullYear(), 11, 31).toISOString().split("T")[0];
        break;
    }

    setFiltros((prev) => ({ ...prev, dataInicio, dataFim }));
  };

  const limparFiltros = () => {
    setFiltros({
      dataInicio: "",
      dataFim: "",
      descricao2: "all",
      nomeBanco: "all",
      busca: "",
      pago: "all",
    });
    toast.success("Filtros limpos!");
  };

  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter((l) => {
      // Filtro de período
      if (filtros.dataInicio && l.dataPagamento < filtros.dataInicio) return false;
      if (filtros.dataFim && l.dataPagamento > filtros.dataFim) return false;

      // Filtro de descrição 2
      if (filtros.descricao2 && filtros.descricao2 !== "all") {
        const temDescricao2 = l.itens.some((item) => item.descricao2 === filtros.descricao2);
        if (!temDescricao2) return false;
      }

      // Filtro de banco
      if (filtros.nomeBanco && filtros.nomeBanco !== "all" && l.nomeBanco !== filtros.nomeBanco) return false;

      // Filtro de busca (cliente ou pet)
      if (filtros.busca) {
        const buscaLower = filtros.busca.toLowerCase();
        const matchCliente = l.nomeCliente.toLowerCase().includes(buscaLower);
        const matchPet = l.nomePet.toLowerCase().includes(buscaLower);
        if (!matchCliente && !matchPet) return false;
      }

      // Filtro de status
      if (filtros.pago === "true" && !l.pago) return false;
      if (filtros.pago === "false" && l.pago) return false;

      return true;
    });
  }, [lancamentos, filtros]);

  // Cálculos de KPIs
  const totalReceitaOperacional = useMemo(() => {
    return lancamentosFiltrados.reduce((acc, l) => acc + l.valorTotal, 0);
  }, [lancamentosFiltrados]);

  const mediaDiariaReceita = useMemo(() => {
    if (!filtros.dataInicio || !filtros.dataFim || lancamentosFiltrados.length === 0) {
      return 0;
    }

    const inicio = new Date(filtros.dataInicio + "T00:00:00");
    const fim = new Date(filtros.dataFim + "T00:00:00");
    const dias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    return totalReceitaOperacional / dias;
  }, [totalReceitaOperacional, filtros.dataInicio, filtros.dataFim, lancamentosFiltrados]);

  const receitaPorServicos = useMemo(() => {
    return lancamentosFiltrados.reduce((acc, l) => {
      const valorServicos = l.itens
        .filter((item) => item.descricao2 === "Serviços")
        .reduce((sum, item) => sum + item.valor, 0);
      return acc + valorServicos;
    }, 0);
  }, [lancamentosFiltrados]);

  const receitaPorVendas = useMemo(() => {
    return lancamentosFiltrados.reduce((acc, l) => {
      const valorVendas = l.itens
        .filter((item) => item.descricao2 === "Venda")
        .reduce((sum, item) => sum + item.valor, 0);
      return acc + valorVendas;
    }, 0);
  }, [lancamentosFiltrados]);

  // Dados para gráfico de barras
  const dadosGraficoBarras = useMemo(() => {
    const servicos = lancamentosFiltrados.reduce((acc, l) => {
      return acc + l.itens.filter((i) => i.descricao2 === "Serviços").reduce((sum, i) => sum + i.valor, 0);
    }, 0);

    const vendas = lancamentosFiltrados.reduce((acc, l) => {
      return acc + l.itens.filter((i) => i.descricao2 === "Venda").reduce((sum, i) => sum + i.valor, 0);
    }, 0);

    const outras = lancamentosFiltrados.reduce((acc, l) => {
      return acc + l.itens.filter((i) => i.descricao2 === "Outras Receitas Operacionais").reduce((sum, i) => sum + i.valor, 0);
    }, 0);

    return [
      { categoria: "Serviços", valor: servicos },
      { categoria: "Vendas", valor: vendas },
      { categoria: "Outras", valor: outras },
    ].filter((item) => item.valor > 0);
  }, [lancamentosFiltrados]);

  // Dados para gráfico de linha
  const dadosGraficoLinha = useMemo(() => {
    const receitaPorDia: { [key: string]: number } = {};

    lancamentosFiltrados.forEach((l) => {
      const data = l.dataPagamento;
      receitaPorDia[data] = (receitaPorDia[data] || 0) + l.valorTotal;
    });

    return Object.entries(receitaPorDia)
      .map(([data, valor]) => ({
        data: formatDate(data),
        valor,
      }))
      .sort((a, b) => {
        const [diaA, mesA, anoA] = a.data.split("/");
        const [diaB, mesB, anoB] = b.data.split("/");
        return new Date(`${anoA}-${mesA}-${diaA}`).getTime() - new Date(`${anoB}-${mesB}-${diaB}`).getTime();
      });
  }, [lancamentosFiltrados]);

  const handleExcluir = async () => {
    if (!lancamentoSelecionado || !user) return;
    try {
      await supabase
        .from("lancamentos_financeiros_itens")
        .delete()
        .eq("lancamento_id", lancamentoSelecionado.id);

      await supabase
        .from("lancamentos_financeiros")
        .delete()
        .eq("id", lancamentoSelecionado.id);

      toast.success("Lançamento excluído com sucesso!");
      await loadLancamentos();
      setIsDeleteDialogOpen(false);
      setLancamentoSelecionado(null);
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir lançamento");
    }
  };

  const exportarCSV = () => {
    const headers = ["Data", "Ano/Mês", "Cliente", "Pet", "Descrição 2", "Valor", "Banco", "Status"];
    const rows = lancamentosFiltrados.map((l) => [
      formatDate(l.dataPagamento),
      `${l.ano}/${l.mesCompetencia}`,
      l.nomeCliente,
      l.nomePet,
      l.itens.map((i) => i.descricao2).join("; "),
      l.valorTotal,
      l.nomeBanco,
      l.pago ? "Recebido" : "A Receber",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `receita-operacional-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Relatório exportado com sucesso!");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Relatório de Receita Operacional</h1>
        </div>
        <Button variant="outline" onClick={exportarCSV}>
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Painel de Filtros Colapsável */}
      <Card>
        <CardHeader className="pb-3">
          <Button
            variant="ghost"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="font-semibold">Filtros</span>
            </div>
            {mostrarFiltros ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardHeader>

        {mostrarFiltros && (
          <CardContent className="space-y-4">
            {/* Período */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Período (Data do Pagamento)</Label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px]">Data Início</Label>
                  <Input
                    type="date"
                    value={filtros.dataInicio}
                    onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[10px]">Data Fim</Label>
                  <Input
                    type="date"
                    value={filtros.dataFim}
                    onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setPeriodoRapido("hoje")} className="text-xs h-7">
                  Hoje
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPeriodoRapido("7dias")} className="text-xs h-7">
                  7 dias
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPeriodoRapido("30dias")} className="text-xs h-7">
                  30 dias
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPeriodoRapido("mesAtual")} className="text-xs h-7">
                  Mês Atual
                </Button>
                <Button variant="outline" size="sm" onClick={() => setPeriodoRapido("anoAtual")} className="text-xs h-7">
                  Ano Atual
                </Button>
              </div>
            </div>

            {/* Outros Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Descrição 2</Label>
                <Select value={filtros.descricao2} onValueChange={(value) => setFiltros({ ...filtros, descricao2: value })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todas as subcategorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">Todas</SelectItem>
                    <SelectItem value="Serviços" className="text-xs">Serviços</SelectItem>
                    <SelectItem value="Venda" className="text-xs">Venda</SelectItem>
                    <SelectItem value="Outras Receitas Operacionais" className="text-xs">Outras Receitas Operacionais</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Banco</Label>
                <Select value={filtros.nomeBanco} onValueChange={(value) => setFiltros({ ...filtros, nomeBanco: value })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos os bancos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">Todos</SelectItem>
                    {contas.map((conta) => (
                      <SelectItem key={conta.id} value={conta.nome} className="text-xs">
                        {conta.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Cliente / Pet</Label>
                <Input
                  type="text"
                  value={filtros.busca}
                  onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                  placeholder="Buscar cliente ou pet..."
                  className="h-8 text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Status</Label>
                <Select value={filtros.pago} onValueChange={(value) => setFiltros({ ...filtros, pago: value as "all" | "true" | "false" })}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">Todos</SelectItem>
                    <SelectItem value="true" className="text-xs">Recebido</SelectItem>
                    <SelectItem value="false" className="text-xs">A Receber</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex gap-2">
              <Button onClick={limparFiltros} variant="outline" size="sm" className="text-xs">
                🧹 Limpar Filtros
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Cards de Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        <KPICard
          titulo="Total de Receita Operacional"
          valor={totalReceitaOperacional}
          icon={<TrendingUp />}
          cor="green"
          subtitulo="No período selecionado"
        />
        <KPICard
          titulo="Média Diária de Receita"
          valor={mediaDiariaReceita}
          icon={<Calendar />}
          cor="default"
          subtitulo="Média por dia"
        />
        <KPICard
          titulo="Receita por Serviços"
          valor={receitaPorServicos}
          icon={<DollarSign />}
          cor="default"
          subtitulo="Total de serviços prestados"
        />
        <KPICard
          titulo="Receita por Vendas"
          valor={receitaPorVendas}
          icon={<BarChart3 />}
          cor="default"
          subtitulo="Total de vendas de produtos"
        />
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lançamentos de Receita Operacional</CardTitle>
        </CardHeader>
        <CardContent>
          {lancamentosFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum lançamento de Receita Operacional encontrado no período selecionado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data do Pagamento</TableHead>
                    <TableHead className="text-xs">Ano/Mês</TableHead>
                    <TableHead className="text-xs">Tipo</TableHead>
                    <TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs">Pet</TableHead>
                    <TableHead className="text-xs">Descrição 1</TableHead>
                    <TableHead className="text-xs">Descrição 2</TableHead>
                    <TableHead className="text-xs">Itens</TableHead>
                    <TableHead className="text-xs">Valor Total</TableHead>
                    <TableHead className="text-xs">Banco</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lancamentosFiltrados.map((lancamento) => (
                    <TableRow key={lancamento.id} className="hover:bg-secondary/50">
                      <TableCell className="text-xs">{formatDate(lancamento.dataPagamento)}</TableCell>
                      <TableCell className="text-xs">{`${lancamento.ano}/${lancamento.mesCompetencia}`}</TableCell>
                      <TableCell>
                        <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                          {lancamento.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{lancamento.nomeCliente || "-"}</TableCell>
                      <TableCell className="text-xs">{lancamento.nomePet || "-"}</TableCell>
                      <TableCell className="text-xs">{lancamento.descricao1}</TableCell>
                      <TableCell className="text-xs">
                        {lancamento.itens.map((item) => item.descricao2).join(", ")}
                      </TableCell>
                      <TableCell className="text-xs">{lancamento.itens.length} item(s)</TableCell>
                      <TableCell className="text-xs font-semibold">{formatCurrency(lancamento.valorTotal)}</TableCell>
                      <TableCell className="text-xs">{lancamento.nomeBanco}</TableCell>
                      <TableCell>
                        <Badge
                          variant={lancamento.pago ? "default" : "secondary"}
                          className={`text-xs ${
                            lancamento.pago ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                          }`}
                        >
                          {lancamento.pago ? "Recebido" : "A Receber"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            title="Excluir Lançamento"
                            onClick={() => {
                              setLancamentoSelecionado(lancamento);
                              setIsDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráficos */}
      {lancamentosFiltrados.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Gráfico de Barras */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receita por Descrição 2</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosGraficoBarras}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoria" style={{ fontSize: "12px" }} />
                  <YAxis style={{ fontSize: "12px" }} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ fontSize: "12px" }}
                  />
                  <Bar dataKey="valor" fill="#8b5cf6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Gráfico de Linha */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução da Receita (por dia)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dadosGraficoLinha}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" style={{ fontSize: "12px" }} />
                  <YAxis style={{ fontSize: "12px" }} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ fontSize: "12px" }}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={2} dot />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
