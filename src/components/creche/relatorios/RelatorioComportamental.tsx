import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCrecheData } from "./useCrecheData";
import { Loader2, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  periodo: { inicio: string; fim: string };
  tipoFilter: string;
}

const RelatorioComportamental = ({ periodo, tipoFilter }: Props) => {
  const { estadias, registros, loading } = useCrecheData(periodo, tipoFilter);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const estadiaIdToPet = new Map(estadias.map((e) => [e.id, e.pet_nome]));

  // Group registros by pet
  const petOcorrencias = new Map<string, { brigas: number; doenca: number; pulgas: number; total: number }>();
  registros.forEach((r) => {
    const pet = estadiaIdToPet.get(r.estadia_id);
    if (!pet) return;
    const curr = petOcorrencias.get(pet) || { brigas: 0, doenca: 0, pulgas: 0, total: 0 };
    if (r.brigas) curr.brigas++;
    if (r.sinais_doenca) curr.doenca++;
    if (r.pulgas_carrapatos) curr.pulgas++;
    curr.total++;
    petOcorrencias.set(pet, curr);
  });

  const alertPets = [...petOcorrencias.entries()]
    .filter(([_, o]) => o.brigas > 0 || o.doenca > 0 || o.pulgas > 0)
    .map(([pet, o]) => ({ pet, ...o }))
    .sort((a, b) => (b.brigas + b.doenca + b.pulgas) - (a.brigas + a.doenca + a.pulgas));

  const totalBrigas = registros.filter((r) => r.brigas).length;
  const totalDoenca = registros.filter((r) => r.sinais_doenca).length;
  const totalPulgas = registros.filter((r) => r.pulgas_carrapatos).length;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <Card className="p-0">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-500">{totalBrigas}</p>
            <p className="text-xs text-muted-foreground">Brigas</p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-orange-500">{totalDoenca}</p>
            <p className="text-xs text-muted-foreground">Sinais de Doença</p>
          </CardContent>
        </Card>
        <Card className="p-0">
          <CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-yellow-500">{totalPulgas}</p>
            <p className="text-xs text-muted-foreground">Pulgas/Carrapatos</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            Pets com Ocorrências
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-3 pt-0">
          {alertPets.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">✅ Nenhuma ocorrência comportamental no período.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Pet</TableHead>
                  <TableHead className="text-xs text-center">Brigas</TableHead>
                  <TableHead className="text-xs text-center">Doença</TableHead>
                  <TableHead className="text-xs text-center">Pulgas</TableHead>
                  <TableHead className="text-xs text-center">Registros</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {alertPets.map((p) => (
                  <TableRow key={p.pet}>
                    <TableCell className="text-sm font-medium">{p.pet}</TableCell>
                    <TableCell className="text-center">
                      {p.brigas > 0 && <Badge variant="destructive" className="text-[10px]">{p.brigas}</Badge>}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.doenca > 0 && <Badge variant="destructive" className="text-[10px]">{p.doenca}</Badge>}
                    </TableCell>
                    <TableCell className="text-center">
                      {p.pulgas > 0 && <Badge className="text-[10px] bg-yellow-500">{p.pulgas}</Badge>}
                    </TableCell>
                    <TableCell className="text-sm text-center text-muted-foreground">{p.total}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RelatorioComportamental;
