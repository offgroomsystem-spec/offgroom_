import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, getDay, getDate } from "date-fns";

type PeriodoDias = 30 | 60 | 90 | 120 | 180;

interface Cenario {
  conservador: number;
  realista: number;
  otimista: number;
}

interface Previsao {
  dias: number;
  label: string;
  cenarios: Cenario;
}

interface DadoDiario {
  data: string;
  valor: number;
}

interface DadoDiaSemana {
  dia: string;
  media: number;
  total: number;
  count: number;
}

interface DadoSemanaMes {
  semana: string;
  media: number;
  total: number;
  count: number;
}

interface Insight {
  tipo: "crescimento" | "sazonalidade" | "comportamento" | "previsao" | "alerta";
  icone: string;
  texto: string;
  cor: "green" | "red" | "yellow" | "blue";
}

interface ScoreDetalhes {
  crescimento: number;
  estabilidade: number;
  atividadeRecente: number;
  base: number;
}

interface DadoProjecao {
  dia: number;
  conservador: number;
  realista: number;
  otimista: number;
}

export interface FinancialIntelligenceData {
  isLoading: boolean;
  periodoDias: PeriodoDias;
  setPeriodoDias: (p: PeriodoDias) => void;
  // Camada 1
  mediaDiaria: number;
  mediaSemanal: number;
  mediaMensal: number;
  totalPeriodo: number;
  faturamento30d: number;
  faturamento60d: number;
  faturamento90d: number;
  // Camada 2
  taxaCrescimento: number;
  tendencia: "crescimento" | "estavel" | "queda";
  // Camada 3
  dadosDiaSemana: DadoDiaSemana[];
  dadosSemanaMes: DadoSemanaMes[];
  // Camada 4
  volatilidade: number;
  classificacaoVolatilidade: "Estável" | "Em Crescimento" | "Volátil";
  // Previsões
  previsoesCurtoPrazo: Previsao[];
  previsoesMedioPrazo: Previsao[];
  // Score
  score: number;
  scoreCor: "red" | "yellow" | "green" | "blue";
  scoreLabel: string;
  scoreDetalhes: ScoreDetalhes;
  // Dados gráficos
  dadosDiarios: DadoDiario[];
  dadosProjecao: DadoProjecao[];
  // Insights e alertas
  insights: Insight[];
  alertas: Insight[];
}

const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const SEMANAS_MES = ["Semana 1 (1-7)", "Semana 2 (8-14)", "Semana 3 (15-21)", "Semana 4 (22-28)", "Semana 5 (29-31)"];

function getSemanaMes(dia: number): number {
  if (dia <= 7) return 0;
  if (dia <= 14) return 1;
  if (dia <= 21) return 2;
  if (dia <= 28) return 3;
  return 4;
}

