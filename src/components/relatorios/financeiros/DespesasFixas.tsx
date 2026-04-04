import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingDown, Calendar, Building2, Receipt, Filter, Download, Edit2, Trash2, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { format, startOfMonth, endOfMonth, subDays, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface ItemLancamento {
  id: string;
  descricao2: string;
  valor: number;
  observacao?: string;
}

interface LancamentoFinanceiro {
  id: string;
  tipo: string;
  descricao1: string;
  dataPagamento: string;
  valorTotal: number;
  pago: boolean;
  nomeBanco?: string;
  nomeCliente?: string;
  nomePet?: string;
  ano: string;
  mesCompetencia: string;
  itens: ItemLancamento[];
}

interface ContaBancaria {
  id: string;
  nome: string;
  saldo: number;
}

export function DespesasFixas() {
  const [loading, setLoading] = useState(true);
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [lancamentoParaExcluir, setLancamentoParaExcluir] = useState<string | null>(null);
  
  // Estados para edição
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState<LancamentoFinanceiro | null>(null);
  
  // Estados do formulário de edição
  const [formData, setFormData] = useState({
    ano: "",
    mesCompetencia: "",
    tipo: "Despesa",
    descricao1: "Despesa Fixa",
    dataPagamento: "",
    nomeCliente: "",
    nomePet: "",
    nomeBanco: "",
    pago: false,
    valorDeducao: 0,
    tipoDeducao: "",
  });
  
  const [itensLancamento, setItensLancamento] = useState<ItemLancamento[]>([
    { id: Date.now().toString(), descricao2: "", valor: 0 }
  ]);

  const [filtros, setFiltros] = useState({
    dataInicio: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    dataFim: format(endOfMonth(new Date()), "yyyy-MM-dd"),
    descricao2: "all",
    nomeBanco: "all",
    busca: "",
    pago: "all" as "all" | "true" | "false",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: lancamentosData, error: lancamentosError } = await supabase
        .from("lancamentos_financeiros")
        .select(`
          id,
          tipo,
          descricao1,
          data_pagamento,
          valor_total,
          pago,
          conta_id,
          cliente_id,
          ano,
          mes_competencia,
          contas_bancarias (nome),
          clientes (nome_cliente),
          pets:pet_ids
        `)
        .eq("user_id", user.id)
        .eq("tipo", "Despesa")
        .eq("descricao1", "Despesa Fixa")
        .order("data_pagamento", { ascending: false });

      if (lancamentosError) throw lancamentosError;

      const { data: itensData, error: itensError } = await supabase
        .from("lancamentos_financeiros_itens")
        .select("*")
        .in(
          "lancamento_id",
          lancamentosData?.map((l: any) => l.id) || []
        );

      if (itensError) throw itensError;

      const { data: contasData, error: contasError } = await supabase
        .from("contas_bancarias")
        .select("*")
        .eq("user_id", user.id);

      if (contasError) throw contasError;

      const petIds = lancamentosData
        ?.flatMap((l: any) => l.pets || [])
        .filter((id: string) => id);

      let petsData: any[] = [];
      if (petIds && petIds.length > 0) {
        const { data, error } = await supabase
          .from("pets")
          .select("id, nome_pet")
          .in("id", petIds);

        if (!error) petsData = data || [];
      }

      const lancamentosFormatados: LancamentoFinanceiro[] = (lancamentosData || []).map((l: any) => {
        const petId = Array.isArray(l.pets) && l.pets.length > 0 ? l.pets[0] : null;
        const pet = petId ? petsData.find((p) => p.id === petId) : null;

        return {
          id: l.id,
          tipo: l.tipo,
          descricao1: l.descricao1,
          dataPagamento: l.data_pagamento,
          valorTotal: l.valor_total,
          pago: l.pago,
          nomeBanco: l.contas_bancarias?.nome,
          nomeCliente: l.clientes?.nome_cliente,
          nomePet: pet?.nome_pet,
          ano: l.ano,
          mesCompetencia: l.mes_competencia,
          itens: (itensData || [])
            .filter((item: any) => item.lancamento_id === l.id)
            .map((item: any) => ({
              id: item.id,
              descricao2: item.descricao2,
              valor: item.valor,
              observacao: item.observacao,
            })),
        };
      });

      setLancamentos(lancamentosFormatados);
      setContas(contasData || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do relatório.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const lancamentosFiltrados = useMemo(() => {
    let resultado = lancamentos;

    if (filtros.dataInicio) {
      resultado = resultado.filter((l) => l.dataPagamento >= filtros.dataInicio);
    }
    if (filtros.dataFim) {
      resultado = resultado.filter((l) => l.dataPagamento <= filtros.dataFim);
    }

    if (filtros.descricao2 !== "all") {
      resultado = resultado.filter((l) =>
        l.itens.some((item) => item.descricao2 === filtros.descricao2)
      );
    }

    if (filtros.nomeBanco !== "all") {
      resultado = resultado.filter((l) => l.nomeBanco === filtros.nomeBanco);
    }

    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      resultado = resultado.filter(
        (l) =>
          l.nomeCliente?.toLowerCase().includes(busca) ||
          l.nomePet?.toLowerCase().includes(busca)
      );
    }

    if (filtros.pago !== "all") {
      resultado = resultado.filter((l) => l.pago === (filtros.pago === "true"));
    }

    return resultado.sort((a, b) => b.dataPagamento.localeCompare(a.dataPagamento));
  }, [lancamentos, filtros]);

  const totalDespesas = useMemo(
    () => lancamentosFiltrados.reduce((acc, l) => acc + l.valorTotal, 0),
    [lancamentosFiltrados]
  );

  const mediaMensal = useMemo(() => {
    if (!filtros.dataInicio || !filtros.dataFim) return 0;

    const inicio = new Date(filtros.dataInicio);
    const fim = new Date(filtros.dataFim);
    const meses =
      (fim.getFullYear() - inicio.getFullYear()) * 12 +
      (fim.getMonth() - inicio.getMonth()) +
      1;

    return meses > 0 ? totalDespesas / meses : 0;
  }, [totalDespesas, filtros.dataInicio, filtros.dataFim]);

  const aluguelSalarios = useMemo(
    () =>
      lancamentosFiltrados
        .filter((l) =>
          l.itens.some((i) => i.descricao2 === "Aluguel" || i.descricao2 === "Salários")
        )
        .reduce((acc, l) => acc + l.valorTotal, 0),
    [lancamentosFiltrados]
  );

  const impostos = useMemo(
    () =>
      lancamentosFiltrados
        .filter((l) => l.itens.some((i) => i.descricao2 === "Impostos Fixos"))
        .reduce((acc, l) => acc + l.valorTotal, 0),
    [lancamentosFiltrados]
  );

  const dadosGraficoBarras = useMemo(() => {
    const aluguel = lancamentosFiltrados
      .filter((l) => l.itens.some((i) => i.descricao2 === "Aluguel"))
      .reduce((acc, l) => acc + l.valorTotal, 0);

    const salarios = lancamentosFiltrados
      .filter((l) => l.itens.some((i) => i.descricao2 === "Salários"))
      .reduce((acc, l) => acc + l.valorTotal, 0);

    const impostosFixos = lancamentosFiltrados
      .filter((l) => l.itens.some((i) => i.descricao2 === "Impostos Fixos"))
      .reduce((acc, l) => acc + l.valorTotal, 0);

    const sistemasSoftwares = lancamentosFiltrados
      .filter((l) => l.itens.some((i) => i.descricao2 === "Sistemas e Softwares"))
      .reduce((acc, l) => acc + l.valorTotal, 0);

    const outras = lancamentosFiltrados
      .filter((l) => l.itens.some((i) => i.descricao2 === "Outras Despesas Fixas"))
      .reduce((acc, l) => acc + l.valorTotal, 0);

    return [
      { categoria: "Aluguel", valor: aluguel },
      { categoria: "Salários", valor: salarios },
      { categoria: "Impostos", valor: impostosFixos },
      { categoria: "Sistemas/Softwares", valor: sistemasSoftwares },
      { categoria: "Outras", valor: outras },
    ];
  }, [lancamentosFiltrados]);

  const dadosGraficoLinha = useMemo(() => {
    const porDia: { [key: string]: number } = {};

    lancamentosFiltrados.forEach((l) => {
      const data = format(new Date(l.dataPagamento), "dd/MM", { locale: ptBR });
      porDia[data] = (porDia[data] || 0) + l.valorTotal;
    });

    return Object.entries(porDia)
      .map(([data, valor]) => ({ data, valor }))
      .sort((a, b) => {
        const [diaA, mesA] = a.data.split("/").map(Number);
        const [diaB, mesB] = b.data.split("/").map(Number);
        return mesA === mesB ? diaA - diaB : mesA - mesB;
      });
  }, [lancamentosFiltrados]);

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  const formatarData = (data: string) => {
    return format(new Date(data), "dd/MM/yyyy", { locale: ptBR });
  };

  const setPeriodoRapido = (tipo: string) => {
    const hoje = new Date();
    let inicio: Date;
    let fim: Date;

    switch (tipo) {
      case "hoje":
        inicio = hoje;
        fim = hoje;
        break;
      case "7dias":
        inicio = subDays(hoje, 7);
        fim = hoje;
        break;
      case "mes":
        inicio = startOfMonth(hoje);
        fim = endOfMonth(hoje);
        break;
      case "ano":
        inicio = startOfYear(hoje);
        fim = endOfYear(hoje);
        break;
      default:
        return;
    }

    setFiltros({
      ...filtros,
      dataInicio: format(inicio, "yyyy-MM-dd"),
      dataFim: format(fim, "yyyy-MM-dd"),
    });
  };

  const aplicarFiltros = () => {
    setMostrarFiltros(false);
    toast({
      title: "Filtros aplicados",
      description: "Os filtros foram aplicados com sucesso.",
    });
  };

  const limparFiltros = () => {
    setFiltros({
      dataInicio: format(startOfMonth(new Date()), "yyyy-MM-dd"),
      dataFim: format(endOfMonth(new Date()), "yyyy-MM-dd"),
      descricao2: "all",
      nomeBanco: "all",
      busca: "",
      pago: "all",
    });
    toast({
      title: "Filtros limpos",
      description: "Os filtros foram resetados.",
    });
  };

  const handleDelete = (id: string) => {
    setLancamentoParaExcluir(id);
    setIsDeleteDialogOpen(true);
  };

  const confirmarExclusao = async () => {
    if (!lancamentoParaExcluir) return;

    try {
      await supabase
        .from("lancamentos_financeiros_itens")
        .delete()
        .eq("lancamento_id", lancamentoParaExcluir);

      const { error } = await supabase
        .from("lancamentos_financeiros")
        .delete()
        .eq("id", lancamentoParaExcluir);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Lançamento excluído com sucesso!",
      });

      loadData();
    } catch (error) {
      console.error("Erro ao excluir lançamento:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir lançamento.",
        variant: "destructive",
      });
    } finally {
      setIsDeleteDialogOpen(false);
      setLancamentoParaExcluir(null);
    }
  };

  const abrirEdicao = (lancamento: LancamentoFinanceiro) => {
    setLancamentoSelecionado(lancamento);
    
    setFormData({
      ano: lancamento.ano,
      mesCompetencia: lancamento.mesCompetencia,
      tipo: "Despesa",
      descricao1: "Despesa Fixa",
      dataPagamento: lancamento.dataPagamento,
      nomeCliente: lancamento.nomeCliente || "",
      nomePet: lancamento.nomePet || "",
      nomeBanco: lancamento.nomeBanco || "",
      pago: lancamento.pago,
      valorDeducao: 0,
      tipoDeducao: "",
    });
    
    setItensLancamento(
      lancamento.itens.map((item) => ({
        id: item.id,
        descricao2: item.descricao2,
        valor: item.valor,
        observacao: item.observacao || "",
      }))
    );
    
    setIsEditDialogOpen(true);
  };
  
  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!lancamentoSelecionado) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        });
        return;
      }
      
      // Calcular valor total
      const valorTotal = itensLancamento.reduce((acc, item) => acc + item.valor, 0);
      
      // Buscar IDs das entidades
      const { data: contaData } = await supabase
        .from("contas_bancarias")
        .select("id")
        .eq("nome", formData.nomeBanco)
        .eq("user_id", user.id)
        .maybeSingle();
      
      const { data: clienteData } = await supabase
        .from("clientes")
        .select("id")
        .eq("nome_cliente", formData.nomeCliente)
        .eq("user_id", user.id)
        .maybeSingle();
      
      // Atualizar lançamento principal
      const { error: updateError } = await supabase
        .from("lancamentos_financeiros")
        .update({
          ano: formData.ano,
          mes_competencia: formData.mesCompetencia,
          tipo: "Despesa",
          descricao1: "Despesa Fixa",
          data_pagamento: formData.dataPagamento,
          conta_id: contaData?.id || null,
          cliente_id: clienteData?.id || null,
          pago: formData.pago,
          valor_total: valorTotal,
        })
        .eq("id", lancamentoSelecionado.id);
      
      if (updateError) throw updateError;
      
      // Deletar itens antigos
      await supabase
        .from("lancamentos_financeiros_itens")
        .delete()
        .eq("lancamento_id", lancamentoSelecionado.id);
      
      // Inserir novos itens
      const itensParaInserir = itensLancamento.map((item) => ({
        lancamento_id: lancamentoSelecionado.id,
        descricao2: item.descricao2,
        valor: item.valor,
        observacao: item.observacao || null,
      }));
      
      const { error: itensError } = await supabase
        .from("lancamentos_financeiros_itens")
        .insert(itensParaInserir);
      
      if (itensError) throw itensError;
      
      toast({
        title: "Sucesso",
        description: "Lançamento atualizado com sucesso!",
      });
      
      setIsEditDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Erro ao editar lançamento:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar lançamento",
        variant: "destructive",
      });
    }
  };

  const exportarCSV = () => {
    const headers = [
      "Data",
      "Ano/Mês",
      "Tipo",
      "Cliente",
      "Pet",
      "Descrição 1",
      "Descrição 2",
      "Valor Total",
      "Banco",
      "Status",
    ];

    const rows = lancamentosFiltrados.map((l) => [
      formatarData(l.dataPagamento),
      `${l.ano}/${l.mesCompetencia}`,
      "Despesa",
      l.nomeCliente || "-",
      l.nomePet || "-",
      "Despesa Fixa",
      l.itens.map((i) => i.descricao2).join("; "),
      l.valorTotal.toFixed(2),
      l.nomeBanco || "-",
      l.pago ? "Pago" : "Pendente",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `despesas-fixas-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();

    toast({
      title: "Sucesso",
      description: "Relatório exportado com sucesso!",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Relatório de Despesas Fixas</h2>
          <p className="text-sm text-muted-foreground">
            Análise detalhada de despesas fixas mensais
          </p>
        </div>
        <Button onClick={exportarCSV} variant="outline" size="sm">
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
              <div className="flex flex-wrap gap-2 mb-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPeriodoRapido("hoje")}
                >
                  Hoje
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPeriodoRapido("7dias")}
                >
                  Últimos 7 dias
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPeriodoRapido("mes")}
                >
                  Este mês
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setPeriodoRapido("ano")}
                >
                  Este ano
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dataInicio" className="text-xs">
                    Data Inicial
                  </Label>
                  <Input
                    id="dataInicio"
                    type="date"
                    value={filtros.dataInicio}
                    onChange={(e) =>
                      setFiltros({ ...filtros, dataInicio: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="dataFim" className="text-xs">
                    Data Final
                  </Label>
                  <Input
                    id="dataFim"
                    type="date"
                    value={filtros.dataFim}
                    onChange={(e) =>
                      setFiltros({ ...filtros, dataFim: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Descrição 2 */}
            <div className="space-y-2">
              <Label htmlFor="descricao2" className="text-xs font-semibold">
                Descrição 2
              </Label>
              <Select
                value={filtros.descricao2}
                onValueChange={(value) =>
                  setFiltros({ ...filtros, descricao2: value })
                }
              >
                <SelectTrigger id="descricao2">
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  <SelectItem value="Aluguel">Aluguel</SelectItem>
                  <SelectItem value="Salários">Salários</SelectItem>
                  <SelectItem value="Impostos Fixos">Impostos Fixos</SelectItem>
                  <SelectItem value="Sistemas e Softwares">Sistemas e Softwares</SelectItem>
                  <SelectItem value="Outras Despesas Fixas">
                    Outras Despesas Fixas
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Banco */}
            <div className="space-y-2">
              <Label htmlFor="banco" className="text-xs font-semibold">
                Banco
              </Label>
              <Select
                value={filtros.nomeBanco}
                onValueChange={(value) =>
                  setFiltros({ ...filtros, nomeBanco: value })
                }
              >
                <SelectTrigger id="banco">
                  <SelectValue placeholder="Todos os bancos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os bancos</SelectItem>
                  {contas.map((conta) => (
                    <SelectItem key={conta.id} value={conta.nome}>
                      {conta.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Busca */}
            <div className="space-y-2">
              <Label htmlFor="busca" className="text-xs font-semibold">
                Buscar Cliente/Pet
              </Label>
              <Input
                id="busca"
                placeholder="Digite o nome do cliente ou pet..."
                value={filtros.busca}
                onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
              />
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status" className="text-xs font-semibold">
                Status
              </Label>
              <Select
                value={filtros.pago}
                onValueChange={(value: "all" | "true" | "false") =>
                  setFiltros({ ...filtros, pago: value })
                }
              >
                <SelectTrigger id="status">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="true">Pago</SelectItem>
                  <SelectItem value="false">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botões */}
            <div className="flex gap-2">
              <Button onClick={aplicarFiltros} className="flex-1">
                Aplicar Filtros
              </Button>
              <Button onClick={limparFiltros} variant="outline" className="flex-1">
                Limpar Filtros
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Cards KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-red-900">
                Total de Despesas Fixas
              </CardTitle>
              <TrendingDown className="h-5 w-5 text-red-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatarMoeda(totalDespesas)}
            </div>
            <p className="text-xs text-red-700 mt-1">No período selecionado</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-blue-900">
                Média Mensal de Despesas
              </CardTitle>
              <Calendar className="h-5 w-5 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatarMoeda(mediaMensal)}
            </div>
            <p className="text-xs text-blue-700 mt-1">Média mensal de gastos fixos</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-purple-900">
                Aluguel + Salários
              </CardTitle>
              <Building2 className="h-5 w-5 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatarMoeda(aluguelSalarios)}
            </div>
            <p className="text-xs text-purple-700 mt-1">Principais despesas fixas</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-orange-900">
                Impostos Fixos
              </CardTitle>
              <Receipt className="h-5 w-5 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatarMoeda(impostos)}
            </div>
            <p className="text-xs text-orange-700 mt-1">Total de impostos fixos</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lançamentos de Despesas Fixas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-center">Data do Pagamento</TableHead>
                  <TableHead className="text-center">Ano/Mês</TableHead>
                  <TableHead className="text-center">Tipo</TableHead>
                  <TableHead className="text-center">Cliente</TableHead>
                  <TableHead className="text-center">Pet</TableHead>
                  <TableHead className="text-center">Descrição 1</TableHead>
                  <TableHead className="text-center">Descrição 2</TableHead>
                  <TableHead className="text-center">Itens</TableHead>
                  <TableHead className="text-center text-right">Valor Total</TableHead>
                  <TableHead className="text-center">Banco</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 12 }).map((_, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : lancamentosFiltrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <AlertCircle className="h-8 w-8 text-red-500" />
                        <p className="text-sm text-muted-foreground">
                          Nenhum lançamento de Despesa Fixa encontrado no período selecionado.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  lancamentosFiltrados.map((lancamento) => (
                    <TableRow key={lancamento.id} className="hover:bg-secondary/50">
                      <TableCell className="text-center text-xs">
                        {formatarData(lancamento.dataPagamento)}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {lancamento.ano}/{lancamento.mesCompetencia}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
                          Despesa
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">{lancamento.nomeCliente || "-"}</TableCell>
                      <TableCell className="text-xs">{lancamento.nomePet || "-"}</TableCell>
                      <TableCell className="text-xs">Despesa Fixa</TableCell>
                      <TableCell className="text-xs">
                        {lancamento.itens.map((i) => i.descricao2).join(", ")}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        {lancamento.itens.length} item(s)
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-red-600">
                        {formatarMoeda(lancamento.valorTotal)}
                      </TableCell>
                      <TableCell className="text-xs">{lancamento.nomeBanco || "-"}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          className={
                            lancamento.pago
                              ? "bg-green-100 text-green-800 hover:bg-green-100"
                              : "bg-red-100 text-red-800 hover:bg-red-100"
                          }
                        >
                          {lancamento.pago ? "Pago" : "Pendente"}
                        </Badge>
                      </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => abrirEdicao(lancamento)}
                        title="Editar Lançamento"
                      >
                        <Edit2 className="h-3 w-3 text-blue-600" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(lancamento.id)}
                      >
                        <Trash2 className="h-3 w-3 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Totalizador no Rodapé */}
      <Card className="bg-red-50 border-red-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              <span className="text-sm font-semibold text-red-900">
                Total de Despesas Fixas no Período:
              </span>
            </div>
            <span className="text-2xl font-bold text-red-600">
              {formatarMoeda(totalDespesas)}
            </span>
          </div>
          <p className="text-xs text-red-700 mt-2">
            {lancamentosFiltrados.length} lançamento(s) encontrado(s)
          </p>
        </CardContent>
      </Card>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Barras */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosGraficoBarras}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="categoria" />
                <YAxis />
                <Tooltip formatter={(value) => formatarMoeda(Number(value))} />
                <Legend />
                <Bar dataKey="valor" fill="#ef4444" name="Despesa (R$)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Linha */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Evolução das Despesas Fixas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosGraficoLinha}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip formatter={(value) => formatarMoeda(Number(value))} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke="#ef4444"
                  strokeWidth={2}
                  name="Despesa (R$)"
                  dot={{ fill: "#ef4444" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de Edição */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setLancamentoSelecionado(null);
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Lançamento de Despesa Fixa</DialogTitle>
            <DialogDescription>
              Atualize os dados do lançamento financeiro
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleEditar} className="space-y-4">
            {/* Linha 1: Ano, Mês, Data Pagamento, Status */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-ano">Ano *</Label>
                <Select
                  value={formData.ano}
                  onValueChange={(value) => setFormData({ ...formData, ano: value })}
                >
                  <SelectTrigger id="edit-ano">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 11 }, (_, i) => 2025 + i).map((ano) => (
                      <SelectItem key={ano} value={ano.toString()}>
                        {ano}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-mes">Mês *</Label>
                <Select
                  value={formData.mesCompetencia}
                  onValueChange={(value) => setFormData({ ...formData, mesCompetencia: value })}
                >
                  <SelectTrigger id="edit-mes">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
                      <SelectItem key={mes} value={mes.toString().padStart(2, "0")}>
                        {mes.toString().padStart(2, "0")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-data-pagamento">Data do Pagamento *</Label>
                <Input
                  id="edit-data-pagamento"
                  type="date"
                  value={formData.dataPagamento}
                  onChange={(e) => setFormData({ ...formData, dataPagamento: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-pago">Status *</Label>
                <Select
                  value={formData.pago ? "true" : "false"}
                  onValueChange={(value) => setFormData({ ...formData, pago: value === "true" })}
                >
                  <SelectTrigger id="edit-pago">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Pago</SelectItem>
                    <SelectItem value="false">Pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Linha 2: Cliente, Pet, Banco */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cliente">Cliente</Label>
                <Input
                  id="edit-cliente"
                  value={formData.nomeCliente}
                  onChange={(e) => setFormData({ ...formData, nomeCliente: e.target.value })}
                  placeholder="Nome do cliente (opcional)"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-pet">Pet</Label>
                <Input
                  id="edit-pet"
                  value={formData.nomePet}
                  onChange={(e) => setFormData({ ...formData, nomePet: e.target.value })}
                  placeholder="Nome do pet (opcional)"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-banco">Banco</Label>
                <Select
                  value={formData.nomeBanco}
                  onValueChange={(value) => setFormData({ ...formData, nomeBanco: value })}
                >
                  <SelectTrigger id="edit-banco">
                    <SelectValue placeholder="Selecione o banco" />
                  </SelectTrigger>
                  <SelectContent>
                    {contas.map((conta) => (
                      <SelectItem key={conta.id} value={conta.nome}>
                        {conta.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Seção de Itens */}
            <div className="space-y-2">
              <Label className="font-semibold">Itens da Despesa</Label>
              {itensLancamento.map((item, index) => (
                <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5 space-y-1">
                    <Label htmlFor={`edit-descricao2-${index}`} className="text-xs">
                      Descrição 2 *
                    </Label>
                    <Select
                      value={item.descricao2}
                      onValueChange={(value) => {
                        const novosItens = [...itensLancamento];
                        novosItens[index].descricao2 = value;
                        setItensLancamento(novosItens);
                      }}
                    >
                      <SelectTrigger id={`edit-descricao2-${index}`}>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Aluguel">Aluguel</SelectItem>
                        <SelectItem value="Salários">Salários</SelectItem>
                        <SelectItem value="Impostos Fixos">Impostos Fixos</SelectItem>
                        <SelectItem value="Sistemas e Softwares">Sistemas e Softwares</SelectItem>
                        <SelectItem value="Outras Despesas Fixas">Outras Despesas Fixas</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-4 space-y-1">
                    <Label htmlFor={`edit-observacao-${index}`} className="text-xs">
                      Observação
                    </Label>
                    <Input
                      id={`edit-observacao-${index}`}
                      value={item.observacao || ""}
                      onChange={(e) => {
                        const novosItens = [...itensLancamento];
                        novosItens[index].observacao = e.target.value;
                        setItensLancamento(novosItens);
                      }}
                      placeholder="Observação (opcional)"
                    />
                  </div>
                  
                  <div className="col-span-2 space-y-1">
                    <Label htmlFor={`edit-valor-${index}`} className="text-xs">
                      Valor (R$) *
                    </Label>
                    <Input
                      id={`edit-valor-${index}`}
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.valor}
                      onChange={(e) => {
                        const novosItens = [...itensLancamento];
                        novosItens[index].valor = parseFloat(e.target.value) || 0;
                        setItensLancamento(novosItens);
                      }}
                      required
                    />
                  </div>
                  
                  <div className="col-span-1 flex items-end">
                    {itensLancamento.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setItensLancamento(itensLancamento.filter((_, i) => i !== index));
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Botão Adicionar Item */}
              {itensLancamento.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setItensLancamento([
                      ...itensLancamento,
                      {
                        id: Date.now().toString(),
                        descricao2: "",
                        valor: 0,
                        observacao: "",
                      },
                    ]);
                  }}
                  className="text-xs"
                >
                  + Adicionar Item
                </Button>
              )}
            </div>
            
            {/* Total */}
            <div className="flex justify-end">
              <div className="text-right">
                <Label className="text-sm font-semibold">Valor Total:</Label>
                <p className="text-2xl font-bold text-red-600">
                  {formatarMoeda(itensLancamento.reduce((acc, item) => acc + item.valor, 0))}
                </p>
              </div>
            </div>
            
            {/* Botões de Ação */}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmarExclusao}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
