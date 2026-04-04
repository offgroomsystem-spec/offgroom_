import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ClipboardList, LogOut, Eye, MessageSquarePlus,
  Droplets, UtensilsCrossed, Dog, Smile, Frown,
  Bug, Stethoscope, CircleCheck, AlertTriangle, Clock, MessageCircle
} from "lucide-react";
import { gerarHistoricoDiario, gerarHistoricoCompleto } from "@/utils/crecheHistoryMessage";
import { normalizeBrazilPhone, buildWhatsAppUrl, getInvalidPhoneMessage } from "@/utils/phone";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect, useRef } from "react";

interface Registro {
  comeu: boolean;
  bebeu_agua: boolean;
  brincou: boolean;
  interagiu_bem: boolean;
  brigas: boolean;
  fez_necessidades: boolean;
  sinais_doenca: boolean;
  pulgas_carrapatos: boolean;
}

interface Estadia {
  id: string;
  tipo: string;
  data_entrada: string;
  hora_entrada: string;
  data_saida_prevista: string | null;
  pet_nome: string;
  cliente_nome: string;
  observacoes_entrada: string | null;
  ultimo_registro?: Registro | null;
  checklist_entrada?: any;
  pet_sexo?: string;
  cliente_whatsapp?: string;
}

interface EstadiasAtivasProps {
  estadias: Estadia[];
  onRegistro: (estadiaId: string, petNome: string) => void;
  onCheckoutDireto: (estadiaId: string, clienteNome: string) => void;
  onVerDetalhes: (estadiaId: string, petNome: string) => void;
  onAdicionarObs: (estadiaId: string, petNome: string) => void;
  onRefresh?: () => void;
}

export const indicadores = [
  { key: "comeu", icon: UtensilsCrossed, label: "Comeu", color: "text-green-600 dark:text-green-400" },
  { key: "bebeu_agua", icon: Droplets, label: "Bebeu água", color: "text-blue-600 dark:text-blue-400" },
  { key: "brincou", icon: Dog, label: "Brincou", color: "text-yellow-600 dark:text-yellow-400" },
  { key: "interagiu_bem", icon: Smile, label: "Boa interação", color: "text-purple-600 dark:text-purple-400" },
  { key: "brigas", icon: Frown, label: "Brigas", color: "text-red-600 dark:text-red-400" },
  { key: "fez_necessidades", icon: CircleCheck, label: "Necessidades", color: "text-amber-600 dark:text-amber-400" },
  { key: "sinais_doenca", icon: Stethoscope, label: "Sinais doença", color: "text-red-600 dark:text-red-400" },
  { key: "pulgas_carrapatos", icon: Bug, label: "Pulgas/Carrapatos", color: "text-orange-600 dark:text-orange-400" },
];

const getAlerts = (e: Estadia) => {
  const alerts: { text: string; severity: "warning" | "danger" }[] = [];
  const checklist = e.checklist_entrada || {};
  if (checklist.agressivo) alerts.push({ text: "Agressivo", severity: "danger" });
  if (checklist.sinais_doenca) alerts.push({ text: "Sinais de doença (entrada)", severity: "danger" });
  if (e.ultimo_registro?.sinais_doenca) alerts.push({ text: "Sinais de doença", severity: "danger" });
  if (e.ultimo_registro?.brigas) alerts.push({ text: "Envolvido em briga", severity: "warning" });
  if (e.ultimo_registro?.pulgas_carrapatos) alerts.push({ text: "Pulgas/Carrapatos", severity: "warning" });

  if (e.data_saida_prevista) {
    const hoje = new Date();
    const saida = new Date(e.data_saida_prevista + "T23:59:59");
    if (hoje > saida) alerts.push({ text: "Check-out atrasado", severity: "danger" });
  }

  return alerts;
};

const getStatus = (e: Estadia) => {
  if (e.data_saida_prevista) {
    const hoje = format(new Date(), "yyyy-MM-dd");
    if (e.data_saida_prevista === hoje) return { label: "Saída Hoje", variant: "default" as const };
    if (e.data_saida_prevista < hoje) return { label: "Atrasado", variant: "destructive" as const };
  }
  const checklist = e.checklist_entrada || {};
  if (checklist.sinais_doenca || checklist.agressivo || e.ultimo_registro?.sinais_doenca) {
    return { label: "Em Observação", variant: "destructive" as const };
  }
  return { label: "Ativo", variant: "secondary" as const };
};

