import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  DollarSign, 
  FileText, 
  TrendingDown, 
  Calendar, 
  Filter, 
  Download, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  AlertCircle,
  ArrowUpDown
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { KPICard } from "@/components/relatorios/shared/KPICard";

interface LancamentoFinanceiro {
  id: string;
  tipo: string;
  dataPagamento: string;
  dataLancamento: string;
  valorTotal: number;
  pago: boolean;
  clienteId: string;
  petId: string;
  nomeCliente: string;
  nomePet: string;
  descricao1: string;
  nomeBanco: string;
  observacao: string;
  itens: Array<{
    descricao2: string;
    quantidade: number;
    valorUnitario: number;
  }>;
}

interface Filtros {
  dataInicio: string;
  dataFim: string;
  clienteId: string;
  petId: string;
  descricao1: string;
  nomeBanco: string;
  busca: string;
}

export function Inadimplencia() {
  const { user, ownerId } = useAuth();
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);
  const [lancamentosTodosPeriodo, setLancamentosTodosPeriodo] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [pets, setPets] = useState<any[]>([]);
  const [contas, setContas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [lancamentoExcluindo, setLancamentoExcluindo] = useState<string | null>(null);
  const [lancamentoMarcandoPago, setLancamentoMarcandoPago] = useState<string | null>(null);
  const [ordenacao, setOrdenacao] = useState<{ campo: string; ordem: 'asc' | 'desc' }>({ 
    campo: 'dataPagamento', 
    ordem: 'asc' 
  });

  const [filtros, setFiltros] = useState<Filtros>({
    dataInicio: "",
    dataFim: "",
    clienteId: "all",
    petId: "all",
    descricao1: "all",
    nomeBanco: "all",
    busca: "",
  });

  const calcularDiasAtraso = (dataVencimento: string): number => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(dataVencimento);
    vencimento.setHours(0, 0, 0, 0);
    const diferenca = hoje.getTime() - vencimento.getTime();
    return Math.floor(diferenca / (1000 * 60 * 60 * 24));
  };

  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor);
  };

  const formatarData = (data: string): string => {
    return new Date(data).toLocaleDateString("pt-BR");
  };

  const getClasseAtraso = (diasAtraso: number): string => {
    if (diasAtraso > 30) return "bg-red-50 dark:bg-red-950/20";
    if (diasAtraso > 15) return "bg-yellow-50 dark:bg-yellow-950/20";
    return "";
  };

  const loadLancamentos = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const hoje = new Date().toISOString().split('T')[0];

      const { data: lancamentosData, error: lancamentosError } = await supabase
        .from("lancamentos_financeiros")
        .select(`*, lancamentos_financeiros_itens (*)`)
        .eq("user_id", user.id)
        .eq("tipo", "Receita")
        .eq("pago", false)
        .lte("data_pagamento", hoje)
        .order("data_pagamento", { ascending: true });

      if (lancamentosError) throw lancamentosError;

      const { data: todosPeriodoData } = await supabase
        .from("lancamentos_financeiros")
        .select("*")
        .eq("user_id", user.id)
        .eq("tipo", "Receita");

      const [clientesData, petsData, contasData] = await Promise.all([
        supabase.from("clientes").select("*").eq("user_id", ownerId),
        supabase.from("pets").select("*").eq("user_id", ownerId),
        supabase.from("contas_bancarias").select("*").eq("user_id", ownerId),
      ]);

      setClientes(clientesData.data || []);
      setPets(petsData.data || []);
      setContas(contasData.data || []);

      const lancamentosProcessados = (lancamentosData || []).map((l: any) => {
        const cliente = clientesData.data?.find((c: any) => c.id === l.cliente_id);
        const pet = petsData.data?.find((p: any) => p.id === l.pet_id);

        return {
          id: l.id,
          tipo: l.tipo,
          dataPagamento: l.data_pagamento,
          dataLancamento: l.data_lancamento,
          valorTotal: l.valor_total,
          pago: l.pago,
          clienteId: l.cliente_id,
          petId: l.pet_id,
          nomeCliente: cliente?.nome_cliente || "Sem Cliente",
          nomePet: pet?.nome_pet || "Sem Pet",
          descricao1: l.descricao1 || "",
          nomeBanco: l.nome_banco || "Sem Banco",
          observacao: l.observacao || "",
          itens: (l.lancamentos_financeiros_itens || []).map((item: any) => ({
            descricao2: item.descricao2 || "",
            quantidade: item.quantidade || 0,
            valorUnitario: item.valor_unitario || 0,
          })),
        };
      });

      setLancamentos(lancamentosProcessados);
      setLancamentosTodosPeriodo(todosPeriodoData || []);
    } catch (error) {
      console.error("Erro ao carregar lançamentos:", error);
      toast.error("Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLancamentos();
  }, [user]);

  const lancamentosFiltrados = useMemo(() => {
    let resultado = [...lancamentos];

    if (filtros.dataInicio) resultado = resultado.filter(l => l.dataPagamento >= filtros.dataInicio);
    if (filtros.dataFim) resultado = resultado.filter(l => l.dataPagamento <= filtros.dataFim);
    if (filtros.clienteId !== "all") resultado = resultado.filter(l => l.clienteId === filtros.clienteId);
    if (filtros.petId !== "all") resultado = resultado.filter(l => l.petId === filtros.petId);
    if (filtros.descricao1 !== "all") resultado = resultado.filter(l => l.descricao1 === filtros.descricao1);
    if (filtros.nomeBanco !== "all") resultado = resultado.filter(l => l.nomeBanco === filtros.nomeBanco);
    if (filtros.busca) {
      const buscaLower = filtros.busca.toLowerCase();
      resultado = resultado.filter(l => 
        l.nomeCliente.toLowerCase().includes(buscaLower) ||
        l.nomePet.toLowerCase().includes(buscaLower) ||
        l.descricao1.toLowerCase().includes(buscaLower) ||
        l.observacao.toLowerCase().includes(buscaLower) ||
        l.itens.some(i => i.descricao2.toLowerCase().includes(buscaLower))
      );
    }

    resultado.sort((a, b) => {
      let aVal: any = a[ordenacao.campo as keyof LancamentoFinanceiro];
      let bVal: any = b[ordenacao.campo as keyof LancamentoFinanceiro];

      if (ordenacao.campo === 'diasAtraso') {
        aVal = calcularDiasAtraso(a.dataPagamento);
        bVal = calcularDiasAtraso(b.dataPagamento);
      }

      if (typeof aVal === 'string') {
        return ordenacao.ordem === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return ordenacao.ordem === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return resultado;
  }, [lancamentos, filtros, ordenacao]);

  const totalEmAberto = useMemo(() => lancamentosFiltrados.reduce((acc, l) => acc + l.valorTotal, 0), [lancamentosFiltrados]);
  const quantidadeLancamentos = lancamentosFiltrados.length;

  const taxaInadimplencia = useMemo(() => {
    if (lancamentosTodosPeriodo.length === 0) return 0;
    const totalPeriodo = lancamentosTodosPeriodo.reduce((acc: number, l: any) => acc + l.valor_total, 0);
    const totalNaoPago = lancamentosFiltrados.reduce((acc, l) => acc + l.valorTotal, 0);
    return totalPeriodo > 0 ? (totalNaoPago / totalPeriodo) * 100 : 0;
  }, [lancamentosFiltrados, lancamentosTodosPeriodo]);

  const mediaAtraso = useMemo(() => {
    if (lancamentosFiltrados.length === 0) return 0;
    const somaAtrasos = lancamentosFiltrados.reduce((acc, l) => acc + Math.max(0, calcularDiasAtraso(l.dataPagamento)), 0);
    return Math.round(somaAtrasos / lancamentosFiltrados.length);
  }, [lancamentosFiltrados]);

  const dadosGraficoClientes = useMemo(() => {
    const clientesMap = new Map<string, number>();
    lancamentosFiltrados.forEach(l => {
      const cliente = l.nomeCliente || "Sem Cliente";
      clientesMap.set(cliente, (clientesMap.get(cliente) || 0) + l.valorTotal);
    });
    return Array.from(clientesMap.entries())
      .map(([cliente, valor]) => ({ cliente, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);
  }, [lancamentosFiltrados]);

  const dadosGraficoEvolucao = useMemo(() => {
    const datasMap = new Map<string, number>();
    lancamentosFiltrados.forEach(l => {
      const data = formatarData(l.dataPagamento);
      datasMap.set(data, (datasMap.get(data) || 0) + l.valorTotal);
    });
    return Array.from(datasMap.entries())
      .map(([data, valor]) => ({ data, valor }))
      .sort((a, b) => {
        const [diaA, mesA, anoA] = a.data.split('/');
        const [diaB, mesB, anoB] = b.data.split('/');
        return new Date(`${anoA}-${mesA}-${diaA}`).getTime() - new Date(`${anoB}-${mesB}-${diaB}`).getTime();
      });
  }, [lancamentosFiltrados]);

  const handleMarcarComoPago = async (lancamentoId: string) => {
    try {
      const { error } = await supabase.from("lancamentos_financeiros").update({ pago: true }).eq("id", lancamentoId);
      if (error) throw error;
      toast.success("Lançamento marcado como pago!");
      setLancamentoMarcandoPago(null);
      loadLancamentos();
    } catch (error) {
      toast.error("Erro ao marcar como pago");
    }
  };

  const handleExcluir = async () => {
    if (!lancamentoExcluindo) return;
    try {
      await supabase.from("lancamentos_financeiros_itens").delete().eq("lancamento_id", lancamentoExcluindo);
      await supabase.from("lancamentos_financeiros").delete().eq("id", lancamentoExcluindo);
      toast.success("Lançamento excluído com sucesso!");
      setLancamentoExcluindo(null);
      loadLancamentos();
    } catch (error) {
      toast.error("Erro ao excluir lançamento");
    }
  };

  const exportarCSV = () => {
    const headers = ["Data de Vencimento", "Dias de Atraso", "Cliente", "Pet", "Categoria", "Descrição", "Valor (R$)", "Banco", "Status"];
    const rows = lancamentosFiltrados.map(l => [
      formatarData(l.dataPagamento),
      calcularDiasAtraso(l.dataPagamento).toString(),
      l.nomeCliente,
      l.nomePet,
      l.descricao1,
      l.itens.map(i => i.descricao2).join(", "),
      l.valorTotal.toFixed(2).replace('.', ','),
      l.nomeBanco,
      "Não Pago"
    ]);
    const csv = [headers, ...rows].map(row => row.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `inadimplencia-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    toast.success("Relatório exportado!");
  };

  const limparFiltros = () => {
    setFiltros({ dataInicio: "", dataFim: "", clienteId: "all", petId: "all", descricao1: "all", nomeBanco: "all", busca: "" });
  };

  const toggleOrdenacao = (campo: string) => {
    setOrdenacao(prev => ({ campo, ordem: prev.campo === campo && prev.ordem === 'asc' ? 'desc' : 'asc' }));
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Inadimplência e Contas a Receber</h2>
          <p className="text-sm text-muted-foreground">Contas vencidas e gestão de inadimplência</p>
        </div>
        <Button onClick={exportarCSV} className="w-full sm:w-auto">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-red-50 dark:bg-red-950/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-red-900 dark:text-red-200">Total em Aberto</CardTitle></CardHeader>
          <CardContent><div className="flex items-center justify-between"><div><p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatarMoeda(totalEmAberto)}</p><p className="text-xs text-red-700 dark:text-red-300">Total de receitas não pagas</p></div><DollarSign className="h-8 w-8 text-red-500" /></div></CardContent>
        </Card>
        <Card className="bg-blue-50 dark:bg-blue-950/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-blue-900 dark:text-blue-200">Quantidade de Lançamentos</CardTitle></CardHeader>
          <CardContent><div className="flex items-center justify-between"><div><p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{quantidadeLancamentos}</p><p className="text-xs text-blue-700 dark:text-blue-300">Contas a receber em aberto</p></div><FileText className="h-8 w-8 text-blue-500" /></div></CardContent>
        </Card>
        <Card className="bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-orange-900 dark:text-orange-200">Taxa de Inadimplência</CardTitle></CardHeader>
          <CardContent><div className="flex items-center justify-between"><div><p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{taxaInadimplencia.toFixed(1)}%</p><p className="text-xs text-orange-700 dark:text-orange-300">Percentual de inadimplência</p></div><TrendingDown className="h-8 w-8 text-orange-500" /></div></CardContent>
        </Card>
        <Card className="bg-purple-50 dark:bg-purple-950/20">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-purple-900 dark:text-purple-200">Média de Atraso</CardTitle></CardHeader>
          <CardContent><div className="flex items-center justify-between"><div><p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{mediaAtraso} dias</p><p className="text-xs text-purple-700 dark:text-purple-300">Tempo médio de atraso</p></div><Calendar className="h-8 w-8 text-purple-500" /></div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Button variant="ghost" onClick={() => setMostrarFiltros(!mostrarFiltros)} className="w-full justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span>{mostrarFiltros ? "Ocultar Filtros" : "Mostrar Filtros"}</span>
            </div>
            {mostrarFiltros ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </CardHeader>
        {mostrarFiltros && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div><Label>Data Início</Label><Input type="date" value={filtros.dataInicio} onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })} /></div>
              <div><Label>Data Fim</Label><Input type="date" value={filtros.dataFim} onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })} /></div>
              <div><Label>Cliente</Label><Select value={filtros.clienteId} onValueChange={(value) => setFiltros({ ...filtros, clienteId: value })}><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os clientes</SelectItem>{clientes.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Pet</Label><Select value={filtros.petId} onValueChange={(value) => setFiltros({ ...filtros, petId: value })}><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os pets</SelectItem>{pets.filter(p => filtros.clienteId === "all" || p.cliente_id === filtros.clienteId).map(p => <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>)}</SelectContent></Select></div>
              <div><Label>Categoria</Label><Select value={filtros.descricao1} onValueChange={(value) => setFiltros({ ...filtros, descricao1: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem><SelectItem value="Receita Operacional">Receita Operacional</SelectItem><SelectItem value="Receita Não Operacional">Receita Não Operacional</SelectItem></SelectContent></Select></div>
              <div><Label>Banco</Label><Select value={filtros.nomeBanco} onValueChange={(value) => setFiltros({ ...filtros, nomeBanco: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{contas.map(c => <SelectItem key={c.id} value={c.nome_banco}>{c.nome_banco}</SelectItem>)}</SelectContent></Select></div>
              <div className="lg:col-span-3"><Label>Busca</Label><Input placeholder="Buscar..." value={filtros.busca} onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })} /></div>
            </div>
            <Button variant="outline" onClick={limparFiltros} className="mt-4">Limpar Filtros</Button>
          </CardContent>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card><CardHeader><CardTitle>Inadimplência por Cliente</CardTitle></CardHeader><CardContent>{dadosGraficoClientes.length > 0 ? <ResponsiveContainer width="100%" height={300}><BarChart data={dadosGraficoClientes} layout="vertical"><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" /><YAxis dataKey="cliente" type="category" width={120} /><Tooltip formatter={(value: number) => formatarMoeda(value)} /><Bar dataKey="valor" fill="#ef4444" /></BarChart></ResponsiveContainer> : <div className="flex items-center justify-center h-[300px] text-muted-foreground"><AlertCircle className="h-8 w-8 mr-2" /><span>Sem dados</span></div>}</CardContent></Card>
        <Card><CardHeader><CardTitle>Evolução</CardTitle></CardHeader><CardContent>{dadosGraficoEvolucao.length > 0 ? <ResponsiveContainer width="100%" height={300}><LineChart data={dadosGraficoEvolucao}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="data" /><YAxis /><Tooltip formatter={(value: number) => formatarMoeda(value)} /><Legend /><Line type="monotone" dataKey="valor" stroke="#ef4444" strokeWidth={2} /></LineChart></ResponsiveContainer> : <div className="flex items-center justify-center h-[300px] text-muted-foreground"><AlertCircle className="h-8 w-8 mr-2" /><span>Sem dados</span></div>}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Lançamentos em Aberto ({lancamentosFiltrados.length})</CardTitle></CardHeader>
        <CardContent>
          {lancamentosFiltrados.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="cursor-pointer" onClick={() => toggleOrdenacao('dataPagamento')}><div className="flex items-center gap-1">Data<ArrowUpDown className="h-3 w-3" /></div></TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleOrdenacao('diasAtraso')}><div className="flex items-center gap-1">Atraso<ArrowUpDown className="h-3 w-3" /></div></TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Pet</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleOrdenacao('valorTotal')}><div className="flex items-center gap-1">Valor<ArrowUpDown className="h-3 w-3" /></div></TableHead>
                    <TableHead>Banco</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lancamentosFiltrados.map((lancamento) => {
                    const diasAtraso = calcularDiasAtraso(lancamento.dataPagamento);
                    return (
                      <TableRow key={lancamento.id} className={getClasseAtraso(diasAtraso)}>
                        <TableCell>{formatarData(lancamento.dataPagamento)}</TableCell>
                        <TableCell>
                          <Badge className={diasAtraso > 30 ? "bg-red-100 text-red-800 hover:bg-red-100" : diasAtraso > 15 ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" : "bg-orange-100 text-orange-800 hover:bg-orange-100"}>
                            {diasAtraso} dias
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{lancamento.nomeCliente}</TableCell>
                        <TableCell>{lancamento.nomePet}</TableCell>
                        <TableCell>{lancamento.descricao1}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{lancamento.itens.map(i => i.descricao2).join(", ")}</TableCell>
                        <TableCell className="font-semibold">{formatarMoeda(lancamento.valorTotal)}</TableCell>
                        <TableCell>{lancamento.nomeBanco}</TableCell>
                        <TableCell><Badge className="bg-red-100 text-red-800 hover:bg-red-100">Não Pago</Badge></TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" className="text-green-600 hover:bg-green-50" onClick={() => setLancamentoMarcandoPago(lancamento.id)} title="Marcar como pago"><Check className="h-4 w-4" /></Button>
                            <Button size="sm" variant="ghost" className="text-red-600 hover:bg-red-50" onClick={() => setLancamentoExcluindo(lancamento.id)} title="Excluir"><Trash2 className="h-4 w-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-4" />
              <p className="text-lg font-medium">Nenhum lançamento em aberto encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {lancamentosFiltrados.length > 0 && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2"><TrendingDown className="h-5 w-5 text-red-600" /><span className="text-red-900 font-semibold">Total em Aberto:</span></div>
              <span className="text-2xl font-bold text-red-600">{formatarMoeda(totalEmAberto)}</span>
            </div>
            <p className="text-xs text-red-700 mt-2">{lancamentosFiltrados.length} lançamento(s) • Média: {mediaAtraso} dias</p>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!lancamentoMarcandoPago} onOpenChange={() => setLancamentoMarcandoPago(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar Pagamento</AlertDialogTitle><AlertDialogDescription>Marcar este lançamento como pago?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => lancamentoMarcandoPago && handleMarcarComoPago(lancamentoMarcandoPago)} className="bg-green-600 hover:bg-green-700">Confirmar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!lancamentoExcluindo} onOpenChange={() => setLancamentoExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Excluir este lançamento? Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleExcluir} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
