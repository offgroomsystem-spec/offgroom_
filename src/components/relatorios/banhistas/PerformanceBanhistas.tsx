import { useState, useEffect, useMemo } from "react";
import { ComissoesDetalhadas } from "./ComissoesDetalhadas";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth, endOfMonth, subMonths, parseISO, eachDayOfInterval, getDay, getHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { Users, Clock, Star, DollarSign, TrendingUp, Activity, Info } from "lucide-react";

const COLORS = [
  "hsl(var(--primary))", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#06b6d4", "#ec4899", "#14b8a6", "#f97316", "#6366f1",
];

interface Agendamento {
  id: string;
  groomer: string;
  data: string;
  horario: string;
  horario_termino: string;
  tempo_servico: string;
  servico: string;
  servicos: any;
  status: string;
  pet: string;
  raca: string;
  taxi_dog: string;
  cliente: string;
}

export const PerformanceBanhistas = () => {
  const { user, ownerId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [groomers, setGroomers] = useState<string[]>([]);
  const [groomersData, setGroomersData] = useState<{ id: string; nome: string }[]>([]);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [empresaConfig, setEmpresaConfig] = useState<any>(null);
  const [pacotes, setPacotes] = useState<any[]>([]);
  const [comissoesConfig, setComissoesConfig] = useState<any>(null);
  const [lancamentosComissao, setLancamentosComissao] = useState<any[]>([]);
  const [allAgGroomers, setAllAgGroomers] = useState<{ id: string; groomer: string }[]>([]);
  const [comissoesDetalhadasOpen, setComissoesDetalhadasOpen] = useState(false);

  // Filters
  const [periodo, setPeriodo] = useState("mes");
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [groomerFilter, setGroomerFilter] = useState("todos");
  

  useEffect(() => {
    if (periodo === "mes") {
      setDataInicio(format(startOfMonth(new Date()), "yyyy-MM-dd"));
      setDataFim(format(endOfMonth(new Date()), "yyyy-MM-dd"));
    } else if (periodo === "mes-anterior") {
      const m = subMonths(new Date(), 1);
      setDataInicio(format(startOfMonth(m), "yyyy-MM-dd"));
      setDataFim(format(endOfMonth(m), "yyyy-MM-dd"));
    } else if (periodo === "trimestre") {
      setDataInicio(format(subMonths(startOfMonth(new Date()), 2), "yyyy-MM-dd"));
      setDataFim(format(endOfMonth(new Date()), "yyyy-MM-dd"));
    }
  }, [periodo]);

  // Helper: flatten agendamentos_pacotes into individual service entries within date range
  const flattenPacotes = (pacotesData: any[], inicio: string, fim: string): Agendamento[] => {
    const result: Agendamento[] = [];
    (pacotesData || []).forEach((p: any) => {
      const servicos = Array.isArray(p.servicos) ? p.servicos : [];
      servicos.forEach((s: any) => {
        if (!s.data) return;
        if (s.data >= inicio && s.data <= fim) {
          result.push({
            id: `${p.id}_${s.numero || s.data}`,
            groomer: s.groomer || "",
            data: s.data,
            horario: s.horarioInicio || "",
            horario_termino: s.horarioTermino || "",
            tempo_servico: s.tempoServico || "",
            servico: s.nomeServico || "",
            servicos: s.servicosExtras || null,
            status: "",
            pet: p.nome_pet || "",
            raca: p.raca || "",
            taxi_dog: p.taxi_dog || "",
            cliente: p.nome_cliente || "",
          });
        }
      });
    });
    return result;
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [agRes, grRes, lnRes, empRes, pacRes, comRes, lnDetailRes, agAllGroomerRes] = await Promise.all([
        supabase
          .from("agendamentos")
          .select("id, groomer, data, horario, horario_termino, tempo_servico, servico, servicos, status, pet, raca, taxi_dog, cliente")
          .eq("user_id", ownerId)
          .gte("data", dataInicio)
          .lte("data", dataFim)
          .order("data", { ascending: true }),
        supabase.from("groomers").select("id, nome").eq("user_id", ownerId),
        supabase
          .from("lancamentos_financeiros")
          .select("agendamento_id, valor_total")
          .eq("user_id", ownerId)
          .eq("tipo", "Receita")
          .not("agendamento_id", "is", null),
        supabase.from("empresa_config").select("dias_funcionamento, horario_inicio, horario_fim, meta_faturamento_mensal").eq("user_id", ownerId).maybeSingle(),
        supabase
          .from("agendamentos_pacotes")
          .select("id, nome_cliente, nome_pet, raca, taxi_dog, servicos")
          .eq("user_id", ownerId),
        supabase
          .from("comissoes_config" as any)
          .select("*")
          .eq("user_id", ownerId)
          .maybeSingle(),
        supabase
          .from("lancamentos_financeiros")
          .select("id, agendamento_id, valor_total, descricao1, data_pagamento, lancamentos_financeiros_itens(descricao2, valor, quantidade)")
          .eq("user_id", ownerId)
          .eq("pago", true)
          .eq("tipo", "Receita")
          .gte("data_pagamento", dataInicio)
          .lte("data_pagamento", dataFim),
        // Fetch ALL agendamento->groomer mapping (no date filter) for commission calc
        supabase
          .from("agendamentos")
          .select("id, groomer")
          .eq("user_id", ownerId),
      ]);
      setEmpresaConfig(empRes.data);
      setComissoesConfig(comRes.data || null);
      setLancamentosComissao(lnDetailRes.data || []);
      setAllAgGroomers((agAllGroomerRes.data || []) as { id: string; groomer: string }[]);
      setGroomersData((grRes.data || []) as { id: string; nome: string }[]);

      const agData = agRes.data || [];
      const pacData = pacRes.data || [];
      setPacotes(pacData);
      const pacoteEntries = flattenPacotes(pacData, dataInicio, dataFim);
      const allAgendamentos = [...agData, ...pacoteEntries];
      setAgendamentos(allAgendamentos);
      const nomes = [...new Set((grRes.data || []).map((g: any) => g.nome))].sort();
      const hasEmpty = allAgendamentos.some((a: any) => !a.groomer || !a.groomer.trim());
      if (hasEmpty) nomes.push("Não atribuído");
      setGroomers(nomes);
      setLancamentos(lnRes.data || []);
      setLoading(false);
    };
    load();
  }, [user, ownerId, dataInicio, dataFim]);

  // Subscribe to realtime changes
  useEffect(() => {
    const reloadComissaoData = () => {
      if (!user) return;
      Promise.all([
        supabase.from("comissoes_config" as any).select("*").eq("user_id", ownerId).maybeSingle(),
        supabase
          .from("lancamentos_financeiros")
          .select("id, agendamento_id, valor_total, descricao1, data_pagamento, lancamentos_financeiros_itens(descricao2, valor, quantidade)")
          .eq("user_id", ownerId)
          .eq("pago", true)
          .eq("tipo", "Receita")
          .gte("data_pagamento", dataInicio)
          .lte("data_pagamento", dataFim),
        supabase.from("agendamentos").select("id, groomer").eq("user_id", ownerId),
      ]).then(([comRes, lnRes, agAllRes]) => {
        setComissoesConfig(comRes.data || null);
        setLancamentosComissao(lnRes.data || []);
        setAllAgGroomers((agAllRes.data || []) as { id: string; groomer: string }[]);
      });
    };

    const channel = supabase
      .channel("perf-banhistas")
      .on("postgres_changes", { event: "*", schema: "public", table: "agendamentos" }, () => {
        if (!user) return;
        Promise.all([
          supabase
            .from("agendamentos")
            .select("id, groomer, data, horario, horario_termino, tempo_servico, servico, servicos, status, pet, raca, taxi_dog, cliente")
            .eq("user_id", ownerId)
            .gte("data", dataInicio)
            .lte("data", dataFim)
            .order("data", { ascending: true }),
          supabase
            .from("agendamentos_pacotes")
            .select("id, nome_cliente, nome_pet, raca, taxi_dog, servicos")
            .eq("user_id", ownerId),
          supabase.from("agendamentos").select("id, groomer").eq("user_id", ownerId),
        ]).then(([agRes, pacRes, agAllRes]) => {
          const pacData = pacRes.data || [];
          setPacotes(pacData);
          const pacoteEntries = flattenPacotes(pacData, dataInicio, dataFim);
          setAgendamentos([...(agRes.data || []), ...pacoteEntries]);
          setAllAgGroomers((agAllRes.data || []) as { id: string; groomer: string }[]);
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "agendamentos_pacotes" }, () => {
        if (!user) return;
        Promise.all([
          supabase
            .from("agendamentos")
            .select("id, groomer, data, horario, horario_termino, tempo_servico, servico, servicos, status, pet, raca, taxi_dog, cliente")
            .eq("user_id", ownerId)
            .gte("data", dataInicio)
            .lte("data", dataFim)
            .order("data", { ascending: true }),
          supabase
            .from("agendamentos_pacotes")
            .select("id, nome_cliente, nome_pet, raca, taxi_dog, servicos")
            .eq("user_id", ownerId),
        ]).then(([agRes, pacRes]) => {
          const pacData = pacRes.data || [];
          setPacotes(pacData);
          const pacoteEntries = flattenPacotes(pacData, dataInicio, dataFim);
          setAgendamentos([...(agRes.data || []), ...pacoteEntries]);
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "comissoes_config" }, () => {
        reloadComissaoData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "lancamentos_financeiros" }, () => {
        reloadComissaoData();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, ownerId, dataInicio, dataFim]);

  const receitaMap = useMemo(() => {
    const m = new Map<string, number>();
    lancamentos.forEach((l) => { if (l.agendamento_id) m.set(l.agendamento_id, l.valor_total); });
    return m;
  }, [lancamentos]);

  // Normalize groomer name: treat empty/blank as "Não atribuído"
  const normalizeGroomer = (g: string) => (g && g.trim() ? g.trim() : "Não atribuído");

  const normalizedAgendamentos = useMemo(() =>
    agendamentos.map((a) => ({ ...a, groomer: normalizeGroomer(a.groomer) })),
  [agendamentos]);

  const filtered = useMemo(() => {
    let list = normalizedAgendamentos;
    if (groomerFilter !== "todos") list = list.filter((a) => a.groomer === groomerFilter);
    return list;
  }, [normalizedAgendamentos, groomerFilter]);

  const concluidos = filtered;

  // Helper: parse tempo_servico "01:30" to minutes
  const parseMinutos = (t: string) => {
    if (!t) return 0;
    const [h, m] = t.split(":").map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  // Format raw minutes into "Xh Ymin" display
  const formatMinutosDisplay = (minutos: number) => {
    if (!minutos || minutos <= 0) return "0min";
    const h = Math.floor(minutos / 60);
    const m = Math.round(minutos % 60);
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  };

  const formatHorasMinutos = (horas: number) => {
    return formatMinutosDisplay(horas * 60);
  };

  const formatOccupancyRate = (value: number) => {
    if (!Number.isFinite(value) || value <= 0) return "0%";

    if (value < 1) {
      return `${value.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}%`;
    }

    const hasFraction = Math.abs(value - Math.round(value)) >= 0.05;

    return `${value.toLocaleString("pt-BR", {
      minimumFractionDigits: hasFraction ? 1 : 0,
      maximumFractionDigits: hasFraction ? 1 : 0,
    })}%`;
  };

  // Helper: get porte from raca text (simplified)
  const getPorte = (raca: string) => {
    const r = raca?.toLowerCase() || "";
    if (r.includes("grande") || r.includes("golden") || r.includes("labrador") || r.includes("pastor") || r.includes("husky") || r.includes("rottweiler")) return "Grande";
    if (r.includes("pequeno") || r.includes("yorkshire") || r.includes("shih") || r.includes("maltês") || r.includes("pinscher") || r.includes("chihuahua") || r.includes("lhasa") || r.includes("poodle toy")) return "Pequeno";
    return "Médio";
  };

  // === KPIs ===
  const kpis = useMemo(() => {
    const totalPets = concluidos.length;
    const totalMinutos = concluidos.reduce((s, a) => s + parseMinutos(a.tempo_servico), 0);
    const totalHoras = totalMinutos / 60;
    const mediaMinutos = totalPets > 0 ? Math.round(totalMinutos / totalPets) : 0;

    // Banhista mais produtivo — SEMPRE usa dados gerais do período (ignora filtro de groomer)
    const countPerGroomer = new Map<string, number>();
    normalizedAgendamentos.forEach((a) => {
      if (a.groomer && a.groomer.trim() && a.groomer !== "Não atribuído") {
        countPerGroomer.set(a.groomer, (countPerGroomer.get(a.groomer) || 0) + 1);
      }
    });
    let topGroomer = "-";
    let topCount = 0;
    const topGroomers: string[] = [];
    countPerGroomer.forEach((c, g) => {
      if (c > topCount) { topCount = c; topGroomers.length = 0; topGroomers.push(g); }
      else if (c === topCount && topCount > 0) { topGroomers.push(g); }
    });
    topGroomer = topGroomers.length > 0 ? topGroomers.join(" e ") : "-";

    // Receita total
    const receitaTotal = concluidos.reduce((s, a) => s + (receitaMap.get(a.id) || 0), 0);

    // Taxa ocupação baseada nos dias/horários de funcionamento da empresa
    const diasFunc = empresaConfig?.dias_funcionamento as Record<string, boolean> | null;
    const dayNameMap: Record<number, string> = { 0: "domingo", 1: "segunda", 2: "terca", 3: "quarta", 4: "quinta", 5: "sexta", 6: "sabado" };
    const diasNoIntervalo = eachDayOfInterval({ start: parseISO(dataInicio), end: parseISO(dataFim) })
      .filter((d) => {
        const nome = dayNameMap[getDay(d)];
        return diasFunc ? diasFunc[nome] === true : getDay(d) !== 0;
      });

    // Calcular horas de funcionamento diário
    const hInicio = empresaConfig?.horario_inicio ? parseInt(empresaConfig.horario_inicio.split(":")[0], 10) : 8;
    const mInicio = empresaConfig?.horario_inicio ? parseInt(empresaConfig.horario_inicio.split(":")[1] || "0", 10) : 0;
    const hFim = empresaConfig?.horario_fim ? parseInt(empresaConfig.horario_fim.split(":")[0], 10) : 18;
    const mFim = empresaConfig?.horario_fim ? parseInt(empresaConfig.horario_fim.split(":")[1] || "0", 10) : 0;
    const horasDiarias = (hFim * 60 + mFim - hInicio * 60 - mInicio) / 60 || 8;

    // Quando há filtro, a capacidade deve refletir apenas os groomers no contexto atual
    const allBanhistasCadastrados = groomers.filter((g) => g !== "Não atribuído").length || 1;
    const numBanhistasCadastrados =
      groomerFilter === "todos"
        ? allBanhistasCadastrados
        : groomerFilter === "Não atribuído"
          ? 0
          : 1;
    const capacidadeTotal = diasNoIntervalo.length * horasDiarias * numBanhistasCadastrados;
    const taxaOcupacao = capacidadeTotal > 0 ? (totalHoras / capacidadeTotal) * 100 : 0;
    const taxaOcupacaoFormatada = formatOccupancyRate(taxaOcupacao);

    return {
      totalPets,
      totalMinutos,
      totalHoras,
      mediaMinutos,
      topGroomer,
      topCount,
      receitaTotal,
      taxaOcupacao,
      taxaOcupacaoFormatada,
      capacidadeTotal: Math.round(capacidadeTotal * 10) / 10,
      numBanhistasCadastrados,
      diasUteis: diasNoIntervalo.length,
      horasDiarias: Math.round(horasDiarias * 10) / 10,
    };
  }, [concluidos, receitaMap, groomers, dataInicio, dataFim, empresaConfig, groomerFilter, normalizedAgendamentos]);

  // === Charts data ===

  // Pets atendidos por banhista
  const petsPerGroomer = useMemo(() => {
    const map = new Map<string, number>();
    concluidos.forEach((a) => map.set(a.groomer, (map.get(a.groomer) || 0) + 1));
    return [...map.entries()].map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total);
  }, [concluidos]);

  // Horas trabalhadas por banhista
  const horasPerGroomer = useMemo(() => {
    const map = new Map<string, number>();
    concluidos.forEach((a) => {
      if (a.groomer === "Não atribuído") return;
      const mins = parseMinutos(a.tempo_servico);
      map.set(a.groomer, (map.get(a.groomer) || 0) + mins);
    });
    return [...map.entries()].map(([nome, mins]) => ({ nome, minutos: mins, horas: mins / 60 })).sort((a, b) => b.minutos - a.minutos);
  }, [concluidos]);

  // Tempo médio por atendimento por banhista
  const tempoMedioPerGroomer = useMemo(() => {
    const mapMins = new Map<string, number>();
    const mapCount = new Map<string, number>();
    concluidos.forEach((a) => {
      if (a.groomer === "Não atribuído") return;
      const mins = parseMinutos(a.tempo_servico);
      mapMins.set(a.groomer, (mapMins.get(a.groomer) || 0) + mins);
      mapCount.set(a.groomer, (mapCount.get(a.groomer) || 0) + 1);
    });
    return [...mapMins.entries()].map(([nome, mins]) => ({
      nome,
      media: Math.round(mins / (mapCount.get(nome) || 1)),
    })).sort((a, b) => a.media - b.media);
  }, [concluidos]);

  // Receita por banhista
  const receitaPerGroomer = useMemo(() => {
    const map = new Map<string, number>();
    concluidos.forEach((a) => {
      if (a.groomer === "Não atribuído") return;
      map.set(a.groomer, (map.get(a.groomer) || 0) + (receitaMap.get(a.id) || 0));
    });
    return [...map.entries()].map(([nome, receita]) => ({ nome, receita: Math.round(receita * 100) / 100 })).sort((a, b) => b.receita - a.receita);
  }, [concluidos, receitaMap]);

  // Produtividade ao longo do tempo (por semana/dia)
  const produtividadeTimeline = useMemo(() => {
    const dayMap = new Map<string, number>();
    concluidos.forEach((a) => {
      dayMap.set(a.data, (dayMap.get(a.data) || 0) + 1);
    });
    return [...dayMap.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([data, total]) => ({
        data: format(parseISO(data), "dd/MM", { locale: ptBR }),
        atendimentos: total,
      }));
  }, [concluidos]);

  // Heatmap por hora do dia
  const heatmapData = useMemo(() => {
    const hours = Array.from({ length: 13 }, (_, i) => i + 7); // 7h-19h
    const counts = new Map<number, number>();
    hours.forEach((h) => counts.set(h, 0));
    concluidos.forEach((a) => {
      const h = parseInt(a.horario?.split(":")[0] || "0");
      if (counts.has(h)) counts.set(h, (counts.get(h) || 0) + 1);
    });
    return hours.map((h) => ({ hora: `${h}h`, total: counts.get(h) || 0 }));
  }, [concluidos]);

  // Ranking de performance (score combinado)
  const ranking = useMemo(() => {
    const groomerSet = new Set(concluidos.map((a) => a.groomer).filter((g) => g !== "Não atribuído"));
    const results: { nome: string; pets: number; receita: number; mediaMin: number; score: number }[] = [];
    groomerSet.forEach((g) => {
      const ga = concluidos.filter((a) => a.groomer === g);
      const pets = ga.length;
      const receita = ga.reduce((s, a) => s + (receitaMap.get(a.id) || 0), 0);
      const totalMin = ga.reduce((s, a) => s + parseMinutos(a.tempo_servico), 0);
      const mediaMin = pets > 0 ? Math.round(totalMin / pets) : 0;
      // Score: 50% pets + 30% receita + 20% eficiência (menos tempo = melhor)
      const maxPets = Math.max(...[...groomerSet].map((x) => concluidos.filter((a) => a.groomer === x).length), 1);
      const maxReceita = Math.max(...[...groomerSet].map((x) => concluidos.filter((a) => a.groomer === x).reduce((s, a) => s + (receitaMap.get(a.id) || 0), 0)), 1);
      const score = Math.round(((pets / maxPets) * 50) + ((receita / maxReceita) * 30) + (mediaMin > 0 ? ((60 / mediaMin) * 20) : 0));
      results.push({ nome: g, pets, receita, mediaMin, score: Math.min(score, 100) });
    });
    return results.sort((a, b) => b.score - a.score);
  }, [concluidos, receitaMap]);

  // Tipos de serviço por banhista
  const servicoPerGroomer = useMemo(() => {
    const map = new Map<string, Map<string, number>>();
    concluidos.forEach((a) => {
      if (a.groomer === "Não atribuído") return;
      if (!map.has(a.groomer)) map.set(a.groomer, new Map());
      const sMap = map.get(a.groomer)!;
      const servico = a.servico || "Outros";
      sMap.set(servico, (sMap.get(servico) || 0) + 1);
    });
    const result: { nome: string; [key: string]: any }[] = [];
    const allServicos = new Set<string>();
    map.forEach((sMap) => sMap.forEach((_, s) => allServicos.add(s)));
    map.forEach((sMap, groomer) => {
      const row: any = { nome: groomer };
      allServicos.forEach((s) => { row[s] = sMap.get(s) || 0; });
      result.push(row);
    });
    return { data: result, servicos: [...allServicos] };
  }, [concluidos]);

  // Taxa de ocupação por banhista (individual)
  const ocupacaoPerGroomer = useMemo(() => {
    const diasFunc = empresaConfig?.dias_funcionamento as Record<string, boolean> | null;
    const dayNameMap: Record<number, string> = { 0: "domingo", 1: "segunda", 2: "terca", 3: "quarta", 4: "quinta", 5: "sexta", 6: "sabado" };
    const diasNoIntervalo = eachDayOfInterval({ start: parseISO(dataInicio), end: parseISO(dataFim) })
      .filter((d) => {
        const nome = dayNameMap[getDay(d)];
        return diasFunc ? diasFunc[nome] === true : getDay(d) !== 0;
      });
    const hInicio = empresaConfig?.horario_inicio ? parseInt(empresaConfig.horario_inicio.split(":")[0], 10) : 8;
    const mInicio = empresaConfig?.horario_inicio ? parseInt(empresaConfig.horario_inicio.split(":")[1] || "0", 10) : 0;
    const hFim = empresaConfig?.horario_fim ? parseInt(empresaConfig.horario_fim.split(":")[0], 10) : 18;
    const mFim = empresaConfig?.horario_fim ? parseInt(empresaConfig.horario_fim.split(":")[1] || "0", 10) : 0;
    const horasDiarias = (hFim * 60 + mFim - hInicio * 60 - mInicio) / 60 || 8;
    const capacidadeIndividual = diasNoIntervalo.length * horasDiarias;

    // Accumulate hours per registered groomer
    const horasMap = new Map<string, number>();
    const registeredGroomers = groomers.filter((g) => g !== "Não atribuído");
    registeredGroomers.forEach((g) => horasMap.set(g, 0));

    // Use filtered data to respect groomer filter
    concluidos.forEach((a) => {
      if (a.groomer && a.groomer !== "Não atribuído" && horasMap.has(a.groomer)) {
        horasMap.set(a.groomer, (horasMap.get(a.groomer) || 0) + parseMinutos(a.tempo_servico));
      }
    });

    return registeredGroomers
      .filter((g) => groomerFilter === "todos" || groomerFilter === g)
      .map((g) => {
        const horasTrabalhadas = Math.round(((horasMap.get(g) || 0) / 60) * 100) / 100;
        const taxa = capacidadeIndividual > 0 ? (horasTrabalhadas / capacidadeIndividual) * 100 : 0;
        return {
          nome: g,
          taxa: Math.round(taxa * 100) / 100,
          horasTrabalhadas: Math.round(horasTrabalhadas * 10) / 10,
          capacidade: Math.round(capacidadeIndividual * 10) / 10,
          diasUteis: diasNoIntervalo.length,
          horasDiarias: Math.round(horasDiarias * 10) / 10,
        };
      })
      .sort((a, b) => b.taxa - a.taxa);
  }, [concluidos, groomers, dataInicio, dataFim, empresaConfig, groomerFilter]);

  // Performance por porte
  const porteData = useMemo(() => {
    const portes = new Map<string, { total: number; minutos: number }>();
    concluidos.forEach((a) => {
      const p = getPorte(a.raca);
      const existing = portes.get(p) || { total: 0, minutos: 0 };
      existing.total += 1;
      existing.minutos += parseMinutos(a.tempo_servico);
      portes.set(p, existing);
    });
    return [...portes.entries()].map(([porte, d]) => ({
      porte,
      total: d.total,
      mediaMin: d.total > 0 ? Math.round(d.minutos / d.total) : 0,
    }));
  }, [concluidos]);

  // === Commission calculation ===
  const comissaoPerGroomer = useMemo(() => {
    const cfg = comissoesConfig as any;
    if (!cfg?.ativo) return null;

    const tipoGlobal = cfg.tipo_comissao || "servicos_e_vendas";
    const tiposPerGroomer = (cfg.tipos_comissao_groomers || {}) as Record<string, string>;
    const modelo = cfg.modelo;

    const matchesTipo = (descricao2: string, tipo: string) => {
      const d = descricao2?.toLowerCase()?.trim() || "";
      if (tipo === "servicos") return d === "serviços" || d === "servicos";
      if (tipo === "produtos") return d === "venda" || d === "vendas";
      return d === "serviços" || d === "servicos" || d === "venda" || d === "vendas";
    };

    // Map agendamento_id -> groomer name (for atendimento-based models)
    const agGroomerMap = new Map<string, string>();
    allAgGroomers.forEach((a) => {
      const g = a.groomer?.trim();
      if (a.id && g && g !== "Não atribuído") {
        agGroomerMap.set(a.id, g);
      }
    });

    const nameToId = new Map(groomersData.map((g) => [g.nome, g.id]));

    // Helper: get tipo for a specific groomer (only used in "groomer" model)
    const getGroomerTipo = (groomerName: string): string => {
      if (modelo === "groomer") {
        const gId = nameToId.get(groomerName);
        return gId ? (tiposPerGroomer[gId] || tipoGlobal) : tipoGlobal;
      }
      return tipoGlobal;
    };

    // Calculate filtered value for a lancamento given a tipo filter
    const calcFilteredValue = (l: any, tipo: string): number => {
      const itens = (l.lancamentos_financeiros_itens || []) as any[];
      if (itens.length > 0) {
        return itens
          .filter((item: any) => matchesTipo(item.descricao2, tipo))
          .reduce((sum: number, item: any) => sum + ((item.valor || 0) * (item.quantidade || 1)), 0);
      }
      // Fallback: use valor_total
      return l.valor_total || 0;
    };

    const registeredGroomers = groomersData.map((g) => g.nome);
    const results: { nome: string; comissao: number }[] = [];

    if (modelo === "groomer") {
      // Commission on TOTAL company revenue per tipo, each groomer gets their % of that total
      registeredGroomers.forEach((groomerName) => {
        const gId = nameToId.get(groomerName);
        const pct = gId ? ((cfg.comissoes_groomers as any)?.[gId] || 0) : 0;
        const tipo = getGroomerTipo(groomerName);
        
        // Sum ALL paid lancamentos filtered by this groomer's tipo (total company revenue)
        let totalFiltered = 0;
        (lancamentosComissao || []).forEach((l: any) => {
          totalFiltered += calcFilteredValue(l, tipo);
        });
        
        results.push({ nome: groomerName, comissao: Math.round(totalFiltered * pct / 100 * 100) / 100 });
      });

    } else if (modelo === "faturamento") {
      // Commission on TOTAL company revenue (servicos_e_vendas always), single % for all groomers
      const pct = cfg.comissao_faturamento || 0;
      let totalFiltered = 0;
      (lancamentosComissao || []).forEach((l: any) => {
        totalFiltered += calcFilteredValue(l, "servicos_e_vendas");
      });
      
      registeredGroomers.forEach((groomerName) => {
        results.push({ nome: groomerName, comissao: Math.round(totalFiltered * pct / 100 * 100) / 100 });
      });

    } else if (modelo === "atendimento") {
      // Commission on groomer's OWN attended revenue only
      const pct = cfg.comissao_atendimento || 0;
      
      registeredGroomers.forEach((groomerName) => {
        let groomerVal = 0;
        (lancamentosComissao || []).forEach((l: any) => {
          const attendedBy = l.agendamento_id ? agGroomerMap.get(l.agendamento_id) : null;
          if (attendedBy !== groomerName) return;
          groomerVal += calcFilteredValue(l, tipoGlobal);
        });
        results.push({ nome: groomerName, comissao: Math.round(groomerVal * pct / 100 * 100) / 100 });
      });

    } else if (modelo === "hibrida") {
      const pctFat = cfg.comissao_faturamento || 0;
      const pctAtend = cfg.comissao_atendimento || 0;
      const pctBonus = cfg.bonus_meta || 0;
      const meta = empresaConfig?.meta_faturamento_mensal || 0;

      // Total company revenue (servicos_e_vendas) for faturamento + bonus parts
      let totalCompany = 0;
      (lancamentosComissao || []).forEach((l: any) => {
        totalCompany += calcFilteredValue(l, "servicos_e_vendas");
      });

      // Bonus: only on excess over meta
      const excessoMeta = (meta > 0 && totalCompany >= meta) ? (totalCompany - meta) : 0;

      registeredGroomers.forEach((groomerName) => {
        // Faturamento part: % of total company revenue
        const comFat = totalCompany * pctFat / 100;

        // Atendimento part: % of groomer's OWN attended revenue
        let groomerAtendVal = 0;
        (lancamentosComissao || []).forEach((l: any) => {
          const attendedBy = l.agendamento_id ? agGroomerMap.get(l.agendamento_id) : null;
          if (attendedBy !== groomerName) return;
          groomerAtendVal += calcFilteredValue(l, tipoGlobal);
        });
        const comAtend = groomerAtendVal * pctAtend / 100;

        // Bonus part: % of excess over meta (total company)
        const comBonus = excessoMeta * pctBonus / 100;

        results.push({ nome: groomerName, comissao: Math.round((comFat + comAtend + comBonus) * 100) / 100 });
      });
    }

    return results.sort((a, b) => b.comissao - a.comissao);
  }, [comissoesConfig, lancamentosComissao, allAgGroomers, groomersData, empresaConfig]);

  const totalComissao = useMemo(() => {
    if (!comissaoPerGroomer) return 0;
    return comissaoPerGroomer.reduce((s, g) => s + g.comissao, 0);
  }, [comissaoPerGroomer]);


  if (loading) {
    return (
      <div className="space-y-2">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="space-y-2">
      {/* Filters */}
      <Card className="p-2">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="space-y-0.5">
            <Label className="text-[10px]">Período</Label>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="h-7 text-xs w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mes">Mês atual</SelectItem>
                <SelectItem value="mes-anterior">Mês anterior</SelectItem>
                <SelectItem value="trimestre">Trimestre</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {periodo === "custom" && (
            <>
              <div className="space-y-0.5">
                <Label className="text-[10px]">Início</Label>
                <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-7 text-xs w-32" />
              </div>
              <div className="space-y-0.5">
                <Label className="text-[10px]">Fim</Label>
                <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-7 text-xs w-32" />
              </div>
            </>
          )}
          <div className="space-y-0.5">
            <Label className="text-[10px]">Banhista</Label>
            <Select value={groomerFilter} onValueChange={setGroomerFilter}>
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {groomers.map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-1.5">
        {[
          { label: "Pets Atendidos", value: kpis.totalPets, icon: Users, color: "text-blue-500" },
          { label: "Horas Trabalhadas", value: formatMinutosDisplay(kpis.totalMinutos), icon: Clock, color: "text-green-500" },
          { label: "Média/Atend.", value: `${kpis.mediaMinutos}min`, icon: Activity, color: "text-orange-500" },
          { label: "Mais Produtivo", value: kpis.topGroomer, sub: `${kpis.topCount} ${kpis.topCount === 1 ? "pet" : "pets"}`, icon: Star, color: "text-yellow-500" },
          { label: "Taxa Ocupação", value: kpis.taxaOcupacaoFormatada, icon: TrendingUp, color: "text-purple-500", hasTooltip: true },
          { label: "Total Comissão", value: comissoesConfig?.ativo ? formatCurrency(totalComissao) : "Inativo", icon: DollarSign, color: "text-emerald-500", hasTooltip: true, tooltipType: "comissao" },
        ].map((k) => {
          const cardContent = (
            <Card key={k.label} className="p-0 relative">
              <CardContent className="flex items-center gap-2 p-2">
                <k.icon className={`h-5 w-5 ${k.color} shrink-0`} />
                <div className="min-w-0">
                  <p className="text-sm font-bold leading-none truncate">{k.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{k.label}</p>
                  {k.sub && <p className="text-[9px] text-muted-foreground">{k.sub}</p>}
                </div>
                {k.hasTooltip && <Info className="h-3 w-3 text-muted-foreground absolute top-1 right-1" />}
              </CardContent>
            </Card>
          );

          if (k.hasTooltip) {
            return (
              <TooltipProvider key={k.label}>
                <UITooltip delayDuration={200}>
                  <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-xs text-xs space-y-1 p-3 z-[100]">
                    {k.tooltipType === "comissao" ? (
                      comissoesConfig?.ativo ? (
                        <p className="font-semibold">💰 Total de comissões calculadas no período</p>
                      ) : (
                        <p className="text-xs">Ative as comissões em <strong>Configurações da Empresa</strong></p>
                      )
                    ) : (
                      <>
                        <p className="font-semibold">📊 Taxa de Ocupação</p>
                        <p>Mede quanto da capacidade total dos groomers cadastrados foi utilizada no período.</p>
                        <p className="font-medium mt-1">Fórmula:</p>
                        <p className="italic">Horas Trabalhadas ÷ Capacidade Total × 100</p>
                        <p className="font-medium mt-1">Cálculo atual:</p>
                        <p>• {kpis.numBanhistasCadastrados} groomer(s) cadastrado(s)</p>
                        <p>• {kpis.diasUteis} dias de funcionamento no período</p>
                        <p>• {kpis.horasDiarias}h de jornada diária</p>
                        <p>• Capacidade: {kpis.capacidadeTotal}h</p>
                        <p>• Horas trabalhadas: {formatMinutosDisplay(kpis.totalMinutos)}</p>
                        <p className="font-semibold mt-1">Resultado: {kpis.taxaOcupacaoFormatada}</p>
                        <p className="mt-1 italic">Ou seja, apenas {kpis.taxaOcupacaoFormatada} da capacidade total dos groomers cadastrados foi utilizada no período.</p>
                      </>
                    )}
                  </TooltipContent>
                </UITooltip>
              </TooltipProvider>
            );
          }
          return cardContent;
        })}
      </div>

      {/* Main Charts */}
      <div className="grid md:grid-cols-2 gap-2">
        {/* Pets por Banhista */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">🐾 Pets Atendidos por Banhista</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2 pt-0 h-48">
            {petsPerGroomer.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={petsPerGroomer} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="nome" type="category" width={70} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="total" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} label={({ x, y, width, height, value }: any) => (
                    <text x={x + width - 4} y={y + height / 2} textAnchor="end" dominantBaseline="middle" fontSize={9} fontWeight="bold" fill="#fff">{value}</text>
                  )} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Horas por Banhista */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">⏱️ Horas Trabalhadas por Banhista</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2 pt-0 h-48">
            {horasPerGroomer.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={horasPerGroomer} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" dataKey="minutos" tick={{ fontSize: 10 }} tickFormatter={(v) => formatMinutosDisplay(v)} />
                  <YAxis dataKey="nome" type="category" width={70} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number, name: string) => [formatMinutosDisplay(name === "minutos" ? v : v * 60), "Tempo"]} />
                  <Bar dataKey="minutos" fill="#10b981" radius={[0, 4, 4, 0]} label={({ x, y, width, height, value }: any) => (
                    <text x={x + width - 4} y={y + height / 2} textAnchor="end" dominantBaseline="middle" fontSize={9} fontWeight="bold" fill="#fff">
                      {formatMinutosDisplay(value)}
                    </text>
                  )} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Tempo Médio por Banhista */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">⏳ Tempo Médio por Atendimento (min)</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2 pt-0 h-48">
            {tempoMedioPerGroomer.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tempoMedioPerGroomer} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis dataKey="nome" type="category" width={70} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="media" fill="#f59e0b" radius={[0, 4, 4, 0]} label={({ x, y, width, height, value }: any) => (
                    <text x={x + width - 4} y={y + height / 2} textAnchor="end" dominantBaseline="middle" fontSize={9} fontWeight="bold" fill="#fff">{value}min</text>
                  )} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Comissões por Banhista */}
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setComissoesDetalhadasOpen(true)}>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs flex items-center justify-between">
              <span>💰 Comissões por Banhista</span>
              <span className="text-[9px] text-muted-foreground font-normal">Clique para detalhes</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2 pt-0 h-48">
            {!comissoesConfig?.ativo ? (
              <div className="flex items-center justify-center h-full px-4">
                <p className="text-xs text-muted-foreground text-center">
                  Ative a opção <strong>"Configurar Comissões"</strong> na página de <strong>"Configurações da Empresa"</strong> para visualizar este gráfico.
                </p>
              </div>
            ) : !comissaoPerGroomer || comissaoPerGroomer.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comissaoPerGroomer} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `R$${v}`} />
                  <YAxis dataKey="nome" type="category" width={70} tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} formatter={(v: number) => [formatCurrency(v), "Comissão"]} />
                  <Bar dataKey="comissao" fill="#8b5cf6" radius={[0, 4, 4, 0]} label={({ x, y, width, height, value }: any) => (
                    <text x={x + width - 4} y={y + height / 2} textAnchor="end" dominantBaseline="middle" fontSize={9} fontWeight="bold" fill="#fff">
                      {formatCurrency(value)}
                    </text>
                  )} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Advanced Charts */}
      <div className="grid md:grid-cols-2 gap-2">
        {/* Produtividade Timeline */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">📈 Produtividade ao Longo do Tempo</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2 pt-0 h-48">
            {produtividadeTimeline.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={produtividadeTimeline} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="data" tick={{ fontSize: 9 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Line type="monotone" dataKey="atendimentos" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Heatmap horários */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">🔥 Heatmap de Horários</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2 pt-0 h-48">
            {heatmapData.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={heatmapData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="hora" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]} label={({ x, y, width, height, value }: any) => value > 0 ? (
                    <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="middle" fontSize={9} fontWeight="bold" fill="#fff">{value}</text>
                  ) : null}>
                    {heatmapData.map((entry, i) => {
                      const max = Math.max(...heatmapData.map((d) => d.total), 1);
                      const intensity = entry.total / max;
                      const color = `hsl(${200 - intensity * 180}, ${60 + intensity * 30}%, ${50 - intensity * 15}%)`;
                      return <Cell key={i} fill={color} />;
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Serviços por Banhista */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">✂️ Serviços por Banhista</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2 pt-0 h-48">
            {servicoPerGroomer.data.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={servicoPerGroomer.data} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="nome" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 9 }} />
                  {servicoPerGroomer.servicos.slice(0, 5).map((s, i) => (
                    <Bar key={s} dataKey={s} stackId="a" fill={COLORS[i % COLORS.length]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Taxa de Ocupação por Banhista */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">📊 Taxa de Ocupação por Banhista</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2 pt-0 h-48">
            {ocupacaoPerGroomer.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs text-muted-foreground">Nenhum banhista cadastrado</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ocupacaoPerGroomer} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
                  <YAxis dataKey="nome" type="category" width={70} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ fontSize: 11 }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      const taxaFormatada = formatOccupancyRate(d.taxa);
                      return (
                        <div className="bg-background border border-border/50 rounded-lg shadow-xl p-3 max-w-xs text-xs space-y-1 z-[100]">
                          <p className="font-semibold">📊 Taxa de Ocupação – {d.nome}</p>
                          <p>Mede quanto da capacidade individual deste profissional foi utilizada no período selecionado.</p>
                          <p className="font-medium mt-1">Fórmula:</p>
                          <p className="italic">Horas Trabalhadas ÷ Capacidade Individual × 100</p>
                          <p className="font-medium mt-1">Cálculo:</p>
                          <p>• 1 groomer (individual)</p>
                          <p>• {d.diasUteis} dias de funcionamento no período</p>
                          <p>• {d.horasDiarias}h de jornada diária</p>
                          <p>• Capacidade: {d.capacidade}h</p>
                          <p>• Horas trabalhadas: {d.horasTrabalhadas}h</p>
                          <p className="font-semibold mt-1">Resultado: {taxaFormatada}</p>
                          <p className="mt-1 italic">Ou seja, {taxaFormatada} da capacidade total deste banhista foi utilizada no período.</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="taxa" fill="#8b5cf6" radius={[0, 4, 4, 0]} label={({ x, y, width, height, value }: any) => (
                    <text x={x + width - 4} y={y + height / 2} textAnchor="end" dominantBaseline="middle" fontSize={10} fontWeight="bold" fill="#fff">
                      {formatOccupancyRate(value)}
                    </text>
                  )}>
                    {ocupacaoPerGroomer.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ranking + Porte */}
      <div className="grid md:grid-cols-2 gap-2">
        {/* Ranking */}
        <Card>
          <CardHeader className="py-2 px-3 flex flex-row items-center gap-1">
            <CardTitle className="text-xs">🏆 Ranking de Performance</CardTitle>
            <TooltipProvider>
              <UITooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <Info className="h-3 w-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs space-y-1 p-3 z-[100]">
                  <p className="font-semibold">📊 Como é calculado o Ranking?</p>
                  <p>A pontuação (score) de cada banhista é composta por 3 critérios:</p>
                  <p className="font-medium mt-1">1️⃣ Quantidade de Pets (50% do score)</p>
                  <p className="italic">Pets do banhista ÷ Máximo de pets entre todos × 50</p>
                  <p className="font-medium mt-1">2️⃣ Receita Gerada (30% do score)</p>
                  <p className="italic">Receita do banhista ÷ Maior receita entre todos × 30</p>
                  <p className="font-medium mt-1">3️⃣ Eficiência de Tempo (20% do score)</p>
                  <p className="italic">60 ÷ Tempo médio por atendimento (min) × 20</p>
                  <p className="text-muted-foreground mt-1">Quanto menor o tempo médio, maior a pontuação de eficiência.</p>
                  <p className="font-semibold mt-1">Score final = critério 1 + critério 2 + critério 3 (máx. 100pts)</p>
                </TooltipContent>
              </UITooltip>
            </TooltipProvider>
          </CardHeader>
          <CardContent className="px-3 pb-2 pt-0 h-48">
            {ranking.length === 0 ? <EmptyState /> : (
              <div className="space-y-1">
                {ranking.map((r, i) => (
                  <div key={r.nome} className="flex items-center justify-between text-[11px] py-1 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-1.5">
                      <span className="w-4 text-muted-foreground font-medium">{i + 1}.</span>
                      <span className="font-medium">{r.nome}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[9px] h-4 px-1">{r.pets} pets</Badge>
                      <Badge variant="outline" className="text-[9px] h-4 px-1">{r.mediaMin}min</Badge>
                      <Badge className="text-[9px] h-4 px-1 bg-primary/10 text-primary border-0">{r.score}pts</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Performance por Porte */}
        <Card>
          <CardHeader className="py-2 px-3">
            <CardTitle className="text-xs">🐕 Performance por Porte</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-2 pt-0 h-48">
            {porteData.length === 0 ? <EmptyState /> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={porteData} margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="porte" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="total" name="Qtd" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} label={({ x, y, width, height, value }: any) => value > 0 ? (
                    <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="middle" fontSize={9} fontWeight="bold" fill="#fff">{value}</text>
                  ) : null} />
                  <Bar dataKey="mediaMin" name="Média (min)" fill="#f59e0b" radius={[4, 4, 0, 0]} label={({ x, y, width, height, value }: any) => value > 0 ? (
                    <text x={x + width / 2} y={y + height / 2} textAnchor="middle" dominantBaseline="middle" fontSize={9} fontWeight="bold" fill="#fff">{value}</text>
                  ) : null} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

      </div>
      <ComissoesDetalhadas open={comissoesDetalhadasOpen} onOpenChange={setComissoesDetalhadasOpen} />
    </div>
  );
};

const EmptyState = () => (
  <div className="flex items-center justify-center h-full">
    <p className="text-xs text-muted-foreground">Sem dados no período.</p>
  </div>
);
