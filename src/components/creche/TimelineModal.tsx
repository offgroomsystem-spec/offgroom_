import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Clock, UtensilsCrossed, Droplets, Dog, Smile, Frown,
  CircleCheck, Stethoscope, Bug, AlertTriangle, LogIn, MessageSquare
} from "lucide-react";

interface TimelineModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estadiaId: string | null;
  petNome: string;
}

interface Registro {
  id: string;
  data_registro: string;
  hora_registro: string;
  comeu: boolean;
  bebeu_agua: boolean;
  brincou: boolean;
  interagiu_bem: boolean;
  brigas: boolean;
  fez_necessidades: boolean;
  sinais_doenca: boolean;
  pulgas_carrapatos: boolean;
  observacoes: string | null;
}

interface EstadiaInfo {
  data_entrada: string;
  hora_entrada: string;
  tipo: string;
  observacoes_entrada: string | null;
  checklist_entrada: any;
  data_saida_prevista: string | null;
}

const indicadoresMap: Record<string, { icon: any; label: string; alert?: boolean }> = {
  comeu: { icon: UtensilsCrossed, label: "Comeu" },
  bebeu_agua: { icon: Droplets, label: "Bebeu água" },
  brincou: { icon: Dog, label: "Brincou" },
  interagiu_bem: { icon: Smile, label: "Boa interação" },
  brigas: { icon: Frown, label: "Brigas", alert: true },
  fez_necessidades: { icon: CircleCheck, label: "Necessidades" },
  sinais_doenca: { icon: Stethoscope, label: "Sinais doença", alert: true },
  pulgas_carrapatos: { icon: Bug, label: "Pulgas/Carrapatos", alert: true },
};

const TimelineModal = ({ open, onOpenChange, estadiaId, petNome }: TimelineModalProps) => {
  const [registros, setRegistros] = useState<Registro[]>([]);
  const [estadia, setEstadia] = useState<EstadiaInfo | null>(null);

  useEffect(() => {
    if (open && estadiaId) {
      loadData();
    }
  }, [open, estadiaId]);

  const loadData = async () => {
    if (!estadiaId) return;
    const [regRes, estRes] = await Promise.all([
      supabase
        .from("creche_registros_diarios")
        .select("*")
        .eq("estadia_id", estadiaId)
        .order("data_registro", { ascending: true })
        .order("hora_registro", { ascending: true }),
      supabase
        .from("creche_estadias")
        .select("data_entrada, hora_entrada, tipo, observacoes_entrada, checklist_entrada, data_saida_prevista")
        .eq("id", estadiaId)
        .single(),
    ]);
    if (regRes.data) setRegistros(regRes.data as Registro[]);
    if (estRes.data) setEstadia(estRes.data as EstadiaInfo);
  };

  const hasAlerts = registros.some(r => r.brigas || r.sinais_doenca || r.pulgas_carrapatos);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Timeline - {petNome}
            {hasAlerts && <AlertTriangle className="h-4 w-4 text-destructive" />}
          </DialogTitle>
          <DialogDescription>Histórico completo da estadia.</DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-2">
          <div className="relative pl-6 space-y-0">
            {/* Vertical line */}
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-border" />

            {/* Entry event */}
            {estadia && (
              <div className="relative pb-4">
                <div className="absolute left-[-13px] top-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <LogIn className="h-3 w-3 text-primary-foreground" />
                </div>
                <div className="border rounded-md p-2.5 space-y-1 ml-2">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold">Check-in</p>
                    <Badge variant="outline" className="text-[10px]">
                      {estadia.tipo === "hotel" ? "Hotel" : "Creche"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(estadia.data_entrada + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })} às {estadia.hora_entrada?.slice(0, 5)}
                  </p>
                  {estadia.data_saida_prevista && (
                    <p className="text-[11px] text-muted-foreground">
                      Prev. saída: {format(new Date(estadia.data_saida_prevista + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  )}
                  {estadia.observacoes_entrada && (
                    <p className="text-[11px] text-muted-foreground italic">{estadia.observacoes_entrada}</p>
                  )}
                </div>
              </div>
            )}

            {/* Registros */}
            {registros.map((r) => {
              const activeIndicators = Object.entries(indicadoresMap).filter(
                ([key]) => (r as any)[key]
              );
              const isAlert = r.brigas || r.sinais_doenca || r.pulgas_carrapatos;

              return (
                <div key={r.id} className="relative pb-4">
                  <div className={`absolute left-[-13px] top-1 w-5 h-5 rounded-full flex items-center justify-center ${
                    isAlert ? "bg-destructive" : "bg-muted"
                  }`}>
                    {isAlert ? (
                      <AlertTriangle className="h-3 w-3 text-destructive-foreground" />
                    ) : (
                      <Clock className="h-3 w-3 text-muted-foreground" />
                    )}
                  </div>
                  <div className={`border rounded-md p-2.5 space-y-1 ml-2 ${
                    isAlert ? "border-destructive/40" : ""
                  }`}>
                    <p className="text-[11px] font-medium">
                      {format(new Date(r.data_registro + "T00:00:00"), "dd/MM", { locale: ptBR })} às {r.hora_registro?.slice(0, 5)}
                    </p>
                    {activeIndicators.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {activeIndicators.map(([key, config]) => {
                          const Icon = config.icon;
                          return (
                            <span
                              key={key}
                              className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                                config.alert
                                  ? "bg-destructive/10 text-destructive"
                                  : "bg-accent text-accent-foreground"
                              }`}
                            >
                              <Icon className="h-3 w-3" />
                              {config.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    {r.observacoes && (
                      <div className="flex items-start gap-1 text-[11px] text-muted-foreground">
                        <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{r.observacoes}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {registros.length === 0 && (
              <p className="text-xs text-muted-foreground ml-2 py-2">Nenhum registro ainda.</p>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default TimelineModal;
