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
  Calendar,
  Clock,
  TrendingUp,
  Award,
  DollarSign,
  Download,
  Filter,
  ChevronDown,
  ChevronUp,
  Users,
  PawPrint,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from "recharts";
import { KPICard } from "@/components/relatorios/shared/KPICard";
import { 
  format, subDays, startOfMonth, endOfMonth, 
  subMonths, differenceInMinutes, parse 
} from "date-fns";
import { ptBR } from "date-fns/locale";

interface AtendimentoConsolidado {
  id: string;
  data: string;
  horario: string;
  horarioTermino: string;
  servico: string;
  cliente: string;
  pet: string;
  raca: string;
  porte: string;
  tipo: "Avulso" | "Pacote";
  groomer: string;
  origem: "agendamentos" | "agendamentos_pacotes";
}

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

export function AtendimentosRealizados() {
  const { user, ownerId, isRecepcionista } = useAuth();
  const [loading, setLoading] = useState(true);
  const [atendimentos, setAtendimentos] = useState<AtendimentoConsolidado[]>([]);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtros, setFiltros] = useState({
    dataInicio: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    dataFim: format(new Date(), "yyyy-MM-dd"),
    tipo: "all" as "all" | "Avulso" | "Pacote",
  });

  useEffect(() => {
    if (user) {
      loadAtendimentos();
    }
  }, [user]);

  const loadAtendimentos = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Buscar agendamentos avulsos e de pacotes já agendados na tabela agendamentos
      const { data: agendamentosData, error: errorAgendamentos } = await supabase
        .from("agendamentos")
        .select("*")
        .eq("user_id", user.id)
        .gte("data", filtros.dataInicio)
        .lte("data", filtros.dataFim)
        .order("data", { ascending: false });
      
      if (errorAgendamentos) throw errorAgendamentos;
      
      // Buscar pacotes vendidos para expandir os serviços por data de atendimento
      const { data: pacotesData, error: errorPacotes } = await supabase
        .from("agendamentos_pacotes")
        .select("*")
        .eq("user_id", ownerId);
      
      if (errorPacotes) throw errorPacotes;
      
      // Buscar raças para obter porte
      const { data: racasData } = await supabase
        .from("racas")
        .select("nome, porte")
        .eq("user_id", user.id);
      
      const racasMap = new Map(
        (racasData || []).map(r => [r.nome, r.porte])
      );
      
      // Consolidar agendamentos da tabela agendamentos
      const atendimentosAgendamentos: AtendimentoConsolidado[] = (agendamentosData || []).map((a: any) => {
        const isPacote = a.numero_servico_pacote && a.numero_servico_pacote.trim() !== "";
        
        return {
          id: a.id,
          data: a.data,
          horario: a.horario || "—",
          horarioTermino: a.horario_termino || "—",
          servico: a.servico,
          cliente: a.cliente,
          pet: a.pet,
          raca: a.raca,
          porte: racasMap.get(a.raca) || "Médio",
          tipo: isPacote ? "Pacote" as const : "Avulso" as const,
          groomer: a.groomer || "—",
          origem: "agendamentos" as const,
        };
      });
      
      // Expandir serviços de pacotes filtrando pela data do atendimento
      const atendimentosPacotes: AtendimentoConsolidado[] = [];
      (pacotesData || []).forEach((p: any) => {
        const servicos = p.servicos as any[];
        servicos.forEach((s: any, index: number) => {
          const dataServico = s.data;
          
          // Filtrar apenas serviços dentro do período selecionado
          if (dataServico >= filtros.dataInicio && dataServico <= filtros.dataFim) {
            atendimentosPacotes.push({
              id: `${p.id}-${index}`,
              data: dataServico,
              horario: s.horarioInicio || "—",
              horarioTermino: s.horarioTermino || "—",
              servico: s.nomeServico || "Serviço do Pacote",
              cliente: p.nome_cliente,
              pet: p.nome_pet,
              raca: p.raca,
              porte: racasMap.get(p.raca) || "Médio",
              tipo: "Pacote" as const,
              groomer: "—",
              origem: "agendamentos_pacotes" as const,
            });
          }
        });
      });
      
      const todosAtendimentos = [...atendimentosAgendamentos, ...atendimentosPacotes];
      setAtendimentos(todosAtendimentos);
      
    } catch (error) {
      console.error("Erro ao carregar atendimentos:", error);
      toast.error("Erro ao carregar dados dos atendimentos");
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    loadAtendimentos();
    toast.success("Filtros aplicados com sucesso!");
  };

  const limparFiltros = () => {
    setFiltros({
      dataInicio: format(subDays(new Date(), 30), "yyyy-MM-dd"),
      dataFim: format(new Date(), "yyyy-MM-dd"),
      tipo: "all",
    });
  };

  // Cálculos dos KPIs
  const totalAtendimentos = useMemo(() => {
    if (isRecepcionista) return 0;
    return atendimentos.length;
  }, [atendimentos, isRecepcionista]);

  const atendimentosAvulsos = useMemo(() => {
    if (isRecepcionista) return 0;
    return atendimentos.filter(a => a.tipo === "Avulso").length;
  }, [atendimentos, isRecepcionista]);

  const atendimentosPacotes = useMemo(() => {
    if (isRecepcionista) return 0;
    return atendimentos.filter(a => a.tipo === "Pacote").length;
  }, [atendimentos, isRecepcionista]);

  const percentualAvulsos = useMemo(() => {
    if (totalAtendimentos === 0) return 0;
    return ((atendimentosAvulsos / totalAtendimentos) * 100).toFixed(0);
  }, [atendimentosAvulsos, totalAtendimentos]);

  const percentualPacotes = useMemo(() => {
    if (totalAtendimentos === 0) return 0;
    return ((atendimentosPacotes / totalAtendimentos) * 100).toFixed(0);
  }, [atendimentosPacotes, totalAtendimentos]);

  const servicoMaisRealizado = useMemo(() => {
    if (isRecepcionista || atendimentos.length === 0) return { nome: "—", quantidade: 0 };
    
    const contagem = new Map<string, number>();
    atendimentos.forEach(a => {
      contagem.set(a.servico, (contagem.get(a.servico) || 0) + 1);
    });
    
    let maxServico = { nome: "—", quantidade: 0 };
    contagem.forEach((qtd, servico) => {
      if (qtd > maxServico.quantidade) {
        maxServico = { nome: servico, quantidade: qtd };
      }
    });
    
    return maxServico;
  }, [atendimentos, isRecepcionista]);

  const horarioPico = useMemo(() => {
    if (isRecepcionista) return { faixa: "—", quantidade: 0 };
    
    const atendimentosComHorario = atendimentos.filter(a => a.horario !== "—");
    if (atendimentosComHorario.length === 0) return { faixa: "—", quantidade: 0 };
    
    const contagemHora = new Map<number, number>();
    atendimentosComHorario.forEach(a => {
      const hora = parseInt(a.horario.split(":")[0]);
      if (!isNaN(hora)) {
        contagemHora.set(hora, (contagemHora.get(hora) || 0) + 1);
      }
    });
    
    let maxHora = { faixa: "—", quantidade: 0 };
    contagemHora.forEach((qtd, hora) => {
      if (qtd > maxHora.quantidade) {
        maxHora = { 
          faixa: `${hora}h - ${hora + 1}h`, 
          quantidade: qtd 
        };
      }
    });
    
    return maxHora;
  }, [atendimentos, isRecepcionista]);

  // Dados para gráficos
  const atendimentosPorDia = useMemo(() => {
    if (isRecepcionista) return [];
    
    const agrupado = new Map<string, number>();
    
    atendimentos.forEach(a => {
      agrupado.set(a.data, (agrupado.get(a.data) || 0) + 1);
    });
    
    return Array.from(agrupado.entries())
      .map(([data, quantidade]) => ({ data, quantidade }))
      .sort((a, b) => a.data.localeCompare(b.data));
  }, [atendimentos, isRecepcionista]);

  const atendimentosPorServico = useMemo(() => {
    if (isRecepcionista) return [];
    
    const contagem = new Map<string, number>();
    
    atendimentos.forEach(a => {
      contagem.set(a.servico, (contagem.get(a.servico) || 0) + 1);
    });
    
    return Array.from(contagem.entries())
      .map(([servico, quantidade]) => ({ servico, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);
  }, [atendimentos, isRecepcionista]);

  const distribuicaoTipo = useMemo(() => {
    if (isRecepcionista) return [];
    return [
      { name: "Avulsos", value: atendimentosAvulsos },
      { name: "Pacotes", value: atendimentosPacotes }
    ].filter(item => item.value > 0);
  }, [atendimentosAvulsos, atendimentosPacotes, isRecepcionista]);

  const atendimentosPorDiaSemana = useMemo(() => {
    const diasSemana = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    if (isRecepcionista) {
      return diasSemana.map(dia => ({ dia, quantidade: 0 }));
    }
    
    const contagem = new Array(7).fill(0);
    
    atendimentos.forEach(a => {
      const diaSemana = new Date(a.data + "T12:00:00").getDay();
      contagem[diaSemana]++;
    });
    
    return diasSemana.map((dia, index) => ({
      dia,
      quantidade: contagem[index]
    }));
  }, [atendimentos, isRecepcionista]);

  const distribuicaoPorte = useMemo(() => {
    if (isRecepcionista) return [];
    
    const contagem = new Map<string, number>();
    
    atendimentos.forEach(a => {
      contagem.set(a.porte, (contagem.get(a.porte) || 0) + 1);
    });
    
    return Array.from(contagem.entries())
      .map(([porte, quantidade]) => ({ porte, quantidade }))
      .sort((a, b) => {
        const ordem = ["Pequeno", "Médio", "Grande"];
        return ordem.indexOf(a.porte) - ordem.indexOf(b.porte);
      });
  }, [atendimentos, isRecepcionista]);

  const topClientes = useMemo(() => {
    if (isRecepcionista) return [];
    
    const contagem = new Map<string, number>();
    
    atendimentos.forEach(a => {
      contagem.set(a.cliente, (contagem.get(a.cliente) || 0) + 1);
    });
    
    return Array.from(contagem.entries())
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10);
  }, [atendimentos, isRecepcionista]);

  const horariosHeatmap = useMemo(() => {
    const contagem = new Map<number, number>();
    
    for (let h = 8; h <= 18; h++) {
      contagem.set(h, 0);
    }
    
    if (!isRecepcionista) {
      atendimentos.forEach(a => {
        if (a.horario !== "—") {
          const hora = parseInt(a.horario.split(":")[0]);
          if (!isNaN(hora) && hora >= 8 && hora <= 18) {
            contagem.set(hora, (contagem.get(hora) || 0) + 1);
          }
        }
      });
    }
    
    return Array.from(contagem.entries())
      .map(([hora, quantidade]) => ({ hora, quantidade }))
      .sort((a, b) => a.hora - b.hora);
  }, [atendimentos, isRecepcionista]);

  const maxAtendimentosHora = useMemo(() => {
    return Math.max(...horariosHeatmap.map(h => h.quantidade), 1);
  }, [horariosHeatmap]);

  const exportarCSV = () => {
    const headers = [
      "Data",
      "Horário",
      "Serviço",
      "Pet",
      "Raça",
      "Porte",
      "Tutor",
      "Tipo",
      "Groomer"
    ];
    
    const rows = atendimentos.map(a => [
      format(new Date(a.data + "T12:00:00"), "dd/MM/yyyy"),
      a.horario,
      a.servico,
      a.pet,
      a.raca,
      a.porte,
      a.cliente,
      a.tipo,
      a.groomer
    ]);
    
    const csv = [headers, ...rows]
      .map(row => row.join(";"))
      .join("\n");
    
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `atendimentos-${format(new Date(), "yyyy-MM-dd")}.csv`;
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
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h2 className="text-3xl font-bold">Relatório de Atendimentos Realizados</h2>
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
                <Label>Tipo de Atendimento</Label>
                <Select 
                  value={filtros.tipo}
                  onValueChange={(value: any) => setFiltros({ ...filtros, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="Avulso">Avulso</SelectItem>
                    <SelectItem value="Pacote">Pacote</SelectItem>
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
        <KPICard
          titulo="Total de Atendimentos"
          valor={totalAtendimentos.toString()}
          subtitulo="No período selecionado"
          icon={<Calendar className="h-5 w-5" />}
        />
        
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-blue-200 dark:border-blue-800">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Avulsos vs Pacotes
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {atendimentosAvulsos}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    Avulsos ({percentualAvulsos}%)
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                    {atendimentosPacotes}
                  </p>
                  <p className="text-xs text-green-600 dark:text-green-400">
                    Pacotes ({percentualPacotes}%)
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <KPICard
          titulo="Serviço Mais Realizado"
          valor={servicoMaisRealizado.nome}
          subtitulo={`${servicoMaisRealizado.quantidade} atendimentos`}
          icon={<Award className="h-5 w-5" />}
        />
        
        <KPICard
          titulo="Horário de Pico"
          valor={horarioPico.faixa}
          subtitulo={`${horarioPico.quantidade} atendimentos`}
          icon={<Clock className="h-5 w-5" />}
        />
      </div>

      {/* Gráficos - Linha 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Atendimentos por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={atendimentosPorDia}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="data" 
                  tickFormatter={(value) => format(new Date(value + "T12:00:00"), "dd/MM")}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  labelFormatter={(label) => format(new Date(label + "T12:00:00"), "dd/MM/yyyy")}
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Bar dataKey="quantidade" fill="hsl(var(--primary))" name="Atendimentos" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tendência de Atendimentos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={atendimentosPorDia}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis 
                  dataKey="data" 
                  tickFormatter={(value) => format(new Date(value + "T12:00:00"), "dd/MM")}
                  className="text-xs"
                />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="quantidade" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  name="Atendimentos"
                  dot={{ fill: '#8b5cf6' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos - Linha 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Distribuição: Avulsos vs Pacotes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={distribuicaoTipo}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={(entry) => `${entry.name}: ${entry.value}`}
                >
                  <Cell fill="#3b82f6" />
                  <Cell fill="#10b981" />
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Atendimentos por Dia da Semana</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={atendimentosPorDiaSemana}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="dia" className="text-xs" angle={-45} textAnchor="end" height={80} />
                <YAxis className="text-xs" />
                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                <Bar dataKey="quantidade" fill="#f59e0b" name="Atendimentos" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Serviços Mais Realizados */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Serviços Mais Realizados</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={atendimentosPorServico} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis type="number" className="text-xs" />
              <YAxis dataKey="servico" type="category" width={150} className="text-xs" />
              <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
              <Bar dataKey="quantidade" fill="#10b981" name="Atendimentos" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Heatmap Horários */}
      <Card>
        <CardHeader>
          <CardTitle>Mapa de Calor - Horários de Pico</CardTitle>
          <p className="text-sm text-muted-foreground">
            Intensidade de atendimentos por hora do dia
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {horariosHeatmap.map((faixa) => (
              <div key={faixa.hora} className="flex items-center gap-2">
                <span className="text-sm font-medium w-20">
                  {faixa.hora}h
                </span>
                <div className="flex-1 h-8 bg-muted rounded relative overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all"
                    style={{ width: `${(faixa.quantidade / maxAtendimentosHora) * 100}%` }}
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-white mix-blend-difference">
                    {faixa.quantidade} atendimento{faixa.quantidade !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top 10 Clientes */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Clientes - Mais Atendimentos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {topClientes.map((cliente, index) => (
              <div key={cliente.nome} className="flex items-center gap-4">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-sm">
                  {index + 1}
                </div>
                
                <div className="flex-1">
                  <p className="font-semibold">{cliente.nome}</p>
                  <div className="w-full h-2 bg-muted rounded-full mt-1">
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all"
                      style={{ width: `${(cliente.quantidade / topClientes[0].quantidade) * 100}%` }}
                    />
                  </div>
                </div>
                
                <span className="font-bold text-lg">{cliente.quantidade}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
