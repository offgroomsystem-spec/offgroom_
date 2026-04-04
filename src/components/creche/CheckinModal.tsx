import { useState, useEffect, useMemo, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogAction, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { Search, X, CalendarPlus } from "lucide-react";
import { subtractBusinessDays } from "@/utils/diasUteis";

interface ServicoExtra {
  id: string;
  nome: string;
  valor: number;
}

interface Pet {
  id: string;
  nome_pet: string;
  cliente_id: string;
  porte?: string;
  raca?: string;
  cliente_nome?: string;
  cliente_whatsapp?: string;
}

const normalizePhone = (phone: string) =>
  phone.replace(/[\s\-\(\)\+]/g, "");

interface CheckinModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const CheckinModal = ({ open, onOpenChange, onSuccess }: CheckinModalProps) => {
  const { user } = useAuth();
  const [pets, setPets] = useState<Pet[]>([]);
  const [filteredPets, setFilteredPets] = useState<Pet[]>([]);
  const [searchPet, setSearchPet] = useState("");
  const [selectedPet, setSelectedPet] = useState<Pet | null>(null);
  const [tipo, setTipo] = useState<string>("creche");
  const [modeloPreco, setModeloPreco] = useState<string>("unico");
  const [modeloCobranca, setModeloCobranca] = useState<string>("hora");
  const [dataEntrada, setDataEntrada] = useState(format(new Date(), "yyyy-MM-dd"));
  const [horaEntrada, setHoraEntrada] = useState(format(new Date(), "HH:mm"));
  const [dataSaidaPrevista, setDataSaidaPrevista] = useState("");
  const [horaSaidaPrevista, setHoraSaidaPrevista] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);

  // Serviços Extras
  const [servicosCreche, setServicosCreche] = useState<any[]>([]);
  const [selectedExtras, setSelectedExtras] = useState<ServicoExtra[]>([]);
  const [searchExtras, setSearchExtras] = useState("");
  const [extrasOpen, setExtrasOpen] = useState(false);
  const extrasRef = useRef<HTMLDivElement>(null);
  const [agendarExtras, setAgendarExtras] = useState(false);
  const [empresaHorarioFim, setEmpresaHorarioFim] = useState<string | null>(null);
  const [showExtrasConfirm, setShowExtrasConfirm] = useState(false);

  useEffect(() => {
    if (!extrasOpen) return;
    const handler = (e: MouseEvent) => {
      if (extrasRef.current && !extrasRef.current.contains(e.target as Node)) {
        setExtrasOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [extrasOpen]);

  const [checklist, setChecklist] = useState({
    comeu_antes: false,
    comportamento_normal: true,
    sinais_doenca: false,
    pulgas_carrapatos: false,
    agressivo: false,
    restricao: false,
  });
  const [checklistObs, setChecklistObs] = useState("");

  useEffect(() => {
    if (!open || !user) return;
    loadPets();
    loadServicosCreche();
    loadEmpresaConfig();
  }, [open, user]);

  const loadEmpresaConfig = async () => {
    const { data } = await supabase
      .from("empresa_config")
      .select("horario_fim")
      .limit(1)
      .maybeSingle();
    if (data) setEmpresaHorarioFim(data.horario_fim);
  };

  useEffect(() => {
    if (!searchPet.trim()) {
      setFilteredPets(pets);
    } else {
      const s = searchPet.toLowerCase();
      const sNorm = normalizePhone(s);
      setFilteredPets(
        pets.filter(
          (p) =>
            p.nome_pet.toLowerCase().includes(s) ||
            (p.cliente_nome && p.cliente_nome.toLowerCase().includes(s)) ||
            (p.cliente_whatsapp && normalizePhone(p.cliente_whatsapp).includes(sNorm))
        )
      );
    }
  }, [searchPet, pets]);

  const loadPets = async () => {
    const { data } = await supabase
      .from("pets")
      .select("id, nome_pet, cliente_id, porte, raca")
      .order("nome_pet");

    if (data) {
      const clienteIds = [...new Set(data.map((p) => p.cliente_id))];
      const { data: clientes } = await supabase
        .from("clientes")
        .select("id, nome_cliente, whatsapp")
        .in("id", clienteIds);

      const clienteMap = new Map(
        clientes?.map((c) => [c.id, { nome: c.nome_cliente, whatsapp: c.whatsapp }]) || []
      );
      setPets(
        data.map((p) => ({
          ...p,
          cliente_nome: clienteMap.get(p.cliente_id)?.nome || "",
          cliente_whatsapp: clienteMap.get(p.cliente_id)?.whatsapp || "",
        }))
      );
    }
  };

  const loadServicosCreche = async () => {
    const { data } = await supabase
      .from("servicos")
      .select("id, nome, valor, porte")
      .order("nome");
    if (data) setServicosCreche(data);
  };

  const normalizePorte = (p?: string) => (p || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  const availableExtras = useMemo(() => {
    if (!selectedPet) return [];
    const petPorte = normalizePorte(selectedPet.porte);
    const searchNorm = searchExtras.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    return servicosCreche
      .filter((s) => {
        if (s.nome?.toLowerCase().startsWith("pacote")) return false;
        if ((s.valor || 0) <= 0) return false;

        // Filter by porte compatibility
        const sPorte = normalizePorte(s.porte);
        if (sPorte && sPorte !== petPorte && sPorte !== "todos") return false;

        // Search filter
        if (searchNorm) {
          const nomeNorm = (s.nome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          if (!nomeNorm.includes(searchNorm)) return false;
        }

        return true;
      })
      .map((s) => ({ id: s.id, nome: s.nome, valor: s.valor }));
  }, [servicosCreche, selectedPet, searchExtras]);

  const toggleExtra = (extra: ServicoExtra) => {
    setSelectedExtras((prev) => {
      const exists = prev.find((e) => e.id === extra.id);
      if (exists) return prev.filter((e) => e.id !== extra.id);
      return [...prev, extra];
    });
  };

  const handleSave = async () => {
    if (!selectedPet || !user) {
      toast.error("Selecione um pet.");
      return;
    }
    const exigeSaida = tipo === "hotel" || selectedExtras.length > 0;
    if (exigeSaida && !dataSaidaPrevista) {
      toast.error("Informe a previsão de saída.");
      return;
    }
    if (exigeSaida && !horaSaidaPrevista) {
      toast.error("Informe a hora de saída prevista.");
      return;
    }

    // Show confirmation if extras selected but toggle is off
    if (selectedExtras.length > 0 && !agendarExtras) {
      setShowExtrasConfirm(true);
      return;
    }

    await executeSave();
  };

  const executeSave = async () => {
    setSaving(true);
    try {
      const insertData: any = {
        user_id: user.id,
        pet_id: selectedPet.id,
        cliente_id: selectedPet.cliente_id,
        tipo,
        data_entrada: dataEntrada,
        hora_entrada: horaEntrada,
        data_saida_prevista: dataSaidaPrevista || null,
        hora_saida_prevista: horaSaidaPrevista || null,
        observacoes_entrada: observacoes || null,
        checklist_entrada: { ...checklist, observacoes_adicionais: checklistObs },
        status: "ativo",
        modelo_preco: modeloPreco,
        modelo_cobranca: modeloCobranca,
        servicos_extras: selectedExtras.map((e) => ({ id: e.id, nome: e.nome, valor: e.valor })),
      };

      const { error } = await supabase.from("creche_estadias").insert(insertData);

      if (error) throw error;

      // Create agendamento for extras if toggle is on
      console.log("Check-in save - agendarExtras:", agendarExtras, "selectedExtras:", selectedExtras.length, "dataSaidaPrevista:", dataSaidaPrevista);
      if (agendarExtras && selectedExtras.length > 0 && dataSaidaPrevista) {
        console.log("Creating agendamento for extras...");
        await criarAgendamentoExtras();
      }

      toast.success("Check-in realizado com sucesso!");
      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error("Erro ao fazer check-in: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const criarAgendamentoExtras = async () => {
    if (!selectedPet || !user) {
      console.error("criarAgendamentoExtras: selectedPet or user is null");
      return;
    }

    // Calculate date and time for the agendamento
    let agendaData = dataSaidaPrevista;
    let agendaHora = "09:00";
    const tempoServico = "02:00";

    const checkinECheckoutMesmoDia = dataEntrada === dataSaidaPrevista;

    if (checkinECheckoutMesmoDia && horaSaidaPrevista) {
      // Regra 3: Check-in e Check-out no mesmo dia → 2h antes da hora de saída prevista
      const [saidaH, saidaM] = horaSaidaPrevista.split(":").map(Number);
      const inicioMinutos = Math.max(saidaH * 60 + saidaM - 120, 0);
      const h = Math.floor(inicioMinutos / 60);
      const m = inicioMinutos % 60;
      agendaHora = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    } else if (empresaHorarioFim && horaSaidaPrevista) {
      const [fimH, fimM] = empresaHorarioFim.split(":").map(Number);
      const [saidaH, saidaM] = horaSaidaPrevista.split(":").map(Number);
      const fimMinutos = fimH * 60 + fimM;
      const saidaMinutos = saidaH * 60 + saidaM;
      // Regra 1: mais de 1h40min antes do horário fim → dia útil anterior, 2h antes do fim
      const limiteMinutos = fimMinutos - 100; // 1h40min = 100 minutos

      if (saidaMinutos <= limiteMinutos) {
        const dataSaida = new Date(dataSaidaPrevista + "T12:00:00");
        const diaAnterior = subtractBusinessDays(dataSaida, 1);
        agendaData = format(diaAnterior, "yyyy-MM-dd");

        // 2h antes do horário de encerramento
        const novaHoraMinutos = fimMinutos - 120;
        const h = Math.floor(Math.max(novaHoraMinutos, 0) / 60);
        const m = Math.max(novaHoraMinutos, 0) % 60;
        agendaHora = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      } else {
        // Regra 2: dentro do mesmo dia → 2h antes da hora de saída prevista
        const inicioMinutos = Math.max(saidaMinutos - 120, 0);
        const h = Math.floor(inicioMinutos / 60);
        const m = inicioMinutos % 60;
        agendaHora = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
    } else if (horaSaidaPrevista) {
      const [saidaH, saidaM] = horaSaidaPrevista.split(":").map(Number);
      const inicioMinutos = Math.max(saidaH * 60 + saidaM - 120, 0);
      const h = Math.floor(inicioMinutos / 60);
      const m = inicioMinutos % 60;
      agendaHora = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    }

    // Calculate horario_termino (2 hours after start)
    const [hh, mm] = agendaHora.split(":").map(Number);
    const terminoMin = Math.min(hh * 60 + mm + 120, 23 * 60 + 59);
    const terminoH = Math.floor(terminoMin / 60);
    const terminoM = terminoMin % 60;
    const horarioTermino = `${String(terminoH).padStart(2, "0")}:${String(terminoM).padStart(2, "0")}`;

    // Build servicos list and description
    const servicosNomes = selectedExtras.map((e) => e.nome).join(", ");
    const servicosJson = selectedExtras.map((e) => ({
      nome: e.nome,
      valor: e.valor,
    }));

    const agendamentoData = {
      user_id: user!.id,
      cliente: selectedPet.cliente_nome || "",
      cliente_id: selectedPet.cliente_id,
      pet: selectedPet.nome_pet,
      raca: selectedPet.raca || "",
      whatsapp: selectedPet.cliente_whatsapp || "",
      servico: servicosNomes,
      servicos: servicosJson,
      tempo_servico: tempoServico,
      groomer: "",
      taxi_dog: "Não",
      data: agendaData,
      data_venda: format(new Date(), "yyyy-MM-dd"),
      horario: agendaHora,
      horario_termino: horarioTermino,
      status: "confirmado",
      numero_servico_pacote: "CHECKIN_EXTRA",
    };

    console.log("Inserting agendamento:", JSON.stringify(agendamentoData));
    const { error } = await supabase.from("agendamentos").insert(agendamentoData);
    if (error) {
      console.error("Erro ao criar agendamento de extras:", error);
      toast.error("Check-in ok, mas falha ao agendar serviços extras.");
    } else {
      console.log("Agendamento de extras criado com sucesso!");
      toast.success("Serviços extras agendados com sucesso!");
    }
  };

  const resetForm = () => {
    setSelectedPet(null);
    setSearchPet("");
    setTipo("creche");
    setModeloPreco("unico");
    setModeloCobranca("hora");
    setDataEntrada(format(new Date(), "yyyy-MM-dd"));
    setHoraEntrada(format(new Date(), "HH:mm"));
    setDataSaidaPrevista("");
    setHoraSaidaPrevista("");
    setObservacoes("");
    setSelectedExtras([]);
    setSearchExtras("");
    setChecklist({
      comeu_antes: false,
      comportamento_normal: true,
      sinais_doenca: false,
      pulgas_carrapatos: false,
      agressivo: false,
      restricao: false,
    });
    setChecklistObs("");
    setAgendarExtras(false);
  };

  const checklistItems = [
    { key: "comeu_antes", label: "Comeu antes?" },
    { key: "comportamento_normal", label: "Comportamento normal?" },
    { key: "sinais_doenca", label: "Sinais de doença?" },
    { key: "pulgas_carrapatos", label: "Pulgas/Carrapatos?" },
    { key: "agressivo", label: "Agressivo?" },
    { key: "restricao", label: "Restrição?" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); onOpenChange(v); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-1">
          <DialogTitle className="text-base">Check-in</DialogTitle>
          <DialogDescription className="text-xs">Registrar entrada de pet na creche ou hotel.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5">
          {/* Pet search */}
          <div>
            <Label className="text-[11px] text-muted-foreground">Buscar Pet / Tutor</Label>
            <Input
              placeholder="Nome do pet, tutor ou WhatsApp..."
              value={searchPet}
              onChange={(e) => {
                setSearchPet(e.target.value);
                setSelectedPet(null);
              }}
              className="h-7 text-xs"
            />
            {searchPet && !selectedPet && filteredPets.length === 0 && (
              <p className="text-[10px] text-muted-foreground mt-0.5">Nenhum resultado encontrado</p>
            )}
            {searchPet && !selectedPet && filteredPets.length > 0 && (
              <div className="border rounded mt-0.5 max-h-28 overflow-y-auto bg-background">
                {filteredPets.slice(0, 10).map((p) => (
                  <div
                    key={p.id}
                    className="px-2 py-1 hover:bg-accent cursor-pointer text-xs"
                    onClick={() => {
                      setSelectedPet(p);
                      setSearchPet(`${p.nome_pet} - ${p.cliente_nome}`);
                    }}
                  >
                    <span className="font-medium">{p.nome_pet}</span>
                    <span className="text-muted-foreground ml-1.5">({p.cliente_nome})</span>
                    {p.cliente_whatsapp && (
                      <span className="text-muted-foreground ml-1 text-[10px]">• {p.cliente_whatsapp}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedPet && (
            <p className="text-[11px] text-muted-foreground -mt-1">
              Tutor: <strong>{selectedPet.cliente_nome}</strong>
              {selectedPet.porte && <span className="ml-2">Porte: <strong className="capitalize">{selectedPet.porte}</strong></span>}
            </p>
          )}

          {/* Tipo + Pricing in a row */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Tipo de Estadia</Label>
              <Select value={tipo} onValueChange={(v) => { setTipo(v); }}>
                <SelectTrigger className="h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="creche">Creche (Day Care)</SelectItem>
                  <SelectItem value="hotel">Hotel (Hospedagem)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-[11px] text-muted-foreground">Tipo de Cobrança</Label>
              <ToggleGroup
                type="single"
                value={modeloPreco}
                onValueChange={(v) => { if (v) setModeloPreco(v); }}
                className="justify-start mt-0.5"
              >
                <ToggleGroupItem value="unico" className="h-7 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  Único
                </ToggleGroupItem>
                <ToggleGroupItem value="porte" className="h-7 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                  Por Porte
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          </div>

          {/* Modelo de Cobrança - visible only for Creche */}
          {tipo === "creche" && (
          <div>
            <Label className="text-[11px] text-muted-foreground">Modelo de Cobrança</Label>
            <ToggleGroup
              type="single"
              value={modeloCobranca}
              onValueChange={(v) => { if (v) setModeloCobranca(v); }}
              className="justify-start mt-0.5"
            >
              <ToggleGroupItem value="hora" className="h-7 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Por Hora
              </ToggleGroupItem>
              <ToggleGroupItem value="dia" className="h-7 px-3 text-xs data-[state=on]:bg-primary data-[state=on]:text-primary-foreground">
                Por Dia
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          )}

          {/* Serviços Extras */}
          {selectedPet && (
            <div className="relative" ref={extrasRef}>
              <Label className="text-[11px] font-semibold">Serviços Extras</Label>
              {/* Selected extras badges */}
              {selectedExtras.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1 mb-1">
                  {selectedExtras.map((extra) => (
                    <Badge
                      key={extra.id}
                      variant="secondary"
                      className="text-[10px] gap-1 cursor-pointer hover:bg-destructive/20"
                      onClick={() => toggleExtra(extra)}
                    >
                      {extra.nome} — R$ {extra.valor.toFixed(2)}
                      <X className="h-2.5 w-2.5" />
                    </Badge>
                  ))}
                </div>
              )}
              {/* Search input - click to open dropdown */}
              <div className="relative mt-0.5">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input
                  placeholder="Buscar serviço extra..."
                  value={searchExtras}
                  onChange={(e) => setSearchExtras(e.target.value)}
                  onFocus={() => setExtrasOpen(true)}
                  className="h-7 text-xs pl-7"
                />
              </div>
              {/* Dropdown list */}
              {extrasOpen && (
                <div className="absolute z-50 left-0 right-0 border rounded mt-0.5 max-h-36 overflow-y-auto bg-popover shadow-md">
                  {availableExtras.length === 0 ? (
                    <p className="text-[10px] text-muted-foreground text-center py-2">
                      {servicosCreche.length === 0 ? "Nenhum serviço cadastrado" : "Nenhum serviço compatível"}
                    </p>
                  ) : (
                    availableExtras.map((extra) => {
                      const isSelected = selectedExtras.some((e) => e.id === extra.id);
                      return (
                        <div
                          key={extra.id}
                          className={`flex items-center justify-between px-2 py-1.5 cursor-pointer text-xs hover:bg-accent ${isSelected ? "bg-primary/10 font-medium" : ""}`}
                          onClick={() => {
                            toggleExtra(extra);
                            setExtrasOpen(false);
                            setSearchExtras("");
                          }}
                        >
                          <div className="flex items-center gap-1.5">
                            <Checkbox checked={isSelected} className="h-3 w-3" tabIndex={-1} />
                            <span>{extra.nome}</span>
                          </div>
                          <span className="text-muted-foreground text-[10px]">R$ {extra.valor.toFixed(2)}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          )}

          {/* Datas */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Data Entrada</Label>
              <Input type="date" value={dataEntrada} onChange={(e) => setDataEntrada(e.target.value)} className="h-7 text-xs" />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Hora Entrada</Label>
              <Input type="time" value={horaEntrada} onChange={(e) => setHoraEntrada(e.target.value)} className="h-7 text-xs" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] text-muted-foreground">Previsão Saída {(tipo === "hotel" || selectedExtras.length > 0) && "*"}</Label>
              <Input type="date" value={dataSaidaPrevista} onChange={(e) => setDataSaidaPrevista(e.target.value)} className="h-7 text-xs" />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">Hora Saída Prevista {(tipo === "hotel" || selectedExtras.length > 0) && "*"}</Label>
              <Input type="time" value={horaSaidaPrevista} onChange={(e) => setHoraSaidaPrevista(e.target.value)} className="h-7 text-xs" />
            </div>
          </div>

          {/* Checklist */}
          <div>
            <Label className="text-[11px] font-semibold">Checklist Inicial</Label>
            <div className="grid grid-cols-3 gap-1 mt-0.5">
              {checklistItems.map((item) => (
                <div key={item.key} className="flex items-center gap-1.5">
                  <Checkbox
                    className="h-3.5 w-3.5"
                    checked={(checklist as any)[item.key]}
                    onCheckedChange={(v) => setChecklist((prev) => ({ ...prev, [item.key]: !!v }))}
                  />
                  <span className="text-[10px] leading-tight">{item.label}</span>
                </div>
              ))}
            </div>
            <Textarea
              placeholder="Observações do checklist..."
              value={checklistObs}
              onChange={(e) => setChecklistObs(e.target.value)}
              className="mt-1 min-h-[40px] text-xs"
            />
          </div>

          {/* Obs */}
          <div>
            <Label className="text-[11px] text-muted-foreground">Observações Gerais</Label>
            <Textarea
              placeholder="Observações sobre a entrada..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="min-h-[40px] text-xs"
            />
          </div>

          {/* Agendar serviços extras toggle */}
          {selectedExtras.length > 0 && (
            <div className="flex items-center justify-between rounded-md border-2 border-destructive px-3 py-2">
              <div className="flex items-center gap-2">
                <CalendarPlus className="h-4 w-4 text-destructive" />
                <Label className="text-xs font-medium cursor-pointer" htmlFor="agendar-extras">
                  Agendar serviços extras
                </Label>
              </div>
              <Switch
                id="agendar-extras"
                checked={agendarExtras}
                onCheckedChange={setAgendarExtras}
              />
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full h-8 text-sm">
            {saving ? "Salvando..." : "Confirmar Check-in"}
          </Button>
        </div>

        {/* Confirmation dialog for extras not scheduled */}
        <AlertDialog open={showExtrasConfirm} onOpenChange={setShowExtrasConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Serviços extras não agendados</AlertDialogTitle>
              <AlertDialogDescription>
                Deseja prosseguir com o check-in sem confirmar o agendamento de serviços extras?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { 
                setShowExtrasConfirm(false); 
                setAgendarExtras(true); 
              }}>
                Não
              </AlertDialogCancel>
              <AlertDialogAction onClick={async () => { 
                setShowExtrasConfirm(false); 
                await executeSave(); 
              }}>
                Sim, prosseguir sem agendar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
};

export default CheckinModal;
