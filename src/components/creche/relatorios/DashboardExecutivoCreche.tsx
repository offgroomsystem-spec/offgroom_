import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCrecheData } from "./useCrecheData";
import { DollarSign, Users, BarChart3, Star, Loader2 } from "lucide-react";
import { differenceInHours, parseISO } from "date-fns";

interface Props {
  periodo: { inicio: string; fim: string };
  tipoFilter: string;
}

const DashboardExecutivoCreche = ({ periodo, tipoFilter }: Props) => {
  const { estadias, registros, loading } = useCrecheData(periodo, tipoFilter);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  const totalEstadias = estadias.length;
  const finalizadas = estadias.filter((e) => e.status === "finalizado");

  // Unique pets
  const uniquePets = new Set(estadias.map((e) => e.pet_nome));
  const uniqueClientes = new Set(estadias.map((e) => e.cliente_nome));

  // Avg stay hours
  const stayHours = finalizadas
    .filter((e) => e.data_saida && e.hora_saida)
    .map((e) => {
      const entrada = new Date(`${e.data_entrada}T${e.hora_entrada}`);
      const saida = new Date(`${e.data_saida}T${e.hora_saida}`);
      return differenceInHours(saida, entrada);
    })
    .filter((h) => h > 0);
  const avgHours = stayHours.length > 0 ? Math.round(stayHours.reduce((a, b) => a + b, 0) / stayHours.length) : 0;

  // Top pets by frequency
  const petCount = new Map<string, number>();
  estadias.forEach((e) => petCount.set(e.pet_nome, (petCount.get(e.pet_nome) || 0) + 1));
  const topPets = [...petCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Pet scores
  const petScores = calcPetScores(estadias, registros);

  const kpis = [
    { label: "Total Estadias", value: totalEstadias, icon: BarChart3, color: "text-blue-500" },
    { label: "Pets Atendidos", value: uniquePets.size, icon: Users, color: "text-green-500" },
    { label: "Tutores", value: uniqueClientes.size, icon: Users, color: "text-purple-500" },
    { label: "Tempo Médio (h)", value: avgHours, icon: Star, color: "text-orange-500" },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {kpis.map((k) => (
          <Card key={k.label} className="p-0">
            <CardContent className="flex items-center gap-3 p-3">
              <k.icon className={`h-7 w-7 ${k.color} shrink-0`} />
              <div>
                <p className="text-xl font-bold leading-none">{k.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{k.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        {/* Top Pets */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">🏆 Pets Mais Frequentes</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            {topPets.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem dados no período.</p>
            ) : (
              <div className="space-y-1.5">
                {topPets.map(([nome, count], i) => (
                  <div key={nome} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                      {nome}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">{count}x</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pet Scores */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">🐾 Score dos Pets</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 pt-0">
            {petScores.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sem registros comportamentais.</p>
            ) : (
              <div className="space-y-1.5">
                {petScores.slice(0, 5).map((ps) => (
                  <div key={ps.pet} className="flex items-center justify-between text-sm">
                    <span>{ps.pet}</span>
                    <div className="flex items-center gap-2">
                      <ScoreBadge label="Social" value={ps.sociabilidade} />
                      <ScoreBadge label="Saúde" value={ps.saude} />
                      <ScoreBadge label="Energia" value={ps.energia} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const ScoreBadge = ({ label, value }: { label: string; value: number }) => {
  const color =
    value >= 80 ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
    value >= 50 ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" :
    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${color}`} title={label}>
      {label} {value}
    </span>
  );
};

interface PetScore {
  pet: string;
  sociabilidade: number;
  saude: number;
  energia: number;
}

function calcPetScores(
  estadias: { pet_nome: string; id: string }[],
  registros: { estadia_id: string; interagiu_bem: boolean | null; brigas: boolean | null; sinais_doenca: boolean | null; pulgas_carrapatos: boolean | null; brincou: boolean | null; comeu: boolean | null }[]
): PetScore[] {
  const estadiaIdToPet = new Map(estadias.map((e) => [e.id, e.pet_nome]));
  const petRegistros = new Map<string, typeof registros>();

  registros.forEach((r) => {
    const pet = estadiaIdToPet.get(r.estadia_id);
    if (!pet) return;
    const arr = petRegistros.get(pet) || [];
    arr.push(r);
    petRegistros.set(pet, arr);
  });

  const scores: PetScore[] = [];
  petRegistros.forEach((regs, pet) => {
    const total = regs.length;
    if (total === 0) return;

    const socialPos = regs.filter((r) => r.interagiu_bem).length;
    const socialNeg = regs.filter((r) => r.brigas).length;
    const sociabilidade = Math.round(Math.max(0, Math.min(100, ((socialPos - socialNeg) / total) * 100)));

    const healthNeg = regs.filter((r) => r.sinais_doenca || r.pulgas_carrapatos).length;
    const saude = Math.round(Math.max(0, Math.min(100, ((total - healthNeg) / total) * 100)));

    const energyPos = regs.filter((r) => r.brincou).length;
    const energia = Math.round(Math.max(0, Math.min(100, (energyPos / total) * 100)));

    scores.push({ pet, sociabilidade, saude, energia });
  });

  return scores.sort((a, b) => (b.sociabilidade + b.saude + b.energia) - (a.sociabilidade + a.saude + a.energia));
}

export default DashboardExecutivoCreche;
