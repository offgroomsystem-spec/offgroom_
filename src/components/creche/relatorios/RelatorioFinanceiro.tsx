import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCrecheData } from "./useCrecheData";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  periodo: { inicio: string; fim: string };
  tipoFilter: string;
}

const RelatorioFinanceiro = ({ periodo, tipoFilter }: Props) => {
  const { estadias, loading } = useCrecheData(periodo, tipoFilter);
  const { user } = useAuth();
  const [lancamentos, setLancamentos] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("lancamentos_financeiros")
        .select("id, valor_total, data_pagamento, pago, descricao1, tipo")
        .eq("tipo", "Receita Operacional")
        .eq("pago", true)
        .gte("data_pagamento", periodo.inicio)
        .lte("data_pagamento", periodo.fim);

      // Filter creche-related entries by description
      const crecheRelated = (data || []).filter((l) =>
        l.descricao1?.toLowerCase().includes("creche") ||
        l.descricao1?.toLowerCase().includes("hotel") ||
        l.descricao1?.toLowerCase().includes("hospedagem") ||
        l.descricao1?.toLowerCase().includes("diária")
      );
      setLancamentos(crecheRelated);
    };
    load();
  }, [user, periodo.inicio, periodo.fim]);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const faturamento = lancamentos.reduce((acc, l) => acc + (l.valor_total || 0), 0);
  const totalEstadias = estadias.length;
  const ticketMedio = totalEstadias > 0 ? faturamento / totalEstadias : 0;

  // Monthly breakdown
  const monthMap = new Map<string, number>();
  lancamentos.forEach((l) => {
    const m = l.data_pagamento.substring(0, 7);
    monthMap.set(m, (monthMap.get(m) || 0) + (l.valor_total || 0));
  });
  const monthData = [...monthMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([m, v]) => ({
      mes: format(parseISO(m + "-01"), "MMM/yy", { locale: ptBR }),
      valor: v,
    }));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-0">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold text-green-600">
              {faturamento.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
            <p className="text-xs text-muted-foreground">Faturamento</p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold">
              {ticketMedio.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
            <p className="text-xs text-muted-foreground">Ticket Médio/Estadia</p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="p-3 text-center">
            <p className="text-xl font-bold">{lancamentos.length}</p>
            <p className="text-xs text-muted-foreground">Lançamentos</p>
          </CardContent>
        </Card>
      </div>

      {monthData.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Faturamento Mensal</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3 pt-0">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} formatter={(v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} />
                  <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Receita" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="py-6 text-center">
          <p className="text-xs text-muted-foreground">
            💡 Dica: Para que o relatório financeiro reflita dados precisos, cadastre os lançamentos de Creche/Hotel com descrições que incluam "creche", "hotel", "hospedagem" ou "diária".
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default RelatorioFinanceiro;
