import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { FileText, Download, DollarSign, TrendingUp, Users, Percent, Target, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const COLORS = ["#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899", "#14b8a6", "#f97316"];

interface ComissoesDetalhadasProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ComissoesDetalhadas = ({ open, onOpenChange }: ComissoesDetalhadasProps) => {
  const { user, ownerId } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState("mes");
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [groomerFilter, setGroomerFilter] = useState("todos");

  const [comissoesConfig, setComissoesConfig] = useState<any>(null);
  const [lancamentosComissao, setLancamentosComissao] = useState<any[]>([]);
  const [allAgGroomers, setAllAgGroomers] = useState<{ id: string; groomer: string }[]>([]);
  const [groomersData, setGroomersData] = useState<{ id: string; nome: string }[]>([]);
  const [empresaConfig, setEmpresaConfig] = useState<any>(null);

  const reportRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!open || !user) return;
    const load = async () => {
      setLoading(true);
      const [comRes, lnRes, agAllRes, grRes, empRes] = await Promise.all([
        supabase.from("comissoes_config" as any).select("*").eq("user_id", ownerId).maybeSingle(),
        supabase
          .from("lancamentos_financeiros")
          .select("id, agendamento_id, valor_total, descricao1, data_pagamento, lancamentos_financeiros_itens(descricao2, valor, quantidade)")
          .eq("user_id", ownerId).eq("pago", true).eq("tipo", "Receita")
          .gte("data_pagamento", dataInicio).lte("data_pagamento", dataFim),
        supabase.from("agendamentos").select("id, groomer").eq("user_id", ownerId),
        supabase.from("groomers").select("id, nome").eq("user_id", ownerId),
        supabase.from("empresa_config").select("meta_faturamento_mensal, nome_empresa").eq("user_id", ownerId).maybeSingle(),
      ]);
      setComissoesConfig(comRes.data || null);
      setLancamentosComissao(lnRes.data || []);
      setAllAgGroomers((agAllRes.data || []) as any);
      setGroomersData((grRes.data || []) as any);
      setEmpresaConfig(empRes.data);
      setLoading(false);
    };
    load();
  }, [open, user, ownerId, dataInicio, dataFim]);

  // Realtime
  useEffect(() => {
    if (!open) return;
    const ch = supabase
      .channel("comissoes-det")
      .on("postgres_changes", { event: "*", schema: "public", table: "comissoes_config" }, () => {
        supabase.from("comissoes_config" as any).select("*").eq("user_id", ownerId).maybeSingle()
          .then(({ data }) => setComissoesConfig(data || null));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "lancamentos_financeiros" }, () => {
        supabase.from("lancamentos_financeiros")
          .select("id, agendamento_id, valor_total, descricao1, data_pagamento, lancamentos_financeiros_itens(descricao2, valor, quantidade)")
          .eq("user_id", ownerId).eq("pago", true).eq("tipo", "Receita")
          .gte("data_pagamento", dataInicio).lte("data_pagamento", dataFim)
          .then(({ data }) => setLancamentosComissao(data || []));
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [open, ownerId, dataInicio, dataFim]);

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  // Commission calculation (mirrors parent logic)
  const comissaoData = useMemo(() => {
    const cfg = comissoesConfig as any;
    if (!cfg?.ativo) return null;

    const tipoGlobal = cfg.tipo_comissao || "servicos_e_vendas";
    const tiposPerGroomer = (cfg.tipos_comissao_groomers || {}) as Record<string, string>;
    const modelo = cfg.modelo;
    const nameToId = new Map(groomersData.map((g) => [g.nome, g.id]));

    const matchesTipo = (descricao2: string, tipo: string) => {
      const d = descricao2?.toLowerCase()?.trim() || "";
      if (tipo === "servicos") return d === "serviços" || d === "servicos";
      if (tipo === "produtos") return d === "venda" || d === "vendas";
      return d === "serviços" || d === "servicos" || d === "venda" || d === "vendas";
    };

    const agGroomerMap = new Map<string, string>();
    allAgGroomers.forEach((a) => {
      const g = a.groomer?.trim();
      if (a.id && g && g !== "Não atribuído") agGroomerMap.set(a.id, g);
    });

    const getGroomerTipo = (groomerName: string): string => {
      if (modelo === "groomer") {
        const gId = nameToId.get(groomerName);
        return gId ? (tiposPerGroomer[gId] || tipoGlobal) : tipoGlobal;
      }
      return tipoGlobal;
    };

    const calcFilteredValue = (l: any, tipo: string): number => {
      const itens = (l.lancamentos_financeiros_itens || []) as any[];
      if (itens.length > 0) {
        return itens
          .filter((item: any) => matchesTipo(item.descricao2, tipo))
          .reduce((sum: number, item: any) => sum + ((item.valor || 0) * (item.quantidade || 1)), 0);
      }
      return l.valor_total || 0;
    };

    const calcGroomerAtendVal = (groomerName: string): number => {
      let val = 0;
      (lancamentosComissao || []).forEach((l: any) => {
        const attendedBy = l.agendamento_id ? agGroomerMap.get(l.agendamento_id) : null;
        if (attendedBy !== groomerName) return;
        val += calcFilteredValue(l, modelo === "hibrida" ? tipoGlobal : tipoGlobal);
      });
      return val;
    };

    // Total company revenue
    let totalCompany = 0;
    let totalServicos = 0;
    let totalVendas = 0;
    (lancamentosComissao || []).forEach((l: any) => {
      totalCompany += calcFilteredValue(l, "servicos_e_vendas");
      totalServicos += calcFilteredValue(l, "servicos");
      totalVendas += calcFilteredValue(l, "produtos");
    });

    const meta = empresaConfig?.meta_faturamento_mensal || 0;
    const excessoMeta = (meta > 0 && totalCompany >= meta) ? (totalCompany - meta) : 0;
    const metaAtingida = meta > 0 && totalCompany >= meta;

    const registeredGroomers = groomersData.map((g) => g.nome);
    const results: {
      nome: string; comissao: number; base: number; pct: number;
      tipo: string; detalhes: { label: string; valor: number }[];
    }[] = [];

    if (modelo === "groomer") {
      registeredGroomers.forEach((name) => {
        const gId = nameToId.get(name);
        const pct = gId ? ((cfg.comissoes_groomers as any)?.[gId] || 0) : 0;
        const tipo = getGroomerTipo(name);
        let base = 0;
        (lancamentosComissao || []).forEach((l: any) => { base += calcFilteredValue(l, tipo); });
        const comissao = Math.round(base * pct / 100 * 100) / 100;
        const tipoLabel = tipo === "servicos" ? "Serviços" : tipo === "produtos" ? "Vendas" : "Serviços e Vendas";
        results.push({
          nome: name, comissao, base, pct, tipo: tipoLabel,
          detalhes: [{ label: `Faturamento (${tipoLabel})`, valor: base }, { label: `Comissão (${pct}%)`, valor: comissao }],
        });
      });
    } else if (modelo === "faturamento") {
      const pct = cfg.comissao_faturamento || 0;
      registeredGroomers.forEach((name) => {
        const comissao = Math.round(totalCompany * pct / 100 * 100) / 100;
        results.push({
          nome: name, comissao, base: totalCompany, pct, tipo: "Serviços e Vendas",
          detalhes: [{ label: "Faturamento Total", valor: totalCompany }, { label: `Comissão (${pct}%)`, valor: comissao }],
        });
      });
    } else if (modelo === "atendimento") {
      const pct = cfg.comissao_atendimento || 0;
      registeredGroomers.forEach((name) => {
        const base = calcGroomerAtendVal(name);
        const comissao = Math.round(base * pct / 100 * 100) / 100;
        const tipoLabel = tipoGlobal === "servicos" ? "Serviços" : tipoGlobal === "produtos" ? "Vendas" : "Serviços e Vendas";
        results.push({
          nome: name, comissao, base, pct, tipo: tipoLabel,
          detalhes: [{ label: `Atendimentos Próprios (${tipoLabel})`, valor: base }, { label: `Comissão (${pct}%)`, valor: comissao }],
        });
      });
    } else if (modelo === "hibrida") {
      const pctFat = cfg.comissao_faturamento || 0;
      const pctAtend = cfg.comissao_atendimento || 0;
      const pctBonus = cfg.bonus_meta || 0;

      registeredGroomers.forEach((name) => {
        const comFat = Math.round(totalCompany * pctFat / 100 * 100) / 100;
        const atendVal = calcGroomerAtendVal(name);
        const comAtend = Math.round(atendVal * pctAtend / 100 * 100) / 100;
        const comBonus = Math.round(excessoMeta * pctBonus / 100 * 100) / 100;
        const total = Math.round((comFat + comAtend + comBonus) * 100) / 100;
        results.push({
          nome: name, comissao: total, base: totalCompany, pct: 0, tipo: "Híbrida",
          detalhes: [
            { label: `Faturamento (${pctFat}%)`, valor: comFat },
            { label: `Atendimento (${pctAtend}%)`, valor: comAtend },
            { label: `Bônus Meta (${pctBonus}%)`, valor: comBonus },
          ],
        });
      });
    }

    return {
      results: results.sort((a, b) => b.comissao - a.comissao),
      modelo,
      totalCompany,
      totalServicos,
      totalVendas,
      meta,
      metaAtingida,
      excessoMeta,
    };
  }, [comissoesConfig, lancamentosComissao, allAgGroomers, groomersData, empresaConfig]);

  const filteredResults = useMemo(() => {
    if (!comissaoData) return [];
    if (groomerFilter === "todos") return comissaoData.results;
    return comissaoData.results.filter((r) => r.nome === groomerFilter);
  }, [comissaoData, groomerFilter]);

  const totalComissao = useMemo(() => filteredResults.reduce((s, r) => s + r.comissao, 0), [filteredResults]);

  const modeloLabel = (m: string) => {
    const map: Record<string, string> = {
      groomer: "Comissão por Groomer",
      faturamento: "Comissão por Faturamento",
      atendimento: "Comissão por Atendimento",
      hibrida: "Comissão Híbrida",
    };
    return map[m] || m;
  };

  const periodoLabel = () => {
    try {
      return `${format(parseISO(dataInicio), "dd/MM/yyyy")} a ${format(parseISO(dataFim), "dd/MM/yyyy")}`;
    } catch { return `${dataInicio} a ${dataFim}`; }
  };

  const generateChartsSvgHtml = (results: typeof filteredResults, total: number) => {
    if (results.length === 0) return "";
    const nameColWidth = 120;
    const barMaxWidth = 200;
    const valueSpace = 80;
    const barW = nameColWidth + barMaxWidth + valueSpace + 20;
    const barH = results.length * 34 + 20;
    const maxVal = Math.max(...results.map(r => r.comissao), 1);
    const barBars = results.map((r, i) => {
      const w = Math.max((r.comissao / maxVal) * barMaxWidth, 2);
      const y = i * 34 + 10;
      const c = COLORS[i % COLORS.length];
      const barX = nameColWidth + 4;
      return `<text x="${nameColWidth}" y="${y + 15}" text-anchor="end" font-size="9" fill="#333">${r.nome}</text><rect x="${barX}" y="${y}" width="${w}" height="22" rx="3" fill="${c}"/><text x="${barX + w + 4}" y="${y + 15}" font-size="8" fill="#333">${formatCurrency(r.comissao)}</text>`;
    }).join("");
    const barSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${barW} ${barH}" width="100%" height="${barH}" preserveAspectRatio="xMidYMid meet">${barBars}</svg>`;

    const pieR = 60, pieCx = 80, pieCy = 80;
    const legendX = pieCx + pieR + 40;
    let startAngle = -90;
    const activeResults = results.filter(r => r.comissao > 0);
    const pieSlices = activeResults.map((r, i) => {
      const pct = total > 0 ? r.comissao / total : 0;
      const angle = pct * 360;
      const a1 = (startAngle * Math.PI) / 180;
      const a2 = ((startAngle + angle) * Math.PI) / 180;
      const largeArc = angle > 180 ? 1 : 0;
      const x1 = pieCx + pieR * Math.cos(a1), y1 = pieCy + pieR * Math.sin(a1);
      const x2 = pieCx + pieR * Math.cos(a2), y2 = pieCy + pieR * Math.sin(a2);
      startAngle += angle;
      const c = COLORS[i % COLORS.length];
      return `<path d="M${pieCx},${pieCy} L${x1},${y1} A${pieR},${pieR} 0 ${largeArc},1 ${x2},${y2} Z" fill="${c}"/>`;
    }).join("");
    const pieLegend = activeResults.map((r, i) => {
      const pct = total > 0 ? (r.comissao / total) * 100 : 0;
      const y = 10 + i * 18;
      return `<rect x="${legendX}" y="${y}" width="10" height="10" rx="2" fill="${COLORS[i % COLORS.length]}"/><text x="${legendX + 14}" y="${y + 9}" font-size="9" fill="#333">${r.nome} (${pct.toFixed(0)}%)</text>`;
    }).join("");
    const pieW = legendX + 160;
    const pieH = Math.max(pieCy * 2 + 10, activeResults.length * 18 + 20);
    const pieSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${pieW} ${pieH}" width="100%" height="${pieH}" preserveAspectRatio="xMidYMid meet">${pieSlices}${pieLegend}</svg>`;

    return `<div class="charts-row"><div class="chart-box"><div class="chart-title">Comissão por Funcionário</div>${barSvg}</div><div class="chart-box"><div class="chart-title">Distribuição das Comissões</div>${pieSvg}</div></div>`;
  };

  const exportPDFDetalhado = () => {
    if (filteredResults.length === 0) {
      toast({ title: "Aviso", description: "Não há dados para exportar.", variant: "destructive" });
      return;
    }

    const nomeEmpresa = empresaConfig?.nome_empresa || "Minha Empresa";
    const rows = filteredResults.map((r) => {
      const detalhesHtml = r.detalhes.map((d) => `<div class="det-row"><span>${d.label}</span><span>${formatCurrency(d.valor)}</span></div>`).join("");
      return `
        <div class="groomer-card">
          <div class="groomer-header">
            <span class="groomer-name">${r.nome}</span>
            <span class="groomer-total">${formatCurrency(r.comissao)}</span>
          </div>
          <div class="groomer-info">
            <span>Tipo: ${r.tipo}</span>
            ${r.pct > 0 ? `<span>Percentual: ${r.pct}%</span>` : ""}
            <span>Base: ${formatCurrency(r.base)}</span>
          </div>
          <div class="det-section">
            <div class="det-title">Detalhamento</div>
            ${detalhesHtml}
          </div>
        </div>`;
    }).join("");

    const metaSection = comissaoData?.meta && comissaoData.meta > 0
      ? `<div class="meta-section">
          <div class="meta-title">Meta de Faturamento</div>
          <div class="det-row"><span>Meta</span><span>${formatCurrency(comissaoData.meta)}</span></div>
          <div class="det-row"><span>Faturamento Total</span><span>${formatCurrency(comissaoData.totalCompany)}</span></div>
          <div class="det-row"><span>Status</span><span class="${comissaoData.metaAtingida ? 'meta-ok' : 'meta-nok'}">${comissaoData.metaAtingida ? '✅ Atingida' : '❌ Não atingida'}</span></div>
          ${comissaoData.metaAtingida ? `<div class="det-row"><span>Excedente</span><span>${formatCurrency(comissaoData.excessoMeta)}</span></div>` : ""}
        </div>`
      : "";

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Relatório de Comissões</title>
<style>
@page { size: A4; margin: 15mm; }
body { font-family: Arial, sans-serif; font-size: 11px; color: #222; margin: 0; padding: 0; }
.header { text-align: center; margin-bottom: 16px; border-bottom: 2px solid #8b5cf6; padding-bottom: 8px; }
.header h1 { font-size: 16px; margin: 0 0 4px 0; color: #8b5cf6; }
.header p { font-size: 10px; color: #666; margin: 2px 0; }
.summary { display: flex; gap: 12px; margin-bottom: 14px; flex-wrap: wrap; }
.sum-card { flex: 1; min-width: 120px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px 10px; }
.sum-card .sum-label { font-size: 9px; color: #888; text-transform: uppercase; }
.sum-card .sum-value { font-size: 14px; font-weight: 700; color: #333; }
.groomer-card { border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 10px; overflow: hidden; }
.groomer-header { display: flex; justify-content: space-between; align-items: center; background: #8b5cf6; color: #fff; padding: 6px 10px; }
.groomer-name { font-weight: 700; font-size: 12px; }
.groomer-total { font-weight: 700; font-size: 13px; }
.groomer-info { display: flex; gap: 12px; padding: 6px 10px; font-size: 10px; color: #666; background: #faf5ff; }
.det-section { padding: 6px 10px; }
.det-title { font-size: 10px; font-weight: 700; color: #8b5cf6; margin-bottom: 4px; }
.det-row { display: flex; justify-content: space-between; padding: 2px 0; border-bottom: 1px solid #f3f4f6; font-size: 10px; }
.meta-section { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 8px 10px; margin-bottom: 14px; }
.meta-title { font-size: 11px; font-weight: 700; color: #15803d; margin-bottom: 4px; }
.meta-ok { color: #15803d; font-weight: 600; }
.meta-nok { color: #dc2626; font-weight: 600; }
.total-footer { text-align: right; font-size: 14px; font-weight: 700; color: #8b5cf6; margin-top: 10px; padding-top: 8px; border-top: 2px solid #8b5cf6; }
.charts-row { display: flex; gap: 16px; margin-bottom: 16px; }
.chart-box { flex: 1; border: 1px solid #e5e7eb; border-radius: 6px; padding: 8px; background: #fafafa; }
.chart-title { font-size: 11px; font-weight: 700; color: #8b5cf6; margin-bottom: 6px; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="header">
  <h1>Relatório Detalhado de Comissões</h1>
  <p>${nomeEmpresa}</p>
  <p>Período: ${periodoLabel()} | Modelo: ${modeloLabel(comissaoData?.modelo || "")}</p>
  <p>Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
</div>
<div class="summary">
  <div class="sum-card"><div class="sum-label">Faturamento Total</div><div class="sum-value">${formatCurrency(comissaoData?.totalCompany || 0)}</div></div>
  <div class="sum-card"><div class="sum-label">Total Comissões</div><div class="sum-value">${formatCurrency(totalComissao)}</div></div>
  <div class="sum-card"><div class="sum-label">Funcionários</div><div class="sum-value">${filteredResults.length}</div></div>
  <div class="sum-card"><div class="sum-label">Modelo</div><div class="sum-value">${modeloLabel(comissaoData?.modelo || "")}</div></div>
</div>
${metaSection}
${generateChartsSvgHtml(filteredResults, totalComissao)}
${rows}
<div class="total-footer">Total a Pagar: ${formatCurrency(totalComissao)}</div>
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) { toast({ title: "Erro", description: "Permita pop-ups para exportar.", variant: "destructive" }); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
    toast({ title: "Sucesso", description: "PDF detalhado gerado!" });
  };

  const exportPDFSimplificado = () => {
    if (filteredResults.length === 0) {
      toast({ title: "Aviso", description: "Não há dados para exportar.", variant: "destructive" });
      return;
    }

    const nomeEmpresa = empresaConfig?.nome_empresa || "Minha Empresa";
    const rowsHtml = filteredResults.map((r, i) =>
      `<tr><td>${i + 1}</td><td>${r.nome}</td><td>${r.tipo}</td><td>${formatCurrency(r.base)}</td><td>${r.pct > 0 ? r.pct + "%" : "-"}</td><td class="val">${formatCurrency(r.comissao)}</td></tr>`
    ).join("");

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Comissões - Simplificado</title>
<style>
@page { size: A4; margin: 15mm; }
body { font-family: Arial, sans-serif; font-size: 11px; color: #222; margin: 0; }
.header { text-align: center; margin-bottom: 14px; }
.header h1 { font-size: 15px; margin: 0 0 4px 0; }
.header p { font-size: 10px; color: #666; margin: 1px 0; }
table { width: 100%; border-collapse: collapse; margin-top: 10px; }
th { background: #f3f4f6; padding: 5px 6px; text-align: left; font-size: 10px; border-bottom: 2px solid #d1d5db; }
td { padding: 4px 6px; font-size: 10px; border-bottom: 1px solid #e5e7eb; }
tr:nth-child(even) { background: #f9fafb; }
.val { font-weight: 700; color: #8b5cf6; }
.total-row td { font-weight: 700; font-size: 11px; border-top: 2px solid #8b5cf6; background: #faf5ff; }
@media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style></head><body>
<div class="header">
  <h1>Comissões - Resumo para Financeiro</h1>
  <p>${nomeEmpresa} | Período: ${periodoLabel()}</p>
  <p>Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}</p>
</div>
<table>
  <thead><tr><th>#</th><th>Funcionário</th><th>Tipo</th><th>Base</th><th>%</th><th>Valor a Pagar</th></tr></thead>
  <tbody>${rowsHtml}
    <tr class="total-row"><td colspan="5" style="text-align:right">TOTAL A PAGAR</td><td class="val">${formatCurrency(totalComissao)}</td></tr>
  </tbody>
</table>
</body></html>`;

    const win = window.open("", "_blank");
    if (!win) { toast({ title: "Erro", description: "Permita pop-ups para exportar.", variant: "destructive" }); return; }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
    toast({ title: "Sucesso", description: "PDF simplificado gerado!" });
  };

  // Pie chart data for commission distribution
  const pieData = useMemo(() => {
    return filteredResults.map((r) => ({ name: r.nome, value: r.comissao })).filter((r) => r.value > 0);
  }, [filteredResults]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-5 pt-4 pb-2">
          <DialogTitle className="text-sm font-bold flex items-center gap-1.5">
            <DollarSign className="h-4 w-4 text-primary" />
            Relatório Detalhado de Comissões
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 pb-4 space-y-3" ref={reportRef}>
          {/* Filters */}
          <div className="flex flex-wrap gap-2 items-end">
            <div className="space-y-[2px]">
              <Label className="text-[11px] font-semibold">Período</Label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="h-7 text-[12px] w-28">
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
                <div className="space-y-[2px]">
                  <Label className="text-[11px] font-semibold">Início</Label>
                  <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-7 text-[12px] w-32" />
                </div>
                <div className="space-y-[2px]">
                  <Label className="text-[11px] font-semibold">Fim</Label>
                  <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="h-7 text-[12px] w-32" />
                </div>
              </>
            )}
            <div className="space-y-[2px]">
              <Label className="text-[11px] font-semibold">Funcionário</Label>
              <Select value={groomerFilter} onValueChange={setGroomerFilter}>
                <SelectTrigger className="h-7 text-[12px] w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {groomersData.map((g) => <SelectItem key={g.id} value={g.nome}>{g.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-1.5 ml-auto">
              <Button variant="outline" size="sm" className="h-7 text-[12px] font-semibold" onClick={exportPDFDetalhado}>
                <FileText className="h-3.5 w-3.5 mr-1" />
                Exportar Detalhado
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-[12px] font-semibold" onClick={exportPDFSimplificado}>
                <Download className="h-3.5 w-3.5 mr-1" />
                Exportar Simplificado
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
            </div>
          ) : !comissoesConfig?.ativo ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-[12px] text-muted-foreground text-center">
                Ative a opção <strong>"Configurar Comissões"</strong> na página de <strong>"Configurações da Empresa"</strong> para visualizar este relatório.
              </p>
            </div>
          ) : (
            <>
              {/* KPI Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
                <Card className="p-0">
                  <CardContent className="flex items-center gap-2 p-2">
                    <DollarSign className="h-3.5 w-3.5 text-primary shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Faturamento Total</p>
                      <p className="text-[12px] font-bold">{formatCurrency(comissaoData?.totalCompany || 0)}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="p-0">
                  <CardContent className="flex items-center gap-2 p-2">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Total Comissões</p>
                      <p className="text-[12px] font-bold text-emerald-600">{formatCurrency(totalComissao)}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="p-0">
                  <CardContent className="flex items-center gap-2 p-2">
                    <Users className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Funcionários</p>
                      <p className="text-[12px] font-bold">{filteredResults.length}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="p-0">
                  <CardContent className="flex items-center gap-2 p-2">
                    <Percent className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                    <div>
                      <p className="text-[10px] text-muted-foreground">Modelo</p>
                      <p className="text-[12px] font-bold truncate">{modeloLabel(comissaoData?.modelo || "")}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Meta card */}
              {comissaoData?.meta && comissaoData.meta > 0 && (
                <Card className="p-0 border-l-4" style={{ borderLeftColor: comissaoData.metaAtingida ? "#22c55e" : "#ef4444" }}>
                  <CardContent className="flex items-center justify-between p-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-3.5 w-3.5" style={{ color: comissaoData.metaAtingida ? "#22c55e" : "#ef4444" }} />
                      <div>
                        <p className="text-[10px] text-muted-foreground">Meta de Faturamento</p>
                        <p className="text-[12px] font-bold">{formatCurrency(comissaoData.meta)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={comissaoData.metaAtingida ? "default" : "destructive"} className="text-[10px] h-5">
                        {comissaoData.metaAtingida ? "✅ Atingida" : "❌ Não atingida"}
                      </Badge>
                      {comissaoData.metaAtingida && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">Excedente: {formatCurrency(comissaoData.excessoMeta)}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Charts row */}
              <div className="grid md:grid-cols-2 gap-2">
                {/* Bar chart */}
                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-[11px] font-semibold">Comissão por Funcionário</CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 pb-2 pt-0 h-44">
                    {filteredResults.length === 0 ? (
                      <div className="flex items-center justify-center h-full"><p className="text-[11px] text-muted-foreground">Sem dados</p></div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={filteredResults} layout="vertical" margin={{ left: 0, right: 8, top: 4, bottom: 4 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={(v) => `R$${v}`} />
                          <YAxis dataKey="nome" type="category" width={70} tick={{ fontSize: 9 }} />
                          <Tooltip contentStyle={{ fontSize: 10 }} formatter={(v: number) => [formatCurrency(v), "Comissão"]} />
                          <Bar dataKey="comissao" radius={[0, 4, 4, 0]} label={({ x, y, width, height, value }: any) => (
                            <text x={x + width - 4} y={y + height / 2} textAnchor="end" dominantBaseline="middle" fontSize={8} fontWeight="bold" fill="#fff">
                              {formatCurrency(value)}
                            </text>
                          )}>
                            {filteredResults.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                {/* Pie chart */}
                <Card>
                  <CardHeader className="py-2 px-3">
                    <CardTitle className="text-[11px] font-semibold">Distribuição das Comissões</CardTitle>
                  </CardHeader>
                  <CardContent className="px-2 pb-2 pt-0 h-44">
                    {pieData.length === 0 ? (
                      <div className="flex items-center justify-center h-full"><p className="text-[11px] text-muted-foreground">Sem dados</p></div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={55} innerRadius={25}
                            label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false} style={{ fontSize: 9 }}>
                            {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                          </Pie>
                          <Tooltip contentStyle={{ fontSize: 10 }} formatter={(v: number) => formatCurrency(v)} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Revenue breakdown */}
              {comissaoData && (
                <div className="grid grid-cols-3 gap-1.5">
                  <Card className="p-0">
                    <CardContent className="p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Receita Serviços</p>
                      <p className="text-[12px] font-bold text-blue-600">{formatCurrency(comissaoData.totalServicos)}</p>
                    </CardContent>
                  </Card>
                  <Card className="p-0">
                    <CardContent className="p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">Receita Vendas</p>
                      <p className="text-[12px] font-bold text-orange-600">{formatCurrency(comissaoData.totalVendas)}</p>
                    </CardContent>
                  </Card>
                  <Card className="p-0">
                    <CardContent className="p-2 text-center">
                      <p className="text-[10px] text-muted-foreground">% Comissão s/ Faturamento</p>
                      <p className="text-[12px] font-bold text-purple-600">
                        {(comissaoData.totalCompany > 0 ? (totalComissao / comissaoData.totalCompany * 100) : 0).toFixed(1)}%
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Separator />

              {/* Individual groomer cards */}
              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground">Detalhamento Individual</p>
                {filteredResults.map((r, i) => (
                  <Card key={r.nome} className="p-0 overflow-hidden">
                    <div className="flex items-center justify-between px-3 py-1.5" style={{ background: `${COLORS[i % COLORS.length]}15` }}>
                      <div className="flex items-center gap-1.5">
                        <Award className="h-3.5 w-3.5" style={{ color: COLORS[i % COLORS.length] }} />
                        <span className="text-[12px] font-bold">{r.nome}</span>
                      </div>
                      <span className="text-[13px] font-bold" style={{ color: COLORS[i % COLORS.length] }}>{formatCurrency(r.comissao)}</span>
                    </div>
                    <CardContent className="px-3 py-2 space-y-1">
                      <div className="flex gap-3 text-[10px] text-muted-foreground">
                        <span>Tipo: <strong>{r.tipo}</strong></span>
                        {r.pct > 0 && <span>Percentual: <strong>{r.pct}%</strong></span>}
                        <span>Base: <strong>{formatCurrency(r.base)}</strong></span>
                      </div>
                      <div className="space-y-0.5">
                        {r.detalhes.map((d, j) => (
                          <div key={j} className="flex justify-between text-[10px] py-0.5 border-b border-border/30 last:border-0">
                            <span className="text-muted-foreground">{d.label}</span>
                            <span className="font-semibold">{formatCurrency(d.valor)}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Total footer */}
              <Card className="p-0 bg-primary/5 border-primary/20">
                <CardContent className="flex items-center justify-between p-3">
                  <span className="text-[12px] font-bold text-primary">TOTAL A PAGAR</span>
                  <span className="text-[16px] font-bold text-primary">{formatCurrency(totalComissao)}</span>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
