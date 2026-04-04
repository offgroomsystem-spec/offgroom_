import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/relatorios/shared/KPICard";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, CalendarDays, DollarSign, TrendingUp, TrendingDown, Users, AlertTriangle, Package, ShoppingCart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, startOfMonth, endOfMonth, subDays, addDays, subMonths, differenceInDays, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ContasProximasVencimento } from "@/components/dashboard/ContasProximasVencimento";

interface DashboardContentProps {
  onNavigateToRelatorio?: (reportId: string) => void;
}

export const DashboardContent = ({ onNavigateToRelatorio }: DashboardContentProps) => {
  const { user, ownerId, isRecepcionista } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [agendamentos, setAgendamentos] = useState<any[]>([]);
  const [agendamentosPacotes, setAgendamentosPacotes] = useState<any[]>([]);
  const [lancamentos, setLancamentos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [diasFuncionamento, setDiasFuncionamento] = useState<any>(null);
  const [metaFaturamentoMensal, setMetaFaturamentoMensal] = useState<number>(0);
  const [kpisAdicionais, setKpisAdicionais] = useState({
    clientesEmRisco: 0,
    pacotesExpirados: 0,
    pacotesAExpirar: 0,
    produtosVencimento: 0,
  });

  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        const hoje = new Date();
        const inicioMes = startOfMonth(hoje);
        const fimMes = endOfMonth(hoje);
        const ultimos30Dias = subDays(hoje, 30);
        const ultimos365Dias = subDays(hoje, 365);

        // Carregar agendamentos
        const { data: agendamentosData } = await supabase
          .from("agendamentos")
          .select("*")
          .eq("user_id", ownerId)
          .gte("data", format(ultimos30Dias, "yyyy-MM-dd"))
          .order("data", { ascending: true })
          .order("horario", { ascending: true });

        setAgendamentos(agendamentosData || []);

        // Carregar agendamentos de pacotes (últimos 365 dias para suportar gráfico de 12 meses)
        const { data: agendamentosPacotesData } = await supabase
          .from("agendamentos_pacotes")
          .select("*")
          .eq("user_id", ownerId)
          .gte("data_venda", format(ultimos365Dias, "yyyy-MM-dd"))
          .order("data_venda", { ascending: true });

        setAgendamentosPacotes(agendamentosPacotesData || []);

        // Carregar lançamentos financeiros (últimos 365 dias para suportar gráfico de 12 meses)
        const { data: lancamentosData } = await supabase
          .from("lancamentos_financeiros")
          .select("*, lancamentos_financeiros_itens(*)")
          .eq("user_id", ownerId)
          .gte("data_pagamento", format(ultimos365Dias, "yyyy-MM-dd"));

        setLancamentos(lancamentosData || []);

        // Carregar clientes
        const { data: clientesData } = await supabase.from("clientes").select("*").eq("user_id", ownerId);

        setClientes(clientesData || []);

        // Carregar configuração da empresa para obter dias de funcionamento
        const { data: empresaConfig } = await supabase
          .from("empresa_config")
          .select("dias_funcionamento, meta_faturamento_mensal")
          .eq("user_id", ownerId)
          .single();

        setDiasFuncionamento(
          empresaConfig?.dias_funcionamento || {
            segunda: true,
            terca: true,
            quarta: true,
            quinta: true,
            sexta: true,
            sabado: false,
            domingo: false,
          },
        );

        setMetaFaturamentoMensal(empresaConfig?.meta_faturamento_mensal || 0);

        // Calcular KPIs adicionais
        const [clientesRisco, pacotesExp, pacotesAExp, produtosVenc] = await Promise.all([
          calcularClientesEmRisco(),
          calcularPacotesExpirados(),
          calcularPacotesAExpirar(),
          calcularProdutosVencimento(),
        ]);

        setKpisAdicionais({
          clientesEmRisco: clientesRisco,
          pacotesExpirados: pacotesExp,
          pacotesAExpirar: pacotesAExp,
          produtosVencimento: produtosVenc,
        });
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
        toast.error("Erro ao carregar dados do dashboard");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  // Função para calcular o próximo dia útil
  const getProximoDiaUtil = (diasFuncionamento: any) => {
    const hoje = new Date();
    let proximoDia = addDays(hoje, 1);

    const diasSemana = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

    let tentativas = 0;
    while (tentativas < 7) {
      const diaDaSemana = diasSemana[proximoDia.getDay()];
      if (diasFuncionamento && diasFuncionamento[diaDaSemana] === true) {
        return proximoDia;
      }
      proximoDia = addDays(proximoDia, 1);
      tentativas++;
    }

    return addDays(hoje, 1);
  };

  // Calcular Clientes em Risco (15-90 dias sem agendamento)
  const calcularClientesEmRisco = async () => {
    if (!user) return 0;

    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const { data: agendamentosData } = await supabase
        .from("agendamentos")
        .select("cliente_id, cliente, data, pet, whatsapp")
        .eq("user_id", user.id)
        .order("data", { ascending: false });

      const { data: pacotesData } = await supabase
        .from("agendamentos_pacotes")
        .select("id, nome_cliente, data_venda, nome_pet, servicos")
        .eq("user_id", ownerId);

      const mapa = new Map<string, { nomeCliente: string; nomePet: string; ultimoAgendamento: Date }>();

      agendamentosData?.forEach((a) => {
        const chave = `${a.cliente}_${a.pet}`;
        const data = new Date(a.data + "T00:00:00");
        if (!isValid(data)) return;

        if (!mapa.has(chave)) {
          mapa.set(chave, { nomeCliente: a.cliente, nomePet: a.pet, ultimoAgendamento: data });
        } else {
          const existente = mapa.get(chave)!;
          if (data > existente.ultimoAgendamento) {
            existente.ultimoAgendamento = data;
          }
        }
      });

      pacotesData?.forEach((p) => {
        const chave = `${p.nome_cliente}_${p.nome_pet}`;
        let ultimaDataServico: Date | null = null;

        try {
          const servicos = typeof p.servicos === "string" ? JSON.parse(p.servicos) : p.servicos;
          if (Array.isArray(servicos)) {
            const datasValidas = servicos.map((s) => new Date(s.data + "T00:00:00")).filter((d) => isValid(d));
            if (datasValidas.length > 0) {
              ultimaDataServico = new Date(Math.max(...datasValidas.map((d) => d.getTime())));
            }
          }
        } catch {}

        const dataFinal = ultimaDataServico ? ultimaDataServico : new Date(p.data_venda + "T00:00:00");
        if (!isValid(dataFinal)) return;

        if (!mapa.has(chave)) {
          mapa.set(chave, { nomeCliente: p.nome_cliente, nomePet: p.nome_pet, ultimoAgendamento: dataFinal });
        } else {
          const existente = mapa.get(chave)!;
          if (dataFinal > existente.ultimoAgendamento) {
            existente.ultimoAgendamento = dataFinal;
          }
        }
      });

      let count = 0;
      mapa.forEach((cli) => {
        const dias = differenceInDays(hoje, cli.ultimoAgendamento);
        
        // Verificar agendamento futuro APENAS para este cliente/pet específico
        const temAgendamentoFuturo =
          agendamentosData?.some(
            (a) => a.cliente === cli.nomeCliente && a.pet === cli.nomePet && new Date(a.data + "T00:00:00") >= hoje
          ) ||
          pacotesData?.some((p) => {
            if (p.nome_cliente !== cli.nomeCliente || p.nome_pet !== cli.nomePet) return false;
            try {
              const servicos = typeof p.servicos === "string" ? JSON.parse(p.servicos) : p.servicos;
              if (Array.isArray(servicos)) {
                return servicos.some((s) => isValid(new Date(s.data + "T00:00:00")) && new Date(s.data + "T00:00:00") >= hoje);
              }
            } catch {
              return false;
            }
            return false;
          });

        if (!temAgendamentoFuturo && dias >= 15 && dias <= 90) {
          count++;
        }
      });

      return count;
    } catch (error) {
      console.error("Erro ao calcular clientes em risco:", error);
      return 0;
    }
  };

  // Calcular Pacotes Expirados sem agendamento futuro
  const calcularPacotesExpirados = async () => {
    if (!user) return 0;

    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const { data: agendamentosPacotesData } = await supabase
        .from("agendamentos_pacotes")
        .select("*")
        .eq("user_id", ownerId);

      const { data: pacotesDefinicao } = await supabase
        .from("pacotes")
        .select("*")
        .eq("user_id", user.id);

      const { data: todosAgendamentos } = await supabase
        .from("agendamentos")
        .select("*")
        .eq("user_id", user.id);

      let count = 0;

      for (const pacoteVendido of agendamentosPacotesData || []) {
        const definicao = pacotesDefinicao?.find((p) => p.nome === pacoteVendido.nome_pacote);
        if (!definicao) continue;

        const dataVenda = new Date(pacoteVendido.data_venda);
        const validadeDias = parseInt(definicao.validade) || 0;
        const dataVencimento = new Date(dataVenda);
        dataVencimento.setDate(dataVencimento.getDate() + validadeDias);

        if (dataVencimento >= hoje) continue;

        const agendamentosClientePet =
          todosAgendamentos?.filter((ag) => {
            const clienteNormalizado = ag.cliente?.trim().toLowerCase() || "";
            const clientePacoteNormalizado = pacoteVendido.nome_cliente?.trim().toLowerCase() || "";
            const petNormalizado = ag.pet?.trim().toLowerCase() || "";
            const petPacoteNormalizado = pacoteVendido.nome_pet?.trim().toLowerCase() || "";

            return clienteNormalizado === clientePacoteNormalizado && petNormalizado === petPacoteNormalizado;
          }) || [];

        const temAgendamentoNaTabela = agendamentosClientePet.some((ag) => {
          const dataAgendamento = new Date(ag.data);
          dataAgendamento.setHours(0, 0, 0, 0);
          return dataAgendamento >= hoje;
        });

        const servicosFuturosNoPacote =
          (pacoteVendido.servicos as any[])?.filter((servico) => {
            const dataServico = new Date(servico.data);
            dataServico.setHours(0, 0, 0, 0);
            return dataServico >= hoje;
          }) || [];
        const temServicoFuturoNoPacote = servicosFuturosNoPacote.length > 0;

        // Verificar se algum outro pacote do mesmo cliente/pet tem serviços futuros
        const outrosPacotesClientePet =
          agendamentosPacotesData?.filter((p) => {
            if (p.id === pacoteVendido.id) return false;

            const clienteNormalizado = p.nome_cliente?.trim().toLowerCase() || "";
            const clientePacoteNormalizado = pacoteVendido.nome_cliente?.trim().toLowerCase() || "";
            const petNormalizado = p.nome_pet?.trim().toLowerCase() || "";
            const petPacoteNormalizado = pacoteVendido.nome_pet?.trim().toLowerCase() || "";

            return clienteNormalizado === clientePacoteNormalizado && petNormalizado === petPacoteNormalizado;
          }) || [];

        const temServicoFuturoEmOutrosPacotes = outrosPacotesClientePet.some((outroPacote) => {
          return (outroPacote.servicos as any[])?.some((servico) => {
            const dataServico = new Date(servico.data);
            dataServico.setHours(0, 0, 0, 0);
            return dataServico >= hoje;
          });
        });

        const temAgendamentoFuturo =
          temAgendamentoNaTabela || temServicoFuturoNoPacote || temServicoFuturoEmOutrosPacotes;

        // Se não tem agendamento futuro, adicionar à contagem (sem limite de 90 dias)
        if (!temAgendamentoFuturo) {
          count++;
        }
      }

      return count;
    } catch (error) {
      console.error("Erro ao calcular pacotes expirados:", error);
      return 0;
    }
  };

  // Calcular Pacotes a Expirar (7 dias)
  const calcularPacotesAExpirar = async () => {
    if (!user) return 0;

    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const { data: agendamentosPacotesData } = await supabase
        .from("agendamentos_pacotes")
        .select("*")
        .eq("user_id", ownerId);

      const { data: pacotesDefinicao } = await supabase
        .from("pacotes")
        .select("nome, validade")
        .eq("user_id", user.id);

      // Criar mapa de validades
      const validadeMap = new Map<string, number>();
      (pacotesDefinicao || []).forEach((p) => {
        const validadeDias = parseInt(p.validade.replace(/\D/g, "")) || 0;
        validadeMap.set(p.nome, validadeDias);
      });

      let count = 0;

      for (const pacoteVendido of agendamentosPacotesData || []) {
        const validade = validadeMap.get(pacoteVendido.nome_pacote) || 0;
        
        // Calcular dias restantes usando a mesma lógica do relatório
        const dataVencimento = new Date(pacoteVendido.data_venda);
        dataVencimento.setDate(dataVencimento.getDate() + validade);
        dataVencimento.setHours(0, 0, 0, 0);

        const diffTime = dataVencimento.getTime() - hoje.getTime();
        const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diasRestantes >= 0 && diasRestantes <= 7) {
          count++;
        }
      }

      return count;
    } catch (error) {
      console.error("Erro ao calcular pacotes a expirar:", error);
      return 0;
    }
  };

  // Calcular Produtos Próximos ao Vencimento (30 dias)
  const calcularProdutosVencimento = async () => {
    if (!user) return 0;

    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      const { data: itensCompra } = await supabase
        .from("compras_nf_itens")
        .select(`
          id,
          produto_id,
          quantidade,
          data_validade,
          nf_id,
          compras_nf!inner (
            user_id
          )
        `)
        .not("data_validade", "is", null);

      const itensDoUsuario = (itensCompra || []).filter(
        (item: any) => item.compras_nf?.user_id === user.id
      );

      const lotesMap = new Map<string, boolean>();

      itensDoUsuario.forEach((item: any) => {
        const dataValidade = new Date(item.data_validade);
        dataValidade.setHours(0, 0, 0, 0);

        const diasParaVencer = differenceInDays(dataValidade, hoje);

        const chave = `${item.produto_id}-${item.data_validade}`;

        if (diasParaVencer <= 30 && !lotesMap.has(chave)) {
          lotesMap.set(chave, true);
        }
      });

      return lotesMap.size;
    } catch (error) {
      console.error("Erro ao calcular produtos vencimento:", error);
      return 0;
    }
  };

  // Cálculo dos KPIs
  const kpis = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const hojeStr = format(hoje, "yyyy-MM-dd");
    const inicioMes = startOfMonth(hoje);
    const fimMes = endOfMonth(hoje);
    const proximaSemana = addDays(hoje, 7);
    const mesAnterior = subMonths(hoje, 1);
    const inicioMesAnterior = startOfMonth(mesAnterior);
    const fimMesAnterior = endOfMonth(mesAnterior);

    // Atendimentos do dia (agendamentos regulares)
    const atendimentosDiaRegulares = agendamentos.filter(
      (a) => a.data === hojeStr && (a.status === "confirmado" || a.status === "pendente"),
    ).length;

    // Atendimentos do dia (pacotes agendados)
    const atendimentosDiaPacotes = agendamentosPacotes.reduce((count, p) => {
      const servicos = Array.isArray(p.servicos) ? p.servicos : [];
      return count + servicos.filter((s: any) => s.data === hojeStr).length;
    }, 0);

    const atendimentosDia = atendimentosDiaRegulares + atendimentosDiaPacotes;

    // Atendimentos do próximo dia útil
    const proximoDiaUtil = getProximoDiaUtil(diasFuncionamento);
    const proximoDiaUtilStr = format(proximoDiaUtil, "yyyy-MM-dd");

    // Agendamentos regulares do próximo dia útil
    const atendimentosProximoDiaRegulares = agendamentos.filter(
      (a) => a.data === proximoDiaUtilStr && (a.status === "confirmado" || a.status === "pendente"),
    ).length;

    // Agendamentos de pacotes do próximo dia útil
    const atendimentosProximoDiaPacotes = agendamentosPacotes.reduce((count, p) => {
      const servicos = Array.isArray(p.servicos) ? p.servicos : [];
      return count + servicos.filter((s: any) => s.data === proximoDiaUtilStr).length;
    }, 0);

    const atendimentosProximoDia = atendimentosProximoDiaRegulares + atendimentosProximoDiaPacotes;

    // Faturamento do mês (receitas pagas) - usar comparação de strings para evitar bug de timezone
    const inicioMesStr = format(inicioMes, "yyyy-MM-dd");
    const fimMesStr = format(fimMes, "yyyy-MM-dd");
    const faturamentoMes = lancamentos
      .filter((l) => {
        if (l.tipo !== "Receita" || !l.pago || !l.data_pagamento) return false;
        if (l.observacao === "Transferência entre contas") return false;
        return l.data_pagamento >= inicioMesStr && l.data_pagamento <= fimMesStr;
      })
      .reduce((acc, l) => acc + Number(l.valor_total), 0);

    // Entradas previstas (receitas não pagas)
    const entradasPrevistas = lancamentos
      .filter((l) => l.tipo === "Receita" && !l.pago && l.observacao !== "Transferência entre contas")
      .reduce((acc, l) => acc + Number(l.valor_total), 0);

    // Saídas previstas (despesas não pagas)
    const saidasPrevistas = lancamentos
      .filter((l) => l.tipo === "Despesa" && !l.pago && l.observacao !== "Transferência entre contas")
      .reduce((acc, l) => acc + Number(l.valor_total), 0);

    // Taxa de recorrência (clientes que tiveram atendimento este mês e no mês anterior)
    const inicioMesAnteriorStr = format(inicioMesAnterior, "yyyy-MM-dd");
    const fimMesAnteriorStr = format(fimMesAnterior, "yyyy-MM-dd");
    const clientesMesAtual = new Set(
      agendamentos
        .filter((a) => a.data >= inicioMesStr && a.data <= fimMesStr)
        .map((a) => a.cliente),
    );

    const clientesMesAnterior = new Set(
      agendamentos
        .filter((a) => a.data >= inicioMesAnteriorStr && a.data <= fimMesAnteriorStr)
        .map((a) => a.cliente),
    );

    const clientesRecorrentes = [...clientesMesAtual].filter((c) => clientesMesAnterior.has(c)).length;
    const taxaRecorrencia = clientesMesAnterior.size > 0 ? (clientesRecorrentes / clientesMesAnterior.size) * 100 : 0;

    return {
      atendimentosDia,
      atendimentosProximoDia,
      proximoDiaUtil,
      faturamentoMes: isRecepcionista ? 0 : faturamentoMes,
      entradasPrevistas: isRecepcionista ? 0 : entradasPrevistas,
      saidasPrevistas: isRecepcionista ? 0 : saidasPrevistas,
      taxaRecorrencia: isRecepcionista ? 0 : taxaRecorrencia,
    };
  }, [agendamentos, agendamentosPacotes, lancamentos, diasFuncionamento, isRecepcionista]);

  // Dados para gráfico de fluxo de caixa (últimos 30 dias)
  const dadosFluxoCaixa = useMemo(() => {
    const diasSemana = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
    
    if (isRecepcionista) {
      const dados: any[] = [];
      const hoje = new Date();
      for (let i = 29; i >= 0; i--) {
        const data = subDays(hoje, i);
        dados.push({
          data: format(data, "dd/MM", { locale: ptBR }),
          receitas: 0,
          despesas: 0,
          lucro: 0,
          metaDiaria: 0,
        });
      }
      return dados;
    }

    const hoje = new Date();
    const dados: any[] = [];

    // Função para calcular meta diária baseada no mês
    const calcularMetaDiaria = (dataRef: Date) => {
      if (metaFaturamentoMensal === 0) return 0;
      const inicioMes = startOfMonth(dataRef);
      const fimMes = endOfMonth(dataRef);
      let diasUteisMes = 0;
      let d = new Date(inicioMes);
      while (d <= fimMes) {
        const diaDaSemana = diasSemana[d.getDay()];
        if (diasFuncionamento?.[diaDaSemana]) diasUteisMes++;
        d = addDays(d, 1);
      }
      return diasUteisMes > 0 ? metaFaturamentoMensal / diasUteisMes : 0;
    };

    for (let i = 29; i >= 0; i--) {
      const data = subDays(hoje, i);
      const dataStr = format(data, "yyyy-MM-dd");
      const diaDaSemana = diasSemana[data.getDay()];

      // Verificar se é dia de funcionamento
      const eDiaFuncionamento = diasFuncionamento?.[diaDaSemana] === true;

      const receitas = lancamentos
        .filter((l) => l.tipo === "Receita" && l.pago && l.data_pagamento === dataStr && l.observacao !== "Transferência entre contas")
        .reduce((acc, l) => acc + Number(l.valor_total), 0);

      const despesas = lancamentos
        .filter((l) => l.tipo === "Despesa" && l.pago && l.data_pagamento === dataStr && l.observacao !== "Transferência entre contas")
        .reduce((acc, l) => acc + Number(l.valor_total), 0);

      // Verificar se teve faturamento (exceção para dias não trabalhados)
      const teveFaturamento = receitas > 0 || despesas > 0;

      // Incluir apenas se: é dia de funcionamento OU teve faturamento
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

    // Calcular variação percentual para cada dia
    return dados.map((d, index) => {
      if (index === 0 || isRecepcionista) {
        return { ...d, variacaoReceitas: 0, variacaoDespesas: 0 };
      }
      const receitasAnterior = dados[index - 1].receitas;
      const despesasAnterior = dados[index - 1].despesas;
      const variacaoReceitas = receitasAnterior > 0 ? ((d.receitas - receitasAnterior) / receitasAnterior) * 100 : 0;
      const variacaoDespesas = despesasAnterior > 0 ? ((d.despesas - despesasAnterior) / despesasAnterior) * 100 : 0;
      return { ...d, variacaoReceitas, variacaoDespesas };
    });
  }, [lancamentos, isRecepcionista, diasFuncionamento, metaFaturamentoMensal]);

  // Dados para gráfico de Faturamento Médio do Mês (últimos 12 meses)
  const dadosFaturamentoMedio12Meses = useMemo(() => {
    const diasSemana = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];
    const dados: any[] = [];

    for (let i = 11; i >= 0; i--) {
      const mes = subMonths(new Date(), i);
      const inicioMes = startOfMonth(mes);
      const fimMes = endOfMonth(mes);
      const hoje = new Date();
      const dataFinal = i === 0 ? hoje : fimMes;

      if (isRecepcionista) {
        dados.push({
          mes: format(mes, "MMM/yy", { locale: ptBR }),
          media: 0,
          metaMedia: 0,
          diasUteis: 0,
        });
        continue;
      }

      // Contar dias úteis até a data final (para calcular média real)
      let diasUteisAteAgora = 0;
      let dataAtual = new Date(inicioMes);
      while (dataAtual <= dataFinal) {
        const diaDaSemana = diasSemana[dataAtual.getDay()];
        if (diasFuncionamento?.[diaDaSemana]) diasUteisAteAgora++;
        dataAtual = addDays(dataAtual, 1);
      }

      // Contar dias úteis do mês completo (para calcular meta média)
      let diasUteisMesCompleto = 0;
      dataAtual = new Date(inicioMes);
      while (dataAtual <= fimMes) {
        const diaDaSemana = diasSemana[dataAtual.getDay()];
        if (diasFuncionamento?.[diaDaSemana]) diasUteisMesCompleto++;
        dataAtual = addDays(dataAtual, 1);
      }

      // Calcular receitas do mês (pagas) - usar comparação de strings para evitar bug de timezone
      const inicioMesStr = format(inicioMes, "yyyy-MM-dd");
      const dataFinalStr = format(dataFinal, "yyyy-MM-dd");
      const receitas = lancamentos
        .filter((l) => {
          if (l.tipo !== "Receita" || !l.pago || !l.data_pagamento) return false;
          if (l.observacao === "Transferência entre contas") return false;
          return l.data_pagamento >= inicioMesStr && l.data_pagamento <= dataFinalStr;
        })
        .reduce((acc, l) => acc + Number(l.valor_total), 0);

      const media = diasUteisAteAgora > 0 ? receitas / diasUteisAteAgora : 0;
      // Meta média sempre usa os dias úteis do mês completo
      const metaMedia = diasUteisMesCompleto > 0 ? metaFaturamentoMensal / diasUteisMesCompleto : 0;

      dados.push({
        mes: format(mes, "MMM/yy", { locale: ptBR }),
        media,
        metaMedia,
        diasUteis: diasUteisAteAgora,
      });
    }

    return dados;
  }, [lancamentos, diasFuncionamento, metaFaturamentoMensal, isRecepcionista]);

  // Dados para gráfico de crescimento de agendamentos (últimos 12 meses)
  const dadosCrescimentoAgendamentos = useMemo(() => {
    const dados: any[] = [];

    for (let i = 11; i >= 0; i--) {
      const mes = subMonths(new Date(), i);
      const inicioMes = startOfMonth(mes);
      const fimMes = endOfMonth(mes);

      if (isRecepcionista) {
        dados.push({
          mes: format(mes, "MMM/yy", { locale: ptBR }),
          quantidade: 0,
          variacao: 0,
        });
        continue;
      }

      // Agendamentos regulares - usar comparação de strings
      const inicioMesStr = format(inicioMes, "yyyy-MM-dd");
      const fimMesStr = format(fimMes, "yyyy-MM-dd");
      const quantidadeRegulares = agendamentos.filter((a) => {
        return a.data >= inicioMesStr && a.data <= fimMesStr;
      }).length;

      // Agendamentos de pacotes
      const quantidadePacotes = agendamentosPacotes.reduce((count, p) => {
        const servicos = Array.isArray(p.servicos) ? p.servicos : [];
        return (
          count +
          servicos.filter((s: any) => {
            if (!s.data) return false;
            return s.data >= inicioMesStr && s.data <= fimMesStr;
          }).length
        );
      }, 0);

      const totalAtendimentos = quantidadeRegulares + quantidadePacotes;

      dados.push({
        mes: format(mes, "MMM/yy", { locale: ptBR }),
        quantidade: totalAtendimentos,
      });
    }

    // Calcular variação percentual para cada mês
    return dados.map((d, index) => {
      if (index === 0 || isRecepcionista) {
        return { ...d, variacao: 0 };
      }
      const mesAnterior = dados[index - 1].quantidade;
      const variacao = mesAnterior > 0 ? ((d.quantidade - mesAnterior) / mesAnterior) * 100 : 0;
      return { ...d, variacao };
    });
  }, [agendamentos, agendamentosPacotes, isRecepcionista]);

  // Dados históricos de média mensal para os últimos 12 meses
  const dadosMediaMensalHistorico = useMemo(() => {
    if (!diasFuncionamento) return [];

    if (isRecepcionista) {
      const dados: any[] = [];
      for (let i = 11; i >= 0; i--) {
        const mes = subMonths(new Date(), i);
        dados.push({
          mes: format(mes, "MMM/yy", { locale: ptBR }),
          media: 0,
        });
      }
      return dados;
    }

    const dados: any[] = [];
    const diasSemana = ["domingo", "segunda", "terca", "quarta", "quinta", "sexta", "sabado"];

    // Buscar últimos 12 meses
    for (let i = 11; i >= 0; i--) {
      const mes = subMonths(new Date(), i);
      const inicioMes = startOfMonth(mes);
      const fimMes = endOfMonth(mes);
      const hoje = new Date();

      // Limitar ao dia atual se for o mês corrente
      const dataFinal = i === 0 ? hoje : fimMes;

      // Contar agendamentos regulares do mês - usar comparação de strings
      const inicioMesStr2 = format(inicioMes, "yyyy-MM-dd");
      const dataFinalStr2 = format(dataFinal, "yyyy-MM-dd");
      const atendimentosRegulares = agendamentos.filter((a) => {
        return a.data >= inicioMesStr2 && a.data <= dataFinalStr2;
      }).length;

      // Contar agendamentos de pacotes do mês
      const atendimentosPacotes = agendamentosPacotes.reduce((count, p) => {
        const servicos = Array.isArray(p.servicos) ? p.servicos : [];
        return (
          count +
          servicos.filter((s: any) => {
            if (!s.data) return false;
            return s.data >= inicioMesStr2 && s.data <= dataFinalStr2;
          }).length
        );
      }, 0);

      const totalAtendimentos = atendimentosRegulares + atendimentosPacotes;

      // Contar dias úteis do mês (até hoje se for mês corrente)
      let diasUteis = 0;
      let dataAtual = new Date(inicioMes);

      while (dataAtual <= dataFinal) {
        const diaDaSemana = diasSemana[dataAtual.getDay()];
        if (diasFuncionamento[diaDaSemana] === true) {
          diasUteis++;
        }
        dataAtual = addDays(dataAtual, 1);
      }

      const media = diasUteis > 0 ? totalAtendimentos / diasUteis : 0;

      dados.push({
        mes: format(mes, "MMM/yy", { locale: ptBR }),
        media: Math.round(media * 10) / 10, // Arredondar para 1 casa decimal
      });
    }

    // Calcular variação percentual para cada mês
    return dados.map((d, index) => {
      if (index === 0 || isRecepcionista) {
        return { ...d, variacao: 0 };
      }
      const mediaAnterior = dados[index - 1].media;
      const variacao = mediaAnterior > 0 ? ((d.media - mediaAnterior) / mediaAnterior) * 100 : 0;
      return { ...d, variacao };
    });
  }, [agendamentos, agendamentosPacotes, diasFuncionamento, isRecepcionista]);

  // Dados para gráfico de Faturamento/Despesas (últimos 12 meses)
  const dadosFaturamentoDespesas12Meses = useMemo(() => {
    const dados: any[] = [];

    for (let i = 11; i >= 0; i--) {
      const mes = subMonths(new Date(), i);
      const inicioMes = startOfMonth(mes);
      const fimMes = endOfMonth(mes);

      if (isRecepcionista) {
        dados.push({
          mes: format(mes, "MMM/yy", { locale: ptBR }),
          receitas: 0,
          despesas: 0,
        });
        continue;
      }

      // Receitas do mês (pagas) - usar comparação de strings para evitar bug de timezone
      const inicioMesStr = format(inicioMes, "yyyy-MM-dd");
      const fimMesStr = format(fimMes, "yyyy-MM-dd");
      const receitas = lancamentos
        .filter((l) => {
          if (l.tipo !== "Receita" || !l.pago || !l.data_pagamento) return false;
          if (l.observacao === "Transferência entre contas") return false;
          return l.data_pagamento >= inicioMesStr && l.data_pagamento <= fimMesStr;
        })
        .reduce((acc, l) => acc + Number(l.valor_total), 0);

      // Despesas do mês (pagas)
      const despesas = lancamentos
        .filter((l) => {
          if (l.tipo !== "Despesa" || !l.pago || !l.data_pagamento) return false;
          if (l.observacao === "Transferência entre contas") return false;
          return l.data_pagamento >= inicioMesStr && l.data_pagamento <= fimMesStr;
        })
        .reduce((acc, l) => acc + Number(l.valor_total), 0);

      dados.push({
        mes: format(mes, "MMM/yy", { locale: ptBR }),
        receitas,
        despesas,
      });
    }

    // Calcular variação percentual para cada mês
    return dados.map((d, index) => {
      if (index === 0 || isRecepcionista) {
        return { ...d, variacaoReceitas: 0, variacaoDespesas: 0 };
      }
      const receitasAnterior = dados[index - 1].receitas;
      const despesasAnterior = dados[index - 1].despesas;
      const variacaoReceitas = receitasAnterior > 0 ? ((d.receitas - receitasAnterior) / receitasAnterior) * 100 : 0;
      const variacaoDespesas = despesasAnterior > 0 ? ((d.despesas - despesasAnterior) / despesasAnterior) * 100 : 0;
      return { ...d, variacaoReceitas, variacaoDespesas };
    });
  }, [lancamentos, isRecepcionista]);

  const handleKPIClick = (reportId: string) => {
    if (onNavigateToRelatorio) {
      onNavigateToRelatorio(reportId);
    } else {
      navigate("/relatorios", { state: { tab: reportId } });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
    <div className="space-y-4">
      {/* Linha 1: Cards de Indicadores Principais (5 cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KPICard
          titulo="Atendimentos Hoje"
          valor={`${kpis.atendimentosDia} agendamentos`}
          subtitulo=""
          icon={<Calendar />}
          cor="default"
        />

        <KPICard
          titulo="Atendimentos Próximo dia útil"
          valor={`${kpis.atendimentosProximoDia} agendamentos`}
          subtitulo={kpis.proximoDiaUtil ? format(kpis.proximoDiaUtil, "EEEE, dd/MM", { locale: ptBR }) : ""}
          icon={<CalendarDays />}
          cor="default"
        />

        <KPICard
          titulo="Faturamento Mês"
          valor={kpis.faturamentoMes}
          subtitulo="receitas pagas no mês"
          icon={<DollarSign />}
          cor="green"
        />

        <KPICard
          titulo="Entradas Previstas"
          valor={kpis.entradasPrevistas}
          subtitulo="contas a receber"
          icon={<TrendingUp />}
          cor="default"
        />

        <KPICard
          titulo="Saídas Previstas"
          valor={kpis.saidasPrevistas}
          subtitulo="contas a pagar"
          icon={<TrendingDown />}
          cor="red"
        />
      </div>

      {/* Linha 2: Cards de Indicadores Adicionais (4 cards - clicáveis) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          titulo="Clientes em Risco"
          valor={isRecepcionista ? "0 Clientes" : `${kpisAdicionais.clientesEmRisco} Clientes`}
          subtitulo="sem agendamento há 15+ dias"
          icon={<AlertTriangle />}
          cor={isRecepcionista ? "default" : kpisAdicionais.clientesEmRisco > 0 ? "red" : "green"}
          onClick={isRecepcionista ? undefined : () => handleKPIClick("clientes-risco")}
        />

        <KPICard
          titulo="Pacotes Vencidos"
          valor={isRecepcionista ? "0 Pacotes" : `${kpisAdicionais.pacotesExpirados} Pacotes`}
          subtitulo="sem agendamentos futuros"
          icon={<Package />}
          cor={isRecepcionista ? "default" : kpisAdicionais.pacotesExpirados > 0 ? "red" : "green"}
          onClick={isRecepcionista ? undefined : () => handleKPIClick("pacotes-expirados")}
        />

        <KPICard
          titulo="Pacotes a Expirar"
          valor={isRecepcionista ? "0 Pacotes" : `${kpisAdicionais.pacotesAExpirar} Pacotes`}
          subtitulo="7 dias"
          icon={<Package />}
          cor={isRecepcionista ? "default" : kpisAdicionais.pacotesAExpirar > 0 ? "yellow" : "green"}
          onClick={isRecepcionista ? undefined : () => handleKPIClick("pacotes-vencimento")}
        />

        <KPICard
          titulo="Produtos Próximos ao Vencimento"
          valor={isRecepcionista ? "0 Produtos" : `${kpisAdicionais.produtosVencimento} Produtos`}
          subtitulo="30 dias"
          icon={<ShoppingCart />}
          cor={isRecepcionista ? "default" : kpisAdicionais.produtosVencimento > 0 ? "yellow" : "green"}
          onClick={isRecepcionista ? undefined : () => handleKPIClick("produtos-vencimento")}
        />
      </div>

      {/* Linha 2: Gráficos Principais (4 colunas no desktop) */}
      {/* Linha 3: Gráficos Financeiros (3 colunas no desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Gráfico Faturamento/Despesas - 12 Meses */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Faturamento/Despesas dos últimos 12 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosFaturamentoDespesas12Meses} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis width={40} tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const formatCurrency = (value: number) =>
                        new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(value);
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{data.mes}</p>
                          <p className="text-sm text-green-600">Receitas: {formatCurrency(data.receitas)}</p>
                          {data.variacaoReceitas !== 0 && (
                            <p
                              className={`text-xs font-medium ${data.variacaoReceitas > 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {data.variacaoReceitas > 0 ? "+" : ""}
                              {data.variacaoReceitas.toFixed(1)}% vs mês anterior
                            </p>
                          )}
                          <p className="text-sm text-red-600 mt-1">Despesas: {formatCurrency(data.despesas)}</p>
                          {data.variacaoDespesas !== 0 && (
                            <p
                              className={`text-xs font-medium ${data.variacaoDespesas > 0 ? "text-red-600" : "text-green-600"}`}
                            >
                              {data.variacaoDespesas > 0 ? "+" : ""}
                              {data.variacaoDespesas.toFixed(1)}% vs mês anterior
                            </p>
                          )}
                          {metaFaturamentoMensal > 0 && (
                            <p className="text-sm text-gray-500 mt-1 border-t pt-1">
                              Meta Mensal: {formatCurrency(metaFaturamentoMensal)}
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                {metaFaturamentoMensal > 0 && (
                  <ReferenceLine
                    y={metaFaturamentoMensal}
                    stroke="#9ca3af"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    label={{
                      value: "Meta",
                      position: "insideTopRight",
                      fill: "#9ca3af",
                      fontSize: 12,
                    }}
                  />
                )}
                <Line 
                  type="monotone" 
                  dataKey="receitas" 
                  stroke="#22c55e" 
                  name="Receitas" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line 
                  type="monotone" 
                  dataKey="despesas" 
                  stroke="#ef4444" 
                  name="Despesas" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico Faturamento Médio do Mês */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Faturamento Médio do mês</CardTitle>
            <p className="text-xs text-muted-foreground">
              Média diária de faturamento considerando dias úteis trabalhados
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosFaturamentoMedio12Meses} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis width={50} tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const formatCurrency = (value: number) =>
                        new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(value);
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{data.mes}</p>
                          <p className="text-sm text-green-600">
                            Média Diária: {formatCurrency(data.media)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ({data.diasUteis} dias úteis)
                          </p>
                          {data.metaMedia > 0 && (
                            <p className="text-sm text-gray-500 mt-1 border-t pt-1">
                              Meta Média: {formatCurrency(data.metaMedia)}/dia
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="media"
                  stroke="#22c55e"
                  name="Média Diária"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
                {metaFaturamentoMensal > 0 && (
                  <Line
                    type="monotone"
                    dataKey="metaMedia"
                    stroke="#9ca3af"
                    name="Meta Média"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico Fluxo de Caixa */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Fluxo de Caixa - Últimos 30 dias</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosFluxoCaixa} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="data" tick={{ fontSize: 12 }} />
                <YAxis width={30} tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      const formatCurrency = (value: number) =>
                        new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(value);
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{data.data}</p>
                          <p className="text-sm text-green-600">Receitas: {formatCurrency(data.receitas)}</p>
                          {data.variacaoReceitas !== 0 && (
                            <p
                              className={`text-xs font-medium ${data.variacaoReceitas > 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {data.variacaoReceitas > 0 ? "+" : ""}
                              {data.variacaoReceitas.toFixed(1)}% vs dia anterior
                            </p>
                          )}
                          <p className="text-sm text-red-600 mt-1">Despesas: {formatCurrency(data.despesas)}</p>
                          {data.variacaoDespesas !== 0 && (
                            <p
                              className={`text-xs font-medium ${data.variacaoDespesas > 0 ? "text-red-600" : "text-green-600"}`}
                            >
                              {data.variacaoDespesas > 0 ? "+" : ""}
                              {data.variacaoDespesas.toFixed(1)}% vs dia anterior
                            </p>
                          )}
                          {data.metaDiaria > 0 && (
                            <p className="text-sm text-gray-500 mt-1 border-t pt-1">
                              Meta Diária: {formatCurrency(data.metaDiaria)}
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                {metaFaturamentoMensal > 0 && (
                  <Line
                    type="monotone"
                    dataKey="metaDiaria"
                    stroke="#9ca3af"
                    name="Meta Diária"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                )}
                <Line type="monotone" dataKey="receitas" stroke="#22c55e" name="Receitas" strokeWidth={2} />
                <Line type="monotone" dataKey="despesas" stroke="#ef4444" name="Despesas" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Linha 4: Gráficos de Atendimentos + Contas a Vencer (3 colunas no desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Gráfico Evolução de Agendamentos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução de Atendimentos - Últimos 12 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosCrescimentoAgendamentos} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis width={30} tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{data.mes}</p>
                          <p className="text-sm">Atendimentos: {data.quantidade}</p>
                          {data.variacao !== 0 && (
                            <p
                              className={`text-sm font-medium ${data.variacao > 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {data.variacao > 0 ? "+" : ""}
                              {data.variacao.toFixed(1)}% vs mês anterior
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="quantidade"
                  stroke="#3b82f6"
                  name="Atendimentos"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico Média Mensal */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Média do Mês de Atendimentos Realizados</CardTitle>
            <p className="text-xs text-muted-foreground">
              Média diária de atendimentos considerando apenas dias úteis trabalhados
            </p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dadosMediaMensalHistorico} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis width={30} tick={{ fontSize: 12 }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded-lg p-3 shadow-lg">
                          <p className="font-semibold">{data.mes}</p>
                          <p className="text-sm">Média: {data.media.toFixed(1)} atendimentos/dia</p>
                          {data.variacao !== 0 && (
                            <p
                              className={`text-sm font-medium ${data.variacao > 0 ? "text-green-600" : "text-red-600"}`}
                            >
                              {data.variacao > 0 ? "+" : ""}
                              {data.variacao.toFixed(1)}% vs mês anterior
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="media"
                  stroke="#8b5cf6"
                  name="Média Diária"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Contas a Vencer */}
        <ContasProximasVencimento lancamentos={isRecepcionista ? [] : lancamentos} />
      </div>
    </div>
  );
};