const EstadiasAtivas = ({ estadias, onRegistro, onCheckoutDireto, onVerDetalhes, onAdicionarObs, onRefresh }: EstadiasAtivasProps) => {
  const { ownerId } = useAuth();
  const [togglingKeys, setTogglingKeys] = useState<Set<string>>(new Set());
  const [optimisticOverrides, setOptimisticOverrides] = useState<Record<string, Record<string, boolean>>>({});
  const [sendingHistory, setSendingHistory] = useState<Set<string>>(new Set());
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [whatsappInstanceName, setWhatsappInstanceName] = useState("");
  const lastSendRef = useRef<number>(0);

  // Load WhatsApp instance status
  useEffect(() => {
    if (!ownerId) return;
    (async () => {
      const { data } = await supabase
        .from("whatsapp_instances")
        .select("instance_name, status")
        .eq("user_id", ownerId)
        .maybeSingle();
      if (data?.instance_name) {
        setWhatsappInstanceName(data.instance_name);
        try {
          const res = await supabase.functions.invoke("evolution-api", {
            body: { action: "check-status", instanceName: data.instance_name },
          });
          setWhatsappConnected(res.data?.instance?.state === "open");
        } catch {
          setWhatsappConnected(false);
        }
      }
    })();
  }, [ownerId]);

  const handleSendHistory = async (estadia: Estadia, tipo: "diario" | "completo") => {
    const key = `${estadia.id}-${tipo}`;
    if (sendingHistory.has(key)) return;

    // Validate phone
    const normalizedPhone = normalizeBrazilPhone(estadia.cliente_whatsapp);
    if (!normalizedPhone) {
      toast.error(getInvalidPhoneMessage(estadia.cliente_whatsapp));
      return;
    }

    setSendingHistory(prev => new Set(prev).add(key));
    try {
      const msg = tipo === "diario"
        ? await gerarHistoricoDiario(estadia.id, estadia.pet_nome, estadia.pet_sexo || null, estadia.cliente_nome)
        : await gerarHistoricoCompleto(estadia.id, estadia.pet_nome, estadia.pet_sexo || null, estadia.cliente_nome, estadia.checklist_entrada, estadia.data_entrada, estadia.hora_entrada);

      const tipoLabel = tipo === "diario" ? "diário" : "completo";

      if (whatsappConnected && whatsappInstanceName) {
        // Enforce 10s spacing between sends
        const now = Date.now();
        const elapsed = now - lastSendRef.current;
        if (elapsed < 10000) {
          await new Promise(resolve => setTimeout(resolve, 10000 - elapsed));
        }
        lastSendRef.current = Date.now();

        const res = await supabase.functions.invoke("evolution-api", {
          body: { action: "send-message", instanceName: whatsappInstanceName, number: normalizedPhone, text: msg },
        });

        if (res.error) {
          throw new Error(res.error.message || "Erro na API");
        }

        if (res.data?.error) {
          throw new Error(res.data.error);
        }

        toast.success(`Histórico ${tipoLabel} enviado automaticamente! ✅`);
      } else {
        // Fallback: wa.me link
        toast.info("WhatsApp não conectado. Abrindo link manual...");
        const url = buildWhatsAppUrl(estadia.cliente_whatsapp, msg);
        if (url) window.open(url, "_blank");
      }
    } catch (err: any) {
      console.error("Erro ao enviar histórico:", err);
      toast.error(err?.message || "Erro ao enviar histórico.");
      // Fallback on error
      try {
        const msg = tipo === "diario"
          ? await gerarHistoricoDiario(estadia.id, estadia.pet_nome, estadia.pet_sexo || null, estadia.cliente_nome)
          : await gerarHistoricoCompleto(estadia.id, estadia.pet_nome, estadia.pet_sexo || null, estadia.cliente_nome, estadia.checklist_entrada, estadia.data_entrada, estadia.hora_entrada);
        const url = buildWhatsAppUrl(estadia.cliente_whatsapp, msg);
        if (url) window.open(url, "_blank");
      } catch { /* ignore fallback errors */ }
    } finally {
      setSendingHistory(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  // Smart override clearing: remove overrides that match real data (confirmed by DB)
  useEffect(() => {
    setOptimisticOverrides(prev => {
      const next: Record<string, Record<string, boolean>> = {};
      let changed = false;
      for (const estadiaId of Object.keys(prev)) {
        const estadia = estadias.find(e => e.id === estadiaId);
        const reg = estadia?.ultimo_registro;
        const overrides = prev[estadiaId];
        const remaining: Record<string, boolean> = {};
        for (const key of Object.keys(overrides)) {
          const realValue = reg ? !!(reg as any)[key] : false;
          if (overrides[key] !== realValue) {
            // Override still differs from real data — keep it
            remaining[key] = overrides[key];
          } else {
            changed = true;
          }
        }
        if (Object.keys(remaining).length > 0) {
          next[estadiaId] = remaining;
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [estadias]);

  const handleQuickToggle = async (estadiaId: string, key: string, currentValue: boolean) => {
    if (!ownerId) return;
    const toggleKey = `${estadiaId}-${key}`;
    if (togglingKeys.has(toggleKey)) return;
    
    const newValue = !currentValue;

    // Optimistic UI update immediately
    setOptimisticOverrides(prev => ({
      ...prev,
      [estadiaId]: {
        ...(prev[estadiaId] || {}),
        [key]: newValue,
      },
    }));

    setTogglingKeys(prev => new Set(prev).add(toggleKey));
    
    try {
      const hoje = format(new Date(), "yyyy-MM-dd");
      
      const { data: existing } = await supabase
        .from("creche_registros_diarios")
        .select("id, comeu, bebeu_agua, brincou, interagiu_bem, brigas, fez_necessidades, sinais_doenca, pulgas_carrapatos")
        .eq("estadia_id", estadiaId)
        .eq("data_registro", hoje)
        .order("hora_registro", { ascending: false })
        .limit(1);

      if (existing && existing.length > 0) {
        const { error } = await supabase
          .from("creche_registros_diarios")
          .update({ [key]: newValue })
          .eq("id", existing[0].id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("creche_registros_diarios")
          .insert({
            estadia_id: estadiaId,
            user_id: ownerId,
            [key]: newValue,
          });
        if (error) throw error;
      }
      
      toast.success(`${indicadores.find(i => i.key === key)?.label} atualizado!`);
      onRefresh?.();
    } catch {
      // Revert optimistic update on error
      setOptimisticOverrides(prev => {
        const copy = { ...prev };
        if (copy[estadiaId]) {
          delete copy[estadiaId][key];
          if (Object.keys(copy[estadiaId]).length === 0) delete copy[estadiaId];
        }
        return copy;
      });
      toast.error("Erro ao atualizar indicador.");
    } finally {
      setTogglingKeys(prev => {
        const next = new Set(prev);
        next.delete(toggleKey);
        return next;
      });
    }
  };

  if (estadias.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground text-sm">
          Nenhum pet ativo no momento.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <CardTitle className="text-sm">Pets Ativos ({estadias.length})</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-0">
        <div className="space-y-2">
          {estadias.map((e) => {
            const alerts = getAlerts(e);
            const status = getStatus(e);
            const reg = e.ultimo_registro;

            return (
              <div
                key={e.id}
                className={`border rounded-lg p-3 space-y-2 ${
                  alerts.some(a => a.severity === "danger")
                    ? "border-destructive/50 bg-destructive/5"
                    : ""
                }`}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{e.pet_nome}</span>
                    <Badge variant={e.tipo === "hotel" ? "secondary" : "outline"} className="text-[10px]">
                      {e.tipo === "hotel" ? "Hotel" : "Creche"}
                    </Badge>
                    <Badge variant={status.variant} className="text-[10px]">
                      {status.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleSendHistory(e, "diario")}
                            disabled={sendingHistory.has(`${e.id}-diario`)}
                            className="p-1 rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">Enviar Histórico Diário</TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => handleSendHistory(e, "completo")}
                            disabled={sendingHistory.has(`${e.id}-completo`)}
                            className="p-1 rounded-md text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
                          >
                            <MessageCircle className="h-4 w-4 fill-green-600" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">Enviar Histórico Completo</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </div>

                {/* Info */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>Tutor: {e.cliente_nome}</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(new Date(e.data_entrada + "T00:00:00"), "dd/MM", { locale: ptBR })} {e.hora_entrada?.slice(0, 5)}
                  </span>
                  {e.data_saida_prevista && (
                    <span>Saída prev.: {format(new Date(e.data_saida_prevista + "T00:00:00"), "dd/MM", { locale: ptBR })}</span>
                  )}
                </div>

                {/* Alerts */}
                {alerts.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {alerts.map((a, i) => (
                      <span
                        key={i}
                        className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded ${
                          a.severity === "danger"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                        }`}
                      >
                        <AlertTriangle className="h-3 w-3" />
                        {a.text}
                      </span>
                    ))}
                  </div>
                )}

                {/* Quick Indicators */}
                <TooltipProvider delayDuration={200}>
                  <div className="flex flex-wrap gap-1">
                    {indicadores.map((ind) => {
                      const overrides = optimisticOverrides[e.id];
                      const active = overrides && ind.key in overrides
                        ? overrides[ind.key]
                        : reg ? (reg as any)[ind.key] : false;
                      const Icon = ind.icon;
                      const isToggling = togglingKeys.has(`${e.id}-${ind.key}`);
                      return (
                        <Tooltip key={ind.key}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleQuickToggle(e.id, ind.key, active)}
                              disabled={isToggling}
                              className={`p-1.5 rounded-md border transition-colors ${
                                active
                                  ? `${ind.color} bg-accent border-accent`
                                  : "text-muted-foreground/40 border-transparent hover:border-border hover:text-muted-foreground"
                              } ${isToggling ? "opacity-50" : ""}`}
                            >
                              <Icon className="h-3.5 w-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">
                            {ind.label}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </TooltipProvider>

                {/* Actions */}
                <div className="flex gap-1.5 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs flex-1"
                    onClick={() => onRegistro(e.id, e.pet_nome)}
                  >
                    <ClipboardList className="h-3 w-3 mr-1" />
                    Registro
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs flex-1"
                    onClick={() => onAdicionarObs(e.id, e.pet_nome)}
                  >
                    <MessageSquarePlus className="h-3 w-3 mr-1" />
                    Obs
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs flex-1"
                    onClick={() => onVerDetalhes(e.id, e.pet_nome)}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Detalhes
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => onCheckoutDireto(e.id, e.cliente_nome)}
                  >
                    <LogOut className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default EstadiasAtivas;
