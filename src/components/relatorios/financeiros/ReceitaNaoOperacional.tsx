import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, Calendar, Tag, Briefcase, Filter, Download, Edit2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { format, startOfMonth, endOfMonth, subDays, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface ItemLancamento {
  id: string;
  lancamento_id: string;
  descricao2: string;
  produto_servico: string | null;
  valor: number;
  created_at: string;
}

interface LancamentoFinanceiro {
  id: string;
  user_id: string;
  tipo: string;
  descricao1: string;
  cliente_id: string | null;
  valor_total: number;
  dataPagamento: string;
  conta_id: string | null;
  nomeBanco: string;
  pago: boolean;
  data_cadastro: string;
  created_at: string;
  updated_at: string;
  observacao: string | null;
  mes_competencia: string;
  ano: string;
  valor_deducao: number | null;
  tipo_deducao: string | null;
  pet_ids: any;
  nomeCliente: string;
  nomePet: string;
  itens: ItemLancamento[];
}

interface ContaBancaria {
  id: string;
  nome: string;
  saldo: number;
}

export const ReceitaNaoOperacional = () => {
  const { user, ownerId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [lancamentoParaExcluir, setLancamentoParaExcluir] = useState<string | null>(null);

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

      // Carregar lançamentos
      const { data: lancamentosData, error: lancamentosError } = await supabase
        .from("lancamentos_financeiros")
        .select("*")
        .eq("user_id", user.id)
        .eq("tipo", "Receita")
        .eq("descricao1", "Receita Não Operacional")
        .order("data_pagamento", { ascending: false });

      if (lancamentosError) throw lancamentosError;

      // Carregar itens
      const { data: itensData, error: itensError } = await supabase
        .from("lancamentos_financeiros_itens")
        .select("*")
        .in(
          "lancamento_id",
          (lancamentosData || []).map((l) => l.id)
        );

      if (itensError) throw itensError;

      // Carregar clientes
      const { data: clientesData, error: clientesError } = await supabase
        .from("clientes")
        .select("id, nome_cliente")
        .eq("user_id", ownerId);

      if (clientesError) throw clientesError;

      // Carregar pets
      const { data: petsData, error: petsError } = await supabase
        .from("pets")
        .select("id, nome_pet, cliente_id")
        .eq("user_id", ownerId);

      if (petsError) throw petsError;

      // Carregar contas bancárias
      const { data: contasData, error: contasError } = await supabase
        .from("contas_bancarias")
        .select("id, nome")
        .eq("user_id", ownerId);

      if (contasError) throw contasError;

      // Mapear clientes e pets
      const clientesMap = new Map(clientesData?.map((c) => [c.id, c.nome_cliente]));
      const petsMap = new Map(petsData?.map((p) => [p.id, { nome: p.nome_pet, clienteId: p.cliente_id }]));
      const contasMap = new Map(contasData?.map((c) => [c.id, c.nome]));

      // Montar estrutura de lançamentos
      const lancamentosComItens: LancamentoFinanceiro[] = (lancamentosData || []).map((lanc) => {
        const itensDoLancamento = (itensData || []).filter((item) => item.lancamento_id === lanc.id);

        // Buscar o primeiro pet
        let petId = null;
        let petNome = "";
        let clienteNome = "";

        if (lanc.pet_ids && Array.isArray(lanc.pet_ids) && lanc.pet_ids.length > 0) {
          petId = lanc.pet_ids[0];
          const petInfo = petsMap.get(petId);
          if (petInfo) {
            petNome = petInfo.nome;
            const clienteId = petInfo.clienteId;
            clienteNome = clientesMap.get(clienteId) || "";
          }
        }

        return {
          ...lanc,
          dataPagamento: lanc.data_pagamento,
          nomeBanco: lanc.conta_id ? contasMap.get(lanc.conta_id) || "" : "",
          nomeCliente: clienteNome,
          nomePet: petNome,
          itens: itensDoLancamento,
        };
      });

      setLancamentos(lancamentosComItens);
    } catch (error) {
      console.error("Erro ao carregar lançamentos:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os lançamentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadContas = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("contas_bancarias")
        .select("id, nome, saldo")
        .eq("user_id", user.id);

      if (error) throw error;
      setContas(data || []);
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
    try {
      return format(new Date(dateString), "dd/MM/yyyy", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  const setPeriodoRapido = (tipo: string) => {
    const hoje = new Date();
    let inicio = "";
    let fim = "";

    switch (tipo) {
      case "hoje":
        inicio = format(hoje, "yyyy-MM-dd");
        fim = format(hoje, "yyyy-MM-dd");
        break;
      case "7dias":
        inicio = format(subDays(hoje, 7), "yyyy-MM-dd");
        fim = format(hoje, "yyyy-MM-dd");
        break;
      case "30dias":
        inicio = format(subDays(hoje, 30), "yyyy-MM-dd");
        fim = format(hoje, "yyyy-MM-dd");
        break;
      case "mes":
        inicio = format(startOfMonth(hoje), "yyyy-MM-dd");
        fim = format(endOfMonth(hoje), "yyyy-MM-dd");
        break;
      case "ano":
        inicio = format(startOfYear(hoje), "yyyy-MM-dd");
        fim = format(endOfYear(hoje), "yyyy-MM-dd");
        break;
    }

    setFiltros({ ...filtros, dataInicio: inicio, dataFim: fim });
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
    toast({
      title: "Sucesso",
      description: "Filtros limpos!",
    });
  };

  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter((l) => {
      // Filtro de data
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
        const contemCliente = l.nomeCliente.toLowerCase().includes(buscaLower);
        const contemPet = l.nomePet.toLowerCase().includes(buscaLower);
        if (!contemCliente && !contemPet) return false;
      }

      // Filtro de status (pago)
      if (filtros.pago === "true" && !l.pago) return false;
      if (filtros.pago === "false" && l.pago) return false;

      return true;
    });
  }, [lancamentos, filtros]);

  // Cálculos de KPI
  const totalReceitaNaoOperacional = useMemo(() => {
    return lancamentosFiltrados.reduce((acc, l) => acc + l.valor_total, 0);
  }, [lancamentosFiltrados]);

  const mediaDiariaReceita = useMemo(() => {
    if (!filtros.dataInicio || !filtros.dataFim) return 0;
    try {
      const inicio = new Date(filtros.dataInicio);
      const fim = new Date(filtros.dataFim);
      const dias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return totalReceitaNaoOperacional / dias;
    } catch {
      return 0;
    }
  }, [totalReceitaNaoOperacional, filtros.dataInicio, filtros.dataFim]);

  const receitaPorVendaAtivo = useMemo(() => {
    return lancamentosFiltrados.reduce((acc, l) => {
      const somaVendaAtivo = l.itens
        .filter((item) => item.descricao2 === "Venda de Ativo")
        .reduce((sum, item) => sum + item.valor, 0);
      return acc + somaVendaAtivo;
    }, 0);
  }, [lancamentosFiltrados]);

  const receitaPorOutras = useMemo(() => {
    return lancamentosFiltrados.reduce((acc, l) => {
      const somaOutras = l.itens
        .filter((item) => item.descricao2 === "Outras Receitas Não Operacionais")
        .reduce((sum, item) => sum + item.valor, 0);
      return acc + somaOutras;
    }, 0);
  }, [lancamentosFiltrados]);

  const receitaPorResgateAplicacao = useMemo(() => {
    return lancamentosFiltrados.reduce((acc, l) => {
      const soma = l.itens
        .filter((item) => item.descricao2 === "Resgate de Aplicação Financeira")
        .reduce((sum, item) => sum + item.valor, 0);
      return acc + soma;
    }, 0);
  }, [lancamentosFiltrados]);

  // Dados para gráfico de barras
  const dadosGraficoBarras = useMemo(() => {
    return [
      { categoria: "Venda de Ativo", valor: receitaPorVendaAtivo },
      { categoria: "Resgate Aplic. Fin.", valor: receitaPorResgateAplicacao },
      { categoria: "Outras", valor: receitaPorOutras },
    ];
  }, [receitaPorVendaAtivo, receitaPorResgateAplicacao, receitaPorOutras]);

  // Dados para gráfico de linha (evolução por dia)
  const dadosGraficoLinha = useMemo(() => {
    const receitaPorDia = new Map<string, number>();

    lancamentosFiltrados.forEach((l) => {
      const data = l.dataPagamento;
      const valorAtual = receitaPorDia.get(data) || 0;
      receitaPorDia.set(data, valorAtual + l.valor_total);
    });

    const dados = Array.from(receitaPorDia.entries())
      .map(([data, valor]) => ({
        data: formatDate(data),
        valor,
      }))
      .sort((a, b) => {
        const dataA = a.data.split("/").reverse().join("-");
        const dataB = b.data.split("/").reverse().join("-");
        return dataA.localeCompare(dataB);
      });

    return dados;
  }, [lancamentosFiltrados]);

  const handleExcluir = async () => {
    if (!lancamentoParaExcluir) return;

    try {
      // Excluir itens primeiro
      const { error: itensError } = await supabase
        .from("lancamentos_financeiros_itens")
        .delete()
        .eq("lancamento_id", lancamentoParaExcluir);

      if (itensError) throw itensError;

      // Excluir lançamento
      const { error: lancamentoError } = await supabase
        .from("lancamentos_financeiros")
        .delete()
        .eq("id", lancamentoParaExcluir);

      if (lancamentoError) throw lancamentoError;

      toast({
        title: "Sucesso",
        description: "Lançamento excluído com sucesso!",
      });
      setLancamentoParaExcluir(null);
      loadLancamentos();
    } catch (error) {
      console.error("Erro ao excluir lançamento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o lançamento.",
        variant: "destructive",
      });
    }
  };

  const exportarCSV = () => {
    const headers = ["Data", "Ano/Mês", "Tipo", "Cliente", "Pet", "Descrição 1", "Descrição 2", "Valor Total", "Banco", "Status"];
    const rows = lancamentosFiltrados.map((l) => [
      formatDate(l.dataPagamento),
      `${l.ano}/${l.mes_competencia}`,
      l.tipo,
      l.nomeCliente,
      l.nomePet,
      l.descricao1,
      l.itens.map((i) => i.descricao2).join("; "),
      formatCurrency(l.valor_total),
      l.nomeBanco,
      l.pago ? "Recebido" : "A Receber",
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `receita-nao-operacional-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();

    toast({
      title: "Sucesso",
      description: "Relatório exportado com sucesso!",
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Relatório de Receita Não Operacional</h2>
        <Button onClick={exportarCSV} size="sm" variant="outline">
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
            <Label className="text-xs font-semibold">Período</Label>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setPeriodoRapido("hoje")} size="sm" variant="outline" className="text-xs">
                Hoje
              </Button>
              <Button onClick={() => setPeriodoRapido("7dias")} size="sm" variant="outline" className="text-xs">
                7 dias
              </Button>
              <Button onClick={() => setPeriodoRapido("30dias")} size="sm" variant="outline" className="text-xs">
                30 dias
              </Button>
              <Button onClick={() => setPeriodoRapido("mes")} size="sm" variant="outline" className="text-xs">
                Mês Atual
              </Button>
              <Button onClick={() => setPeriodoRapido("ano")} size="sm" variant="outline" className="text-xs">
                Ano Atual
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Data Início</Label>
                <Input
                  type="date"
                  value={filtros.dataInicio}
                  onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Data Fim</Label>
                <Input
                  type="date"
                  value={filtros.dataFim}
                  onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Outros filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Descrição 2</Label>
              <Select value={filtros.descricao2} onValueChange={(value) => setFiltros({ ...filtros, descricao2: value })}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Todas as subcategorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="text-xs">Todas</SelectItem>
                  <SelectItem value="Venda de Ativo" className="text-xs">Venda de Ativo</SelectItem>
                  <SelectItem value="Resgate de Aplicação Financeira" className="text-xs">Resgate de Aplicação Financeira</SelectItem>
                  <SelectItem value="Outras Receitas Não Operacionais" className="text-xs">Outras Receitas Não Operacionais</SelectItem>
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
                placeholder="Buscar cliente ou pet"
                value={filtros.busca}
                onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
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

          <div className="flex gap-2">
            <Button onClick={loadLancamentos} size="sm">
              Atualizar
            </Button>
            <Button onClick={limparFiltros} size="sm" variant="outline">
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
        )}
      </Card>

      {/* Cards KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total de Receita Não Operacional</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalReceitaNaoOperacional)}</div>
            <p className="text-xs text-muted-foreground mt-1">No período selecionado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Média Diária de Receita</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(mediaDiariaReceita)}</div>
            <p className="text-xs text-muted-foreground mt-1">Média por dia útil</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Venda de Ativo</CardTitle>
            <Tag className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(receitaPorVendaAtivo)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total de vendas de ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Resgate de Aplicação Financeira</CardTitle>
            <TrendingUp className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(receitaPorResgateAplicacao)}</div>
            <p className="text-xs text-muted-foreground mt-1">Total de resgates de aplicações</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Outras Receitas Não Operacionais</CardTitle>
            <Briefcase className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(receitaPorOutras)}</div>
            <p className="text-xs text-muted-foreground mt-1">Outras receitas não operacionais</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lançamentos</CardTitle>
        </CardHeader>
        <CardContent>
          {lancamentosFiltrados.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum lançamento de Receita Não Operacional encontrado no período selecionado.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Ano/Mês</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Pet</TableHead>
                    <TableHead>Descrição 1</TableHead>
                    <TableHead>Descrição 2</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Valor Total</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lancamentosFiltrados.map((lanc) => (
                    <TableRow key={lanc.id}>
                      <TableCell className="text-xs">{formatDate(lanc.dataPagamento)}</TableCell>
                      <TableCell className="text-xs">{`${lanc.ano}/${lanc.mes_competencia}`}</TableCell>
                      <TableCell className="text-xs">{lanc.tipo}</TableCell>
                      <TableCell className="text-xs">{lanc.nomeCliente}</TableCell>
                      <TableCell className="text-xs">{lanc.nomePet}</TableCell>
                      <TableCell className="text-xs">{lanc.descricao1}</TableCell>
                      <TableCell className="text-xs">{lanc.itens.map((i) => i.descricao2).join(", ")}</TableCell>
                      <TableCell className="text-xs">{lanc.itens.length}</TableCell>
                      <TableCell className="text-xs font-medium">{formatCurrency(lanc.valor_total)}</TableCell>
                      <TableCell className="text-xs">{lanc.nomeBanco}</TableCell>
                      <TableCell>
                        <Badge variant={lanc.pago ? "default" : "secondary"} className="text-xs">
                          {lanc.pago ? "Recebido" : "A Receber"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => setLancamentoParaExcluir(lanc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Barras */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receita por Descrição 2</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosGraficoBarras}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoria" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Bar dataKey="valor" fill="#8884d8" name="Valor" />
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
                  <XAxis dataKey="data" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="valor" stroke="#82ca9d" name="Receita" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={!!lancamentoParaExcluir} onOpenChange={(open) => !open && setLancamentoParaExcluir(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLancamentoParaExcluir(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleExcluir}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
