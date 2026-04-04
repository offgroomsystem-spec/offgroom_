import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCrecheData } from "./useCrecheData";
import { Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  periodo: { inicio: string; fim: string };
  tipoFilter: string;
}

const RelatorioCrescimento = ({ periodo, tipoFilter }: Props) => {
  const { estadias, loading } = useCrecheData(periodo, tipoFilter);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  // Monthly stats
  const monthMap = new Map<string, { total: number; uniquePets: Set<string> }>();
  estadias.forEach((e) => {
    const m = e.data_entrada.substring(0, 7);
    const curr = monthMap.get(m) || { total: 0, uniquePets: new Set<string>() };
    curr.total++;
    curr.uniquePets.add(e.pet_nome);
    monthMap.set(m, curr);
  });

  const monthData = [...monthMap.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([m, v]) => ({
      mes: format(parseISO(m + "-01"), "MMM/yy", { locale: ptBR }),
      estadias: v.total,
      pets: v.uniquePets.size,
    }));

  // Growth %
  let crescimento = 0;
  if (monthData.length >= 2) {
    const prev = monthData[monthData.length - 2].estadias;
    const curr = monthData[monthData.length - 1].estadias;
    crescimento = prev > 0 ? Math.round(((curr - prev) / prev) * 100) : 0;
  }

  // New vs returning pets
  const firstSeen = new Map<string, string>();
  [...estadias].sort((a, b) => a.data_entrada.localeCompare(b.data_entrada)).forEach((e) => {
    if (!firstSeen.has(e.pet_nome)) firstSeen.set(e.pet_nome, e.data_entrada.substring(0, 7));
  });

  const newVsReturn = monthData.map((md) => {
    const mesKey = [...monthMap.keys()].find((k) => format(parseISO(k + "-01"), "MMM/yy", { locale: ptBR }) === md.mes);
    if (!mesKey) return { ...md, novos: 0, recorrentes: 0 };
    const mesStats = monthMap.get(mesKey)!;
    let novos = 0;
    let recorrentes = 0;
    mesStats.uniquePets.forEach((pet) => {
      if (firstSeen.get(pet) === mesKey) novos++;
      else recorrentes++;
    });
    return { ...md, novos, recorrentes };
  });

  // Smart suggestions
  const suggestions: string[] = [];
  if (crescimento > 10) suggestions.push("📈 Crescimento forte! Considere aumentar a capacidade da creche.");
  if (crescimento < -10) suggestions.push("📉 Queda na demanda. Considere promoções ou pacotes especiais.");
  const topMonth = monthData.reduce((max, d) => d.estadias > (max?.estadias || 0) ? d : max, monthData[0]);
  if (topMonth) suggestions.push(`🏆 Mês de pico: ${topMonth.mes} com ${topMonth.estadias} estadias.`);

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-0">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{estadias.length}</p>
            <p className="text-xs text-muted-foreground">Total no Período</p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="p-3 text-center">
            <div className="flex items-center justify-center gap-1">
              <p className={`text-2xl font-bold ${crescimento >= 0 ? "text-green-500" : "text-red-500"}`}>
                {crescimento >= 0 ? "+" : ""}{crescimento}%
              </p>
              {crescimento >= 0 ? <TrendingUp className="h-4 w-4 text-green-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
            </div>
            <p className="text-xs text-muted-foreground">Crescimento</p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{new Set(estadias.map((e) => e.pet_nome)).size}</p>
            <p className="text-xs text-muted-foreground">Pets Únicos</p>
          </CardContent>
        </Card>
      </div>

      {monthData.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3 pt-0">
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="estadias" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} name="Estadias" />
                  <Line type="monotone" dataKey="pets" stroke="hsl(var(--muted-foreground))" strokeWidth={1.5} dot={{ r: 2 }} name="Pets Únicos" strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {suggestions.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">💡 Insights</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            <div className="space-y-1">
              {suggestions.map((s, i) => (
                <p key={i} className="text-xs text-muted-foreground">{s}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RelatorioCrescimento;
