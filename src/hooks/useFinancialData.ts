import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth, endOfMonth, subDays, subMonths, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const DIAS_SEMANA = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

const isTransferencia = (l: any) => l.observacao === "Transferência entre contas";

export const useFinancialData = () => {
  const { user, ownerId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [itensMap, setItensMap] = useState<Map<string, any[]>>(new Map());
  const [diasFuncionamento, setDiasFuncionamento] = useState<any>(null);
  const [metaFaturamentoMensal, setMetaFaturamentoMensal] = useState<number>(0);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        setLoading(true);
        const ultimos365 = subDays(new Date(), 365);

        const [lancRes, empresaRes] = await Promise.all([
          supabase
            .from("lancamentos_financeiros")
            .select("*, lancamentos_financeiros_itens(*)")
            .eq("user_id", ownerId)
            .gte("data_pagamento", format(ultimos365, "yyyy-MM-dd")),
          supabase
            .from("empresa_config")
            .select("dias_funcionamento, meta_faturamento_mensal")
            .eq("user_id", ownerId)
            .single(),
        ]);

        const data = lancRes.data || [];
        setLancamentos(data);

        // Build items map
        const map = new Map<string, any[]>();
        data.forEach((l: any) => {
          if (l.lancamentos_financeiros_itens?.length) {
            map.set(l.id, l.lancamentos_financeiros_itens);
          }
        });
        setItensMap(map);

        setDiasFuncionamento(
          empresaRes.data?.dias_funcionamento || {
            segunda: true, terca: true, quarta: true, quinta: true, sexta: true, sabado: false, domingo: false,
          }
        );
        setMetaFaturamentoMensal(empresaRes.data?.meta_faturamento_mensal || 0);
      } catch (error) {
        console.error("Erro ao carregar dados financeiros:", error);
        toast.error("Erro ao carregar dados financeiros");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, ownerId]);

  // Helper: count business days in a date range
  const contarDiasUteis = (inicio: Date, fim: Date) => {
    let count = 0;
    let d = new Date(inicio);
    while (d <= fim) {
      if (diasFuncionamento?.[DIAS_SEMANA[d.getDay()]]) count++;
      d = addDays(d, 1);
    }
    return count;
  };

  // Monthly aggregation for last N months
  const dadosMensais = useMemo(() => {
    const dados: any[] = [];
    for (let i = 11; i >= 0; i--) {
      const mes = subMonths(new Date(), i);
      const inicio = startOfMonth(mes);
      const fim = endOfMonth(mes);
      const hoje = new Date();
      const dataFinal = i === 0 ? hoje : fim;

      const inicioStr = format(inicio, "yyyy-MM-dd");
      const fimStr = format(fim, "yyyy-MM-dd");

      const receitas = lancamentos
        .filter((l) => l.tipo === "Receita" && l.pago && l.data_pagamento && l.data_pagamento >= inicioStr && l.data_pagamento <= fimStr && !isTransferencia(l))
        .reduce((acc, l) => acc + Number(l.valor_total), 0);

      const despesas = lancamentos
        .filter((l) => l.tipo === "Despesa" && l.pago && l.data_pagamento && l.data_pagamento >= inicioStr && l.data_pagamento <= fimStr && !isTransferencia(l))
        .reduce((acc, l) => acc + Number(l.valor_total), 0);

      const diasUteisAteAgora = contarDiasUteis(inicio, dataFinal);
      const diasUteisMesCompleto = contarDiasUteis(inicio, fim);

      dados.push({
        mes: format(mes, "MMM/yy", { locale: ptBR }),
        mesNum: mes.getMonth(),
        mesLabel: format(mes, "MMMM", { locale: ptBR }),
        receitas,
        despesas,
        lucro: receitas - despesas,
        margem: receitas > 0 ? ((receitas - despesas) / receitas) * 100 : 0,
        diasUteisAteAgora,
        diasUteisMesCompleto,
        mediaReceita: diasUteisAteAgora > 0 ? receitas / diasUteisAteAgora : 0,
        metaMedia: diasUteisMesCompleto > 0 ? metaFaturamentoMensal / diasUteisMesCompleto : 0,
        numLancamentosReceita: lancamentos.filter((l) => l.tipo === "Receita" && l.pago && l.data_pagamento && l.data_pagamento >= inicioStr && l.data_pagamento <= fimStr && !isTransferencia(l)).length,
      });
    }

    // Add variation
    return dados.map((d, i) => {
      if (i === 0) return { ...d, varReceitas: 0, varDespesas: 0 };
      const prev = dados[i - 1];
      return {
        ...d,
        varReceitas: prev.receitas > 0 ? ((d.receitas - prev.receitas) / prev.receitas) * 100 : 0,
        varDespesas: prev.despesas > 0 ? ((d.despesas - prev.despesas) / prev.despesas) * 100 : 0,
      };
    });
  }, [lancamentos, diasFuncionamento, metaFaturamentoMensal]);

  // Cash flow last 30 days
  const dadosFluxoCaixa30d = useMemo(() => {
    const hoje = new Date();
    const dados: any[] = [];

    const calcularMetaDiaria = (dataRef: Date) => {
      if (metaFaturamentoMensal === 0) return 0;
      const ini = startOfMonth(dataRef);
      const fim = endOfMonth(dataRef);
      const diasUteis = contarDiasUteis(ini, fim);
      return diasUteis > 0 ? metaFaturamentoMensal / diasUteis : 0;
    };

    for (let i = 29; i >= 0; i--) {
      const data = subDays(hoje, i);
      const dataStr = format(data, "yyyy-MM-dd");
      const diaDaSemana = DIAS_SEMANA[data.getDay()];
      const eDiaFuncionamento = diasFuncionamento?.[diaDaSemana] === true;

      const receitas = lancamentos
        .filter((l) => l.tipo === "Receita" && l.pago && l.data_pagamento === dataStr && !isTransferencia(l))
        .reduce((acc, l) => acc + Number(l.valor_total), 0);
      const despesas = lancamentos
        .filter((l) => l.tipo === "Despesa" && l.pago && l.data_pagamento === dataStr && !isTransferencia(l))
        .reduce((acc, l) => acc + Number(l.valor_total), 0);

      const teveFaturamento = receitas > 0 || despesas > 0;
      if (eDiaFuncionamento || teveFaturamento) {
        dados.push({
          data: format(data, "dd/MM", { locale: ptBR }),
          receitas,
          despesas,
          lucro: receitas - despesas,
          metaDiaria: calcularMetaDiaria(data),
        });
      }
    }

    return dados.map((d, i) => {
      if (i === 0) return { ...d, varReceitas: 0, varDespesas: 0 };
      const prev = dados[i - 1];
      return {
        ...d,
        varReceitas: prev.receitas > 0 ? ((d.receitas - prev.receitas) / prev.receitas) * 100 : 0,
        varDespesas: prev.despesas > 0 ? ((d.despesas - prev.despesas) / prev.despesas) * 100 : 0,
      };
    });
  }, [lancamentos, diasFuncionamento, metaFaturamentoMensal]);

  // Category breakdown for last 3 months (revenue & expenses)
  const categoriasPorMes = useMemo(() => {
    const result: { receitas: any[]; despesas: any[] }[] = [];

    for (let i = 0; i < 3; i++) {
      const mes = subMonths(new Date(), i);
      const inicio = startOfMonth(mes);
      const fim = endOfMonth(mes);
      const label = format(mes, "MMMM/yyyy", { locale: ptBR });

      const inicioStr = format(inicio, "yyyy-MM-dd");
      const fimStr = format(fim, "yyyy-MM-dd");

      const receitasMes = lancamentos.filter(
        (l) => l.tipo === "Receita" && l.pago && l.data_pagamento && l.data_pagamento >= inicioStr && l.data_pagamento <= fimStr && !isTransferencia(l)
      );
      const despesasMes = lancamentos.filter(
        (l) => l.tipo === "Despesa" && l.pago && l.data_pagamento && l.data_pagamento >= inicioStr && l.data_pagamento <= fimStr && !isTransferencia(l)
      );

      const agrupar = (items: any[]) => {
        const map = new Map<string, number>();
        items.forEach((l) => {
          const itens = itensMap.get(l.id) || [];
          if (itens.length > 0) {
            itens.forEach((item) => {
              const cat = item.descricao2 || l.descricao1 || "Outros";
              map.set(cat, (map.get(cat) || 0) + Number(item.valor));
            });
          } else {
            const cat = l.descricao1 || "Outros";
            map.set(cat, (map.get(cat) || 0) + Number(l.valor_total));
          }
        });
        return Array.from(map.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);
      };

      result.push({
        receitas: agrupar(receitasMes),
        despesas: agrupar(despesasMes),
      });
    }
    return result;
  }, [lancamentos, itensMap]);

  // Top 5 categories (all time in loaded data)
  const topCategorias = useMemo(() => {
    const mapReceita = new Map<string, number>();
    const mapDespesa = new Map<string, number>();

    lancamentos.filter((l) => l.pago && !isTransferencia(l)).forEach((l) => {
      const itens = itensMap.get(l.id) || [];
      const targetMap = l.tipo === "Receita" ? mapReceita : mapDespesa;

      if (itens.length > 0) {
        itens.forEach((item) => {
          const cat = item.descricao2 || l.descricao1 || "Outros";
          targetMap.set(cat, (targetMap.get(cat) || 0) + Number(item.valor));
        });
      } else {
        const cat = l.descricao1 || "Outros";
        targetMap.set(cat, (targetMap.get(cat) || 0) + Number(l.valor_total));
      }
    });

    const toArray = (map: Map<string, number>) =>
      Array.from(map.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

    return { receitas: toArray(mapReceita), despesas: toArray(mapDespesa) };
  }, [lancamentos, itensMap]);

  // Accumulated cash evolution
  const caixaAcumulado = useMemo(() => {
    let acumulado = 0;
    return dadosMensais.map((d) => {
      acumulado += d.lucro;
      return { mes: d.mes, acumulado };
    });
  }, [dadosMensais]);

  // Seasonality - últimos 12 meses em ordem cronológica
  const sazonalidade = useMemo(() => {
    return dadosMensais.map((d) => ({
      name: d.mes,
      total: d.receitas,
    }));
  }, [dadosMensais]);

  // Ticket médio mensal
  const ticketMedio = useMemo(() => {
    return dadosMensais.map((d) => ({
      mes: d.mes,
      ticket: d.numLancamentosReceita > 0 ? d.receitas / d.numLancamentosReceita : 0,
    }));
  }, [dadosMensais]);

  // Current vs previous month comparison
  const comparativo = useMemo(() => {
    if (dadosMensais.length < 2) return null;
    const atual = dadosMensais[dadosMensais.length - 1];
    const anterior = dadosMensais[dadosMensais.length - 2];

    const varReceita = anterior.receitas > 0 ? ((atual.receitas - anterior.receitas) / anterior.receitas) * 100 : 0;
    const varDespesa = anterior.despesas > 0 ? ((atual.despesas - anterior.despesas) / anterior.despesas) * 100 : 0;
    const varLucro = anterior.lucro !== 0 ? ((atual.lucro - anterior.lucro) / Math.abs(anterior.lucro)) * 100 : 0;
    const diffMargem = atual.margem - anterior.margem;

    return {
      receita: atual.receitas,
      despesa: atual.despesas,
      lucro: atual.lucro,
      margem: atual.margem,
      varReceita,
      varDespesa,
      varLucro,
      diffMargem,
    };
  }, [dadosMensais]);

  // Break-even indicator - últimos 3 meses
  const pontoEquilibrio = useMemo(() => {
    if (dadosMensais.length === 0) return [];
    const ultimos3 = dadosMensais.slice(-3);
    return ultimos3.map((d, i) => ({
      mes: d.mes,
      mesLabel: d.mesLabel,
      receitas: d.receitas,
      despesas: d.despesas,
      percentual: d.despesas > 0 ? (d.receitas / d.despesas) * 100 : 0,
      isAtual: i === ultimos3.length - 1,
    }));
  }, [dadosMensais]);

  return {
    loading,
    dadosMensais,
    dadosFluxoCaixa30d,
    categoriasPorMes,
    topCategorias,
    caixaAcumulado,
    sazonalidade,
    ticketMedio,
    comparativo,
    pontoEquilibrio,
    metaFaturamentoMensal,
  };
};
