import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCrecheData } from "./useCrecheData";
import { Loader2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  periodo: { inicio: string; fim: string };
  tipoFilter: string;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--muted-foreground))"];

const RelatorioOcupacao = ({ periodo, tipoFilter }: Props) => {
  const { estadias, loading } = useCrecheData(periodo, tipoFilter);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  // Daily occupation
  const days = eachDayOfInterval({
    start: parseISO(periodo.inicio),
    end: parseISO(periodo.fim),
  });

  const dailyData = days.map((day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const count = estadias.filter((e) => e.data_entrada <= dateStr && (!e.data_saida || e.data_saida >= dateStr)).length;
    return {
      dia: format(day, "dd/MM", { locale: ptBR }),
      pets: count,
    };
  });

  // Creche vs Hotel
  const crecheCount = estadias.filter((e) => e.tipo === "creche").length;
  const hotelCount = estadias.filter((e) => e.tipo === "hotel").length;
  const pieData = [
    { name: "Creche", value: crecheCount },
    { name: "Hotel", value: hotelCount },
  ].filter((d) => d.value > 0);

  // Day of week distribution
  const weekDays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const weekMap = new Array(7).fill(0);
  estadias.forEach((e) => {
    const day = parseISO(e.data_entrada).getDay();
    weekMap[day]++;
  });
  const weekData = weekDays.map((name, i) => ({ dia: name, pets: weekMap[i] }));

  return (
    <div className="space-y-3">
      <div className="grid md:grid-cols-3 gap-2">
        <Card className="p-0">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{estadias.length}</p>
            <p className="text-xs text-muted-foreground">Total Estadias</p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{dailyData.length > 0 ? (estadias.length / dailyData.length).toFixed(1) : 0}</p>
            <p className="text-xs text-muted-foreground">Média/Dia</p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{Math.max(...dailyData.map((d) => d.pets), 0)}</p>
            <p className="text-xs text-muted-foreground">Pico do Período</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Ocupação Diária</CardTitle>
        </CardHeader>
        <CardContent className="px-2 pb-3 pt-0">
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Bar dataKey="pets" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Pets" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Creche vs Hotel</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3 pt-0">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">Distribuição por Dia da Semana</CardTitle>
          </CardHeader>
          <CardContent className="px-2 pb-3 pt-0">
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weekData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis dataKey="dia" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="pets" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Pets" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RelatorioOcupacao;
