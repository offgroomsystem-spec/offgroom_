import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import {
  TrendingDown,
  Calendar,
  Zap,
  Megaphone,
  Filter,
  Download,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface ItemLancamento {
  id: string;
  descricao2: string;
  valor: number;
  observacao?: string;
}

interface LancamentoFinanceiro {
  id: string;
  ano: string;
  mesCompetencia: string;
  tipo: string;
  descricao1: string;
  dataPagamento: string;
  nomeCliente: string | null;
  nomePet: string | null;
  nomeBanco: string | null;
  pago: boolean;
  valorTotal: number;
  itens: ItemLancamento[];
}

interface ContaBancaria {
  id: string;
  nome: string;
}

export function DespesasOperacionais() {
  const { user, ownerId } = useAuth();
  const { toast } = useToast();
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const [filtros, setFiltros] = useState({
    dataInicio: "",
    dataFim: "",
    descricao2: "all",
    nomeBanco: "all",
    busca: "",
    pago: "all" as "all" | "true" | "false",
  });

  // Estados para edição
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState<LancamentoFinanceiro | null>(null);

  // Estados do formulário de edição
  const [formData, setFormData] = useState({
    ano: "",
    mesCompetencia: "",
    tipo: "Despesa",
    descricao1: "Despesa Operacional",
    dataPagamento: "",
    nomeCliente: "",
    nomePet: "",
    nomeBanco: "",
    pago: false,
    valorDeducao: 0,
    tipoDeducao: "",
  });

  const [itensLancamento, setItensLancamento] = useState<ItemLancamento[]>([
    { id: Date.now().toString(), descricao2: "", valor: 0 },
  ]);

  // Estados para exclusão
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [lancamentoParaExcluir, setLancamentoParaExcluir] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Carregar lançamentos
      const { data: lancamentosData, error: lancamentosError } = await supabase
        .from("lancamentos_financeiros")
        .select(
          `
          *,
          lancamentos_financeiros_itens (*)
        `,
        )
        .eq("user_id", user.id)
        .eq("tipo", "Despesa")
        .eq("descricao1", "Despesa Operacional")
        .order("data_pagamento", { ascending: false });

      if (lancamentosError) throw lancamentosError;

      // Carregar dados relacionados (clientes, pets, contas)
      const [clientesData, petsData, contasData] = await Promise.all([
        supabase.from("clientes").select("*").eq("user_id", ownerId),
        supabase.from("pets").select("*").eq("user_id", ownerId),
        supabase.from("contas_bancarias").select("*").eq("user_id", ownerId),
      ]);

      const clientes = clientesData.data || [];
      const pets = petsData.data || [];
      const contas = contasData.data || [];

      // Mapear lançamentos com dados relacionados
      const lancamentosComItens = (lancamentosData || []).map((lanc: any) => {
        const cliente = clientes.find((c: any) => c.id === lanc.cliente_id);
        const conta = contas.find((c: any) => c.id === lanc.conta_id);

        // Para pets, precisamos buscar pelos IDs no campo pet_ids (jsonb)
        let nomePet = null;
        if (lanc.pet_ids && Array.isArray(lanc.pet_ids) && lanc.pet_ids.length > 0) {
          const petPrincipal = pets.find((p: any) => p.id === lanc.pet_ids[0]);
          nomePet = petPrincipal?.nome_pet || null;
        }

        return {
          id: lanc.id,
          ano: lanc.ano,
          mesCompetencia: lanc.mes_competencia,
          tipo: lanc.tipo,
          descricao1: lanc.descricao1,
          dataPagamento: lanc.data_pagamento,
          nomeCliente: cliente?.nome_cliente || null,
          nomePet: nomePet,
          nomeBanco: conta?.nome || null,
          pago: lanc.pago,
          valorTotal: Number(lanc.valor_total),
          itens: (lanc.lancamentos_financeiros_itens || []).map((item: any) => ({
            id: item.id,
            descricao2: item.descricao2,
            valor: Number(item.valor),
            observacao: item.produto_servico || "",
          })),
        };
      });

      setLancamentos(lancamentosComItens);
      setContas(contas);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do relatório",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const lancamentosFiltrados = useMemo(() => {
    return lancamentos.filter((lanc) => {
      // Filtro de data
      if (filtros.dataInicio && lanc.dataPagamento < filtros.dataInicio) return false;
      if (filtros.dataFim && lanc.dataPagamento > filtros.dataFim) return false;

      // Filtro de descrição 2
      if (filtros.descricao2 !== "all") {
        const temDescricao2 = lanc.itens.some((item) => item.descricao2 === filtros.descricao2);
        if (!temDescricao2) return false;
      }

      // Filtro de banco
      if (filtros.nomeBanco !== "all" && lanc.nomeBanco !== filtros.nomeBanco) return false;

      // Filtro de status
      if (filtros.pago !== "all") {
        const pagoBoolean = filtros.pago === "true";
        if (lanc.pago !== pagoBoolean) return false;
      }

      // Filtro de busca
      if (filtros.busca) {
        const busca = filtros.busca.toLowerCase();
        const matchCliente = lanc.nomeCliente?.toLowerCase().includes(busca);
        const matchPet = lanc.nomePet?.toLowerCase().includes(busca);
        const matchDescricao = lanc.itens.some((item) => item.descricao2.toLowerCase().includes(busca));
        if (!matchCliente && !matchPet && !matchDescricao) return false;
      }

      return true;
    });
  }, [lancamentos, filtros]);

  const totalDespesas = useMemo(
    () => lancamentosFiltrados.reduce((acc, l) => acc + l.valorTotal, 0),
    [lancamentosFiltrados],
  );

  const mediaMensal = useMemo(() => {
    if (!filtros.dataInicio || !filtros.dataFim) return 0;

    const inicio = new Date(filtros.dataInicio);
    const fim = new Date(filtros.dataFim);
    const meses = (fim.getFullYear() - inicio.getFullYear()) * 12 + (fim.getMonth() - inicio.getMonth()) + 1;

    return meses > 0 ? totalDespesas / meses : 0;
  }, [totalDespesas, filtros.dataInicio, filtros.dataFim]);

  const principaisDespesas = useMemo(
    () =>
      lancamentosFiltrados
        .filter((l) =>
          l.itens.some((i) =>
            ["Contador", "Freelancer", "Telefonia e internet", "Energia elétrica"].includes(i.descricao2),
          ),
        )
        .reduce((acc, l) => acc + l.valorTotal, 0),
    [lancamentosFiltrados],
  );

  const marketing = useMemo(
    () =>
      lancamentosFiltrados
        .filter((l) => l.itens.some((i) => i.descricao2 === "Publicidade e marketing"))
        .reduce((acc, l) => acc + l.valorTotal, 0),
    [lancamentosFiltrados],
  );

  const dadosGraficoBarras = useMemo(() => {
    const categorias = [
      "Contador",
      "Freelancer",
      "Telefonia e internet",
      "Energia elétrica",
      "Água e esgoto",
      "Publicidade e marketing",
      "Outras Despesas Operacionais",
    ];

    return categorias.map((cat) => ({
      categoria: cat.replace(" e ", "/").replace(" Despesas Operacionais", ""),
      valor: lancamentosFiltrados
        .filter((l) => l.itens.some((i) => i.descricao2 === cat))
        .reduce((acc, l) => acc + l.valorTotal, 0),
    }));
  }, [lancamentosFiltrados]);

  const dadosGraficoLinha = useMemo(() => {
    const despesasPorDia: { [key: string]: number } = {};

    lancamentosFiltrados.forEach((lanc) => {
      const data = new Date(lanc.dataPagamento).toLocaleDateString("pt-BR");
      despesasPorDia[data] = (despesasPorDia[data] || 0) + lanc.valorTotal;
    });

    return Object.entries(despesasPorDia)
      .map(([data, valor]) => ({ data, valor }))
      .sort((a, b) => {
        const [diaA, mesA, anoA] = a.data.split("/");
        const [diaB, mesB, anoB] = b.data.split("/");
        return new Date(`${anoA}-${mesA}-${diaA}`).getTime() - new Date(`${anoB}-${mesB}-${diaB}`).getTime();
      });
  }, [lancamentosFiltrados]);

  const aplicarFiltros = () => {
    setMostrarFiltros(false);
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
  };

  const abrirEdicao = (lancamento: LancamentoFinanceiro) => {
    setLancamentoSelecionado(lancamento);

    setFormData({
      ano: lancamento.ano,
      mesCompetencia: lancamento.mesCompetencia,
      tipo: "Despesa",
      descricao1: "Despesa Operacional",
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
      })),
    );

    setIsEditDialogOpen(true);
  };

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!lancamentoSelecionado) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
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
        .single();

      const { data: clienteData } = await supabase
        .from("clientes")
        .select("id")
        .eq("nome_cliente", formData.nomeCliente)
        .eq("user_id", user.id)
        .single();

      // Atualizar lançamento principal
      const { error: updateError } = await supabase
        .from("lancamentos_financeiros")
        .update({
          ano: formData.ano,
          mes_competencia: formData.mesCompetencia,
          tipo: "Despesa",
          descricao1: "Despesa Operacional",
          data_pagamento: formData.dataPagamento,
          conta_id: contaData?.id || null,
          cliente_id: clienteData?.id || null,
          pago: formData.pago,
          valor_total: valorTotal,
        })
        .eq("id", lancamentoSelecionado.id);

      if (updateError) throw updateError;

      // Deletar itens antigos
      await supabase.from("lancamentos_financeiros_itens").delete().eq("lancamento_id", lancamentoSelecionado.id);

      // Inserir novos itens
      const itensParaInserir = itensLancamento.map((item) => ({
        lancamento_id: lancamentoSelecionado.id,
        descricao2: item.descricao2,
        valor: item.valor,
        observacao: item.observacao || null,
      }));

      const { error: itensError } = await supabase.from("lancamentos_financeiros_itens").insert(itensParaInserir);

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

  const abrirExclusao = (lancamentoId: string) => {
    setLancamentoParaExcluir(lancamentoId);
    setIsDeleteDialogOpen(true);
  };

  const confirmarExclusao = async () => {
    if (!lancamentoParaExcluir) return;

    try {
      // Deletar itens primeiro
      await supabase.from("lancamentos_financeiros_itens").delete().eq("lancamento_id", lancamentoParaExcluir);

      // Deletar lançamento
      const { error } = await supabase.from("lancamentos_financeiros").delete().eq("id", lancamentoParaExcluir);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Lançamento excluído com sucesso!",
      });

      setIsDeleteDialogOpen(false);
      setLancamentoParaExcluir(null);
      loadData();
    } catch (error) {
      console.error("Erro ao excluir lançamento:", error);
      toast({
        title: "Erro",
        description: "Erro ao excluir lançamento",
        variant: "destructive",
      });
    }
  };

  const exportarCSV = () => {
    const headers = [
      "Data do Pagamento",
      "Ano/Mês",
      "Tipo",
      "Cliente",
      "Pet",
      "Descrição 1",
      "Descrição 2",
      "Itens",
      "Valor Total",
      "Banco",
      "Status",
    ];

    const rows = lancamentosFiltrados.map((lanc) => [
      new Date(lanc.dataPagamento).toLocaleDateString("pt-BR"),
      `${lanc.ano}/${lanc.mesCompetencia}`,
      lanc.tipo,
      lanc.nomeCliente || "",
      lanc.nomePet || "",
      lanc.descricao1,
      lanc.itens.map((i) => i.descricao2).join("; "),
      lanc.itens.length.toString(),
      lanc.valorTotal.toFixed(2),
      lanc.nomeBanco || "",
      lanc.pago ? "Pago" : "Pendente",
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `despesas-operacionais-${new Date().toISOString().split("T")[0]}.csv`);
    link.click();
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Carregando relatório...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Relatório de Despesas Operacionais</h2>
          <p className="text-sm text-muted-foreground">Análise detalhada de despesas operacionais do negócio</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setMostrarFiltros(!mostrarFiltros)}>
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {mostrarFiltros ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
          </Button>
          <Button variant="outline" size="sm" onClick={exportarCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Painel de Filtros */}
      {mostrarFiltros && (
        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
            <CardDescription>Refine sua busca por despesas operacionais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data-inicio">Data Inicial</Label>
                <Input
                  id="data-inicio"
                  type="date"
                  value={filtros.dataInicio}
                  onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="data-fim">Data Final</Label>
                <Input
                  id="data-fim"
                  type="date"
                  value={filtros.dataFim}
                  onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao2">Categoria</Label>
                <Select
                  value={filtros.descricao2}
                  onValueChange={(value) => setFiltros({ ...filtros, descricao2: value })}
                >
                  <SelectTrigger id="descricao2">
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    <SelectItem value="Contador">Contador</SelectItem>
                    <SelectItem value="Freelancer">Freelancer</SelectItem>
                    <SelectItem value="Telefonia e internet">Telefonia e internet</SelectItem>
                    <SelectItem value="Energia elétrica">Energia elétrica</SelectItem>
                    <SelectItem value="Água e esgoto">Água e esgoto</SelectItem>
                    <SelectItem value="Publicidade e marketing">Publicidade e marketing</SelectItem>
                    <SelectItem value="Outras Despesas Operacionais">Outras Despesas Operacionais</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="banco">Banco</Label>
                <Select
                  value={filtros.nomeBanco}
                  onValueChange={(value) => setFiltros({ ...filtros, nomeBanco: value })}
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
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={filtros.pago} onValueChange={(value) => setFiltros({ ...filtros, pago: value as any })}>
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
              <div className="space-y-2">
                <Label htmlFor="busca">Busca</Label>
                <Input
                  id="busca"
                  placeholder="Cliente, Pet ou Descrição"
                  value={filtros.busca}
                  onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={limparFiltros}>
                Limpar
              </Button>
              <Button onClick={aplicarFiltros}>Aplicar Filtros</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards KPI */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-red-50 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-900">Total de Despesas Operacionais</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatarMoeda(totalDespesas)}</div>
            <p className="text-xs text-red-700 mt-1">No período selecionado</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Média Mensal de Despesas</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatarMoeda(mediaMensal)}</div>
            <p className="text-xs text-blue-700 mt-1">Média mensal de gastos operacionais</p>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-900">Contador + Telefonia + Energia</CardTitle>
            <Zap className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{formatarMoeda(principaisDespesas)}</div>
            <p className="text-xs text-purple-700 mt-1">Principais despesas operacionais</p>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-900">Marketing</CardTitle>
            <Megaphone className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{formatarMoeda(marketing)}</div>
            <p className="text-xs text-orange-700 mt-1">Investimento em marketing</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Lançamentos de Despesas Operacionais</CardTitle>
          <CardDescription>{lancamentosFiltrados.length} lançamento(s) encontrado(s)</CardDescription>
        </CardHeader>
        <CardContent>
          {lancamentosFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
              <p className="text-lg font-semibold text-muted-foreground">
                Nenhum lançamento de Despesa Operacional encontrado
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Tente ajustar os filtros ou adicionar novos lançamentos
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data do Pagamento</TableHead>
                    <TableHead>Ano/Mês</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Pet</TableHead>
                    <TableHead>Descrição 1</TableHead>
                    <TableHead>Descrição 2</TableHead>
                    <TableHead className="text-center">Itens</TableHead>
                    <TableHead className="text-right">Valor Total</TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lancamentosFiltrados.map((lancamento) => (
                    <TableRow key={lancamento.id}>
                      <TableCell>{new Date(lancamento.dataPagamento).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell>
                        {lancamento.ano}/{lancamento.mesCompetencia}
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">{lancamento.tipo}</Badge>
                      </TableCell>
                      <TableCell>{lancamento.nomeCliente || "-"}</TableCell>
                      <TableCell>{lancamento.nomePet || "-"}</TableCell>
                      <TableCell>{lancamento.descricao1}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {lancamento.itens.map((item, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {item.descricao2}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{lancamento.itens.length}</TableCell>
                      <TableCell className="text-right font-semibold">{formatarMoeda(lancamento.valorTotal)}</TableCell>
                      <TableCell>{lancamento.nomeBanco || "-"}</TableCell>
                      <TableCell>
                        {lancamento.pago ? (
                          <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Pago</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-center">
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
                            onClick={() => abrirExclusao(lancamento.id)}
                            title="Excluir Lançamento"
                          >
                            <Trash2 className="h-3 w-3 text-red-600" />
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
          <Card>
            <CardHeader>
              <CardTitle>Despesas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosGraficoBarras}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="categoria" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(value) => formatarMoeda(Number(value))} />
                  <Legend />
                  <Bar dataKey="valor" fill="#ef4444" name="Valor (R$)" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evolução das Despesas Operacionais por Dia</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dadosGraficoLinha}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="data" angle={-45} textAnchor="end" height={100} />
                  <YAxis />
                  <Tooltip formatter={(value) => formatarMoeda(Number(value))} />
                  <Legend />
                  <Line type="monotone" dataKey="valor" stroke="#ef4444" name="Valor (R$)" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Totalizador no Rodapé */}
      {lancamentosFiltrados.length > 0 && (
        <Card className="mt-4 bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                <span className="text-sm font-semibold text-red-900">Total de Despesas Operacionais no Período:</span>
              </div>
              <span className="text-2xl font-bold text-red-600">{formatarMoeda(totalDespesas)}</span>
            </div>
            <p className="text-xs text-red-700 mt-2">{lancamentosFiltrados.length} lançamento(s) encontrado(s)</p>
          </CardContent>
        </Card>
      )}

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
            <DialogTitle>Editar Lançamento de Despesa Operacional</DialogTitle>
            <DialogDescription>Atualize os dados do lançamento financeiro</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditar} className="space-y-4">
            {/* Linha 1: Ano, Mês, Data Pagamento, Status */}
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-ano">Ano *</Label>
                <Select value={formData.ano} onValueChange={(value) => setFormData({ ...formData, ano: value })}>
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
                        <SelectItem value="Contador">Contador</SelectItem>
                        <SelectItem value="Freelancer">Freelancer</SelectItem>
                        <SelectItem value="Telefonia e internet">Telefonia e internet</SelectItem>
                        <SelectItem value="Energia elétrica">Energia elétrica</SelectItem>
                        <SelectItem value="Água e esgoto">Água e esgoto</SelectItem>
                        <SelectItem value="Publicidade e marketing">Publicidade e marketing</SelectItem>
                        <SelectItem value="Outras Despesas Operacionais">Outras Despesas Operacionais</SelectItem>
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
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
            <AlertDialogAction onClick={confirmarExclusao} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
