import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PawPrint, Calendar } from "lucide-react";
import { differenceInDays } from "date-fns";
import { useNavigate } from "react-router-dom";

interface PetsRetornoRecomendadoProps {
  agendamentos: any[];
  clientes: any[];
}

export const PetsRetornoRecomendado = ({ agendamentos, clientes }: PetsRetornoRecomendadoProps) => {
  const navigate = useNavigate();
  
  const petsComRetorno = useMemo(() => {
    const hoje = new Date();
    const clientesPets: { [key: string]: { cliente: string; pet: string; ultimaVisita: Date; diasAtras: number } } = {};
    
    // Agrupar por cliente/pet e pegar último agendamento
    agendamentos.forEach((a) => {
      const key = `${a.cliente}-${a.pet}`;
      const dataAgendamento = new Date(a.data);
      
      if (!clientesPets[key] || dataAgendamento > clientesPets[key].ultimaVisita) {
        clientesPets[key] = {
          cliente: a.cliente,
          pet: a.pet,
          ultimaVisita: dataAgendamento,
          diasAtras: differenceInDays(hoje, dataAgendamento),
        };
      }
    });
    
    // Filtrar pets com última visita há mais de 30 dias
    return Object.values(clientesPets)
      .filter((p) => p.diasAtras > 30)
      .sort((a, b) => b.diasAtras - a.diasAtras)
      .slice(0, 5);
  }, [agendamentos]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <PawPrint className="h-5 w-5" />
          Recomendação de Retorno
        </CardTitle>
      </CardHeader>
      <CardContent>
        {petsComRetorno.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <PawPrint className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Todos os pets estão em dia!</p>
          </div>
        ) : (
          <ScrollArea className="h-[268px]">
            <div className="space-y-3">
              {petsComRetorno.map((pet, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium">{pet.pet}</p>
                    <p className="text-xs text-muted-foreground">{pet.cliente}</p>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>Há {pet.diasAtras} dias</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate("/agendamentos")}
                    className="ml-2"
                  >
                    Agendar
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