function calcDesvio(valores: number[], media: number): number {
  if (valores.length === 0) return 0;
  const soma = valores.reduce((acc, v) => acc + Math.pow(v - media, 2), 0);
  return Math.sqrt(soma / valores.length);
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

export function useFinancialIntelligence(): FinancialIntelligenceData {
  const [periodoDias, setPeriodoDias] = useState<PeriodoDias>(90);

  const hoje = format(new Date(), "yyyy-MM-dd");
  const dataInicio = format(subDays(new Date(), 180), "yyyy-MM-dd"); // always fetch 180 days for sub-period calcs

  const { data: lancamentos, isLoading } = useQuery({
    queryKey: ["financial-intelligence", dataInicio],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lancamentos_financeiros")
        .select("valor_total, data_pagamento")
        .eq("pago", true)
        .eq("descricao1", "Receita Operacional")
        .gte("data_pagamento", dataInicio)
        .lte("data_pagamento", hoje)
        .order("data_pagamento", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  const result = useMemo(() => {
    const all = lancamentos || [];
    const hojeDate = new Date();
    const limiteDate = subDays(hojeDate, periodoDias);
    const limiteStr = format(limiteDate, "yyyy-MM-dd");

    // Filter to selected period
    const dados = all.filter((l) => l.data_pagamento >= limiteStr && l.data_pagamento <= hoje);

    // Aggregate daily
    const dailyMap = new Map<string, number>();
    dados.forEach((l) => {
      dailyMap.set(l.data_pagamento, (dailyMap.get(l.data_pagamento) || 0) + Number(l.valor_total));
    });

    const totalPeriodo = dados.reduce((s, l) => s + Number(l.valor_total), 0);
    const diasAnalisados = Math.max(periodoDias, 1);
    const mediaDiaria = totalPeriodo / diasAnalisados;
    const mediaSemanal = mediaDiaria * 7;
    const mediaMensal = mediaDiaria * 30;

    // Sub-period faturamentos (always from full data, up to 90d)
    const calc30d = (offsetStart: number, offsetEnd: number) => {
      const start = format(subDays(hojeDate, offsetStart), "yyyy-MM-dd");
      const end = format(subDays(hojeDate, offsetEnd), "yyyy-MM-dd");
      return all
        .filter((l) => l.data_pagamento > end && l.data_pagamento <= (offsetEnd === 0 ? hoje : start))
        .reduce((s, l) => s + Number(l.valor_total), 0);
    };

    const faturamento30d = calc30d(30, 0);
    const faturamento60d = all
      .filter((l) => l.data_pagamento >= format(subDays(hojeDate, 60), "yyyy-MM-dd") && l.data_pagamento <= hoje)
      .reduce((s, l) => s + Number(l.valor_total), 0);
    const faturamento90d = all
      .filter((l) => l.data_pagamento >= format(subDays(hojeDate, 90), "yyyy-MM-dd") && l.data_pagamento <= hoje)
      .reduce((s, l) => s + Number(l.valor_total), 0);

    // Camada 2 - Crescimento
    const terco3 = faturamento30d; // últimos 30 dias
    const terco2Str = format(subDays(hojeDate, 60), "yyyy-MM-dd");
    const terco2EndStr = format(subDays(hojeDate, 30), "yyyy-MM-dd");
    const terco2 = all
      .filter((l) => l.data_pagamento >= terco2Str && l.data_pagamento < terco2EndStr)
      .reduce((s, l) => s + Number(l.valor_total), 0);

    const taxaCrescimento = terco2 > 0 ? (terco3 - terco2) / terco2 : 0;
    const tendencia: "crescimento" | "estavel" | "queda" =
      taxaCrescimento > 0.05 ? "crescimento" : taxaCrescimento < -0.05 ? "queda" : "estavel";

    // Camada 3 - Sazonalidade por dia da semana
    const diaSemanaAcc: { total: number; count: number }[] = Array.from({ length: 7 }, () => ({
      total: 0,
      count: 0,
    }));
    const semanaMesAcc: { total: number; count: number }[] = Array.from({ length: 5 }, () => ({
      total: 0,
      count: 0,
    }));

    dados.forEach((l) => {
      const d = new Date(l.data_pagamento + "T12:00:00");
      const dow = getDay(d);
      const dom = getDate(d);
      const val = Number(l.valor_total);
      diaSemanaAcc[dow].total += val;
      diaSemanaAcc[dow].count += 1;
      const sw = getSemanaMes(dom);
      semanaMesAcc[sw].total += val;
      semanaMesAcc[sw].count += 1;
    });

    const dadosDiaSemana: DadoDiaSemana[] = [1, 2, 3, 4, 5, 6].map((i) => ({
      dia: DIAS_SEMANA[i],
      media: diaSemanaAcc[i].count > 0 ? diaSemanaAcc[i].total / diaSemanaAcc[i].count : 0,
      total: diaSemanaAcc[i].total,
      count: diaSemanaAcc[i].count,
    }));

    const dadosSemanaMes: DadoSemanaMes[] = SEMANAS_MES.map((label, i) => ({
      semana: label,
      media: semanaMesAcc[i].count > 0 ? semanaMesAcc[i].total / semanaMesAcc[i].count : 0,
      total: semanaMesAcc[i].total,
      count: semanaMesAcc[i].count,
    }));

    // Camada 4 - Volatilidade (incluindo dias zerados)
    const valoresDiariosCompletos: number[] = [];
    for (let i = periodoDias - 1; i >= 0; i--) {
      const d = format(subDays(hojeDate, i), "yyyy-MM-dd");
      valoresDiariosCompletos.push(dailyMap.get(d) || 0);
    }
    const desvio = calcDesvio(valoresDiariosCompletos, mediaDiaria);
    const volatilidade = mediaDiaria > 0 ? desvio / mediaDiaria : 0;
    const classificacaoVolatilidade: "Estável" | "Em Crescimento" | "Volátil" =
      volatilidade < 0.3 ? "Estável" : volatilidade < 0.6 ? "Em Crescimento" : "Volátil";

    // Previsões
    const gerarPrevisao = (dias: number, label: string): Previsao => {
      const realista = mediaDiaria * dias * (1 + taxaCrescimento);
      return {
        dias,
        label,
        cenarios: {
          conservador: realista * 0.9,
          realista,
          otimista: realista * 1.1,
        },
      };
    };

    const previsoesCurtoPrazo: Previsao[] = [
      gerarPrevisao(7, "7 dias"),
      gerarPrevisao(10, "10 dias"),
      gerarPrevisao(15, "15 dias"),
      gerarPrevisao(20, "20 dias"),
    ];

    const previsoesMedioPrazo: Previsao[] = [
      gerarPrevisao(30, "30 dias"),
      gerarPrevisao(60, "60 dias"),
      gerarPrevisao(90, "90 dias"),
      gerarPrevisao(120, "120 dias"),
    ];

    // Dados para gráficos
    const dadosDiarios: DadoDiario[] = [];
    for (let i = periodoDias - 1; i >= 0; i--) {
      const d = format(subDays(hojeDate, i), "yyyy-MM-dd");
      dadosDiarios.push({ data: d, valor: dailyMap.get(d) || 0 });
    }

    const dadosProjecao: DadoProjecao[] = [];
    for (let i = 1; i <= 120; i += 5) {
      const p = gerarPrevisao(i, `${i}d`);
      dadosProjecao.push({
        dia: i,
        conservador: p.cenarios.conservador,
        realista: p.cenarios.realista,
        otimista: p.cenarios.otimista,
      });
    }

    // Score de Saúde (0-100)
    const scoreCrescimento = Math.min(Math.max((taxaCrescimento + 0.1) / 0.3, 0), 1) * 25;
    const scoreEstabilidade = Math.min(Math.max(1 - volatilidade, 0), 1) * 25;
    const mediaEsperada30d = mediaDiaria * 30;
    const scoreAtividadeRecente = mediaEsperada30d > 0 ? Math.min(faturamento30d / mediaEsperada30d, 1) * 25 : 0;
    const scoreBase = totalPeriodo > 0 ? 25 : 0;
    const score = Math.round(scoreCrescimento + scoreEstabilidade + scoreAtividadeRecente + scoreBase);
    const scoreDetalhes: ScoreDetalhes = {
      crescimento: Math.round(scoreCrescimento),
      estabilidade: Math.round(scoreEstabilidade),
      atividadeRecente: Math.round(scoreAtividadeRecente),
      base: Math.round(scoreBase),
    };
    const scoreCor: "red" | "yellow" | "green" | "blue" =
      score < 30 ? "red" : score < 50 ? "yellow" : score < 75 ? "green" : "blue";
    const scoreLabel =
      score < 30
        ? "Risco Financeiro"
        : score < 50
          ? "Atenção"
          : score < 75
            ? "Saudável"
            : "Crescimento Acelerado";

    // Insights
    const insights: Insight[] = [];
    if (taxaCrescimento !== 0) {
      const pct = (taxaCrescimento * 100).toFixed(1);
      insights.push({
        tipo: "crescimento",
        icone: taxaCrescimento > 0 ? "📈" : "📉",
        texto: `Seu faturamento ${taxaCrescimento > 0 ? "cresceu" : "caiu"} ${Math.abs(Number(pct))}% nos últimos 30 dias em relação ao mês anterior.`,
        cor: taxaCrescimento > 0 ? "green" : "red",
      });
    }

    // Sazonalidade - semana mais fraca
    const semanaMinima = dadosSemanaMes.reduce(
      (min, s) => (s.total < min.total && s.count > 0 ? s : min),
      dadosSemanaMes[0]
    );
    const semanaMaxima = dadosSemanaMes.reduce(
      (max, s) => (s.total > max.total ? s : max),
      dadosSemanaMes[0]
    );
    if (semanaMinima.total > 0 && semanaMaxima.total > 0 && semanaMinima.semana !== semanaMaxima.semana) {
      insights.push({
        tipo: "sazonalidade",
        icone: "📅",
        texto: `A ${semanaMaxima.semana} é o período mais forte. A ${semanaMinima.semana} tende a ter menor faturamento.`,
        cor: "blue",
      });
    }

    // Dia mais forte
    const diaMaisForte = dadosDiaSemana.reduce(
      (max, d) => (d.total > max.total ? d : max),
      dadosDiaSemana[0]
    );
    const totalSemanal = dadosDiaSemana.reduce((s, d) => s + d.total, 0);
    if (totalSemanal > 0 && diaMaisForte.total > 0) {
      const pctDia = ((diaMaisForte.total / totalSemanal) * 100).toFixed(0);
      insights.push({
        tipo: "comportamento",
        icone: "⭐",
        texto: `${diaMaisForte.dia} representa ${pctDia}% do faturamento semanal.`,
        cor: "blue",
      });
    }

    // Previsão 30d
    const prev30 = previsoesMedioPrazo[0];
    insights.push({
      tipo: "previsao",
      icone: "🔮",
      texto: `Se o padrão atual continuar, seu faturamento estimado para os próximos 30 dias é de ${formatCurrency(prev30.cenarios.realista)}.`,
      cor: "green",
    });

    // Alertas
    const alertas: Insight[] = [];
    if (taxaCrescimento < -0.1) {
      alertas.push({
        tipo: "alerta",
        icone: "⚠️",
        texto: `Queda de faturamento detectada: ${(taxaCrescimento * 100).toFixed(1)}% nos últimos 30 dias.`,
        cor: "red",
      });
    }
    if (taxaCrescimento > 0 && taxaCrescimento < 0.02) {
      alertas.push({
        tipo: "alerta",
        icone: "🔻",
        texto: "Desaceleração do crescimento: taxa de crescimento próxima de zero.",
        cor: "yellow",
      });
    }
    if (tendencia === "queda") {
      alertas.push({
        tipo: "alerta",
        icone: "📉",
        texto: "Tendência de baixa identificada no mês atual.",
        cor: "red",
      });
    }

    return {
      isLoading: false,
      periodoDias,
      setPeriodoDias,
      mediaDiaria,
      mediaSemanal,
      mediaMensal,
      totalPeriodo,
      faturamento30d,
      faturamento60d,
      faturamento90d,
      taxaCrescimento,
      tendencia,
      dadosDiaSemana,
      dadosSemanaMes,
      volatilidade,
      classificacaoVolatilidade,
      previsoesCurtoPrazo,
      previsoesMedioPrazo,
      score,
      scoreCor,
      scoreLabel,
      scoreDetalhes,
      dadosDiarios,
      dadosProjecao,
      insights,
      alertas,
    };
  }, [lancamentos, periodoDias, hoje]);

  return {
    ...result,
    isLoading,
    periodoDias,
    setPeriodoDias,
  };
}
