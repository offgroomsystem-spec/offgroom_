import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ProximosAgendamentosProps {
  agendamentos: any[];
}

export const ProximosAgendamentos = ({ agendamentos }: ProximosAgendamentosProps) => {
  const hoje = new Date();
  const hojeStr = format(hoje, "yyyy-MM-dd");
  
  const agendamentosHoje = agendamentos
    .filter((a) => a.data === hojeStr && (a.status === "confirmado" || a.status === "pendente"))
    .sort((a, b) => a.horario.localeCompare(b.horario))
    .slice(0, 7);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Agenda de Hoje
        </CardTitle>
      </CardHeader>
      <CardContent>
        {agendamentosHoje.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum agendamento para hoje</p>
          </div>
        ) : (
          <ScrollArea className="h-[268px]">
            <div className="space-y-3">
              {agendamentosHoje.map((agendamento) => (
                <div
                  key={agendamento.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm font-semibold">{agendamento.horario}</span>
                    </div>
                    <p className="text-sm font-medium">{agendamento.cliente}</p>
                    <p className="text-xs text-muted-foreground">
                      {agendamento.pet} • {agendamento.servico}
                    </p>
                  </div>
                  <Badge
                    variant={agendamento.status === "confirmado" ? "default" : "secondary"}
                    className="ml-2"
                  >
                    {agendamento.status === "confirmado" ? "Confirmado" : "Pendente"}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
