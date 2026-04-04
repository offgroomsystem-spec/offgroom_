import { useState, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { LogIn, LogOut, BarChart3 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import CrecheKPICards from "@/components/creche/CrecheKPICards";
import CrecheFilters from "@/components/creche/CrecheFilters";
import CheckinModal from "@/components/creche/CheckinModal";
import CheckoutModal from "@/components/creche/CheckoutModal";
import EstadiasAtivas from "@/components/creche/EstadiasAtivas";
import RegistroDiarioModal from "@/components/creche/RegistroDiarioModal";
import TimelineModal from "@/components/creche/TimelineModal";
import ObservacaoModal from "@/components/creche/ObservacaoModal";
import CrecheRelatorios from "@/components/creche/CrecheRelatorios";

interface EstadiaComNomes {
  id: string;
  tipo: string;
  data_entrada: string;
  hora_entrada: string;
  data_saida_prevista: string | null;
  pet_nome: string;
  cliente_nome: string;
  observacoes_entrada: string | null;
  checklist_entrada?: any;
  ultimo_registro?: any;
  modelo_cobranca?: string | null;
  modelo_preco?: string;
  pet_porte?: string;
  pet_id?: string;
  cliente_id?: string;
  pet_sexo?: string;
  cliente_whatsapp?: string;
  servicos_extras?: any[];
}

const Creche = () => {
  const { user, ownerId } = useAuth();
  const [estadiasAtivas, setEstadiasAtivas] = useState<EstadiaComNomes[]>([]);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [registroOpen, setRegistroOpen] = useState(false);
  const [registroEstadiaId, setRegistroEstadiaId] = useState<string | null>(null);
  const [registroPetNome, setRegistroPetNome] = useState("");
  const [timelineOpen, setTimelineOpen] = useState(false);
  const [timelineEstadiaId, setTimelineEstadiaId] = useState<string | null>(null);
  const [timelinePetNome, setTimelinePetNome] = useState("");
  const [obsOpen, setObsOpen] = useState(false);
  const [obsEstadiaId, setObsEstadiaId] = useState<string | null>(null);
  const [obsPetNome, setObsPetNome] = useState("");

  // Filters
  const [search, setSearch] = useState("");
  const [tipoFilter, setTipoFilter] = useState("todos");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [sortBy, setSortBy] = useState("entrada");

  const hoje = format(new Date(), "yyyy-MM-dd");

  const loadEstadias = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("creche_estadias")
      .select("id, tipo, data_entrada, hora_entrada, data_saida_prevista, pet_id, cliente_id, observacoes_entrada, checklist_entrada, modelo_cobranca, modelo_preco, servicos_extras")
      .eq("status", "ativo")
      .order("data_entrada", { ascending: false });

    if (!data || data.length === 0) {
      setEstadiasAtivas([]);
      return;
    }

    const petIds = [...new Set(data.map((d) => d.pet_id))];
    const clienteIds = [...new Set(data.map((d) => d.cliente_id))];
    const estadiaIds = data.map((d) => d.id);

    const [petsRes, clientesRes, registrosRes] = await Promise.all([
      supabase.from("pets").select("id, nome_pet, porte, sexo").in("id", petIds),
      supabase.from("clientes").select("id, nome_cliente, whatsapp").in("id", clienteIds),
      supabase
        .from("creche_registros_diarios")
        .select("estadia_id, comeu, bebeu_agua, brincou, interagiu_bem, brigas, fez_necessidades, sinais_doenca, pulgas_carrapatos, data_registro, hora_registro")
        .in("estadia_id", estadiaIds)
        .order("data_registro", { ascending: false })
        .order("hora_registro", { ascending: false }),
    ]);

    const petMap = new Map(petsRes.data?.map((p) => [p.id, { nome: p.nome_pet, porte: p.porte, sexo: p.sexo }]) || []);
    const clienteMap = new Map(clientesRes.data?.map((c) => [c.id, { nome: c.nome_cliente, whatsapp: c.whatsapp }]) || []);

    // Get latest registro per estadia
    const ultimoRegistroMap = new Map<string, any>();
    registrosRes.data?.forEach((r) => {
      if (!ultimoRegistroMap.has(r.estadia_id)) {
        ultimoRegistroMap.set(r.estadia_id, r);
      }
    });

    setEstadiasAtivas(
      data.map((d) => ({
        id: d.id,
        tipo: d.tipo,
        data_entrada: d.data_entrada,
        hora_entrada: d.hora_entrada,
        data_saida_prevista: d.data_saida_prevista,
        pet_nome: petMap.get(d.pet_id)?.nome || "Pet",
        cliente_nome: clienteMap.get(d.cliente_id)?.nome || "Cliente",
        observacoes_entrada: d.observacoes_entrada,
        checklist_entrada: d.checklist_entrada,
        ultimo_registro: ultimoRegistroMap.get(d.id) || null,
        modelo_cobranca: d.modelo_cobranca,
        modelo_preco: d.modelo_preco,
        pet_porte: petMap.get(d.pet_id)?.porte || "",
        pet_id: d.pet_id,
        cliente_id: d.cliente_id,
        pet_sexo: petMap.get(d.pet_id)?.sexo || "",
        cliente_whatsapp: clienteMap.get(d.cliente_id)?.whatsapp || "",
        servicos_extras: Array.isArray((d as any).servicos_extras) ? (d as any).servicos_extras : [],
      }))
    );
  }, [user]);

  useEffect(() => {
    loadEstadias();
  }, [loadEstadias]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("creche-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "creche_estadias" }, () => loadEstadias())
      .on("postgres_changes", { event: "*", schema: "public", table: "creche_registros_diarios" }, () => loadEstadias())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadEstadias]);

  // Filtered + sorted
  const filteredEstadias = useMemo(() => {
    let result = [...estadiasAtivas];

    if (search) {
      const s = search.toLowerCase();
      result = result.filter(e => e.pet_nome.toLowerCase().includes(s) || e.cliente_nome.toLowerCase().includes(s));
    }
    if (tipoFilter !== "todos") {
      result = result.filter(e => e.tipo === tipoFilter);
    }
    if (statusFilter !== "todos") {
      result = result.filter(e => {
        const checklist = e.checklist_entrada || {};
        if (statusFilter === "saida_hoje") return e.data_saida_prevista === hoje;
        if (statusFilter === "atrasado") return e.data_saida_prevista && e.data_saida_prevista < hoje;
        if (statusFilter === "observacao") return checklist.sinais_doenca || checklist.agressivo || e.ultimo_registro?.sinais_doenca;
        return true; // ativo
      });
    }

    result.sort((a, b) => {
      if (sortBy === "nome") return a.pet_nome.localeCompare(b.pet_nome);
      if (sortBy === "saida") return (a.data_saida_prevista || "9999").localeCompare(b.data_saida_prevista || "9999");
      return (b.data_entrada + b.hora_entrada).localeCompare(a.data_entrada + a.hora_entrada);
    });

    return result;
  }, [estadiasAtivas, search, tipoFilter, statusFilter, sortBy, hoje]);

  // KPIs
  const crecheHoje = estadiasAtivas.filter((e) => e.tipo === "creche" && e.data_entrada === hoje).length;
  const hospedadosAtivos = estadiasAtivas.filter((e) => e.tipo === "hotel").length;
  const checkinHoje = estadiasAtivas.filter((e) => e.data_entrada === hoje).length;
  const checkoutHoje = estadiasAtivas.filter((e) => e.data_saida_prevista === hoje).length;

  const handleRegistro = (estadiaId: string, petNome: string) => {
    setRegistroEstadiaId(estadiaId);
    setRegistroPetNome(petNome);
    setRegistroOpen(true);
  };

  const [checkoutContextClienteNome, setCheckoutContextClienteNome] = useState<string | null>(null);
  const [checkoutContextEstadiaId, setCheckoutContextEstadiaId] = useState<string | null>(null);

  const handleCheckoutDireto = (estadiaId: string, clienteNome: string) => {
    setCheckoutContextClienteNome(clienteNome);
    setCheckoutContextEstadiaId(estadiaId);
    setCheckoutOpen(true);
  };

  const handleVerDetalhes = (estadiaId: string, petNome: string) => {
    setTimelineEstadiaId(estadiaId);
    setTimelinePetNome(petNome);
    setTimelineOpen(true);
  };

  const handleAdicionarObs = (estadiaId: string, petNome: string) => {
    setObsEstadiaId(estadiaId);
    setObsPetNome(petNome);
    setObsOpen(true);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Creche & Hotel Pet</h1>
        <div className="flex gap-2">
          <Button onClick={() => setCheckinOpen(true)} className="gap-1.5">
            <LogIn className="h-4 w-4" />
            Check-in
          </Button>
          <Button variant="outline" onClick={() => setCheckoutOpen(true)} className="gap-1.5">
            <LogOut className="h-4 w-4" />
            Check-out
          </Button>
        </div>
      </div>

      <Tabs defaultValue="operacional" className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-auto">
          <TabsTrigger value="operacional" className="text-xs py-1.5">🐾 Painel Operacional</TabsTrigger>
          <TabsTrigger value="relatorios" className="text-xs py-1.5 gap-1">
            <BarChart3 className="h-3.5 w-3.5" /> Relatórios
          </TabsTrigger>
        </TabsList>

        <TabsContent value="operacional" className="space-y-3 mt-3">
          <CrecheKPICards
            crecheHoje={crecheHoje}
            hospedadosAtivos={hospedadosAtivos}
            checkinHoje={checkinHoje}
            checkoutHoje={checkoutHoje}
          />

          <CrecheFilters
            search={search}
            onSearchChange={setSearch}
            tipoFilter={tipoFilter}
            onTipoChange={setTipoFilter}
            statusFilter={statusFilter}
            onStatusChange={setStatusFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          <EstadiasAtivas
            estadias={filteredEstadias}
            onRegistro={handleRegistro}
            onCheckoutDireto={handleCheckoutDireto}
            onVerDetalhes={handleVerDetalhes}
            onAdicionarObs={handleAdicionarObs}
            onRefresh={loadEstadias}
          />
        </TabsContent>

        <TabsContent value="relatorios" className="mt-3">
          <CrecheRelatorios />
        </TabsContent>
      </Tabs>

      <CheckinModal open={checkinOpen} onOpenChange={setCheckinOpen} onSuccess={loadEstadias} />
      <CheckoutModal
        open={checkoutOpen}
        onOpenChange={(open) => {
          setCheckoutOpen(open);
          if (!open) {
            setCheckoutContextClienteNome(null);
            setCheckoutContextEstadiaId(null);
          }
        }}
        estadiasAtivas={estadiasAtivas}
        onSuccess={loadEstadias}
        contextClienteNome={checkoutContextClienteNome}
        contextEstadiaId={checkoutContextEstadiaId}
      />
      <RegistroDiarioModal
        open={registroOpen}
        onOpenChange={setRegistroOpen}
        estadiaId={registroEstadiaId}
        petNome={registroPetNome}
        onSuccess={loadEstadias}
      />
      <TimelineModal
        open={timelineOpen}
        onOpenChange={setTimelineOpen}
        estadiaId={timelineEstadiaId}
        petNome={timelinePetNome}
      />
      <ObservacaoModal
        open={obsOpen}
        onOpenChange={setObsOpen}
        estadiaId={obsEstadiaId}
        petNome={obsPetNome}
        onSuccess={loadEstadias}
      />
    </div>
  );
};

export default Creche;
