import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCrecheData } from "./useCrecheData";
import { Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { differenceInHours, parseISO } from "date-fns";

interface Props {
  periodo: { inicio: string; fim: string };
  tipoFilter: string;
}

const RelatorioFrequencia = ({ periodo, tipoFilter }: Props) => {
  const { estadias, loading } = useCrecheData(periodo, tipoFilter);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  // Frequency by pet
  const petStats = new Map<string, { count: number; tutor: string; totalHours: number; finalizados: number }>();
  estadias.forEach((e) => {
    const curr = petStats.get(e.pet_nome) || { count: 0, tutor: e.cliente_nome, totalHours: 0, finalizados: 0 };
    curr.count++;
    if (e.status === "finalizado" && e.data_saida && e.hora_saida) {
      const h = differenceInHours(
        new Date(`${e.data_saida}T${e.hora_saida}`),
        new Date(`${e.data_entrada}T${e.hora_entrada}`)
      );
      if (h > 0) {
        curr.totalHours += h;
        curr.finalizados++;
      }
    }
    petStats.set(e.pet_nome, curr);
  });

  const petList = [...petStats.entries()]
    .map(([nome, stats]) => ({
      nome,
      tutor: stats.tutor,
      frequencia: stats.count,
      tempoMedio: stats.finalizados > 0 ? Math.round(stats.totalHours / stats.finalizados) : "-",
    }))
    .sort((a, b) => b.frequencia - a.frequencia);

  const uniquePets = petList.length;
  const recorrentes = petList.filter((p) => p.frequencia >= 3).length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-0">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{uniquePets}</p>
            <p className="text-xs text-muted-foreground">Pets Únicos</p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{recorrentes}</p>
            <p className="text-xs text-muted-foreground">Recorrentes (3+)</p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold">{petList.length > 0 ? petList[0].frequencia : 0}x</p>
            <p className="text-xs text-muted-foreground">Maior Frequência</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">Frequência por Pet</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-3 pt-0">
          {petList.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">Sem dados no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Pet</TableHead>
                  <TableHead className="text-xs">Tutor</TableHead>
                  <TableHead className="text-xs text-center">Visitas</TableHead>
                  <TableHead className="text-xs text-center">Tempo Médio (h)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {petList.map((p) => (
                  <TableRow key={p.nome}>
                    <TableCell className="text-sm font-medium">{p.nome}</TableCell>
                    <TableCell className="text-sm">{p.tutor}</TableCell>
                    <TableCell className="text-sm text-center">{p.frequencia}</TableCell>
                    <TableCell className="text-sm text-center">{p.tempoMedio}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {recorrentes > 0 && (
        <Card>
          <CardContent className="py-4">
            <p className="text-xs text-muted-foreground">
              💡 {recorrentes} pet(s) frequentam a creche regularmente. Considere oferecer pacotes mensais para fidelizá-los!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RelatorioFrequencia;
