import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Package,
  CheckCircle,
  Clock,
  TrendingUp,
  Award,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from "recharts";
import { 
  format, subMonths, startOfMonth, endOfMonth, 
  addDays, differenceInDays 
} from "date-fns";
import { ptBR } from "date-fns/locale";

interface PacoteAtivo {
  id: string;
  nomePacote: string;
  cliente: string;
  pet: string;
  raca: string;
  porte: string;
  whatsapp: string;
  dataAtivacao: string;
  dataValidade: string;
  servicosTotal: number;
  servicosUsados: number;
  servicosRestantes: number;
  status: "Ativo" | "Completo" | "Vencido";
  servicos: Array<{
    servico: string;
    quantidade: number;
  }>;
}

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6",
];

export function PacotesAtivos() {
  const { user, ownerId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [pacotes, setPacotes] = useState<PacoteAtivo[]>([]);
  const [pacotesHistorico, setPacotesHistorico] = useState<PacoteAtivo[]>([]);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState({
    dataInicio: format(subMonths(new Date(), 3), "yyyy-MM-dd"),
    dataFim: format(new Date(), "yyyy-MM-dd"),
    status: "Ativo" as "all" | "Ativo" | "Completo" | "Vencido",
    cliente: "all",
    porte: "all",
  });

  /**
   * LÓGICA DE PACOTES ATIVOS:
   * 
   * 1. Busca TODOS os pacotes vendidos (sem filtro de período inicial)
   * 2. Para cada combinação Cliente+Pet, considera apenas o ÚLTIMO pacote vendido (data_venda mais recente)
   * 3. Um pacote é considerado ATIVO apenas se:
   *    - Data de validade >= hoje
   *    - Ainda possui serviços restantes (> 0)
   * 4. Após selecionar os pacotes únicos ativos, aplica filtros de período para exibição no relatório
   * 
   * Exemplo:
   * - Cliente: Larissa Pereira | Pet: Pandora
   * - Pacote A: vendido 16/10/2025 (todos serviços usados, mas ainda válido)
   * - Pacote B: vendido 13/11/2025 (serviços disponíveis, válido)
   * - RESULTADO: Considera apenas Pacote B (mais recente)
   */
  const loadPacotes = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // 1. Buscar TODOS os pacotes vendidos (sem filtro de período)
      const { data: pacotesData, error: errorPacotes } = await supabase
        .from("agendamentos_pacotes")
        .select("*")
        .eq("user_id", ownerId)
        .order("data_venda", { ascending: false });
      
      if (errorPacotes) throw errorPacotes;
      
      // 2. Buscar informações dos pacotes (validade, porte, raca)
      const { data: pacotesInfoData } = await supabase
        .from("pacotes")
        .select("nome, validade, porte, raca")
        .eq("user_id", user.id);
      
      const pacotesInfoMap = new Map(
        (pacotesInfoData || []).map(p => [p.nome, { 
          validade: p.validade,
          porte: p.porte,
          raca: p.raca,
        }])
      );
      
      // 3. Preparar data de hoje para comparação
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);
      
      // 4. Consolidar dados
      const pacotesConsolidados: PacoteAtivo[] = (pacotesData || []).map((p: any) => {
        const servicos = p.servicos as any[];
        const totalServicos = servicos.length;
        
        // Contar serviços usados baseado na data
        const servicosUsados = servicos.filter((s: any) => {
          const dataServico = new Date(s.data + "T00:00:00");
          dataServico.setHours(0, 0, 0, 0);
          return dataServico <= hoje;
        }).length;
        
        const servicosRestantes = Math.max(0, totalServicos - servicosUsados);
        
        // Buscar informações do pacote (validade, porte, raca)
        const infoComplementar = pacotesInfoMap.get(p.nome_pacote) || { 
          validade: "90",
          porte: "Pequeno",
          raca: "",
        };
        
        // Calcular validade
        const validadeDias = parseInt(infoComplementar.validade);
        const dataValidade = addDays(new Date(p.data_venda), validadeDias);
        
        // Status temporário (será recalculado após filtro de único pacote)
        let status: "Ativo" | "Completo" | "Vencido";
        
        if (servicosRestantes === 0) {
          status = "Completo";
        } else if (dataValidade < hoje) {
          status = "Vencido";
        } else {
          status = "Ativo";
        }
        
        return {
          id: p.id,
          nomePacote: p.nome_pacote,
          cliente: p.nome_cliente,
          pet: p.nome_pet,
          raca: p.raca,
          porte: infoComplementar.porte,
          whatsapp: p.whatsapp,
          dataAtivacao: p.data_venda,
          dataValidade: format(dataValidade, "yyyy-MM-dd"),
          servicosTotal: totalServicos,
          servicosUsados,
          servicosRestantes,
          status,
          servicos: servicos.map((s: any) => ({
            servico: s.servico || "",
            quantidade: s.quantidade || 1,
          })),
        };
      });
      
      // 5. Agrupar pacotes por cliente+pet
      const pacotesPorClientePet = new Map<string, PacoteAtivo[]>();
      pacotesConsolidados.forEach(pacote => {
        const chave = `${pacote.cliente}|${pacote.pet}`;
        if (!pacotesPorClientePet.has(chave)) {
          pacotesPorClientePet.set(chave, []);
        }
        pacotesPorClientePet.get(chave)!.push(pacote);
      });
      
      // 6. Para cada grupo, selecionar apenas o pacote mais recente
      const pacotesUnicos: PacoteAtivo[] = [];
      pacotesPorClientePet.forEach(grupoPacotes => {
        // Ordenar por data_venda decrescente e pegar o primeiro
        const maisRecente = grupoPacotes.sort((a, b) => 
          new Date(b.dataAtivacao).getTime() - new Date(a.dataAtivacao).getTime()
        )[0];
        pacotesUnicos.push(maisRecente);
      });
      
      // 7. Recalcular status para TODOS os pacotes únicos (para gráficos históricos)
      const todosComStatusAtualizado = pacotesUnicos.map(pacote => {
        const dataValidade = new Date(pacote.dataValidade);
        dataValidade.setHours(0, 0, 0, 0);
        const hojeLimpo = new Date();
        hojeLimpo.setHours(0, 0, 0, 0);
        
        let status: "Ativo" | "Completo" | "Vencido";
        
        if (dataValidade < hojeLimpo) {
          status = "Vencido";
        } else if (pacote.servicosRestantes === 0) {
          status = "Completo";
        } else {
          status = "Ativo";
        }
        
        return { ...pacote, status };
      });
      
      // 8. Armazenar pacotes históricos (ativos + vencidos) para os gráficos
      setPacotesHistorico(todosComStatusAtualizado);
      
      // 9. Filtrar apenas pacotes com validade >= hoje para tabela e KPIs
      const pacotesAtivosValidos = todosComStatusAtualizado.filter(pacote => {
        const dataValidade = new Date(pacote.dataValidade);
        dataValidade.setHours(0, 0, 0, 0);
        return dataValidade >= hoje;
      });
      
      // 10. Aplicar filtros de período APÓS seleção de pacotes únicos
      const pacotesDentroPeriodo = pacotesAtivosValidos.filter(pacote => {
        const dataAtivacao = new Date(pacote.dataAtivacao);
        const dataInicio = new Date(filtros.dataInicio);
        const dataFim = new Date(filtros.dataFim);
        
        return dataAtivacao >= dataInicio && dataAtivacao <= dataFim;
      });
      
      setPacotes(pacotesDentroPeriodo);
      
    } catch (error) {
      console.error("Erro ao carregar pacotes:", error);
      toast.error("Erro ao carregar dados dos pacotes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPacotes();
  }, [user]);

  const aplicarFiltros = () => {
    loadPacotes();
    setMostrarFiltros(false);
  };

  const limparFiltros = () => {
    setFiltros({
      dataInicio: format(subMonths(new Date(), 3), "yyyy-MM-dd"),
      dataFim: format(new Date(), "yyyy-MM-dd"),
      status: "Ativo",
      cliente: "all",
      porte: "all",
    });
  };

  // Filtrar pacotes
  const pacotesFiltrados = useMemo(() => {
    return pacotes.filter(p => {
      if (filtros.status !== "all" && p.status !== filtros.status) return false;
      if (filtros.cliente !== "all" && p.cliente !== filtros.cliente) return false;
      if (filtros.porte !== "all" && p.porte !== filtros.porte) return false;
      return true;
    });
  }, [pacotes, filtros]);

  // Listas únicas para filtros
  const clientesUnicos = useMemo(() => 
    Array.from(new Set(pacotes.map(p => p.cliente))).sort(),
    [pacotes]
  );

  // Cards KPI
  const totalPacotesAtivos = useMemo(() => 
    pacotesFiltrados.filter(p => p.status === "Ativo").length,
    [pacotesFiltrados]
  );

  const totalServicosUsados = useMemo(() => 
    pacotesFiltrados.reduce((acc, p) => acc + p.servicosUsados, 0),
    [pacotesFiltrados]
  );

  const totalServicosRestantes = useMemo(() => 
    pacotesFiltrados.reduce((acc, p) => acc + p.servicosRestantes, 0),
    [pacotesFiltrados]
  );

  const taxaUtilizacao = useMemo(() => {
    const total = pacotesFiltrados.reduce((acc, p) => acc + p.servicosTotal, 0);
    return total > 0 ? (totalServicosUsados / total) * 100 : 0;
  }, [pacotesFiltrados, totalServicosUsados]);

  const pacoteMaisPopular = useMemo(() => {
    const contagem = new Map<string, number>();
    pacotesFiltrados.forEach(p => {
      contagem.set(p.nomePacote, (contagem.get(p.nomePacote) || 0) + 1);
    });
    
    let max = { nome: "—", quantidade: 0 };
    contagem.forEach((qtd, nome) => {
      if (qtd > max.quantidade) {
        max = { nome, quantidade: qtd };
      }
    });
    
    return max;
  }, [pacotesFiltrados]);

  // Gráficos
  const distribuicaoPorPacote = useMemo(() => {
    const contagem = new Map<string, number>();
    pacotesFiltrados.forEach(p => {
      contagem.set(p.nomePacote, (contagem.get(p.nomePacote) || 0) + 1);
    });
    
    return Array.from(contagem.entries())
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [pacotesFiltrados]);

  const distribuicaoPorte = useMemo(() => {
    const contagem = new Map<string, number>();
    pacotesFiltrados.forEach(p => {
      contagem.set(p.porte, (contagem.get(p.porte) || 0) + 1);
    });
    
    return Array.from(contagem.entries())
      .map(([porte, quantidade]) => ({ porte, quantidade }));
  }, [pacotesFiltrados]);


  const pacotesProximosVencimento = useMemo(() => {
    const hoje = new Date();
    const limite = addDays(hoje, 30);
    
    return pacotesFiltrados
      .filter(p => {
        const validade = new Date(p.dataValidade);
        return p.status === "Ativo" && validade >= hoje && validade <= limite;
      })
      .sort((a, b) => a.dataValidade.localeCompare(b.dataValidade))
      .slice(0, 10);
  }, [pacotesFiltrados]);

  const evolucaoUltimos6Meses = useMemo(() => {
    const hoje = new Date();
    
    // Calcular os últimos 6 meses
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const dataReferencia = subMonths(hoje, i);
      const inicio = startOfMonth(dataReferencia);
      const fim = endOfMonth(dataReferencia);
      
      const pacotesDoMes = pacotesHistorico.filter(p => {
        const data = new Date(p.dataAtivacao);
        return data >= inicio && data <= fim;
      });
      
      const totalServicos = pacotesDoMes.reduce((acc, p) => acc + p.servicosTotal, 0);
      
      meses.push({
        mes: format(dataReferencia, "MMM/yy", { locale: ptBR }),
        servicos: totalServicos,
      });
    }
    
    return meses;
  }, [pacotesHistorico]);

  const evolucaoPacotesVendidos = useMemo(() => {
    const hoje = new Date();
    
    // Calcular os últimos 6 meses
    const meses = [];
    for (let i = 5; i >= 0; i--) {
      const dataReferencia = subMonths(hoje, i);
      const inicio = startOfMonth(dataReferencia);
      const fim = endOfMonth(dataReferencia);
      
      const pacotesDoMes = pacotesHistorico.filter(p => {
        const data = new Date(p.dataAtivacao);
        return data >= inicio && data <= fim;
      });
      
      // Cada pacote vendido conta como 1, independente de quantos serviços tem
      const totalPacotes = pacotesDoMes.length;
      
      meses.push({
        mes: format(dataReferencia, "MMM/yy", { locale: ptBR }),
        pacotes: totalPacotes,
      });
    }
    
    return meses;
  }, [pacotesHistorico]);

  const exportarCSV = () => {
    const headers = [
      "Pacote",
      "Cliente",
      "Pet",
      "Raça",
      "Porte",
      "Data Ativação",
      "Data Validade",
      "Total Serviços",
      "Serviços Usados",
      "Serviços Restantes",
      "Status",
    ];
    
    const rows = pacotesFiltrados.map(p => [
      p.nomePacote,
      p.cliente,
      p.pet,
      p.raca,
      p.porte,
      format(new Date(p.dataAtivacao), "dd/MM/yyyy"),
      format(new Date(p.dataValidade), "dd/MM/yyyy"),
      p.servicosTotal,
      p.servicosUsados,
      p.servicosRestantes,
      p.status,
    ]);
    
    const csv = [headers, ...rows]
      .map(row => row.join(";"))
      .join("\n");
    
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `pacotes-ativos-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    
    toast.success("Relatório exportado com sucesso!");
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Relatório de Pacotes Ativos</h2>
        <Button onClick={exportarCSV} variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Input 
                  type="date" 
                  value={filtros.dataInicio}
                  onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Input 
                  type="date" 
                  value={filtros.dataFim}
                  onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filtros.status} onValueChange={(v: any) => setFiltros({ ...filtros, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Ativo">Ativo</SelectItem>
                    <SelectItem value="Completo">Completo</SelectItem>
                    <SelectItem value="Vencido">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={filtros.cliente} onValueChange={(v) => setFiltros({ ...filtros, cliente: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {clientesUnicos.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Porte</Label>
                <Select value={filtros.porte} onValueChange={(v) => setFiltros({ ...filtros, porte: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Pequeno">Pequeno</SelectItem>
                    <SelectItem value="Médio">Médio</SelectItem>
                    <SelectItem value="Grande">Grande</SelectItem>
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
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-blue-700 font-medium">Pacotes Ativos</p>
                <p className="text-3xl font-bold text-blue-900">{totalPacotesAtivos}</p>
                <p className="text-xs text-blue-600">No período selecionado</p>
              </div>
              <Package className="h-10 w-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-green-700 font-medium">Serviços Utilizados</p>
                <p className="text-3xl font-bold text-green-900">{totalServicosUsados}</p>
                <p className="text-xs text-green-600">Total consumido</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-orange-700 font-medium">Serviços Disponíveis</p>
                <p className="text-3xl font-bold text-orange-900">{totalServicosRestantes}</p>
                <p className="text-xs text-orange-600">Ainda podem ser usados</p>
              </div>
              <Clock className="h-10 w-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-purple-50 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-purple-700 font-medium">Taxa de Utilização</p>
                <p className="text-3xl font-bold text-purple-900">{taxaUtilizacao.toFixed(1)}%</p>
                <p className="text-xs text-purple-600">Serviços usados / total</p>
              </div>
              <TrendingUp className="h-10 w-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-indigo-50 border-indigo-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-indigo-700 font-medium">Pacote Mais Popular</p>
                <p className="text-lg font-bold text-indigo-900 truncate">{pacoteMaisPopular.nome}</p>
                <p className="text-xs text-indigo-600">{pacoteMaisPopular.quantidade} pacotes</p>
              </div>
              <Award className="h-10 w-10 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Tipo de Pacote</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distribuicaoPorPacote}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="quantidade"
                  nameKey="nome"
                  label={(entry) => entry.quantidade}
                >
                  {distribuicaoPorPacote.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Porte do Pet</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
        <Pie
          data={distribuicaoPorte}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={5}
          dataKey="quantidade"
          nameKey="porte"
          label={(entry) => entry.quantidade}
        >
                  {distribuicaoPorte.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.porte === "Pequeno" ? "#10b981" : 
                            entry.porte === "Médio" ? "#f59e0b" : "#ef4444"} 
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Evolução Últimos 6 Meses - Serviços */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Serviços Vendidos dentro do Pacote</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Total de serviços incluídos nos pacotes vendidos nos últimos 6 meses
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={evolucaoUltimos6Meses}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="mes" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="servicos" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 5 }}
                activeDot={{ r: 7 }}
                name="Serviços Vendidos"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Evolução Últimos 6 Meses - Pacotes */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Pacotes Vendidos</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Quantidade de pacotes vendidos nos últimos 6 meses (cada venda conta como 1 pacote)
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={evolucaoPacotesVendidos}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="mes" 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                style={{ fontSize: '12px' }}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="pacotes" 
                stroke="#10b981" 
                strokeWidth={3}
                dot={{ fill: '#10b981', r: 5 }}
                activeDot={{ r: 7 }}
                name="Pacotes Vendidos"
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Vencimentos Próximos */}
      <Card>
        <CardHeader>
          <CardTitle>Pacotes com Vencimento Próximo (30 dias)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pacotesProximosVencimento.length > 0 ? (
              pacotesProximosVencimento.map((pacote) => {
                const diasRestantes = differenceInDays(new Date(pacote.dataValidade), new Date());
                
                return (
                  <div key={pacote.id} className="flex items-center gap-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <AlertCircle className="h-5 w-5 text-orange-600" />
                    
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{pacote.cliente} - {pacote.pet}</p>
                      <p className="text-xs text-muted-foreground">
                        {pacote.nomePacote} | {pacote.servicosRestantes} serviços restantes
                      </p>
                    </div>
                    
                    <div className="text-right">
                      <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                        {diasRestantes} dias
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Vence {format(new Date(pacote.dataValidade), "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Nenhum pacote com vencimento próximo
              </p>
            )}
          </div>
        </CardContent>
      </Card>


      {/* Tabela Final */}
      <Card>
        <CardHeader>
          <CardTitle>Listagem Completa de Pacotes</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pacote</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Pet</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Usados</TableHead>
                <TableHead className="text-center">Restantes</TableHead>
                <TableHead>Ativação</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pacotesFiltrados.length > 0 ? (
                pacotesFiltrados
                  .sort((a, b) => b.dataAtivacao.localeCompare(a.dataAtivacao))
                  .map((pacote) => (
                    <TableRow key={pacote.id}>
                      <TableCell className="font-medium">{pacote.nomePacote}</TableCell>
                      <TableCell>{pacote.cliente}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{pacote.pet}</p>
                          <p className="text-xs text-muted-foreground">
                            {pacote.raca} - {pacote.porte}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold">
                        {pacote.servicosTotal}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                          {pacote.servicosUsados}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge 
                          variant="outline" 
                          className={
                            pacote.servicosRestantes === 0 
                              ? "bg-red-50 text-red-700 border-red-300"
                              : pacote.servicosRestantes <= 2
                              ? "bg-orange-50 text-orange-700 border-orange-300"
                              : "bg-blue-50 text-blue-700 border-blue-300"
                          }
                        >
                          {pacote.servicosRestantes}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(pacote.dataAtivacao), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        {format(new Date(pacote.dataValidade), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            pacote.status === "Ativo" ? "default" :
                            pacote.status === "Completo" ? "secondary" : "destructive"
                          }
                        >
                          {pacote.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    Nenhum pacote encontrado para os filtros selecionados
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
