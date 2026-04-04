import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger } from
"@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  Clock,
  Package,
  Calendar as CalendarIcon,
  ChevronUp,
  ChevronDown,
  Copy,
  Settings,
  Trash2,
  Search,
  Check,
  ChevronsUpDown,
  X,
  Wifi,
  WifiOff,
  LayoutList,
  LayoutGrid } from
"lucide-react";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TimeInput } from "@/components/TimeInput";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";

const toDisplayDate = (isoDate: string): string => {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return isoDate;
};

const fromDisplayDate = (displayDate: string): string => {
  if (!displayDate) return "";
  const parts = displayDate.split("/");
  if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
  return displayDate;
};
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle } from
"@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { criarLancamentoFinanceiroAvulso, criarLancamentoFinanceiroPacote, criarLancamentoFinanceiroMultiplosServicos, criarLancamentoFinanceiroConsolidado } from "@/hooks/useCriarLancamentoAutomatico";
import { scheduleWhatsAppMessages, deletePendingMessages } from "@/utils/whatsappScheduler";
import { buildWhatsAppUrl, getInvalidPhoneMessage, normalizeBrazilPhone } from "@/utils/phone";
import { FinanceiroEditDialog } from "@/components/agendamentos/FinanceiroEditDialog";
import { useManualSendCooldown } from "@/hooks/useManualSendCooldown";


// Interfaces

interface Groomer {
  id: string;
  nome: string;
}

interface Agendamento {
  id: string;
  cliente: string;
  pet: string;
  raca: string;
  whatsapp: string;
  servico: string;
  data: string;
  horario: string;
  tempoServico: string;
  horarioTermino: string;
  dataVenda: string;
  groomer: string;
  taxiDog: string;
  status: "confirmado" | "pendente" | "concluido";
  numeroServicoPacote?: string;
}
interface ServicoAgendamento {
  numero: string;
  nomeServico: string;
  data: string;
  horarioInicio: string;
  tempoServico: string; // Agora em formato hh:mm
  horarioTermino: string;
  servicosExtras?: {id: string;nome: string;valor: number;nativo?: boolean;}[];
}
interface AgendamentoPacote {
  id: string;
  nomeCliente: string;
  nomePet: string;
  raca: string;
  whatsapp: string;
  nomePacote: string;
  taxiDog: string; // "Sim" ou "Não"
  dataVenda: string;
  servicos: ServicoAgendamento[];
}
interface Pet {
  id: string;
  nome: string;
  porte: string;
  raca: string;
  observacao: string;
  sexo: string;
}

interface Cliente {
  id: string;
  nomeCliente: string;
  whatsapp: string;
  endereco: string;
  observacao: string;
  pets: Pet[];
}
interface ServicoSelecionado {
  instanceId: string;
  id: string;
  nome: string;
  valor: number;
}

// Interface para serviços selecionados no agendamento simples
interface ServicoAgendamentoSimples {
  instanceId: string;
  nome: string;
  valor: number;
}
interface Pacote {
  id: string;
  nome: string;
  porte: string;
  servicos: ServicoSelecionado[];
  validade: string;
  descontoPercentual: number;
  descontoValor: number;
  valorFinal: number;
}
interface Servico {
  id: string;
  nome: string;
  valor: number;
  porte: string;
}
interface EmpresaConfig {
  bordao: string;
  horarioInicio: string;
  horarioFim: string;
  diasFuncionamento: {
    domingo: boolean;
    segunda: boolean;
    terca: boolean;
    quarta: boolean;
    quinta: boolean;
    sexta: boolean;
    sabado: boolean;
  };
}
interface AgendamentoUnificado {
  id: string;
  tipo: "simples" | "pacote";
  data: string;
  horarioInicio: string;
  horarioTermino: string;
  cliente: string;
  pet: string;
  raca: string;
  servico: string;
  nomePacote: string;
  numeroPacote: string;
  taxiDog: string;
  dataVenda: string;
  whatsapp: string;
  tempoServico: string;
  groomer: string;
  agendamentoOriginal?: Agendamento;
  pacoteOriginal?: AgendamentoPacote;
  servicoOriginal?: ServicoAgendamento;
}

// Componente auxiliar para combobox de serviço extra
const ServicoExtraCombobox = ({
  extra,
  index,
  servicos,
  onSelect




}: {extra: {id: string;nome: string;valor: number;};index: number;servicos: Servico[];onSelect: (servico: Servico) => void;}) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="flex-1 h-8 text-xs justify-between">
          
          {extra.nome || "Selecione serviço extra..."}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0 z-50 bg-popover">
        <Command>
          <CommandInput placeholder="Buscar serviço..." className="h-9" />
          <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
          <CommandGroup className="max-h-[200px] overflow-y-auto">
            {servicos.map((s) =>
            <CommandItem
              key={s.id}
              value={`${s.nome}__${s.id}`}
              onSelect={() => {
                onSelect(s);
                setOpen(false);
              }}>
              
                <Check
                className={cn(
                  "mr-2 h-4 w-4",
                  extra.nome === s.nome && extra.valor === s.valor ? "opacity-100" : "opacity-0"
                )} />
              
                {s.nome} - R$ {s.valor?.toFixed(2)}
              </CommandItem>
            )}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>);

};

const Agendamentos = () => {
  const { user, ownerId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Função para formatar data sem problemas de timezone
  const formatDateForInput = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Função para formatar data de exibição sem problemas de timezone
  const formatDateForDisplay = (dateStr: string): string => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day); // Cria data no timezone local
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric"
    });
  };

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [agendamentosPacotes, setAgendamentosPacotes] = useState<AgendamentoPacote[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);

  // Pet Pronto dialog states
  const [petProntoDialogOpen, setPetProntoDialogOpen] = useState(false);
  const [petProntoAgendamento, setPetProntoAgendamento] = useState<any>(null);
  const [petProntoHoraAtual, setPetProntoHoraAtual] = useState("");

  // Multi-pet edit & financeiro states
  const [editMultiPetGroup, setEditMultiPetGroup] = useState<AgendamentoUnificado[]>([]);
  const [lancamentoVinculado, setLancamentoVinculado] = useState<any>(null);
  const [lancamentoItensVinculado, setLancamentoItensVinculado] = useState<any[]>([]);
  const [deletePetDialogOpen, setDeletePetDialogOpen] = useState(false);
  const [petParaDeletar, setPetParaDeletar] = useState<AgendamentoUnificado | null>(null);
  const [financeiroDialogOpen, setFinanceiroDialogOpen] = useState(false);


  const normalizarPorte = (porte: string): string => {
    return porte.
    toLowerCase().
    normalize("NFD").
    replace(/[\u0300-\u036f]/g, "");
  };

  const [empresaConfig, setEmpresaConfig] = useState<EmpresaConfig>({
    bordao: "",
    horarioInicio: "08:00",
    horarioFim: "18:00",
    diasFuncionamento: {
      domingo: false,
      segunda: true,
      terca: true,
      quarta: true,
      quinta: true,
      sexta: true,
      sabado: false
    }
  });

  // Load agendamentos from Supabase
  const loadAgendamentos = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.
      from("agendamentos").
      select("*").
      eq("user_id", ownerId).
      order("data", { ascending: true }).
      order("horario", { ascending: true });

      if (error) throw error;

      const agendamentosFormatados = (data || []).map((ag: any) => ({
        id: ag.id,
        cliente: ag.cliente,
        pet: ag.pet,
        raca: ag.raca,
        whatsapp: ag.whatsapp,
        servico: ag.servico,
        data: ag.data,
        horario: ag.horario ? ag.horario.substring(0, 5) : "",
        tempoServico: ag.tempo_servico ? ag.tempo_servico.substring(0, 5) : "",
        horarioTermino: ag.horario_termino ? ag.horario_termino.substring(0, 5) : "",
        dataVenda: ag.data_venda,
        groomer: ag.groomer,
        taxiDog: ag.taxi_dog,
        status: ag.status as "confirmado" | "pendente" | "concluido",
        numeroServicoPacote: ag.numero_servico_pacote || undefined
      }));

      setAgendamentos(agendamentosFormatados);
    } catch (error) {
      console.error("Erro ao carregar agendamentos:", error);
      toast.error("Erro ao carregar agendamentos");
    } finally {
      setLoading(false);
    }
  };

  // Load groomers, clientes, pacotes, servicos from Supabase
  const [whatsappConnected, setWhatsappConnected] = useState(false);
  const [whatsappInstanceName, setWhatsappInstanceName] = useState<string>("");
  const lastSendTimestampRef = useRef<number>(0);
  const sendQueueRef = useRef<Array<() => Promise<void>>>([]);
  const processingQueueRef = useRef(false);
  const { canSend, registerSend } = useManualSendCooldown();

  const loadRelatedData = async () => {
    if (!user || !ownerId) return;

    // Load WhatsApp status with live check via Evolution API
    try {
      const { data: whatsappData } = await supabase
        .from("whatsapp_instances")
        .select("status, instance_name")
        .eq("user_id", ownerId)
        .maybeSingle();

      if (whatsappData?.instance_name) {
        setWhatsappInstanceName(whatsappData.instance_name);
        try {
          const res = await supabase.functions.invoke("evolution-api", {
            body: { action: "check-status", instanceName: whatsappData.instance_name }
          });
          const state = res.data?.instance?.state || res.data?.state || "disconnected";
          const isConnected = state === "open" || state === "connected";
          setWhatsappConnected(isConnected);
          const newStatus = isConnected ? "connected" : "disconnected";
          if (whatsappData.status !== newStatus) {
            await supabase.from("whatsapp_instances")
              .update({ status: newStatus, updated_at: new Date().toISOString() })
              .eq("user_id", ownerId);
          }
          // Sync evolution_auto_send flag
          await supabase.from("empresa_config")
            .update({ evolution_auto_send: isConnected })
            .eq("user_id", ownerId);
        } catch {
          setWhatsappConnected(whatsappData?.status === "connected");
        }
      } else {
        setWhatsappConnected(false);
      }
    } catch (e) {
      console.error('Erro ao verificar status WhatsApp:', e);
    }

    try {
      // Load groomers
      const { data: groomersData } = await (supabase as any).from("groomers").select("*").eq("user_id", ownerId);

      if (groomersData) {
        setGroomers(groomersData.map((g: any) => ({ id: g.id, nome: g.nome })));
      }

      // Load clientes
      const { data: clientesData, error: clientesError } = await supabase.
      from("clientes").
      select("id, nome_cliente, whatsapp, endereco, observacao").
      eq("user_id", ownerId);

      if (clientesError) throw clientesError;

      // Load pets
      const { data: petsData, error: petsError } = await supabase.from("pets").select("*").eq("user_id", ownerId);

      if (petsError) throw petsError;

      // Agrupar pets por cliente_id
      const petsPorCliente = (petsData || []).reduce(
        (acc, pet: any) => {
          if (!acc[pet.cliente_id]) {
            acc[pet.cliente_id] = [];
          }
          acc[pet.cliente_id].push({
            id: pet.id,
            nome: pet.nome_pet,
            porte: pet.porte,
            raca: pet.raca,
            observacao: pet.observacao || "",
            sexo: pet.sexo || ""
          });
          return acc;
        },
        {} as Record<string, Pet[]>
      );

      // Montar estrutura final
      const clientesComPets: Cliente[] = (clientesData || []).map((c: any) => ({
        id: c.id,
        nomeCliente: c.nome_cliente,
        whatsapp: c.whatsapp,
        endereco: c.endereco || "",
        observacao: c.observacao || "",
        pets: petsPorCliente[c.id] || []
      }));

      setClientes(clientesComPets);

      // Load pacotes
      const { data: pacotesData } = await supabase.from("pacotes").select("*").eq("user_id", ownerId);

      if (pacotesData) {
        setPacotes(
          pacotesData.map((p: any) => ({
            id: p.id,
            nome: p.nome,
            porte: p.porte || "",
            servicos: p.servicos || [],
            validade: p.validade,
            descontoPercentual: Number(p.desconto_percentual),
            descontoValor: Number(p.desconto_valor),
            valorFinal: Number(p.valor_final)
          }))
        );
      }

      // Load servicos
      const { data: servicosData } = await supabase.from("servicos").select("*").eq("user_id", ownerId);

      if (servicosData) {
        setServicos(
          servicosData.map((s: any) => ({
            id: s.id,
            nome: s.nome,
            valor: Number(s.valor),
            porte: s.porte || ""
          }))
        );
      }

      // Load empresa config
      const { data: empresaData } = await (supabase as any).
      from("empresa_config").
      select("*").
      eq("user_id", ownerId).
      single();

      if (empresaData) {
        const empresa = empresaData as any;
        setEmpresaConfig({
          bordao: empresa.bordao || "",
          horarioInicio: empresa.horario_inicio || "08:00",
          horarioFim: empresa.horario_fim || "18:00",
          diasFuncionamento: empresa.dias_funcionamento || {
            domingo: false,
            segunda: true,
            terca: true,
            quarta: true,
            quinta: true,
            sexta: true,
            sabado: false
          }
        });
      }
    } catch (error) {
      console.error("Erro ao carregar dados relacionados:", error);
    }
  };

  useEffect(() => {
    if (user && ownerId) {
      loadAgendamentos();
      loadRelatedData();
    }
  }, [user, ownerId]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPacoteDialogOpen, setIsPacoteDialogOpen] = useState(false);
  const [calendarServicoIndex, setCalendarServicoIndex] = useState<number | null>(null);
  const [calendarNovoOpen, setCalendarNovoOpen] = useState(false);
  const [calendarEditGerOpen, setCalendarEditGerOpen] = useState(false);
  const [calendarEditCalOpen, setCalendarEditCalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(formatDateForInput(new Date()));
  const [viewMode, setViewMode] = useState<"semana" | "dia">("semana");
  const [diaViewMode, setDiaViewMode] = useState<"relatorio" | "cards">(() => {
    if (!user) return "relatorio";
    const saved = localStorage.getItem(`diaViewMode_${user.id}`);
    return saved === "cards" ? "cards" : "relatorio";
  });
  const handleDiaViewModeChange = (mode: "relatorio" | "cards") => {
    setDiaViewMode(mode);
    if (user) {
      localStorage.setItem(`diaViewMode_${user.id}`, mode);
    }
  };
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [showCalendar, setShowCalendar] = useState(false);
  const [editingAgendamento, setEditingAgendamento] = useState<any>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    data: "",
    horarioInicio: "",
    tempoServico: "",
    horarioTermino: "",
    servico: ""
  });
  const [formData, setFormData] = useState({
    cliente: "",
    pet: "",
    raca: "",
    whatsapp: "",
    servico: "",
    data: "",
    horario: "",
    tempoServico: "",
    horarioTermino: "",
    dataVenda: "",
    numeroServicoPacote: "",
    groomer: "",
    taxiDog: ""
  });
  // ID do cliente selecionado para garantir vínculo correto
  const [selectedClienteId, setSelectedClienteId] = useState<string>("");

  // Filtrar serviços pelo porte do pet selecionado (agendamento simples)
  const servicosFiltradosPorPorte = useMemo(() => {
    if (!formData.raca || !formData.pet) {
      return servicos;
    }

    let portePet = "";

    // Se o cliente está selecionado por ID, buscar apenas nos pets desse cliente
    if (selectedClienteId) {
      const clienteSelecionado = clientes.find((c) => c.id === selectedClienteId);
      if (clienteSelecionado) {
        const pet = clienteSelecionado.pets.find(
          (p) => p.nome === formData.pet && p.raca === formData.raca
        );
        if (pet) portePet = pet.porte;
      }
    }

    // Fallback: buscar em todos os clientes
    if (!portePet) {
      for (const cliente of clientes) {
        const pet = cliente.pets.find(
          (p) => p.nome === formData.pet && p.raca === formData.raca
        );
        if (pet) {
          portePet = pet.porte;
          break;
        }
      }
    }

    if (!portePet) {
      return servicos;
    }

    const porteNormalizado = normalizarPorte(portePet);
    return servicos.filter(
      (s) => normalizarPorte(s.porte) === porteNormalizado || normalizarPorte(s.porte) === "todos"
    );
  }, [formData.pet, formData.raca, selectedClienteId, servicos, clientes]);

  const [isPacoteSelecionado, setIsPacoteSelecionado] = useState(false);
  const [dataVendaManual, setDataVendaManual] = useState(false);
  const [openServicoCombobox, setOpenServicoCombobox] = useState(false);
  const [openEditServicoCombobox, setOpenEditServicoCombobox] = useState(false);

  // Estado para múltiplos serviços no agendamento simples
  const [servicosSelecionadosSimples, setServicosSelecionadosSimples] = useState<ServicoAgendamentoSimples[]>([
  { instanceId: crypto.randomUUID(), nome: "", valor: 0 }]
  );
  const [openServicoComboboxIndex, setOpenServicoComboboxIndex] = useState<number | null>(null);
  const [pacoteFormData, setPacoteFormData] = useState({
    nomeCliente: "",
    nomePet: "",
    raca: "",
    whatsapp: "",
    nomePacote: "",
    taxiDog: "",
    dataVenda: ""
  });
  const [servicosAgendamento, setServicosAgendamento] = useState<ServicoAgendamento[]>([]);

  // Estado para múltiplos pets no pacote
  const [selectedPacoteClienteId, setSelectedPacoteClienteId] = useState<string>("");
  interface PacoteAdditionalPet {
    petName: string;
    raca: string;
    porte: string;
    servicosAgendamento: ServicoAgendamento[];
  }
  const [pacoteAdditionalPets, setPacoteAdditionalPets] = useState<PacoteAdditionalPet[]>([]);
  const [showPacoteAdditionalPetsPopover, setShowPacoteAdditionalPetsPopover] = useState(false);
  const [pacoteAdditionalCalendarIndex, setPacoteAdditionalCalendarIndex] = useState<string | null>(null); // "petIdx-svcIdx"

  // Estados para busca inteligente (Pacotes)
  const [clienteSearch, setClienteSearch] = useState("");
  const [petSearch, setPetSearch] = useState("");
  const [filteredClientes, setFilteredClientes] = useState<string[]>([]);
  const [filteredPets, setFilteredPets] = useState<string[]>([]);
  const [availableRacas, setAvailableRacas] = useState<string[]>([]);
  const [searchStartedWith, setSearchStartedWith] = useState<"cliente" | "pet" | null>(null);

  // Estados para busca inteligente (Agendamento Simples)
  const [simpleClienteSearch, setSimpleClienteSearch] = useState("");
  const [simplePetSearch, setSimplePetSearch] = useState("");
  const [simpleFilteredClientes, setSimpleFilteredClientes] = useState<Array<{ id: string; nome: string; whatsapp: string }>>([]);
  const [simpleFilteredPets, setSimpleFilteredPets] = useState<string[]>([]);
  const [simpleAvailableRacas, setSimpleAvailableRacas] = useState<string[]>([]);
  const [simpleSearchStartedWith, setSimpleSearchStartedWith] = useState<"cliente" | "pet" | null>(null);
  const simpleClienteJustSelected = useRef(false);
  const clienteJustSelected = useRef(false);
  const simplePetJustSelected = useRef(false);

  // Estados para busca por WhatsApp (Agendamento Simples)
  const [simpleWhatsappSearch, setSimpleWhatsappSearch] = useState("");
  const [simpleFilteredWhatsapp, setSimpleFilteredWhatsapp] = useState<Array<{ whatsapp: string; nomeCliente: string; nomePet: string; raca: string; clienteId: string }>>([]);
  const simpleWhatsappJustSelected = useRef(false);
  const petJustSelected = useRef(false);

  // Estados para busca por WhatsApp (Pacotes)
  const [pacoteWhatsappSearch, setPacoteWhatsappSearch] = useState("");
  const [pacoteFilteredWhatsapp, setPacoteFilteredWhatsapp] = useState<Array<{ whatsapp: string; nomeCliente: string; nomePet: string; raca: string; clienteId: string }>>([]);
  const pacoteWhatsappJustSelected = useRef(false);

  // Estados para agendamento de múltiplos pets
  interface AdditionalPetSchedule {
    petName: string;
    raca: string;
    porte: string;
    horario: string;
    horarioTermino: string;
    tempoServico: string;
    servicos: ServicoAgendamentoSimples[];
    groomer: string;
  }
  const [additionalPets, setAdditionalPets] = useState<AdditionalPetSchedule[]>([]);
  const [showAdditionalPetsPopover, setShowAdditionalPetsPopover] = useState(false);
  const [openAdditionalServicoCombobox, setOpenAdditionalServicoCombobox] = useState<string | null>(null); // "apIdx-sIdx"

  // Filtrar serviços por porte para um pet adicional
  const getServicosFiltradosPorPorteAdditional = (porte: string) => {
    if (!porte) return servicos;
    const porteNormalizado = normalizarPorte(porte);
    return servicos.filter(
      (s) => normalizarPorte(s.porte) === porteNormalizado || normalizarPorte(s.porte) === "todos"
    );
  };

  // Pets do mesmo cliente disponíveis para agendamento adicional (filtrado por ID)
  const otherPetsFromClient = useMemo(() => {
    if (!selectedClienteId || !formData.pet || !formData.raca || !formData.whatsapp) return [];
    const clienteSelecionado = clientes.find(c => c.id === selectedClienteId);
    if (!clienteSelecionado) return [];
    const allPets = clienteSelecionado.pets;
    // Excluir o pet principal e os já adicionados
    const addedNames = additionalPets.map(ap => ap.petName);
    return allPets.filter(p => !(p.nome === formData.pet && p.raca === formData.raca) && !addedNames.includes(p.nome));
  }, [selectedClienteId, formData.pet, formData.raca, formData.whatsapp, clientes, additionalPets]);

  const handleToggleAdditionalPet = (pet: Pet) => {
    const exists = additionalPets.find(ap => ap.petName === pet.nome);
    if (exists) {
      setAdditionalPets(additionalPets.filter(ap => ap.petName !== pet.nome));
    } else {
      setAdditionalPets([...additionalPets, {
        petName: pet.nome,
        raca: pet.raca,
        porte: pet.porte,
        horario: "",
        horarioTermino: "",
        tempoServico: "",
        servicos: [{ instanceId: crypto.randomUUID(), nome: "", valor: 0 }],
        groomer: "",
      }]);
    }
  };

  const updateAdditionalPetTime = (index: number, field: 'horario' | 'horarioTermino' | 'tempoServico', value: string) => {
    setAdditionalPets(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      if (field === 'horario' || field === 'tempoServico') {
        const h = field === 'horario' ? value : updated[index].horario;
        const t = field === 'tempoServico' ? value : updated[index].tempoServico;
        if (h && t) updated[index].horarioTermino = calcularHorarioTermino(h, t);
      }
      if (field === 'horarioTermino') {
        const h = updated[index].horario;
        if (h && value) updated[index].tempoServico = calcularTempoServico(h, value);
      }
      return updated;
    });
  };

  const updateAdditionalPetGroomer = (index: number, groomer: string) => {
    setAdditionalPets(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], groomer };
      return updated;
    });
  };

  const adicionarServicoAdditionalPet = (apIdx: number) => {
    setAdditionalPets(prev => {
      const updated = [...prev];
      updated[apIdx] = {
        ...updated[apIdx],
        servicos: [...updated[apIdx].servicos, { instanceId: crypto.randomUUID(), nome: "", valor: 0 }]
      };
      return updated;
    });
  };

  const removerServicoAdditionalPet = (apIdx: number, instanceId: string) => {
    setAdditionalPets(prev => {
      const updated = [...prev];
      if (updated[apIdx].servicos.length > 1) {
        updated[apIdx] = {
          ...updated[apIdx],
          servicos: updated[apIdx].servicos.filter(s => s.instanceId !== instanceId)
        };
      }
      return updated;
    });
  };

  const atualizarServicoAdditionalPet = (apIdx: number, instanceId: string, servicoIdOrNome: string) => {
    const id = servicoIdOrNome.includes("__") ? servicoIdOrNome.split("__").pop() : null;
    const servicoEncontrado = id ? servicos.find((s) => s.id === id) : servicos.find((s) => s.nome === servicoIdOrNome);
    setAdditionalPets(prev => {
      const updated = [...prev];
      updated[apIdx] = {
        ...updated[apIdx],
        servicos: updated[apIdx].servicos.map(s =>
          s.instanceId === instanceId
            ? { ...s, nome: servicoEncontrado?.nome || servicoIdOrNome, valor: servicoEncontrado?.valor || 0 }
            : s
        )
      };
      return updated;
    });
    setOpenAdditionalServicoCombobox(null);
  };

  // Pets do mesmo cliente disponíveis para agendamento adicional no pacote
  const otherPetsFromClientPacote = useMemo(() => {
    if (!selectedPacoteClienteId || !pacoteFormData.nomePet || !pacoteFormData.raca) return [];
    const clienteSelecionado = clientes.find(c => c.id === selectedPacoteClienteId);
    if (!clienteSelecionado) return [];
    const addedNames = pacoteAdditionalPets.map(ap => ap.petName);
    return clienteSelecionado.pets.filter(
      p => !(p.nome === pacoteFormData.nomePet && p.raca === pacoteFormData.raca) && !addedNames.includes(p.nome)
    );
  }, [selectedPacoteClienteId, pacoteFormData.nomePet, pacoteFormData.raca, clientes, pacoteAdditionalPets]);

  const handleTogglePacoteAdditionalPet = (pet: Pet) => {
    const exists = pacoteAdditionalPets.find(ap => ap.petName === pet.nome);
    if (exists) {
      setPacoteAdditionalPets(pacoteAdditionalPets.filter(ap => ap.petName !== pet.nome));
    } else {
      // Clone servicosAgendamento with empty dates/times for this pet
      const servicosCopy: ServicoAgendamento[] = servicosAgendamento.map(s => ({
        ...s,
        data: "",
        horarioInicio: "",
        tempoServico: "",
        horarioTermino: "",
        servicosExtras: (s.servicosExtras || []).filter(e => e.nativo).map(e => ({ ...e })),
      }));
      setPacoteAdditionalPets([...pacoteAdditionalPets, {
        petName: pet.nome,
        raca: pet.raca,
        porte: pet.porte,
        servicosAgendamento: servicosCopy,
      }]);
    }
  };

  const handlePacoteAdditionalServicoChange = (petIdx: number, svcIdx: number, field: keyof ServicoAgendamento, value: string) => {
    setPacoteAdditionalPets(prev => {
      const updated = [...prev];
      const svcs = [...updated[petIdx].servicosAgendamento];
      svcs[svcIdx] = { ...svcs[svcIdx], [field]: value };
      if (field === "horarioInicio" || field === "tempoServico") {
        const hi = field === "horarioInicio" ? value : svcs[svcIdx].horarioInicio;
        const ts = field === "tempoServico" ? value : svcs[svcIdx].tempoServico;
        if (hi && ts) svcs[svcIdx].horarioTermino = calcularHorarioTermino(hi, ts);
      }
      updated[petIdx] = { ...updated[petIdx], servicosAgendamento: svcs };
      return updated;
    });
  };

  const handleAddPacoteAdditionalExtra = (petIdx: number, svcIdx: number, servicoId: string) => {
    const servicoExtra = servicos.find(s => s.id === servicoId);
    if (!servicoExtra) return;
    setPacoteAdditionalPets(prev => {
      const updated = [...prev];
      const svcs = [...updated[petIdx].servicosAgendamento];
      const extras = svcs[svcIdx].servicosExtras || [];
      if (extras.some(e => e.id === servicoId)) {
        toast.error("Este serviço extra já foi adicionado");
        return prev;
      }
      svcs[svcIdx] = { ...svcs[svcIdx], servicosExtras: [...extras, { id: servicoExtra.id, nome: servicoExtra.nome, valor: servicoExtra.valor }] };
      updated[petIdx] = { ...updated[petIdx], servicosAgendamento: svcs };
      return updated;
    });
  };

  const handleRemovePacoteAdditionalExtra = (petIdx: number, svcIdx: number, extraId: string) => {
    setPacoteAdditionalPets(prev => {
      const updated = [...prev];
      const svcs = [...updated[petIdx].servicosAgendamento];
      svcs[svcIdx] = { ...svcs[svcIdx], servicosExtras: (svcs[svcIdx].servicosExtras || []).filter(e => e.id !== extraId) };
      updated[petIdx] = { ...updated[petIdx], servicosAgendamento: svcs };
      return updated;
    });
  };

  // Estados para Gerenciamento de Agendamentos
  const [gerenciamentoOpen, setGerenciamentoOpen] = useState(false);
  const [filtros, setFiltros] = useState({
    nomePet: "",
    nomeCliente: "",
    dataAgendada: "",
    dataVenda: "",
    nomePacote: ""
  });
  const [filtrosAplicados, setFiltrosAplicados] = useState({
    nomePet: "",
    nomeCliente: "",
    dataAgendada: "",
    dataVenda: "",
    nomePacote: ""
  });
  const [editandoAgendamento, setEditandoAgendamento] = useState<AgendamentoUnificado | null>(null);
  const [editDialogGerenciamento, setEditDialogGerenciamento] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agendamentoParaDeletar, setAgendamentoParaDeletar] = useState<AgendamentoUnificado | null>(null);

  // Estados para edição de serviços extras
  const [servicosExtrasEdicao, setServicosExtrasEdicao] = useState<{id: string;nome: string;valor: number;}[]>([]);
  const [openServicoEdicao, setOpenServicoEdicao] = useState(false);
  const [servicoPrincipalEdicao, setServicoPrincipalEdicao] = useState("");

  // Load agendamentos pacotes from Supabase
  const loadAgendamentosPacotes = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.
      from("agendamentos_pacotes").
      select("*").
      eq("user_id", ownerId).
      order("data_venda", { ascending: false });

      if (error) throw error;

      const pacotesFormatados = (data || []).map((ap: any) => ({
        id: ap.id,
        nomeCliente: ap.nome_cliente,
        nomePet: ap.nome_pet,
        raca: ap.raca,
        whatsapp: ap.whatsapp,
        nomePacote: ap.nome_pacote,
        taxiDog: ap.taxi_dog,
        dataVenda: ap.data_venda,
        servicos: ap.servicos || []
      }));

      setAgendamentosPacotes(pacotesFormatados);
    } catch (error) {
      console.error("Erro ao carregar agendamentos de pacotes:", error);
      toast.error("Erro ao carregar agendamentos de pacotes");
    }
  };

  useEffect(() => {
    if (user) {
      loadAgendamentosPacotes();
    }
  }, [user]);

  // Busca inteligente por cliente (Pacotes)
  useEffect(() => {
    if (clienteJustSelected.current) {
      clienteJustSelected.current = false;
      return;
    }
    if (clienteSearch.length >= 2) {
      const matches = Array.from(
        new Set(
          clientes.
          filter((c) => c.nomeCliente.toLowerCase().startsWith(clienteSearch.toLowerCase())).
          map((c) => c.nomeCliente)
        )
      );
      setFilteredClientes(matches);
    } else {
      setFilteredClientes([]);
    }
  }, [clienteSearch, clientes]);

  // Busca inteligente por pet (Pacotes)
  useEffect(() => {
    if (petJustSelected.current) {
      petJustSelected.current = false;
      return;
    }
    if (petSearch.length >= 2) {
      const matchingPets = new Set<string>();
      clientes.forEach((cliente) => {
        cliente.pets.forEach((pet) => {
          if (pet.nome.toLowerCase().startsWith(petSearch.toLowerCase())) {
            matchingPets.add(pet.nome);
          }
        });
      });
      setFilteredPets(Array.from(matchingPets));
    } else {
      setFilteredPets([]);
    }
  }, [petSearch, clientes]);

  // Busca inteligente por cliente (Agendamento Simples) - nomes agrupados (sem duplicatas visuais)
  useEffect(() => {
    if (simpleClienteJustSelected.current) {
      simpleClienteJustSelected.current = false;
      return;
    }
    if (simpleClienteSearch.length >= 2) {
      const matches = clientes
        .filter((c) => c.nomeCliente.toLowerCase().startsWith(simpleClienteSearch.toLowerCase()));
      // Agrupar por nome — exibir apenas nomes únicos
      const seen = new Map<string, { id: string; nome: string; whatsapp: string }>();
      matches.forEach((c) => {
        if (!seen.has(c.nomeCliente)) {
          seen.set(c.nomeCliente, { id: c.id, nome: c.nomeCliente, whatsapp: c.whatsapp });
        }
      });
      setSimpleFilteredClientes(Array.from(seen.values()));
    } else {
      setSimpleFilteredClientes([]);
    }
  }, [simpleClienteSearch, clientes]);

  // Busca inteligente por pet (Agendamento Simples)
  useEffect(() => {
    if (simplePetJustSelected.current) {
      simplePetJustSelected.current = false;
      return;
    }
    if (simplePetSearch.length >= 2) {
      const matchingPets = new Set<string>();
      clientes.forEach((cliente) => {
        cliente.pets.forEach((pet) => {
          if (pet.nome.toLowerCase().startsWith(simplePetSearch.toLowerCase())) {
            matchingPets.add(pet.nome);
          }
        });
      });
      setSimpleFilteredPets(Array.from(matchingPets));
    } else {
      setSimpleFilteredPets([]);
    }
  }, [simplePetSearch, clientes]);

  // Busca inteligente por WhatsApp (Agendamento Simples)
  useEffect(() => {
    if (simpleWhatsappJustSelected.current) {
      simpleWhatsappJustSelected.current = false;
      return;
    }
    if (simpleWhatsappSearch.length >= 2) {
      const results: Array<{ whatsapp: string; nomeCliente: string; nomePet: string; raca: string; clienteId: string }> = [];
      clientes.forEach((cliente) => {
        if (cliente.whatsapp.includes(simpleWhatsappSearch)) {
          if (cliente.pets.length > 0) {
            cliente.pets.forEach((pet) => {
              results.push({
                whatsapp: cliente.whatsapp,
                nomeCliente: cliente.nomeCliente,
                nomePet: pet.nome,
                raca: pet.raca,
                clienteId: cliente.id,
              });
            });
          } else {
            results.push({
              whatsapp: cliente.whatsapp,
              nomeCliente: cliente.nomeCliente,
              nomePet: "",
              raca: "",
              clienteId: cliente.id,
            });
          }
        }
      });
      setSimpleFilteredWhatsapp(results);
    } else {
      setSimpleFilteredWhatsapp([]);
    }
  }, [simpleWhatsappSearch, clientes]);

  // Handler para seleção por WhatsApp (Agendamento Simples)
  const handleSimpleWhatsappSelect = (item: { whatsapp: string; nomeCliente: string; nomePet: string; raca: string; clienteId: string }) => {
    simpleWhatsappJustSelected.current = true;
    const formatted = item.whatsapp.length >= 11
      ? `(${item.whatsapp.slice(0, 2)}) ${item.whatsapp.slice(2, 7)}-${item.whatsapp.slice(7)}`
      : item.whatsapp;
    setSimpleWhatsappSearch(formatted);
    setSimpleFilteredWhatsapp([]);
    setSelectedClienteId(item.clienteId);
    setFormData({
      ...formData,
      cliente: item.nomeCliente,
      pet: item.nomePet,
      raca: item.raca,
      whatsapp: item.whatsapp,
    });
    setSimpleClienteSearch(item.nomeCliente);
    setSimplePetSearch(item.nomePet);
    if (item.raca) {
      setSimpleAvailableRacas([item.raca]);
    }
  };

  // Busca inteligente por WhatsApp (Pacotes)
  useEffect(() => {
    if (pacoteWhatsappJustSelected.current) {
      pacoteWhatsappJustSelected.current = false;
      return;
    }
    if (pacoteWhatsappSearch.length >= 2) {
      const results: Array<{ whatsapp: string; nomeCliente: string; nomePet: string; raca: string; clienteId: string }> = [];
      clientes.forEach((cliente) => {
        if (cliente.whatsapp.includes(pacoteWhatsappSearch)) {
          if (cliente.pets.length > 0) {
            cliente.pets.forEach((pet) => {
              results.push({ whatsapp: cliente.whatsapp, nomeCliente: cliente.nomeCliente, nomePet: pet.nome, raca: pet.raca, clienteId: cliente.id });
            });
          } else {
            results.push({ whatsapp: cliente.whatsapp, nomeCliente: cliente.nomeCliente, nomePet: "", raca: "", clienteId: cliente.id });
          }
        }
      });
      setPacoteFilteredWhatsapp(results);
    } else {
      setPacoteFilteredWhatsapp([]);
    }
  }, [pacoteWhatsappSearch, clientes]);

  const handlePacoteWhatsappSelect = (item: { whatsapp: string; nomeCliente: string; nomePet: string; raca: string; clienteId: string }) => {
    pacoteWhatsappJustSelected.current = true;
    const formatted = item.whatsapp.length >= 11
      ? `(${item.whatsapp.slice(0, 2)}) ${item.whatsapp.slice(2, 7)}-${item.whatsapp.slice(7)}`
      : item.whatsapp;
    setPacoteWhatsappSearch(formatted);
    setPacoteFilteredWhatsapp([]);
    setSelectedPacoteClienteId(item.clienteId);
    setPacoteAdditionalPets([]);
    setPacoteFormData({
      ...pacoteFormData,
      nomeCliente: item.nomeCliente,
      nomePet: item.nomePet,
      raca: item.raca,
      whatsapp: item.whatsapp,
    });
    setClienteSearch(item.nomeCliente);
    setPetSearch(item.nomePet);
    if (item.raca) {
      setAvailableRacas([item.raca]);
    }
  };

  // Atualizar pets disponíveis quando cliente é selecionado (Pacotes)
  const handleClienteSelect = (nomeCliente: string) => {
    clienteJustSelected.current = true;
    setClienteSearch(nomeCliente);
    setSearchStartedWith("cliente");
    setSelectedPacoteClienteId("");
    setPacoteAdditionalPets([]);

    // Buscar TODOS os clientes com esse nome (não apenas o primeiro)
    const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === nomeCliente);

    if (clientesComMesmoNome.length > 0) {
      const primeiroCliente = clientesComMesmoNome[0];

      setPacoteFormData({
        ...pacoteFormData,
        nomeCliente,
        nomePet: "",
        raca: "",
        whatsapp: primeiroCliente.whatsapp
      });

      const todosPetsDoNome = clientesComMesmoNome.flatMap((cliente) =>
      cliente.pets.map((p) => p.nome)
      );

      setFilteredPets(todosPetsDoNome);
      setFilteredClientes([]);
      setAvailableRacas([]);
    }
  };

  // Atualizar raças disponíveis quando pet é selecionado (Pacotes)
  const handlePetSelect = (nomePet: string) => {
    petJustSelected.current = true;
    setPetSearch(nomePet);

    if (searchStartedWith === "cliente" || pacoteFormData.nomeCliente) {
      // Buscar TODOS os clientes com esse nome
      const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === pacoteFormData.nomeCliente);

      // Encontrar qual cliente específico possui esse pet
      let clienteCorreto: Cliente | undefined;
      let petEncontrado: Pet | undefined;

      for (const cliente of clientesComMesmoNome) {
        const pet = cliente.pets.find((p) => p.nome === nomePet);
        if (pet) {
          clienteCorreto = cliente;
          petEncontrado = pet;
          break;
        }
      }

      if (clienteCorreto && petEncontrado) {
        setSelectedPacoteClienteId(clienteCorreto.id);
        setPacoteAdditionalPets([]);
        setAvailableRacas([petEncontrado.raca]);
        setPacoteFormData({
          ...pacoteFormData,
          nomePet,
          raca: petEncontrado.raca,
          whatsapp: clienteCorreto.whatsapp
        });
      }
    } else {
      // Se começou pelo pet, mostrar clientes que têm esse pet
      setSearchStartedWith("pet");

      const clientesComEssePet = clientes.filter((c) => c.pets.some((p) => p.nome === nomePet));
      const nomesClientes = clientesComEssePet.map((c) => c.nomeCliente);
      setFilteredClientes(nomesClientes);

      const racasDisponiveis = new Set<string>();
      clientesComEssePet.forEach((c) => {
        const pet = c.pets.find((p) => p.nome === nomePet);
        if (pet) racasDisponiveis.add(pet.raca);
      });

      setAvailableRacas(Array.from(racasDisponiveis));
      setPacoteFormData({
        ...pacoteFormData,
        nomePet,
        nomeCliente: "",
        raca: "",
        whatsapp: ""
      });
    }
    setFilteredPets([]);
  };

  // Preencher WhatsApp quando raça é selecionada (Pacotes)
  const handleRacaSelect = (raca: string) => {
    let clienteCorreto: Cliente | undefined;
    let petEncontrado: Pet | undefined;

    if (pacoteFormData.nomeCliente) {
      // Buscar TODOS os clientes com esse nome
      const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === pacoteFormData.nomeCliente);

      for (const cliente of clientesComMesmoNome) {
        const pet = cliente.pets.find((p) => p.nome === pacoteFormData.nomePet && p.raca === raca);
        if (pet) {
          clienteCorreto = cliente;
          petEncontrado = pet;
          break;
        }
      }
    } else if (pacoteFormData.nomePet) {
      clienteCorreto = clientes.find((c) =>
      c.pets.some((p) => p.nome === pacoteFormData.nomePet && p.raca === raca)
      );

      if (clienteCorreto) {
        petEncontrado = clienteCorreto.pets.find((p) => p.nome === pacoteFormData.nomePet && p.raca === raca);
      }
    }

    if (clienteCorreto && petEncontrado) {
      setSelectedPacoteClienteId(clienteCorreto.id);
      setPacoteAdditionalPets([]);
      setPacoteFormData({
        ...pacoteFormData,
        nomeCliente: clienteCorreto.nomeCliente,
        nomePet: petEncontrado.nome,
        raca: petEncontrado.raca,
        whatsapp: clienteCorreto.whatsapp
      });
      setClienteSearch(clienteCorreto.nomeCliente);
      setPetSearch(petEncontrado.nome);
      setFilteredClientes([]);
      setAvailableRacas([]);
    }
  };

  // Atualizar pets disponíveis quando cliente é selecionado (Agendamento Simples)
  // Agora recebe o NOME agrupado e carrega pets de TODOS os clientes com esse nome
  const handleSimpleClienteSelect = (clienteIdOrName: string) => {
    simpleClienteJustSelected.current = true;
    setSimpleSearchStartedWith("cliente");

    // Tentar encontrar pelo ID primeiro (para seleção via WhatsApp)
    let clienteSelecionado = clientes.find((c) => c.id === clienteIdOrName);
    
    let nomeCliente: string;
    if (clienteSelecionado) {
      nomeCliente = clienteSelecionado.nomeCliente;
    } else {
      // Foi passado um nome agrupado — buscar todos os clientes com esse nome
      nomeCliente = clienteIdOrName;
    }

    // Buscar TODOS os clientes com esse nome
    const clientesComEsseNome = clientes.filter((c) => c.nomeCliente === nomeCliente);
    if (clientesComEsseNome.length === 0) return;

    // NÃO definir selectedClienteId ainda — será resolvido ao selecionar o pet
    setSelectedClienteId("");
    setSimpleClienteSearch(nomeCliente);

    setFormData({
      ...formData,
      cliente: nomeCliente,
      pet: "",
      raca: "",
      whatsapp: ""
    });

    // Coletar pets de TODOS os clientes com esse nome
    const todosOsPets: string[] = [];
    clientesComEsseNome.forEach((c) => {
      c.pets.forEach((p) => {
        todosOsPets.push(p.nome);
      });
    });

    setSimpleFilteredPets(todosOsPets);
    setSimpleFilteredClientes([]);
    setSimpleAvailableRacas([]);
    setAdditionalPets([]);
  };

  // Atualizar raças disponíveis quando pet é selecionado (Agendamento Simples)
  // REGRA CRÍTICA: Ao selecionar o pet, resolver automaticamente o cliente_id real
  const handleSimplePetSelect = (nomePet: string) => {
    simplePetJustSelected.current = true;
    setSimplePetSearch(nomePet);

    if (simpleSearchStartedWith === "cliente" || formData.cliente) {
      // Cliente (nome) já foi selecionado — resolver qual cliente REAL possui esse pet
      const clientesComEsseNome = clientes.filter((c) => c.nomeCliente === formData.cliente);
      
      let clienteResolvido: typeof clientes[0] | undefined;
      let petEncontrado: Pet | undefined;

      for (const c of clientesComEsseNome) {
        const pet = c.pets.find((p) => p.nome === nomePet);
        if (pet) {
          clienteResolvido = c;
          petEncontrado = pet;
          break;
        }
      }

      if (clienteResolvido && petEncontrado) {
        // RESOLVER o cliente_id real a partir do pet selecionado
        setSelectedClienteId(clienteResolvido.id);
        setSimpleAvailableRacas([petEncontrado.raca]);
        setFormData({
          ...formData,
          pet: nomePet,
          raca: petEncontrado.raca,
          whatsapp: clienteResolvido.whatsapp
        });
      }
    } else {
      // Se começou pelo pet, mostrar clientes que têm esse pet (agrupados por nome)
      setSimpleSearchStartedWith("pet");

      const clientesComEssePet = clientes.filter((c) => c.pets.some((p) => p.nome === nomePet));
      // Agrupar por nome
      const seen = new Map<string, { id: string; nome: string; whatsapp: string }>();
      clientesComEssePet.forEach((c) => {
        if (!seen.has(c.nomeCliente)) {
          seen.set(c.nomeCliente, { id: c.id, nome: c.nomeCliente, whatsapp: c.whatsapp });
        }
      });
      setSimpleFilteredClientes(Array.from(seen.values()));

      const racasDisponiveis = new Set<string>();
      clientesComEssePet.forEach((c) => {
        const pet = c.pets.find((p) => p.nome === nomePet);
        if (pet) racasDisponiveis.add(pet.raca);
      });

      setSimpleAvailableRacas(Array.from(racasDisponiveis));
      setSelectedClienteId("");
      setFormData({
        ...formData,
        pet: nomePet,
        cliente: "",
        raca: "",
        whatsapp: ""
      });
    }
    setSimpleFilteredPets([]);
  };

  // Preencher WhatsApp quando raça é selecionada (Agendamento Simples)
  const handleSimpleRacaSelect = (raca: string) => {
    let clienteCorreto: Cliente | undefined;
    let petEncontrado: Pet | undefined;

    if (selectedClienteId) {
      // Priorizar busca pelo ID do cliente já selecionado
      const cliente = clientes.find((c) => c.id === selectedClienteId);
      if (cliente) {
        const pet = cliente.pets.find((p) => p.nome === formData.pet && p.raca === raca);
        if (pet) {
          clienteCorreto = cliente;
          petEncontrado = pet;
        }
      }
    } else if (formData.cliente) {
      const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === formData.cliente);
      for (const cliente of clientesComMesmoNome) {
        const pet = cliente.pets.find((p) => p.nome === formData.pet && p.raca === raca);
        if (pet) {
          clienteCorreto = cliente;
          petEncontrado = pet;
          break;
        }
      }
    } else if (formData.pet) {
      clienteCorreto = clientes.find((c) => c.pets.some((p) => p.nome === formData.pet && p.raca === raca));

      if (clienteCorreto) {
        petEncontrado = clienteCorreto.pets.find((p) => p.nome === formData.pet && p.raca === raca);
      }
    }

    if (clienteCorreto && petEncontrado) {
      setSelectedClienteId(clienteCorreto.id);
      setFormData({
        ...formData,
        cliente: clienteCorreto.nomeCliente,
        pet: petEncontrado.nome,
        raca: petEncontrado.raca,
        whatsapp: clienteCorreto.whatsapp
      });
      setSimpleClienteSearch(clienteCorreto.nomeCliente);
      setSimplePetSearch(petEncontrado.nome);
      setSimpleFilteredClientes([]);
      setSimpleAvailableRacas([]);
    }
  };
  // Generate 30-min interval time slots for week view
  const horarios = useMemo(() => {
    const slots: string[] = [];
    const [startH] = (empresaConfig.horarioInicio || "08:00").split(":").map(Number);
    const [endH] = (empresaConfig.horarioFim || "18:00").split(":").map(Number);
    for (let h = startH; h <= endH; h++) {
      slots.push(`${String(h).padStart(2, "0")}:00`);
      if (h < endH) slots.push(`${String(h).padStart(2, "0")}:30`);
    }
    return slots;
  }, [empresaConfig.horarioInicio, empresaConfig.horarioFim]);

  // Helper: convert "HH:MM" to minutes from midnight
  const timeToMinutes = (t: string): number => {
    if (!t) return 0;
    const [h, m] = t.substring(0, 5).split(":").map(Number);
    return h * 60 + (m || 0);
  };

  // Get all unified items for a given date (for absolute positioning in week view)
  const getUnifiedForDate = (date: Date): AgendamentoUnificado[] => {
    const dateStr = formatDateForInput(date);
    const items: AgendamentoUnificado[] = [];
    agendamentos.filter(a => a.data === dateStr).forEach(ag => {
      items.push({
        id: ag.id, tipo: "simples", data: ag.data,
        horarioInicio: ag.horario, horarioTermino: ag.horarioTermino,
        cliente: ag.cliente, pet: ag.pet, raca: ag.raca, servico: ag.servico,
        nomePacote: "", numeroPacote: "", taxiDog: ag.taxiDog || "",
        dataVenda: ag.dataVenda, whatsapp: ag.whatsapp,
        tempoServico: ag.tempoServico || "", groomer: ag.groomer || "",
        agendamentoOriginal: ag
      });
    });
    agendamentosPacotes.forEach(p => {
      p.servicos.filter(s => s.data === dateStr).forEach(s => {
        const extras = (s as any).servicosExtras || [];
        const nomesExtras = extras.map((e: any) => e.nome).join(' + ');
        const servicoCompleto = nomesExtras ? `${s.nomeServico} + ${nomesExtras}` : s.nomeServico;
        items.push({
          id: `${p.id}-${s.numero}`, tipo: "pacote", data: s.data,
          horarioInicio: s.horarioInicio, horarioTermino: s.horarioTermino,
          cliente: p.nomeCliente, pet: p.nomePet, raca: p.raca,
          servico: servicoCompleto, nomePacote: p.nomePacote, numeroPacote: s.numero,
          taxiDog: p.taxiDog, dataVenda: p.dataVenda, whatsapp: p.whatsapp,
          tempoServico: s.tempoServico, groomer: (s as any).groomer || "",
          pacoteOriginal: p, servicoOriginal: s
        });
      });
    });
    return items.sort((a, b) => (a.horarioInicio || "").localeCompare(b.horarioInicio || ""));
  };
  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const mapDiaSemana = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'] as const;

  // Sincronizar Data da Venda com Data do Agendamento
  useEffect(() => {
    if (formData.data && !dataVendaManual) {
      setFormData((prev) => ({
        ...prev,
        dataVenda: formData.data
      }));
    }
  }, [formData.data, dataVendaManual]);
  const getWeekDates = () => {
    const today = new Date(selectedDate);
    const currentDay = today.getDay();
    const diff = today.getDate() - currentDay;
    const sunday = new Date(today.setDate(diff));
    return Array.from(
      {
        length: 7
      },
      (_, i) => {
        const date = new Date(sunday);
        date.setDate(sunday.getDate() + i);
        return date;
      }
    );
  };
  const weekDates = getWeekDates();

  // Filtrar apenas dias de funcionamento
  const filteredWeekDates = weekDates.filter((date) => {
    const dayIndex = date.getDay();
    const dayName = mapDiaSemana[dayIndex];
    return empresaConfig.diasFuncionamento[dayName];
  });

  // Funções para buscar TODOS os agendamentos de um slot (por hora, não horário exato)
  const getHourFromTime = (time: string): string => {
    if (!time) return "";
    return time.substring(0, 2);
  };

  const getAllAgendamentosForSlot = (date: Date, horario: string) => {
    const dateStr = formatDateForInput(date);
    const slotHour = getHourFromTime(horario);
    return agendamentos
      .filter((a) => a.data === dateStr && getHourFromTime(a.horario) === slotHour)
      .sort((a, b) => (a.horario || "").localeCompare(b.horario || ""));
  };

  const getAllPacotesForSlot = (date: Date, horario: string) => {
    const dateStr = formatDateForInput(date);
    const slotHour = getHourFromTime(horario);
    return agendamentosPacotes
      .filter((p) =>
        p.servicos.some((s) => s.data === dateStr && getHourFromTime(s.horarioInicio) === slotHour)
      )
      .sort((a, b) => {
        const aTime = a.servicos.find((s) => s.data === dateStr && getHourFromTime(s.horarioInicio) === slotHour)?.horarioInicio || "";
        const bTime = b.servicos.find((s) => s.data === dateStr && getHourFromTime(s.horarioInicio) === slotHour)?.horarioInicio || "";
        return aTime.localeCompare(bTime);
      });
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || salvando) return;

    // Validar se pelo menos um serviço foi selecionado
    const servicosValidos = servicosSelecionadosSimples.filter((s) => s.nome);
    if (servicosValidos.length === 0) {
      toast.error("Favor selecionar pelo menos um serviço");
      return;
    }

    if (!formData.data) {
      toast.error("Favor preencher a Data do Agendamento");
      return;
    }
    if (!formData.horario) {
      toast.error("Favor preencher o Horário de Início do Serviço");
      return;
    }
    if (!formData.tempoServico && !formData.horarioTermino) {
      toast.error("Favor preencher o Tempo do Serviço ou o Horário de Fim do Serviço");
      return;
    }
    if (!formData.dataVenda) {
      toast.error("Favor preencher a Data da Venda do Serviço");
      return;
    }
    if (!formData.taxiDog) {
      toast.error("Favor selecionar a opção se será necessário o uso de Taxi Dog!");
      return;
    }
    if (isPacoteSelecionado && !formData.numeroServicoPacote) {
      toast.error("Favor selecionar o número do serviço!");
      return;
    }

    // Validar horários e serviços dos pets adicionais
    for (const ap of additionalPets) {
      if (!ap.horario) {
        toast.error(`Favor preencher o Horário de Início para o pet ${ap.petName}`);
        return;
      }
      if (!ap.tempoServico && !ap.horarioTermino) {
        toast.error(`Favor preencher o Tempo de Serviço ou Horário de Fim para o pet ${ap.petName}`);
        return;
      }
      const apServicosValidos = ap.servicos.filter(s => s.nome);
      if (apServicosValidos.length === 0) {
        toast.error(`Favor selecionar pelo menos um serviço para o pet ${ap.petName}`);
        return;
      }
    }

    // Validar cliente_id obrigatório
    if (!selectedClienteId) {
      toast.error("Não foi possível vincular o cliente. Selecione o cliente novamente.");
      return;
    }

    const horarioTermino = formData.horarioTermino || calcularHorarioTermino(formData.horario, formData.tempoServico);

    if (horarioTermino && formData.horario && horarioTermino <= formData.horario) {
      toast.error("O Horário de Fim não pode ser igual ou anterior ao Horário de Início. Por favor, corrija.");
      return;
    }

    // Criar string concatenada para exibição no calendário
    const servicosNomes = servicosValidos.map((s) => s.nome).join(" + ");

    setSalvando(true);
    try {
      // Inserir agendamento principal e obter o ID
      const { data: agendamentoData, error } = await supabase.from("agendamentos").insert([
      {
        user_id: ownerId,
        cliente_id: selectedClienteId,
        cliente: formData.cliente,
        pet: formData.pet,
        raca: formData.raca,
        whatsapp: formData.whatsapp,
        servico: servicosNomes,
        servicos: servicosValidos.map((s) => ({ nome: s.nome, valor: s.valor })),
        data: formData.data,
        horario: formData.horario,
        tempo_servico: formData.tempoServico,
        horario_termino: horarioTermino,
        data_venda: formData.dataVenda,
        numero_servico_pacote: formData.numeroServicoPacote || null,
        groomer: formData.groomer,
        taxi_dog: formData.taxiDog,
        status: "confirmado"
      }]
      ).select("id").single();

      if (error) throw error;

      // Coletar todos os IDs de agendamento e serviços por pet para lançamento consolidado
      const allAgendamentoIds: string[] = [agendamentoData.id];
      const allPetServicos: Array<{ petName: string; servicos: Array<{ nome: string; valor: number }> }> = [
        { petName: formData.pet, servicos: servicosValidos.map(s => ({ nome: s.nome, valor: s.valor })) }
      ];

      // Agendar mensagens WhatsApp automáticas para pet principal
      try {
        let sexoPet = "";
        for (const cliente of clientes) {
          const pet = cliente.pets.find(p => p.nome === formData.pet && p.raca === formData.raca);
          if (pet) { sexoPet = pet.sexo || ""; break; }
        }

        const isPacote = !!formData.numeroServicoPacote;
        let isUltimoServicoPacote = false;
        if (isPacote && formData.numeroServicoPacote) {
          const parts = formData.numeroServicoPacote.split("/");
          if (parts.length === 2 && parts[0] === parts[1]) {
            isUltimoServicoPacote = true;
          }
        }

        await scheduleWhatsAppMessages({
          userId: ownerId || user.id,
          agendamentoId: agendamentoData.id,
          nomeCliente: formData.cliente,
          nomePet: formData.pet,
          sexoPet,
          raca: formData.raca,
          whatsapp: formData.whatsapp,
          dataAgendamento: formData.data,
          horarioInicio: formData.horario,
          servicos: servicosNomes,
          taxiDog: formData.taxiDog,
          bordao: empresaConfig.bordao,
          isPacote,
          isUltimoServicoPacote,
          servicoNumero: formData.numeroServicoPacote || undefined,
        });
      } catch (schedErr) {
        console.error("Erro ao agendar mensagens WhatsApp:", schedErr);
      }

      // Criar agendamentos para pets adicionais (cada um com seus próprios serviços e groomer)
      for (const ap of additionalPets) {
        const apHorarioTermino = ap.horarioTermino || calcularHorarioTermino(ap.horario, ap.tempoServico);
        const apServicosValidos = ap.servicos.filter(s => s.nome);
        const apServicosNomes = apServicosValidos.map(s => s.nome).join(" + ");
        try {
          const { data: apData, error: apError } = await supabase.from("agendamentos").insert([{
            user_id: ownerId,
            cliente_id: selectedClienteId,
            cliente: formData.cliente,
            pet: ap.petName,
            raca: ap.raca,
            whatsapp: formData.whatsapp,
            servico: apServicosNomes,
            servicos: apServicosValidos.map((s) => ({ nome: s.nome, valor: s.valor })),
            data: formData.data,
            horario: ap.horario,
            tempo_servico: ap.tempoServico,
            horario_termino: apHorarioTermino,
            data_venda: formData.dataVenda,
            numero_servico_pacote: formData.numeroServicoPacote || null,
            groomer: ap.groomer || formData.groomer,
            taxi_dog: formData.taxiDog,
            status: "confirmado"
          }]).select("id").single();

          if (!apError && apData) {
            allAgendamentoIds.push(apData.id);
            allPetServicos.push({ petName: ap.petName, servicos: apServicosValidos.map(s => ({ nome: s.nome, valor: s.valor })) });

            // WhatsApp para pet adicional
            try {
              let sexoPetAd = "";
              for (const cliente of clientes) {
                const pet = cliente.pets.find(p => p.nome === ap.petName && p.raca === ap.raca);
                if (pet) { sexoPetAd = pet.sexo || ""; break; }
              }
              await scheduleWhatsAppMessages({
                userId: ownerId || user.id,
                agendamentoId: apData.id,
                nomeCliente: formData.cliente,
                nomePet: ap.petName,
                sexoPet: sexoPetAd,
                raca: ap.raca,
                whatsapp: formData.whatsapp,
                dataAgendamento: formData.data,
                horarioInicio: ap.horario,
                servicos: apServicosNomes,
                taxiDog: formData.taxiDog,
                bordao: empresaConfig.bordao,
                isPacote: !!formData.numeroServicoPacote,
                isUltimoServicoPacote: false,
                servicoNumero: formData.numeroServicoPacote || undefined,
              });
            } catch (schedErr) {
              console.error("Erro ao agendar WhatsApp para pet adicional:", schedErr);
            }
          }
        } catch (apErr) {
          console.error(`Erro ao criar agendamento para ${ap.petName}:`, apErr);
        }
      }

      // Criar UM ÚNICO lançamento financeiro consolidado com todos os pets e serviços
      await criarLancamentoFinanceiroConsolidado({
        agendamentoIds: allAgendamentoIds,
        nomeCliente: formData.cliente,
        petServicos: allPetServicos,
        dataAgendamento: formData.data,
        dataVenda: formData.dataVenda,
        ownerId: ownerId || user.id
      });

      const totalAgendamentos = 1 + additionalPets.length;
      toast.success(`${totalAgendamentos} agendamento(s) criado(s) com sucesso!`);
      await loadAgendamentos();
      resetForm();
    } catch (error) {
      console.error("Erro ao criar agendamento:", error);
      toast.error("Erro ao criar agendamento");
    } finally {
      setSalvando(false);
    }
  };
  const resetForm = () => {
    setFormData({
      cliente: "",
      pet: "",
      raca: "",
      whatsapp: "",
      servico: "",
      data: "",
      horario: "",
      tempoServico: "",
      horarioTermino: "",
      dataVenda: "",
      numeroServicoPacote: "",
      groomer: "",
      taxiDog: ""
    });
    setIsPacoteSelecionado(false);
    setDataVendaManual(false);
    setSimpleClienteSearch("");
    setSimplePetSearch("");
    setSimpleFilteredClientes([]);
    setSimpleFilteredPets([]);
    setSimpleAvailableRacas([]);
    setSimpleSearchStartedWith(null);
    setSimpleWhatsappSearch("");
    setSimpleFilteredWhatsapp([]);
    setServicosSelecionadosSimples([{ instanceId: crypto.randomUUID(), nome: "", valor: 0 }]);
    setOpenServicoComboboxIndex(null);
    setOpenAdditionalServicoCombobox(null);
    setAdditionalPets([]);
    setShowAdditionalPetsPopover(false);
    setSelectedClienteId("");
    setIsDialogOpen(false);
  };
  const resetPacoteForm = () => {
    setPacoteFormData({
      nomeCliente: "",
      nomePet: "",
      raca: "",
      whatsapp: "",
      nomePacote: "",
      taxiDog: "",
      dataVenda: ""
    });
    setServicosAgendamento([]);
    setClienteSearch("");
    setPetSearch("");
    setFilteredClientes([]);
    setFilteredPets([]);
    setAvailableRacas([]);
    setSearchStartedWith(null);
    setPacoteWhatsappSearch("");
    setPacoteFilteredWhatsapp([]);
    setSelectedPacoteClienteId("");
    setPacoteAdditionalPets([]);
    setShowPacoteAdditionalPetsPopover(false);
    setPacoteAdditionalCalendarIndex(null);
    setIsPacoteDialogOpen(false);
  };

  // Funções para gerenciar múltiplos serviços no agendamento simples
  const adicionarServicoSimples = () => {
    setServicosSelecionadosSimples([
    ...servicosSelecionadosSimples,
    { instanceId: crypto.randomUUID(), nome: "", valor: 0 }]
    );
  };

  const removerServicoSimples = (instanceId: string) => {
    if (servicosSelecionadosSimples.length > 1) {
      setServicosSelecionadosSimples(
        servicosSelecionadosSimples.filter((s) => s.instanceId !== instanceId)
      );
    }
  };

  const atualizarServicoSimples = (instanceId: string, servicoIdOrNome: string) => {
    const id = servicoIdOrNome.includes("__") ? servicoIdOrNome.split("__").pop() : null;
    const servicoEncontrado = id ? servicos.find((s) => s.id === id) : servicos.find((s) => s.nome === servicoIdOrNome);
    setServicosSelecionadosSimples(
      servicosSelecionadosSimples.map((s) =>
      s.instanceId === instanceId ?
      { ...s, nome: servicoEncontrado?.nome || servicoIdOrNome, valor: servicoEncontrado?.valor || 0 } :
      s
      )
    );
    setOpenServicoComboboxIndex(null);
  };

  const handlePacoteSelect = (nomePacote: string) => {
    setPacoteFormData({
      ...pacoteFormData,
      nomePacote
    });
    const pacoteSelecionado = pacotes.find((p) => p.nome === nomePacote);
    if (pacoteSelecionado) {
      const buildServicosInit = (): ServicoAgendamento[] => pacoteSelecionado.servicos.map((servico, index) => {
        const total = pacoteSelecionado.servicos.length;
        const numero = `${String(index + 1).padStart(2, "0")}/${String(total).padStart(2, "0")}`;
        const extras = ((servico as any).servicosExtras || []).map((e: any) => ({
          ...e,
          nativo: true,
        }));
        return {
          numero,
          nomeServico: servico.nome,
          data: "",
          horarioInicio: "",
          tempoServico: "",
          horarioTermino: "",
          servicosExtras: extras
        };
      });
      setServicosAgendamento(buildServicosInit());
      // Sincronizar todos os pets adicionais com o novo pacote
      if (pacoteAdditionalPets.length > 0) {
        setPacoteAdditionalPets(prev => prev.map(ap => ({
          ...ap,
          servicosAgendamento: buildServicosInit(),
        })));
      }
    }
  };

  // Calcular horário de término
  const calcularHorarioTermino = (inicio: string, tempo: string): string => {
    if (!inicio || !tempo) return "";
    if (!inicio.includes(":") || !tempo.includes(":")) return "";
    const [inicioH, inicioM] = inicio.split(":").map(Number);
    const [tempoH, tempoM] = tempo.split(":").map(Number);
    if (isNaN(inicioH) || isNaN(inicioM) || isNaN(tempoH) || isNaN(tempoM)) return "";
    const totalMinutos = inicioH * 60 + inicioM + (tempoH * 60 + tempoM);
    const fimH = Math.floor(totalMinutos / 60);
    const fimM = totalMinutos % 60;
    return `${String(fimH).padStart(2, "0")}:${String(fimM).padStart(2, "0")}`;
  };

  // Calcular tempo de serviço (inverso do calcularHorarioTermino)
  const calcularTempoServico = (inicio: string, fim: string): string => {
    if (!inicio || !fim) return "";
    const [inicioH, inicioM] = inicio.split(":").map(Number);
    const [fimH, fimM] = fim.split(":").map(Number);
    if (isNaN(inicioH) || isNaN(inicioM) || isNaN(fimH) || isNaN(fimM)) return "";
    let diffMinutos = (fimH * 60 + fimM) - (inicioH * 60 + inicioM);
    if (diffMinutos <= 0) return "";
    const h = Math.floor(diffMinutos / 60);
    const m = diffMinutos % 60;
    return `${h}:${String(m).padStart(2, "0")}`;
  };

  // Adicionar serviço extra a um serviço do pacote durante agendamento
  const handleAddServicoExtraAgendamento = (index: number, servicoId: string) => {
    const servicoExtra = servicos.find(s => s.id === servicoId);
    if (!servicoExtra) return;
    const updated = [...servicosAgendamento];
    const extras = updated[index].servicosExtras || [];
    if (extras.some(e => e.id === servicoId)) {
      toast.error("Este serviço extra já foi adicionado");
      return;
    }
    updated[index] = {
      ...updated[index],
      servicosExtras: [...extras, { id: servicoExtra.id, nome: servicoExtra.nome, valor: servicoExtra.valor }]
    };
    setServicosAgendamento(updated);
  };

  // Remover serviço extra de um serviço do pacote durante agendamento
  const handleRemoveServicoExtraAgendamento = (index: number, servicoExtraId: string) => {
    const updated = [...servicosAgendamento];
    updated[index] = {
      ...updated[index],
      servicosExtras: (updated[index].servicosExtras || []).filter(e => e.id !== servicoExtraId)
    };
    setServicosAgendamento(updated);
  };

  // Atualizar serviço individual
  const handleServicoAgendamentoChange = (index: number, field: keyof ServicoAgendamento, value: string) => {
    const updated = [...servicosAgendamento];
    updated[index] = {
      ...updated[index],
      [field]: value
    };

    // Calcular horário de término
    if (field === "horarioInicio" || field === "tempoServico") {
      const horarioInicio = field === "horarioInicio" ? value : updated[index].horarioInicio;
      const tempoServico = field === "tempoServico" ? value : updated[index].tempoServico;
      if (horarioInicio && tempoServico) {
        updated[index].horarioTermino = calcularHorarioTermino(horarioInicio, tempoServico);
      }
    }
    setServicosAgendamento(updated);
  };

  // Mover serviço para cima/baixo
  const moveServico = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === servicosAgendamento.length - 1) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    const updated = [...servicosAgendamento];
    const temp = updated[index];
    updated[index] = updated[newIndex];
    updated[newIndex] = temp;

    // Renumerar
    updated.forEach((servico, idx) => {
      servico.numero = `${String(idx + 1).padStart(2, "0")}/${String(updated.length).padStart(2, "0")}`;
    });
    setServicosAgendamento(updated);
  };
  const handlePacoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || salvando) return;

    if (!pacoteFormData.nomeCliente.trim()) {
      toast.error("Favor preencher o Nome do Cliente");
      return;
    }
    if (!pacoteFormData.nomePet.trim()) {
      toast.error("Favor preencher o Nome do Pet");
      return;
    }
    if (!pacoteFormData.raca) {
      toast.error("Favor selecionar a Raça");
      return;
    }
    if (!pacoteFormData.nomePacote) {
      toast.error("Favor selecionar o Pacote");
      return;
    }
    if (!pacoteFormData.taxiDog) {
      toast.error("Favor responder se necessita Taxi Dog");
      return;
    }
    if (!pacoteFormData.dataVenda) {
      toast.error("Favor preencher a Data da Venda");
      return;
    }

    // Validar serviços do pet principal
    for (let i = 0; i < servicosAgendamento.length; i++) {
      const servico = servicosAgendamento[i];
      if (!servico.data) {
        toast.error(`Favor preencher a Data do serviço ${servico.numero} (${pacoteFormData.nomePet})`);
        return;
      }
      if (!servico.horarioInicio) {
        toast.error(`Favor preencher o Horário de Início do serviço ${servico.numero} (${pacoteFormData.nomePet})`);
        return;
      }
      if (!servico.tempoServico) {
        toast.error(`Favor preencher o Tempo de Serviço do serviço ${servico.numero} (${pacoteFormData.nomePet})`);
        return;
      }
    }

    // Validar serviços dos pets adicionais
    for (const addPet of pacoteAdditionalPets) {
      for (let i = 0; i < addPet.servicosAgendamento.length; i++) {
        const servico = addPet.servicosAgendamento[i];
        if (!servico.data) {
          toast.error(`Favor preencher a Data do serviço ${servico.numero} (${addPet.petName})`);
          return;
        }
        if (!servico.horarioInicio) {
          toast.error(`Favor preencher o Horário de Início do serviço ${servico.numero} (${addPet.petName})`);
          return;
        }
        if (!servico.tempoServico) {
          toast.error(`Favor preencher o Tempo de Serviço do serviço ${servico.numero} (${addPet.petName})`);
          return;
        }
      }
    }

    // Validar consistência cliente + whatsapp contra o cadastro
    const whatsappNorm = pacoteFormData.whatsapp.replace(/\D/g, "");
    const clienteCadastro = clientes.find(c => c.whatsapp.replace(/\D/g, "") === whatsappNorm);
    if (clienteCadastro && clienteCadastro.nomeCliente.trim() !== pacoteFormData.nomeCliente.trim()) {
      toast.error(`O número de WhatsApp informado pertence ao cliente "${clienteCadastro.nomeCliente}", mas o nome preenchido é "${pacoteFormData.nomeCliente}". Corrija antes de salvar.`);
      return;
    }

    setSalvando(true);
    try {
      // Montar lista de todos os pets a criar (principal + adicionais)
      const allPetsToCreate = [
        { petName: pacoteFormData.nomePet, raca: pacoteFormData.raca, servicosAgendamento },
        ...pacoteAdditionalPets,
      ];

      for (const petData of allPetsToCreate) {
        // Inserir registro de pacote para este pet
        const { error } = await supabase.from("agendamentos_pacotes").insert([{
          user_id: ownerId,
          nome_cliente: pacoteFormData.nomeCliente,
          nome_pet: petData.petName,
          raca: petData.raca,
          whatsapp: pacoteFormData.whatsapp,
          nome_pacote: pacoteFormData.nomePacote,
          taxi_dog: pacoteFormData.taxiDog,
          data_venda: pacoteFormData.dataVenda,
          servicos: petData.servicosAgendamento as any
        }]);

        if (error) throw error;

        // Criar lançamento financeiro para este pet
        const primeiraDataServico = petData.servicosAgendamento[0]?.data || pacoteFormData.dataVenda;
        const todosExtras = petData.servicosAgendamento.flatMap(s => 
          (s.servicosExtras || []).filter(e => !e.nativo).map(e => ({ nome: e.nome, valor: e.valor }))
        );

        criarLancamentoFinanceiroPacote({
          nomeCliente: pacoteFormData.nomeCliente,
          nomePet: petData.petName,
          nomePacote: pacoteFormData.nomePacote,
          dataVenda: pacoteFormData.dataVenda,
          primeiraDataServico,
          ownerId: ownerId || "",
          servicosExtras: todosExtras.length > 0 ? todosExtras : undefined,
        });

        // Agendar mensagens WhatsApp para cada serviço deste pet
        try {
          let sexoPet = "";
          for (const cliente of clientes) {
            const pet = cliente.pets.find(p => p.nome === petData.petName && p.raca === petData.raca);
            if (pet) { sexoPet = pet.sexo || ""; break; }
          }

          // Buscar o ID do pacote recém-criado para este pet
          const { data: pacoteCriado } = await supabase
            .from("agendamentos_pacotes")
            .select("id")
            .eq("user_id", ownerId)
            .eq("nome_cliente", pacoteFormData.nomeCliente)
            .eq("nome_pet", petData.petName)
            .eq("nome_pacote", pacoteFormData.nomePacote)
            .eq("data_venda", pacoteFormData.dataVenda)
            .order("created_at", { ascending: false })
            .limit(1)
            .single();

          const pacoteId = pacoteCriado?.id;

          for (const servico of petData.servicosAgendamento) {
            if (!servico.data || !servico.horarioInicio) continue;

            const parts = servico.numero.split("/");
            const isUltimo = parts.length === 2 && parts[0] === parts[1];

            const servicoNomes = [servico.nomeServico, ...(servico.servicosExtras?.map(e => e.nome) || [])].filter(Boolean).join(" + ");

            await scheduleWhatsAppMessages({
              userId: ownerId || user.id,
              agendamentoPacoteId: pacoteId || undefined,
              servicoNumero: servico.numero,
              nomeCliente: pacoteFormData.nomeCliente,
              nomePet: petData.petName,
              sexoPet,
              raca: petData.raca,
              whatsapp: pacoteFormData.whatsapp,
              dataAgendamento: servico.data,
              horarioInicio: servico.horarioInicio,
              servicos: servicoNomes || pacoteFormData.nomePacote,
              taxiDog: pacoteFormData.taxiDog,
              bordao: empresaConfig.bordao,
              isPacote: true,
              isUltimoServicoPacote: isUltimo,
            });
          }
        } catch (schedErr) {
          console.error(`Erro ao agendar mensagens WhatsApp pacote (${petData.petName}):`, schedErr);
        }
      }

      const totalPets = allPetsToCreate.length;
      toast.success(`Pacote agendado com sucesso para ${totalPets} pet(s)!`);
      await loadAgendamentosPacotes();
      resetPacoteForm();
    } catch (error) {
      console.error("Erro ao agendar pacote:", error);
      toast.error("Erro ao agendar pacote");
    } finally {
      setSalvando(false);
    }
  };
  const getAgendamentoForSlot = (date: Date, horario: string) => {
    const dateStr = formatDateForInput(date);
    return agendamentos.find((a) => a.data === dateStr && a.horario === horario);
  };
  const getPacoteForSlot = (date: Date, horario: string) => {
    const dateStr = formatDateForInput(date);
    return agendamentosPacotes.find((a) => a.servicos.some((s) => s.data === dateStr && s.horarioInicio === horario));
  };
  const isHorarioOcupado = (date: Date, horario: string) => {
    return !!getAgendamentoForSlot(date, horario) || !!getPacoteForSlot(date, horario);
  };
  const navigateWeek = (direction: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction * 7);
    setSelectedDate(formatDateForInput(newDate));
  };

  // Contar agendamentos
  const contarAgendamentos = () => {
    if (viewMode === "semana") {
      let count = 0;
      weekDates.forEach((date) => {
        const dateStr = formatDateForInput(date);
        count += agendamentos.filter((a) => a.data === dateStr).length;
        agendamentosPacotes.forEach((p) => {
          count += p.servicos.filter((s) => s.data === dateStr).length;
        });
      });
      return count;
    } else {
      const dateStr = selectedDate;
      let count = agendamentos.filter((a) => a.data === dateStr).length;
      agendamentosPacotes.forEach((p) => {
        count += p.servicos.filter((s) => s.data === dateStr).length;
      });
      return count;
    }
  };

  // Gerar mensagem WhatsApp
  const gerarMensagemWhatsApp = (pacote: AgendamentoPacote, servico: ServicoAgendamento) => {
    const primeiroNomeCliente = pacote.nomeCliente.split(" ")[0];
    const nomeClienteFormatado =
    primeiroNomeCliente.charAt(0).toUpperCase() + primeiroNomeCliente.slice(1).toLowerCase();
    const primeiroNomePet = pacote.nomePet.split(" ")[0];
    const nomePetFormatado = primeiroNomePet.charAt(0).toUpperCase() + primeiroNomePet.slice(1).toLowerCase();
    const dataFormatada = new Date(servico.data + "T00:00:00").toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo"
    });

    const isUltimoServico = servico.numero.split("/")[0] === servico.numero.split("/")[1];
    let mensagem = `Oii, ${nomeClienteFormatado}! Passando apenas para confirmar o agendamento de ${nomePetFormatado} com a gente.\n`;
    mensagem += `*Dia:* ${dataFormatada}\n`;
    mensagem += `*Horario:* ${servico.horarioInicio}\n`;
    mensagem += `*Serviço:* ${servico.nomeServico}\n`;
    mensagem += `*Pacote:* ${pacote.nomePacote || "Serviço Avulso"}\n`;
    mensagem += `*Número do Agendamento:* ${servico.numero}\n\n`;
    if (isUltimoServico) {
      mensagem += `Percebi que este será o último banho do seu pacote. Que tal já garantirmos a renovação no próximo agendamento e mantermos os banhos sequenciais?\n\n`;
    }
    if (empresaConfig.bordao) {
      mensagem += `*${empresaConfig.bordao}*`;
    }
    const whatsappUrl = buildWhatsAppUrl(pacote.whatsapp, mensagem);
    if (!whatsappUrl) {
      toast.error(getInvalidPhoneMessage(pacote.whatsapp));
      return;
    }

    // Criar link dinâmico para evitar bloqueio
    const link = document.createElement("a");
    link.href = whatsappUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Gerar mensagem WhatsApp para agendamento simples
  const gerarMensagemWhatsAppSimples = (agendamento: Agendamento) => {
    const primeiroNomeCliente = agendamento.cliente.split(" ")[0];
    const nomeClienteFormatado =
    primeiroNomeCliente.charAt(0).toUpperCase() + primeiroNomeCliente.slice(1).toLowerCase();
    const primeiroNomePet = agendamento.pet.split(" ")[0];
    const nomePetFormatado = primeiroNomePet.charAt(0).toUpperCase() + primeiroNomePet.slice(1).toLowerCase();
    const dataFormatada = new Date(agendamento.data + "T00:00:00").toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo"
    });

    let mensagem = `Oii, ${nomeClienteFormatado}! Passando apenas para confirmar o agendamento de ${nomePetFormatado} com a gente.\n`;
    mensagem += `*Dia:* ${dataFormatada}\n`;
    mensagem += `*Horario:* ${agendamento.horario}\n`;
    mensagem += `*Serviço:* ${agendamento.servico}\n`;

    if (agendamento.taxiDog === "Sim") {
      mensagem += `\n⚠️ *Lembrete:* Você optou pelo Taxi Dog.\n`;
    }

    if (empresaConfig.bordao) {
      mensagem += `\n*${empresaConfig.bordao}*`;
    }

    const urlWhatsApp = buildWhatsAppUrl(agendamento.whatsapp, mensagem);
    if (!urlWhatsApp) {
      toast.error(getInvalidPhoneMessage(agendamento.whatsapp));
      return;
    }

    // Criar link dinâmico para evitar bloqueio
    const link = document.createElement("a");
    link.href = urlWhatsApp;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ========== FUNÇÕES AUXILIARES PARA FORMATAÇÃO ==========

  // Capitalizar primeira letra de cada palavra
  const capitalizarPrimeiraLetra = (texto: string): string => {
    if (!texto) return "";
    return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
  };

  // Obter apenas o primeiro nome
  const obterPrimeiroNome = (nomeCompleto: string): string => {
    if (!nomeCompleto) return "";
    const primeiroNome = nomeCompleto.trim().split(" ")[0];
    return capitalizarPrimeiraLetra(primeiroNome);
  };

  // Verificar se é o último serviço do pacote
  const ehUltimoServicoPacote = (numeroServico: string): boolean => {
    if (!numeroServico || !numeroServico.includes("/")) return false;
    const [atual, total] = numeroServico.split("/").map((n) => parseInt(n.trim()));
    return atual === total;
  };

  // Formatar número do pacote
  const formatarNumeroPacote = (numeroServico?: string): string => {
    if (!numeroServico || numeroServico.trim() === "") {
      return "Sem pacote.";
    }
    return numeroServico;
  };

  // Gerar URL do WhatsApp sem abrir (para uso em links nativos)
  const gerarUrlWhatsAppSimples = (agendamento: Agendamento): string => {
    const primeiroNome = obterPrimeiroNome(agendamento.cliente);
    const nomePet = capitalizarPrimeiraLetra(agendamento.pet);
    const nomeServico = capitalizarPrimeiraLetra(agendamento.servico);
    const dataFormatada = new Date(agendamento.data + "T00:00:00").toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo"
    });

    const horarioFormatado = agendamento.horario.substring(0, 5); // HH:MM
    const numeroPacote = formatarNumeroPacote(agendamento.numeroServicoPacote);
    const taxiDog = agendamento.taxiDog === "Sim" ? "Sim" : "Não";

    let mensagem = `Oii, ${primeiroNome}! Passando apenas para confirmar o agendamento de ${nomePet} com a gente.\n\n`;
    mensagem += `*Dia:* ${dataFormatada}\n`;
    mensagem += `*Horario:* ${horarioFormatado}\n`;
    mensagem += `*Serviço:* ${nomeServico}\n`;
    mensagem += `*N° do Pacote:* ${numeroPacote}\n`;
    mensagem += `*Taxi Dog:* ${taxiDog}\n`;

    // Se for último serviço do pacote, adicionar mensagem especial
    if (agendamento.numeroServicoPacote && ehUltimoServicoPacote(agendamento.numeroServicoPacote)) {
      mensagem += `\nPercebi que este será o último banho do seu pacote. Que tal já garantirmos a renovação no próximo agendamento e mantermos os banhos sequenciais?\n`;
    }

    if (empresaConfig.bordao) {
      mensagem += `\n*${empresaConfig.bordao}*`;
    }

    return buildWhatsAppUrl(agendamento.whatsapp, mensagem) ?? "";
  };

  // Gerar URL do WhatsApp para pacote sem abrir (para uso em links nativos)
  const gerarUrlWhatsAppPacote = (pacote: AgendamentoPacote, servico: ServicoAgendamento): string => {
    const primeiroNome = obterPrimeiroNome(pacote.nomeCliente);
    const nomePet = capitalizarPrimeiraLetra(pacote.nomePet);
    const nomePacote = capitalizarPrimeiraLetra(pacote.nomePacote);
    const dataFormatada = new Date(servico.data + "T00:00:00").toLocaleDateString("pt-BR", {
      timeZone: "America/Sao_Paulo"
    });

    const horarioFormatado = servico.horarioInicio.substring(0, 5); // HH:MM
    const numeroPacote = servico.numero; // Ex: "03/04"
    const taxiDog = pacote.taxiDog === "Sim" ? "Sim" : "Não";

    let mensagem = `Oii, ${primeiroNome}! Passando apenas para confirmar o agendamento de ${nomePet} com a gente.\n\n`;
    mensagem += `*Dia:* ${dataFormatada}\n`;
    mensagem += `*Horario:* ${horarioFormatado}\n`;
    mensagem += `*Serviço:* ${nomePacote}\n`;
    mensagem += `*N° do Pacote:* ${numeroPacote}\n`;
    mensagem += `*Taxi Dog:* ${taxiDog}\n`;

    // Se for último serviço do pacote, adicionar mensagem especial
    if (ehUltimoServicoPacote(numeroPacote)) {
      mensagem += `\nPercebi que este será o último banho do seu pacote. Que tal já garantirmos a renovação no próximo agendamento e mantermos os banhos sequenciais?\n`;
    }

    if (empresaConfig.bordao) {
      mensagem += `\n*${empresaConfig.bordao}*`;
    }

    return buildWhatsAppUrl(pacote.whatsapp, mensagem) ?? "";
  };

  // Copiar link do WhatsApp para clipboard e mostrar notificação
  const copiarLinkWhatsApp = async (url: string, e: React.MouseEvent) => {
    e.stopPropagation();

    try {
      await navigator.clipboard.writeText(url);
      toast.success("✅ Link copiado!", {
        description: "Cole no navegador (Ctrl+V) para abrir o WhatsApp",
        duration: 5000
      });
    } catch (error) {
      console.error("Erro ao copiar link:", error);
      toast.error("⚠️ Não foi possível copiar", {
        description: "Tente novamente ou copie manualmente",
        duration: 4000
      });
    }
  };

  // Abrir link do WhatsApp em nova aba (fallback)
  const abrirWhatsApp = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(url, '_blank');
  };

  // Obter sexo do pet pelo nome do pet e nome do cliente
  const obterSexoPet = (nomePet: string, nomeCliente: string): string => {
    const cliente = clientes.find(c => 
      c.nomeCliente.toLowerCase().trim() === nomeCliente.toLowerCase().trim()
    );
    if (cliente) {
      const pet = cliente.pets.find(p => 
        p.nome.toLowerCase().trim() === nomePet.toLowerCase().trim()
      );
      if (pet?.sexo) return pet.sexo;
    }
    return "Macho"; // default
  };

  const getSexoPrefix = (sexo: string, tipo: "do" | "o" | "ele"): string => {
    const isFemea = sexo?.toLowerCase() === "fêmea" || sexo?.toLowerCase() === "femea";
    if (tipo === "do") return isFemea ? "da" : "do";
    if (tipo === "o") return isFemea ? "a" : "o";
    if (tipo === "ele") return isFemea ? "ela" : "ele";
    return "do";
  };

  // Processar fila de envios com intervalo de 10s
  const processarFilaEnvios = async () => {
    if (processingQueueRef.current) return;
    processingQueueRef.current = true;
    
    while (sendQueueRef.current.length > 0) {
      const now = Date.now();
      const timeSinceLast = now - lastSendTimestampRef.current;
      if (timeSinceLast < 10000) {
        await new Promise(resolve => setTimeout(resolve, 10000 - timeSinceLast));
      }
      const task = sendQueueRef.current.shift();
      if (task) {
        lastSendTimestampRef.current = Date.now();
        await task();
      }
    }
    
    processingQueueRef.current = false;
  };

  // Enviar WhatsApp direto via Evolution API (aceita AgendamentoUnificado ou agendamentoDia)
  const enviarWhatsAppDireto = (agendamento: any, e: React.MouseEvent) => {
    e.stopPropagation();

    const clienteNome = agendamento.cliente || "";
    const petNome = agendamento.pet || "";

    // Anti-spam: verificar cooldown de 30 minutos
    if (!canSend(clienteNome, petNome, "whatsapp")) return;

    if (!whatsappConnected || !whatsappInstanceName) {
      // Fallback: abrir wa.me
      toast.info("WhatsApp não conectado. Abrindo link manual...");
      registerSend(clienteNome, petNome, "whatsapp");
      if (agendamento.tipo === "pacote" && (agendamento.pacoteOriginal || agendamento.agendamentoPacote) && (agendamento.servicoOriginal || agendamento.servicoAgendamento)) {
        const pacote = agendamento.pacoteOriginal || agendamento.agendamentoPacote;
        const servico = agendamento.servicoOriginal || agendamento.servicoAgendamento;
        window.open(gerarUrlWhatsAppPacote(pacote, servico), '_blank');
      } else if (agendamento.tipo === "simples" && (agendamento.agendamentoOriginal || agendamento.agendamento)) {
        window.open(gerarUrlWhatsAppSimples(agendamento.agendamentoOriginal || agendamento.agendamento), '_blank');
      }
      return;
    }

    const sexoPet = obterSexoPet(agendamento.pet, agendamento.cliente);
    const primeiroNome = obterPrimeiroNome(agendamento.cliente);
    const nomePet = capitalizarPrimeiraLetra(agendamento.pet);
    const doDa = getSexoPrefix(sexoPet, "do");
    
    // Obter data - pode vir de agendamento.data ou do sub-objeto
    const dataStr = agendamento.data || 
      agendamento.agendamentoOriginal?.data || 
      agendamento.agendamento?.data ||
      agendamento.servicoAgendamento?.data ||
      agendamento.servicoOriginal?.data ||
      selectedDate;
    const dataFormatada = new Date(dataStr + "T00:00:00").toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
    const horarioFormatado = agendamento.horarioInicio.substring(0, 5);
    const taxiDog = agendamento.taxiDog === "Sim" ? "Sim" : "Não";
    const servicoNome = capitalizarPrimeiraLetra(agendamento.servico);
    const bordaoLine = empresaConfig.bordao ? `\n\n*${empresaConfig.bordao}*` : "";

    let mensagem = "";

    const isPacote = agendamento.tipo === "pacote" && agendamento.numeroPacote && agendamento.numeroPacote.trim() !== "";
    const isUltimo = isPacote && ehUltimoServicoPacote(agendamento.numeroPacote);

    if (!isPacote) {
      mensagem = `Oi, ${primeiroNome}! Passando apenas para confirmar o agendamento ${doDa} ${nomePet} com a gente.\n\n*Dia:* ${dataFormatada}\n*Horario:* ${horarioFormatado}\n*Serviço:* ${servicoNome}\n*Pacote de serviços:* Sem Pacote 😕\n*Taxi Dog:* ${taxiDog}${bordaoLine}`;
    } else if (isUltimo) {
      mensagem = `Oi, ${primeiroNome}! Passando apenas para confirmar o agendamento ${doDa} ${nomePet} com a gente.\n\n*Dia:* ${dataFormatada}\n*Horario:* ${horarioFormatado}\n*Serviço:* ${servicoNome}\n*N° do Pacote:* ${agendamento.numeroPacote}\n*Taxi Dog:* ${taxiDog}\n\nNotei que hoje finalizamos o pacote atual. Recomendo já renovar para manter a frequência ideal dos banhos ${doDa} ${nomePet}. Que tal já renovar agora e garantir os próximos horários disponíveis? 😊${bordaoLine}`;
    } else {
      mensagem = `Oi, ${primeiroNome}! Passando apenas para confirmar o agendamento ${doDa} ${nomePet} com a gente.\n\n*Dia:* ${dataFormatada}\n*Horario:* ${horarioFormatado}\n*Serviço:* ${servicoNome}\n*N° do Pacote:* ${agendamento.numeroPacote}\n*Taxi Dog:* ${taxiDog}${bordaoLine}`;
    }

    // Obter número WhatsApp do sub-objeto correto
    const whatsappRaw = agendamento.whatsapp || 
      agendamento.agendamentoOriginal?.whatsapp || 
      agendamento.agendamento?.whatsapp ||
      agendamento.agendamentoPacote?.whatsapp ||
      agendamento.pacoteOriginal?.whatsapp || "";
    const numero = normalizeBrazilPhone(whatsappRaw);
    if (!numero) {
      toast.error(getInvalidPhoneMessage(whatsappRaw));
      return;
    }

    // Determine IDs for marking as sent
    const agendamentoId = agendamento.tipo === "simples" 
      ? (agendamento.agendamentoOriginal?.id || agendamento.agendamento?.id) 
      : null;
    const agendamentoPacoteId = agendamento.tipo === "pacote"
      ? (agendamento.pacoteOriginal?.id || agendamento.agendamentoPacote?.id)
      : null;
    const servicoNumero = agendamento.numeroPacote || null;

    const sendTask = async () => {
      try {
        const res = await supabase.functions.invoke("evolution-api", {
          body: { action: "send-message", instanceName: whatsappInstanceName, number: numero, text: mensagem }
        });
        if (res.error) {
          const detail = res.data?.error || res.data?.details || res.error?.message || "Erro desconhecido";
          throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
        }
        toast.success(`✅ Mensagem enviada para ${primeiroNome}!`);
        registerSend(clienteNome, petNome, "whatsapp");

        // Mark as "enviado" so scheduler doesn't duplicate
        await supabase
          .from("whatsapp_mensagens_agendadas" as any)
          .insert({
            user_id: ownerId || user?.id,
            agendamento_id: agendamentoId,
            agendamento_pacote_id: agendamentoPacoteId,
            servico_numero: servicoNumero,
            numero_whatsapp: numero,
            tipo_mensagem: "3h",
            mensagem,
            agendado_para: new Date().toISOString(),
            status: "enviado",
            enviado_em: new Date().toISOString(),
          });
      } catch (err: any) {
        console.error("Erro ao enviar WhatsApp:", err);
        toast.error(`❌ Erro ao enviar para ${primeiroNome}`, { description: err?.message || "Tente novamente" });
      }
    };

    // Adicionar à fila
    const now = Date.now();
    const timeSinceLast = now - lastSendTimestampRef.current;
    
    if (timeSinceLast >= 10000 && sendQueueRef.current.length === 0) {
      // Enviar imediatamente
      lastSendTimestampRef.current = Date.now();
      sendTask();
      toast.info(`📤 Enviando mensagem para ${primeiroNome}...`);
    } else {
      sendQueueRef.current.push(sendTask);
      toast.info(`⏳ Mensagem para ${primeiroNome} na fila (${sendQueueRef.current.length} pendente${sendQueueRef.current.length > 1 ? 's' : ''})`);
      processarFilaEnvios();
    }
  };

  // Pet Pronto: abrir dialog de confirmação
  const handlePetProntoClick = (agendamento: any, e: React.MouseEvent) => {
    e.stopPropagation();
    const agora = new Date();
    const hh = String(agora.getHours()).padStart(2, '0');
    const mm = String(agora.getMinutes()).padStart(2, '0');
    setPetProntoHoraAtual(`${hh}:${mm}`);
    setPetProntoAgendamento(agendamento);
    setPetProntoDialogOpen(true);
  };

  // Construir mensagem "Pet Pronto" unificada
  const buildPetProntoMessage = (primeiroNome: string, pets: Array<{nome: string, sexo: string}>, taxiDog: string): string => {
    const isSingular = pets.length === 1;
    const todasFemea = pets.every(p => p.sexo?.toLowerCase() === "fêmea" || p.sexo?.toLowerCase() === "femea");

    // Concatenar nomes com artigo individual: "a Brie", "a Brie e o Cadu", "a Brie, a Malu e o Cadu"
    const getArtigo = (sexo: string) => (sexo?.toLowerCase() === "fêmea" || sexo?.toLowerCase() === "femea") ? "a" : "o";
    const nomesComArtigo = pets.map(p => `${getArtigo(p.sexo)} ${p.nome}`);
    let nomesConcat = "";
    if (nomesComArtigo.length === 1) {
      nomesConcat = nomesComArtigo[0];
    } else if (nomesComArtigo.length === 2) {
      nomesConcat = `${nomesComArtigo[0]} e ${nomesComArtigo[1]}`;
    } else {
      nomesConcat = nomesComArtigo.slice(0, -1).join(", ") + " e " + nomesComArtigo[nomesComArtigo.length - 1];
    }

    if (isSingular) {
      const isFemea = todasFemea;
      const prontoAdj = isFemea ? "pronta" : "pronto";
      const pronome = isFemea ? "ela" : "ele";
      const pronomeMaiusculo = isFemea ? "Ela" : "Ele";
      const ansiosoAdj = isFemea ? "ansiosa" : "ansioso";
      const buscarPronome = isFemea ? "buscá-la" : "buscá-lo";

      if (taxiDog === "Sim") {
        return `Oii ${primeiroNome}!\nPassando para avisar que ${nomesConcat} já está ${prontoAdj}!\nJá já o Taxi Dog chega e ${pronome} estará indo de volta pra casa!`;
      } else {
        return `Oii ${primeiroNome}!\nPassando para avisar que ${nomesConcat} já está ${prontoAdj} para ir para casa!\n${pronomeMaiusculo} está ${ansiosoAdj} te esperando para ${buscarPronome}! 😌`;
      }
    } else {
      // Plural
      const prontoAdj = todasFemea ? "prontas" : "prontos";
      const pronome = todasFemea ? "elas" : "eles";
      const pronomeMaiusculo = todasFemea ? "Elas" : "Eles";
      const ansiosoAdj = todasFemea ? "ansiosas" : "ansiosos";
      const buscarPronome = todasFemea ? "buscá-las" : "buscá-los";

      if (taxiDog === "Sim") {
        return `Oii ${primeiroNome}!\nPassando para avisar que ${nomesConcat} estão ${prontoAdj}!\nJá já o Taxi Dog chega e ${pronome} estarão indo de volta pra casa!`;
      } else {
        return `Oii ${primeiroNome}!\nPassando para avisar que ${nomesConcat} estão ${prontoAdj} para ir para casa!\n${pronomeMaiusculo} estão ${ansiosoAdj} te esperando para ${buscarPronome}! 😌`;
      }
    }
  };

  // Pet Pronto: confirmar (atualizar horário ou não) e abrir WhatsApp
  const handlePetProntoConfirm = async (atualizarHorario: boolean) => {
    if (!petProntoAgendamento) return;

    const clienteNomePP = petProntoAgendamento.cliente || "";
    const petNomePP = petProntoAgendamento.pet || "";

    // Anti-spam: verificar cooldown de 30 minutos
    if (!canSend(clienteNomePP, petNomePP, "pet_pronto")) {
      setPetProntoDialogOpen(false);
      return;
    }

    if (atualizarHorario) {
      try {
        if (petProntoAgendamento.tipo === "simples" && petProntoAgendamento.agendamentoOriginal) {
          const agId = petProntoAgendamento.agendamentoOriginal.id;
          const { error } = await supabase
            .from("agendamentos")
            .update({ horario_termino: petProntoHoraAtual })
            .eq("id", agId);
          if (error) throw error;
          await loadAgendamentos();
        } else if (petProntoAgendamento.tipo === "pacote" && petProntoAgendamento.agendamentoPacote && petProntoAgendamento.servicoAgendamento) {
          const pacote = petProntoAgendamento.agendamentoPacote as AgendamentoPacote;
          const servicoAtual = petProntoAgendamento.servicoAgendamento as ServicoAgendamento;
          const servicosAtualizados = pacote.servicos.map((s) =>
            s.numero === servicoAtual.numero && s.data === servicoAtual.data
              ? { ...s, horarioTermino: petProntoHoraAtual }
              : s
          );
          const { error } = await supabase
            .from("agendamentos_pacotes")
            .update({ servicos: servicosAtualizados as any })
            .eq("id", pacote.id);
          if (error) throw error;
          await loadAgendamentosPacotes();
        }
        toast.success("Horário de fim atualizado!");
      } catch (error) {
        console.error("Erro ao atualizar horário:", error);
        toast.error("Erro ao atualizar o horário de fim.");
      }
    }

    // Enviar mensagem Pet Pronto via API (ou fallback wa.me)
    const agendamentoDia = petProntoAgendamento;
    const nomeCliente = agendamentoDia.cliente || "";
    const primeiroNome = obterPrimeiroNome(nomeCliente);
    const taxiDog = agendamentoDia.taxiDog;

    // Buscar todos os pets do mesmo cliente agendados para o mesmo dia
    const clienteNomeLower = nomeCliente.toLowerCase().trim();
    const petsDoCliente = agendamentosDia
      .filter(a => a.cliente.toLowerCase().trim() === clienteNomeLower)
      .map(a => ({
        nome: capitalizarPrimeiraLetra(a.pet || ""),
        sexo: obterSexoPet(a.pet, a.cliente)
      }));

    // Remover duplicatas (mesmo pet pode aparecer se houver bug)
    const petsUnicos = petsDoCliente.filter((p, i, arr) => 
      arr.findIndex(x => x.nome === p.nome) === i
    );

    const pets = petsUnicos.length > 0 ? petsUnicos : [{ 
      nome: capitalizarPrimeiraLetra(agendamentoDia.pet || ""), 
      sexo: obterSexoPet(agendamentoDia.pet, agendamentoDia.cliente) 
    }];

    const mensagem = buildPetProntoMessage(primeiroNome, pets, taxiDog);

    // Obter número do WhatsApp
    const numeroWhatsAppRaw = agendamentoDia.whatsapp || 
      agendamentoDia.agendamentoOriginal?.whatsapp || 
      agendamentoDia.agendamentoPacote?.whatsapp || "";
    const numeroWhatsApp = normalizeBrazilPhone(numeroWhatsAppRaw);
    if (!numeroWhatsApp) {
      toast.error(getInvalidPhoneMessage(numeroWhatsAppRaw));
      setPetProntoDialogOpen(false);
      return;
    }

    if (!whatsappConnected || !whatsappInstanceName) {
      // Fallback wa.me
      const url = buildWhatsAppUrl(numeroWhatsApp, mensagem);
      if (!url) {
        toast.error(getInvalidPhoneMessage(numeroWhatsAppRaw));
        setPetProntoDialogOpen(false);
        return;
      }
      window.open(url, '_blank');
      registerSend(clienteNomePP, petNomePP, "pet_pronto");
      setPetProntoDialogOpen(false);
      return;
    }

    const sendTask = async () => {
      try {
        const res = await supabase.functions.invoke("evolution-api", {
          body: { action: "send-message", instanceName: whatsappInstanceName, number: numeroWhatsApp, text: mensagem }
        });
        if (res.error) {
          const detail = res.data?.error || res.data?.details || res.error?.message || "Erro desconhecido";
          throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
        }
        toast.success(`✅ Mensagem "Pet Pronto" enviada para ${primeiroNome}!`);
        registerSend(clienteNomePP, petNomePP, "pet_pronto");
      } catch (err: any) {
        console.error("Erro ao enviar Pet Pronto:", err);
        toast.error(`❌ Erro ao enviar para ${primeiroNome}`, { description: err?.message || "Tente novamente" });
      }
    };

    const now = Date.now();
    const timeSinceLast = now - lastSendTimestampRef.current;
    
    if (timeSinceLast >= 10000 && sendQueueRef.current.length === 0) {
      lastSendTimestampRef.current = Date.now();
      sendTask();
      toast.info(`📤 Enviando "Pet Pronto" para ${primeiroNome}...`);
    } else {
      sendQueueRef.current.push(sendTask);
      toast.info(`⏳ Mensagem "Pet Pronto" para ${primeiroNome} na fila (${sendQueueRef.current.length} pendente${sendQueueRef.current.length > 1 ? 's' : ''})`);
      processarFilaEnvios();
    }

    setPetProntoDialogOpen(false);
  };

  // Convert dia item to AgendamentoUnificado for edit dialog
  const convertDiaItemToUnificado = (item: typeof agendamentosDia[0]): AgendamentoUnificado => {
    if (item.tipo === "simples") {
      const ag = (item as any).agendamentoOriginal || (item as any).agendamento;
      return {
        id: ag.id, tipo: "simples", data: ag.data,
        horarioInicio: ag.horario, horarioTermino: ag.horarioTermino,
        cliente: ag.cliente, pet: ag.pet, raca: ag.raca,
        servico: ag.servico, nomePacote: "", numeroPacote: "",
        taxiDog: ag.taxiDog || "", dataVenda: ag.dataVenda,
        whatsapp: ag.whatsapp, tempoServico: ag.tempoServico || "",
        groomer: ag.groomer || "", agendamentoOriginal: ag,
      };
    } else {
      const p = (item as any).agendamentoPacote;
      const s = (item as any).servicoAgendamento;
      return {
        id: `${p.id}-${s.numero}`, tipo: "pacote", data: s.data,
        horarioInicio: s.horarioInicio, horarioTermino: s.horarioTermino,
        cliente: p.nomeCliente, pet: p.nomePet, raca: p.raca,
        servico: item.servico, nomePacote: p.nomePacote, numeroPacote: s.numero,
        taxiDog: p.taxiDog, dataVenda: p.dataVenda, whatsapp: p.whatsapp,
        tempoServico: s.tempoServico, groomer: (s as any).groomer || "",
        pacoteOriginal: p, servicoOriginal: s,
      };
    }
  };


  const getHorariosGantt = () => {
    if (empresaConfig.horarioInicio && empresaConfig.horarioFim) {
      const [inicioH] = empresaConfig.horarioInicio.split(":").map(Number);
      const [fimH] = empresaConfig.horarioFim.split(":").map(Number);
      const horarios = [];
      for (let h = inicioH; h <= fimH; h++) {
        horarios.push(`${String(h).padStart(2, "0")}:00`);
      }
      return horarios;
    }
    return horarios;
  };
  const horariosGantt = getHorariosGantt();

  // Obter agendamentos do dia para Gantt
  const getAgendamentosDia = () => {
    const dateStr = selectedDate;
    const agendamentosSimples = agendamentos.
    filter((a) => a.data === dateStr).
    map((a) => ({
      tipo: "simples" as const,
      horarioInicio: a.horario,
      horarioFim: a.horarioTermino || a.horario,
      cliente: a.cliente,
      pet: a.pet,
      raca: a.raca,
      servico: a.servico,
      pacote: null,
      numeroPacote: null,
      taxiDog: a.taxiDog,
      groomer: a.groomer || "",
      agendamento: a,
      agendamentoOriginal: a,
      isCheckinExtra: a.numeroServicoPacote === "CHECKIN_EXTRA"
    }));
    const agendamentosPacote = agendamentosPacotes.flatMap((p) =>
    p.servicos.
    filter((s) => s.data === dateStr).
    map((s) => {
      // Montar nome do serviço com extras
      const extras = (s as any).servicosExtras || [];
      const nomesExtras = extras.map((e: any) => e.nome).join(' + ');
      const servicoCompleto = nomesExtras ?
      `${s.nomeServico} + ${nomesExtras}` :
      s.nomeServico;

      return {
        tipo: "pacote" as const,
        horarioInicio: s.horarioInicio,
        horarioFim: s.horarioTermino,
        cliente: p.nomeCliente,
        pet: p.nomePet,
        raca: p.raca,
        servico: servicoCompleto,
        pacote: p.nomePacote,
        numeroPacote: s.numero,
        taxiDog: p.taxiDog,
        groomer: (s as any).groomer || "",
        agendamentoPacote: p,
        servicoAgendamento: s,
        isCheckinExtra: false
      };
    })
    );
    return [...agendamentosSimples, ...agendamentosPacote].sort((a, b) => {
      return a.horarioInicio.localeCompare(b.horarioInicio);
    });
  };
  const agendamentosDia = getAgendamentosDia();

  // Unificar todos os agendamentos (simples + pacotes)
  const unificarAgendamentos = (): AgendamentoUnificado[] => {
    const agendamentosSimples: AgendamentoUnificado[] = agendamentos.map((a) => ({
      id: a.id,
      tipo: "simples" as const,
      data: a.data,
      horarioInicio: a.horario,
      horarioTermino: a.horarioTermino,
      cliente: a.cliente,
      pet: a.pet,
      raca: a.raca,
      servico: a.servico,
      nomePacote: "",
      numeroPacote: "",
      taxiDog: a.taxiDog || "",
      dataVenda: a.dataVenda,
      whatsapp: a.whatsapp,
      tempoServico: a.tempoServico || "",
      groomer: a.groomer || "",
      agendamentoOriginal: a
    }));
    const agendamentosPacote: AgendamentoUnificado[] = agendamentosPacotes.flatMap((p) =>
    p.servicos.map((s) => {
      // Montar nome do serviço com extras
      const extras = (s as any).servicosExtras || [];
      const nomesExtras = extras.map((e: any) => e.nome).join(' + ');
      const servicoCompleto = nomesExtras ?
      `${s.nomeServico} + ${nomesExtras}` :
      s.nomeServico;

      return {
        id: `${p.id}-${s.numero}`,
        tipo: "pacote" as const,
        data: s.data,
        horarioInicio: s.horarioInicio,
        horarioTermino: s.horarioTermino,
        cliente: p.nomeCliente,
        pet: p.nomePet,
        raca: p.raca,
        servico: servicoCompleto,
        nomePacote: p.nomePacote,
        numeroPacote: s.numero,
        taxiDog: p.taxiDog,
        dataVenda: p.dataVenda,
        whatsapp: p.whatsapp,
        tempoServico: s.tempoServico,
        groomer: "",
        pacoteOriginal: p,
        servicoOriginal: s
      };
    })
    );
    return [...agendamentosSimples, ...agendamentosPacote].sort((a, b) => {
      const dataCompare = a.data.localeCompare(b.data);
      if (dataCompare !== 0) return dataCompare;
      return a.horarioInicio.localeCompare(b.horarioInicio);
    });
  };

  // Aplicar filtros
  const aplicarFiltros = (agendamentos: AgendamentoUnificado[]): AgendamentoUnificado[] => {
    return agendamentos.filter((a) => {
      if (filtrosAplicados.nomePet && !a.pet.toLowerCase().includes(filtrosAplicados.nomePet.toLowerCase())) {
        return false;
      }
      if (
      filtrosAplicados.nomeCliente &&
      !a.cliente.toLowerCase().includes(filtrosAplicados.nomeCliente.toLowerCase()))
      {
        return false;
      }
      if (filtrosAplicados.dataAgendada && a.data !== filtrosAplicados.dataAgendada) {
        return false;
      }
      if (filtrosAplicados.dataVenda && a.dataVenda !== filtrosAplicados.dataVenda) {
        return false;
      }
      if (
      filtrosAplicados.nomePacote &&
      !a.nomePacote.toLowerCase().includes(filtrosAplicados.nomePacote.toLowerCase()))
      {
        return false;
      }
      return true;
    });
  };

  // Agendamentos filtrados
  const agendamentosUnificados = useMemo(() => unificarAgendamentos(), [agendamentos, agendamentosPacotes]);
  const agendamentosFiltrados = useMemo(
    () => {
      const filtrados = aplicarFiltros(agendamentosUnificados);
      // Ordenação: primeiro por Data (decrescente), depois por Horário (crescente)
      return filtrados.sort((a, b) => {
        // Primeiro critério: Data do Agendamento (decrescente)
        const dataCompare = b.data.localeCompare(a.data);
        if (dataCompare !== 0) return dataCompare;

        // Segundo critério: Horário (crescente)
        return a.horarioInicio.localeCompare(b.horarioInicio);
      });
    },
    [agendamentosUnificados, filtrosAplicados]
  );

  // Contador total
  const totalAgendamentos = agendamentosUnificados.length;

  // Buscar
  const handleBuscar = () => {
    setFiltrosAplicados({
      ...filtros
    });
  };

  // Limpar filtros
  const limparFiltros = () => {
    setFiltros({
      nomePet: "",
      nomeCliente: "",
      dataAgendada: "",
      dataVenda: "",
      nomePacote: ""
    });
    setFiltrosAplicados({
      nomePet: "",
      nomeCliente: "",
      dataAgendada: "",
      dataVenda: "",
      nomePacote: ""
    });
  };

  // Handler para gerenciar abertura/fechamento do modal de gerenciamento
  const handleGerenciamentoOpenChange = (open: boolean) => {
    setGerenciamentoOpen(open);

    // Se o modal está fechando, limpar todos os filtros
    if (!open) {
      limparFiltros();
    }
  };

  // Load linked financial entry
  const loadFinanceiroVinculado = async (agendamento: AgendamentoUnificado) => {
    if (!user || !agendamento) return;
    try {
      let lancamento = null;
      // Try by agendamento_id first (for simples)
      if (agendamento.tipo === "simples" && agendamento.agendamentoOriginal) {
        const { data } = await supabase
          .from("lancamentos_financeiros")
          .select("*")
          .eq("agendamento_id", agendamento.agendamentoOriginal.id)
          .maybeSingle();
        lancamento = data;
      }
      // Also try siblings' agendamento_ids
      if (!lancamento && agendamento.tipo === "simples") {
        const siblings = agendamentosUnificados.filter(a =>
          a.cliente === agendamento.cliente && a.data === agendamento.data && a.tipo === "simples" && a.agendamentoOriginal
        );
        for (const sib of siblings) {
          if (lancamento) break;
          const { data } = await supabase
            .from("lancamentos_financeiros")
            .select("*")
            .eq("agendamento_id", sib.agendamentoOriginal!.id)
            .maybeSingle();
          if (data) lancamento = data;
        }
      }
      // For pacote: search by cliente_id + data_pagamento matching dataVenda
      if (!lancamento && agendamento.tipo === "pacote") {
        // First get the cliente_id
        const { data: clientesData } = await supabase
          .from("clientes")
          .select("id")
          .eq("user_id", ownerId)
          .ilike("nome_cliente", agendamento.cliente)
          .limit(1);
        const clienteId = clientesData?.[0]?.id;
        if (clienteId) {
          // Search financial entries for this client with matching date
          // Search all financial entries for this client (sale date OR session dates)
          const { data: lancamentos } = await supabase
            .from("lancamentos_financeiros")
            .select("*")
            .eq("user_id", ownerId)
            .eq("cliente_id", clienteId)
            .eq("tipo", "Receita")
            .eq("descricao1", "Receita Operacional")
            .order("created_at", { ascending: false });
          if (lancamentos && lancamentos.length > 0) {
            // Prefer the most recent UNPAID entry (new extras entry)
            const unpaidFirst = lancamentos.find((l: any) => l.pago === false);
            // Also check for package-matching entries
            let packageMatch = null;
            for (const l of lancamentos) {
              const { data: itens } = await supabase
                .from("lancamentos_financeiros_itens")
                .select("*")
                .eq("lancamento_id", l.id);
              const hasPackageItem = (itens || []).some((item: any) =>
                item.produto_servico?.toLowerCase() === agendamento.nomePacote?.toLowerCase()
              );
              if (hasPackageItem) {
                packageMatch = l;
                break;
              }
            }
            // Priority: most recent unpaid > package match > most recent overall
            lancamento = unpaidFirst || packageMatch || lancamentos[0];
          }
        }
      }
      if (lancamento) {
        setLancamentoVinculado(lancamento);
        const { data: itens } = await supabase
          .from("lancamentos_financeiros_itens")
          .select("*")
          .eq("lancamento_id", lancamento.id);
        setLancamentoItensVinculado(itens || []);
      } else {
        setLancamentoVinculado(null);
        setLancamentoItensVinculado([]);
      }
    } catch (e) {
      console.error("Erro ao carregar financeiro:", e);
      setLancamentoVinculado(null);
      setLancamentoItensVinculado([]);
    }
  };

  // Excluir pet individual
  const confirmarExclusaoPet = async () => {
    if (!petParaDeletar || !user) return;
    try {
      if (petParaDeletar.tipo === "simples" && petParaDeletar.agendamentoOriginal) {
        await deletePendingMessages({ agendamentoId: petParaDeletar.agendamentoOriginal.id });
        const { error } = await supabase.from("agendamentos").delete().eq("id", petParaDeletar.agendamentoOriginal.id);
        if (error) throw error;
        // Sync financial: remove items for this pet
        if (lancamentoVinculado) {
          const itensParaDeletar = lancamentoItensVinculado.filter(item => item.descricao2?.includes(petParaDeletar.pet));
          for (const item of itensParaDeletar) {
            await supabase.from("lancamentos_financeiros_itens").delete().eq("id", item.id);
          }
          const itensRestantes = lancamentoItensVinculado.filter(item => !item.descricao2?.includes(petParaDeletar.pet));
          const novoTotal = itensRestantes.reduce((sum: number, item: any) => sum + (item.valor * (item.quantidade || 1)), 0);
          await supabase.from("lancamentos_financeiros").update({ valor_total: novoTotal }).eq("id", lancamentoVinculado.id);
        }
        toast.success(`Agendamento de ${petParaDeletar.pet} excluído com sucesso!`);
      } else if (petParaDeletar.tipo === "pacote" && petParaDeletar.pacoteOriginal && petParaDeletar.servicoOriginal) {
        await deletePendingMessages({ agendamentoPacoteId: petParaDeletar.pacoteOriginal.id, servicoNumero: petParaDeletar.servicoOriginal.numero });
        const servicosAtualizados = petParaDeletar.pacoteOriginal.servicos.filter(s => s.numero !== petParaDeletar.servicoOriginal!.numero);
        if (servicosAtualizados.length === 0) {
          await supabase.from("agendamentos_pacotes").delete().eq("id", petParaDeletar.pacoteOriginal.id);
        } else {
          servicosAtualizados.forEach((s, i) => { s.numero = `${String(i + 1).padStart(2, "0")}/${String(servicosAtualizados.length).padStart(2, "0")}`; });
          await supabase.from("agendamentos_pacotes").update({ servicos: servicosAtualizados as any }).eq("id", petParaDeletar.pacoteOriginal.id);
        }
        toast.success(`Agendamento de ${petParaDeletar.pet} excluído com sucesso!`);
      }
      await loadAgendamentos();
      await loadAgendamentosPacotes();
      setEditMultiPetGroup(prev => prev.filter(a => a.id !== petParaDeletar.id));
      if (editandoAgendamento?.id === petParaDeletar.id) {
        const remaining = editMultiPetGroup.filter(a => a.id !== petParaDeletar.id);
        if (remaining.length > 0) {
          handleEditarClick(remaining[0]);
        } else {
          setEditDialogGerenciamento(false);
          setEditandoAgendamento(null);
        }
      }
    } catch (error) {
      console.error("Erro ao excluir pet:", error);
      toast.error("Erro ao excluir agendamento");
    } finally {
      setDeletePetDialogOpen(false);
      setPetParaDeletar(null);
    }
  };

  // Abrir edição
  const handleEditarClick = (agendamento: AgendamentoUnificado) => {
    setEditandoAgendamento(agendamento);

    // Inicializar serviços extras a partir do agendamento
    if (agendamento.tipo === "pacote" && agendamento.servicoOriginal) {
      const extras = (agendamento.servicoOriginal as any).servicosExtras || [];
      setServicosExtrasEdicao(extras);
      // O serviço principal é o nomeServico sem os extras concatenados
      setServicoPrincipalEdicao(agendamento.servicoOriginal.nomeServico);
    } else if (agendamento.tipo === "simples" && agendamento.agendamentoOriginal) {
      // Para agendamentos simples, verificar se há servicos no campo JSON
      const todosServicos = (agendamento.agendamentoOriginal as any).servicos || [];
      if (todosServicos.length > 1) {
        // O primeiro é o principal, os demais são extras
        setServicoPrincipalEdicao(todosServicos[0]?.nome || agendamento.servico.split(' + ')[0]);
        setServicosExtrasEdicao(todosServicos.slice(1).map((s: any) => ({
          id: s.id || crypto.randomUUID(),
          nome: s.nome,
          valor: s.valor || 0
        })));
      } else {
        // Sem extras, usar o serviço direto (pode ter sido salvo concatenado)
        const partesServico = agendamento.servico.split(' + ');
        setServicoPrincipalEdicao(partesServico[0]);
        if (partesServico.length > 1) {
          setServicosExtrasEdicao(partesServico.slice(1).map((nome) => ({
            id: crypto.randomUUID(),
            nome: nome.trim(),
            valor: 0
          })));
        } else {
          setServicosExtrasEdicao([]);
        }
      }
    } else {
      setServicosExtrasEdicao([]);
      setServicoPrincipalEdicao(agendamento.servico.split(' + ')[0]);
    }

    // Find sibling agendamentos (same client, same date) for multi-pet view
    const siblings = agendamentosUnificados.filter(a => 
      a.cliente === agendamento.cliente && a.data === agendamento.data && a.id !== agendamento.id
    );
    setEditMultiPetGroup(siblings);
    loadFinanceiroVinculado(agendamento);

    setEditDialogGerenciamento(true);
  };

  // Atualizar agendamento
  const handleAtualizarAgendamento = async () => {
    if (!editandoAgendamento || !user) return;

    if (editandoAgendamento.horarioTermino && editandoAgendamento.horarioInicio && editandoAgendamento.horarioTermino <= editandoAgendamento.horarioInicio) {
      toast.error("O Horário de Fim não pode ser igual ou anterior ao Horário de Início. Por favor, corrija.");
      return;
    }

    try {
      // Montar nome do serviço concatenado (principal + extras)
      const extrasNomes = servicosExtrasEdicao.
      filter((e) => e.nome).
      map((e) => e.nome);
      const servicoCompleto = extrasNomes.length > 0 ?
      `${servicoPrincipalEdicao} + ${extrasNomes.join(' + ')}` :
      servicoPrincipalEdicao;

      // Montar array de serviços para persistência
      const servicoPrincipalObj = servicos.find((s) => s.nome === servicoPrincipalEdicao);
      const todosServicosArray = [
      { id: servicoPrincipalObj?.id || '', nome: servicoPrincipalEdicao, valor: servicoPrincipalObj?.valor || 0 },
      ...servicosExtrasEdicao.filter((e) => e.nome)];



      if (editandoAgendamento.tipo === "simples" && editandoAgendamento.agendamentoOriginal) {
        const { error } = await supabase.
        from("agendamentos").
        update({
          cliente: editandoAgendamento.cliente,
          pet: editandoAgendamento.pet,
          raca: editandoAgendamento.raca,
          whatsapp: editandoAgendamento.whatsapp,
          servico: servicoCompleto,
          servicos: todosServicosArray,
          data: editandoAgendamento.data,
          horario: editandoAgendamento.horarioInicio,
          tempo_servico: editandoAgendamento.tempoServico,
          horario_termino: editandoAgendamento.horarioTermino,
          data_venda: editandoAgendamento.dataVenda,
          groomer: editandoAgendamento.groomer,
          updated_at: new Date().toISOString()
        }).
        eq("id", editandoAgendamento.agendamentoOriginal.id);

        if (error) throw error;

        // Sync WhatsApp messages: delete pending and recreate
        const agId = editandoAgendamento.agendamentoOriginal.id;
        await deletePendingMessages({ agendamentoId: agId });
        
        // Get pet sexo for message building
        const sexoPet = obterSexoPet(editandoAgendamento.pet, editandoAgendamento.cliente);
        const isPacote = false;
        const servicoNome = servicoCompleto;
        
        await scheduleWhatsAppMessages({
          userId: ownerId || user.id,
          agendamentoId: agId,
          nomeCliente: editandoAgendamento.cliente,
          nomePet: editandoAgendamento.pet,
          sexoPet: sexoPet,
          raca: editandoAgendamento.raca,
          whatsapp: editandoAgendamento.whatsapp,
          dataAgendamento: editandoAgendamento.data,
          horarioInicio: editandoAgendamento.horarioInicio,
          servicos: servicoNome,
          taxiDog: editandoAgendamento.taxiDog || "Não",
          bordao: empresaConfig.bordao || "",
          isPacote,
        });

        // Sync financial entry for simples - full replace strategy
        if (lancamentoVinculado) {
          const isMultiPet = editMultiPetGroup.length > 0;
          const petName = editandoAgendamento.pet;

          // 1. Fetch ALL current items for this lancamento
          const { data: currentItems } = await supabase
            .from("lancamentos_financeiros_itens")
            .select("*")
            .eq("lancamento_id", lancamentoVinculado.id);

          // 2. Determine which items to DELETE (belonging to this pet)
          const itemsToDelete = (currentItems || []).filter((item: any) => {
            if (isMultiPet) {
              return item.produto_servico?.startsWith(`${petName} - `);
            }
            return true; // single pet: delete all
          });

          // 3. Delete items for this pet
          for (const item of itemsToDelete) {
            await supabase.from("lancamentos_financeiros_itens").delete().eq("id", item.id);
          }

          // 4. Build clean new items from todosServicosArray
          const novosItens = todosServicosArray.map((s: any) => ({
            lancamento_id: lancamentoVinculado.id,
            descricao2: "Serviços",
            produto_servico: isMultiPet ? `${petName} - ${s.nome}` : s.nome,
            valor: s.valor || 0,
            quantidade: 1,
          }));

          if (novosItens.length > 0) {
            await supabase.from("lancamentos_financeiros_itens").insert(novosItens);
          }

          // 5. Recalculate total from ALL items (kept + new)
          const { data: allItems } = await supabase
            .from("lancamentos_financeiros_itens")
            .select("*")
            .eq("lancamento_id", lancamentoVinculado.id);
          const novoTotal = (allItems || []).reduce(
            (sum: number, item: any) => sum + (Number(item.valor) * (Number(item.quantidade) || 1)), 0
          );
          await supabase.from("lancamentos_financeiros")
            .update({ valor_total: novoTotal })
            .eq("id", lancamentoVinculado.id);
        }

        toast.success("Agendamento atualizado com sucesso!");
        await loadAgendamentos();
        // Refresh financial state so Financeiro dialog shows updated data
        await loadFinanceiroVinculado(editandoAgendamento);
      } else if (
      editandoAgendamento.tipo === "pacote" &&
      editandoAgendamento.pacoteOriginal &&
      editandoAgendamento.servicoOriginal)
      {
        const updatedServicos = editandoAgendamento.pacoteOriginal.servicos.map((s) =>
        s.numero === editandoAgendamento.servicoOriginal!.numero ?
        {
          ...s,
          nomeServico: servicoPrincipalEdicao,
          servicosExtras: servicosExtrasEdicao.filter((e) => e.nome),
          data: editandoAgendamento.data,
          horarioInicio: editandoAgendamento.horarioInicio,
          tempoServico: editandoAgendamento.tempoServico,
          horarioTermino: calcularHorarioTermino(
            editandoAgendamento.horarioInicio,
            editandoAgendamento.tempoServico
          ),
          groomer: editandoAgendamento.groomer
        } :
        s
        );

        // Também atualizar whatsapp no pacote se foi alterado
        const { error } = await supabase.
        from("agendamentos_pacotes").
        update({
          servicos: updatedServicos as any,
          whatsapp: editandoAgendamento.whatsapp,
          data_venda: editandoAgendamento.dataVenda,
          taxi_dog: editandoAgendamento.taxiDog,
          updated_at: new Date().toISOString()
        }).
        eq("id", editandoAgendamento.pacoteOriginal.id);

        if (error) throw error;

        // Sync WhatsApp messages for pacote: delete pending and recreate
        const pacoteId = editandoAgendamento.pacoteOriginal.id;
        const servicoNum = editandoAgendamento.servicoOriginal.numero;
        await deletePendingMessages({ agendamentoPacoteId: pacoteId, servicoNumero: servicoNum });

        const sexoPet = obterSexoPet(editandoAgendamento.pet, editandoAgendamento.cliente);
        const totalServicos = editandoAgendamento.pacoteOriginal.servicos.length;
        const currentIdx = editandoAgendamento.pacoteOriginal.servicos.findIndex(
          (s) => s.numero === servicoNum
        );
        const isUltimo = currentIdx === totalServicos - 1;

        await scheduleWhatsAppMessages({
          userId: ownerId || user.id,
          agendamentoPacoteId: pacoteId,
          servicoNumero: servicoNum,
          nomeCliente: editandoAgendamento.cliente,
          nomePet: editandoAgendamento.pet,
          sexoPet: sexoPet,
          raca: editandoAgendamento.raca,
          whatsapp: editandoAgendamento.whatsapp,
          dataAgendamento: editandoAgendamento.data,
          horarioInicio: editandoAgendamento.horarioInicio,
          servicos: servicoPrincipalEdicao,
          taxiDog: editandoAgendamento.taxiDog || "Não",
          bordao: empresaConfig.bordao || "",
          isPacote: true,
          isUltimoServicoPacote: isUltimo,
        });

        // --- Financial sync for pacote edits (accumulative across sessions) ---
        if (lancamentoVinculado) {
          const nomePacote = editandoAgendamento.pacoteOriginal.nomePacote;
          
          // Collect ALL unique extras from ALL sessions of the package (after update)
          const todosExtrasDosPacotes: Array<{ nome: string; valor: number }> = [];
          for (const sessao of updatedServicos) {
            if (sessao.servicosExtras && Array.isArray(sessao.servicosExtras)) {
              for (const extra of sessao.servicosExtras) {
                if (extra.nome && !todosExtrasDosPacotes.some((e: any) => e.nome === extra.nome)) {
                  todosExtrasDosPacotes.push({ nome: extra.nome, valor: extra.valor || 0 });
                }
              }
            }
          }
          
          if (lancamentoVinculado.pago === false) {
            // UNPAID: Accumulative rebuild - package + ALL unique extras from ALL sessions
            await supabase
              .from("lancamentos_financeiros_itens")
              .delete()
              .eq("lancamento_id", lancamentoVinculado.id);

            const { data: pacoteData } = await supabase
              .from("pacotes")
              .select("valor_final")
              .eq("user_id", ownerId || user.id)
              .ilike("nome", nomePacote)
              .limit(1);
            const valorPacote = pacoteData?.[0]?.valor_final ? Number(pacoteData[0].valor_final) : 0;

            const novosItens: Array<{ lancamento_id: string; descricao2: string; produto_servico: string; valor: number; quantidade: number }> = [
              {
                lancamento_id: lancamentoVinculado.id,
                descricao2: "Serviços",
                produto_servico: nomePacote,
                valor: valorPacote,
                quantidade: 1,
              },
            ];
            for (const extra of todosExtrasDosPacotes) {
              novosItens.push({
                lancamento_id: lancamentoVinculado.id,
                descricao2: "Serviços",
                produto_servico: extra.nome,
                valor: extra.valor || 0,
                quantidade: 1,
              });
            }
            await supabase.from("lancamentos_financeiros_itens").insert(novosItens);

            const novoTotal = novosItens.reduce((sum, item) => sum + (item.valor * item.quantidade), 0);
            await supabase
              .from("lancamentos_financeiros")
              .update({ valor_total: novoTotal })
              .eq("id", lancamentoVinculado.id);
          } else {
            // PAID: Do NOT modify existing entry. Create new entry for truly new extras only.
            const existingItemNames = lancamentoItensVinculado.map((item: any) => item.produto_servico);
            const novosExtras = todosExtrasDosPacotes.filter((e) => !existingItemNames.includes(e.nome));

            if (novosExtras.length > 0) {
              const valorNovos = novosExtras.reduce((sum, e) => sum + (e.valor || 0), 0);
              const [ano, mes] = editandoAgendamento.data.split("-");

              const { data: novoLancamento, error: novoLancErr } = await supabase
                .from("lancamentos_financeiros")
                .insert([{
                  user_id: lancamentoVinculado.user_id,
                  ano,
                  mes_competencia: mes,
                  tipo: "Receita",
                  descricao1: "Receita Operacional",
                  cliente_id: lancamentoVinculado.cliente_id,
                  pet_ids: lancamentoVinculado.pet_ids,
                  valor_total: valorNovos,
                  data_pagamento: editandoAgendamento.data,
                  conta_id: lancamentoVinculado.conta_id,
                  pago: false,
                }])
                .select("id")
                .single();

              if (!novoLancErr && novoLancamento) {
                const itensNovos = novosExtras.map((extra) => ({
                  lancamento_id: novoLancamento.id,
                  descricao2: "Serviços",
                  produto_servico: extra.nome,
                  valor: extra.valor || 0,
                  quantidade: 1,
                }));
                await supabase.from("lancamentos_financeiros_itens").insert(itensNovos);
              }
            }
          }
        }

        toast.success("Agendamento atualizado com sucesso!");
        await loadAgendamentosPacotes();
        await loadFinanceiroVinculado(editandoAgendamento);
      }

      setEditDialogGerenciamento(false);
      setEditandoAgendamento(null);
      setServicosExtrasEdicao([]);
      setServicoPrincipalEdicao("");
      setEditMultiPetGroup([]);
      setLancamentoVinculado(null);
      setLancamentoItensVinculado([]);
    } catch (error) {
      console.error("Erro ao atualizar agendamento:", error);
      toast.error("Erro ao atualizar agendamento");
    }
  };

  // Excluir agendamento
  const handleExcluirAgendamento = (agendamento: AgendamentoUnificado) => {
    setAgendamentoParaDeletar(agendamento);
    setDeleteDialogOpen(true);
  };
  const confirmarExclusao = async () => {
    if (!agendamentoParaDeletar || !user) return;

    try {
      if (agendamentoParaDeletar.tipo === "simples" && agendamentoParaDeletar.agendamentoOriginal) {
        // Deletar mensagens pendentes antes de excluir o agendamento
        await deletePendingMessages({ agendamentoId: agendamentoParaDeletar.agendamentoOriginal.id });

        const { error } = await supabase.
        from("agendamentos").
        delete().
        eq("id", agendamentoParaDeletar.agendamentoOriginal.id);

        if (error) throw error;

        toast.success("Agendamento excluído com sucesso!");
        await loadAgendamentos();
      } else if (
      agendamentoParaDeletar.tipo === "pacote" &&
      agendamentoParaDeletar.pacoteOriginal &&
      agendamentoParaDeletar.servicoOriginal)
      {
        // Deletar mensagens pendentes do serviço do pacote
        await deletePendingMessages({
          agendamentoPacoteId: agendamentoParaDeletar.pacoteOriginal.id,
          servicoNumero: agendamentoParaDeletar.servicoOriginal.numero
        });

        // Remove specific service from package or delete entire package if it's the last service
        const servicosAtualizados = agendamentoParaDeletar.pacoteOriginal.servicos.filter(
          (s) => s.numero !== agendamentoParaDeletar.servicoOriginal!.numero
        );

        if (servicosAtualizados.length === 0) {
          // Delete entire package if no services left
          const { error } = await supabase.
          from("agendamentos_pacotes").
          delete().
          eq("id", agendamentoParaDeletar.pacoteOriginal.id);

          if (error) throw error;
        } else {
          // Update package with remaining services
          const { error } = await supabase.
          from("agendamentos_pacotes").
          update({
            servicos: servicosAtualizados as any,
            updated_at: new Date().toISOString()
          }).
          eq("id", agendamentoParaDeletar.pacoteOriginal.id);

          if (error) throw error;
        }

        toast.success("Agendamento excluído com sucesso!");
        await loadAgendamentosPacotes();
      }

      setDeleteDialogOpen(false);
      setAgendamentoParaDeletar(null);
      setEditDialogGerenciamento(false);
      setEditandoAgendamento(null);
    } catch (error) {
      console.error("Erro ao excluir agendamento:", error);
      toast.error("Erro ao excluir agendamento");
    }
  };
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-foreground">Agenda de Serviços</h1>
          <p className="text-muted-foreground text-xs">Visualize e gerencie os agendamentos</p>
        </div>

        <div className="flex gap-2">
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            if (!open) {
              resetForm();
            } else {
              setIsDialogOpen(true);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-8 text-xs">
                <Plus className="h-3 w-3" />
                Novo Agendamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] flex flex-col">
              <DialogHeader className="pb-1">
                <DialogTitle className="text-lg">Novo Agendamento</DialogTitle>
                <DialogDescription className="text-xs">Preencha os dados do agendamento</DialogDescription>
              </DialogHeader>

              <form onSubmit={handleSubmit} className="space-y-1.5 overflow-y-auto flex-1 pr-1">
                <div className="grid grid-cols-2 gap-1.5">
                  <div className="space-y-0.5 relative">
                    <Label htmlFor="cliente" className="text-xs">
                      Cliente *
                    </Label>
                    <Input
                      id="cliente"
                      value={simpleClienteSearch}
                      onChange={(e) => setSimpleClienteSearch(e.target.value)}
                      placeholder="Digite o nome do cliente..."
                      className="h-8 text-xs" />
                    
                    {simpleFilteredClientes.length > 0 &&
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {simpleFilteredClientes.map((clienteItem, idx) => (
                            <div
                              key={clienteItem.nome + '-' + idx}
                              className="px-3 py-2 hover:bg-accent cursor-pointer text-xs"
                              onClick={() => handleSimpleClienteSelect(clienteItem.nome)}>
                              {clienteItem.nome}
                            </div>
                          ))}
                      </div>
                    }
                  </div>

                  <div className="space-y-0.5 relative">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="pet" className="text-xs">
                        Pet *
                      </Label>
                      {formData.cliente && formData.pet && formData.raca && formData.whatsapp && otherPetsFromClient.length > 0 && (
                        <Popover open={showAdditionalPetsPopover} onOpenChange={setShowAdditionalPetsPopover}>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-primary hover:text-primary/80">
                              + Agendar demais pets
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-56 p-2 z-50" align="start">
                            <div className="text-xs font-medium mb-1.5">Selecionar pets:</div>
                            <div className="space-y-1 max-h-40 overflow-y-auto">
                              {(() => {
                                const clienteSelecionado = clientes.find(c => c.id === selectedClienteId);
                                if (!clienteSelecionado) return null;
                                const allPets = clienteSelecionado.pets;
                                const others = allPets.filter(p => !(p.nome === formData.pet && p.raca === formData.raca));
                                return others.map((pet, idx) => {
                                  const isSelected = additionalPets.some(ap => ap.petName === pet.nome);
                                  return (
                                    <div
                                      key={idx}
                                      className={cn("flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs hover:bg-accent", isSelected && "bg-accent")}
                                      onClick={() => handleToggleAdditionalPet(pet)}>
                                      <Check className={cn("h-3 w-3", isSelected ? "opacity-100" : "opacity-0")} />
                                      {pet.nome} ({pet.raca})
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    <Input
                      id="pet"
                      value={simplePetSearch}
                      onChange={(e) => setSimplePetSearch(e.target.value)}
                      placeholder="Digite o nome do pet..."
                      className="h-8 text-xs" />
                    
                    {simpleFilteredPets.length > 0 &&
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {simpleFilteredPets.map((nome, idx) =>
                      <div
                        key={idx}
                        className="px-3 py-2 hover:bg-accent cursor-pointer text-xs"
                        onClick={() => handleSimplePetSelect(nome)}>
                        
                            {nome}
                          </div>
                      )}
                      </div>
                    }
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <div className="space-y-0.5">
                    <Label htmlFor="raca" className="text-xs">
                      Raça *
                    </Label>
                    <Select
                      value={formData.raca}
                      onValueChange={handleSimpleRacaSelect}
                      disabled={simpleAvailableRacas.length === 0}>
                      
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue
                          placeholder={
                          simpleAvailableRacas.length === 0 ? "Selecione cliente e pet primeiro" : "Selecione a raça"
                          } />
                        
                      </SelectTrigger>
                      <SelectContent>
                        {simpleAvailableRacas.map((raca, idx) =>
                        <SelectItem key={idx} value={raca} className="text-xs">
                            {raca}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-0.5 relative">
                    <Label htmlFor="whatsapp" className="text-xs">
                      WhatsApp
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        id="whatsapp"
                        value={simpleWhatsappSearch || (
                          formData.whatsapp ?
                          `(${formData.whatsapp.slice(0, 2)}) ${formData.whatsapp.slice(2, 7)}-${formData.whatsapp.slice(7)}` :
                          ""
                        )}
                        onChange={(e) => {
                          setSimpleWhatsappSearch(e.target.value.replace(/\D/g, ''));
                        }}
                        onFocus={() => {
                          if (formData.whatsapp && !simpleWhatsappSearch) {
                            setSimpleWhatsappSearch('');
                          }
                        }}
                        placeholder="Buscar por WhatsApp..."
                        className="h-8 text-xs pl-7" />
                    </div>
                    {simpleFilteredWhatsapp.length > 0 &&
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {simpleFilteredWhatsapp.map((item, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 hover:bg-accent cursor-pointer"
                        onClick={() => handleSimpleWhatsappSelect(item)}>
                        <div className="text-xs font-medium">
                          ({item.whatsapp.slice(0, 2)}) {item.whatsapp.slice(2, 7)}-{item.whatsapp.slice(7)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {item.nomeCliente}{item.nomePet ? ` • ${item.nomePet}` : ''}
                        </div>
                      </div>
                      ))}
                      </div>
                    }
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-1.5">
                  <div className="space-y-0.5">
                    <Label htmlFor="data" className="text-xs">
                      Dia Agendamento*
                    </Label>
                    <Popover open={calendarNovoOpen} onOpenChange={setCalendarNovoOpen}>
                      <PopoverTrigger asChild>
                        <Input
                          id="data"
                           type="text"
                           placeholder="dd/mm/aaaa"
                          value={toDisplayDate(formData.data)}
                          onChange={(e) => {
                            const raw = e.target.value;
                            const iso = fromDisplayDate(raw);
                            setFormData({
                              ...formData,
                              data: iso
                            });
                            setDataVendaManual(false);
                          }}
                          onDoubleClick={() => setCalendarNovoOpen(true)}
                          className="h-8 text-xs"
                          required />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.data ? new Date(formData.data + "T00:00:00") : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setFormData({
                                ...formData,
                                data: format(date, "yyyy-MM-dd")
                              });
                              setDataVendaManual(false);
                            }
                            setCalendarNovoOpen(false);
                          }}
                          locale={ptBR}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-0.5">
                    <Label htmlFor="horario" className="text-xs">
                      {additionalPets.length > 0 ? `${formData.pet}:` : 'Horário de Início *'}
                    </Label>
                    <TimeInput
                      value={formData.horario}
                      onChange={(value) => {
                        const horarioTermino = formData.tempoServico ? calcularHorarioTermino(value, formData.tempoServico) : formData.horarioTermino;
                        const tempoServico = !formData.tempoServico && formData.horarioTermino ? calcularTempoServico(value, formData.horarioTermino) : formData.tempoServico;
                        setFormData({
                          ...formData,
                          horario: value,
                          horarioTermino,
                          tempoServico
                        });
                      }}
                      placeholder="00:00"
                      className="h-8 text-xs" />
                    
                  </div>

                  <div className="space-y-0.5">
                    <Label htmlFor="horarioFim" className="text-xs">
                      Horário de Fim *
                    </Label>
                    <TimeInput
                      value={formData.horarioTermino}
                      onChange={(value) => {
                        const tempoServico = formData.horario ? calcularTempoServico(formData.horario, value) : "";
                        setFormData({
                          ...formData,
                          horarioTermino: value,
                          tempoServico
                        });
                      }}
                      placeholder="00:00"
                      className="h-8 text-xs" />
                    
                  </div>

                  <div className="space-y-0.5">
                    <Label htmlFor="tempoServico" className="text-xs">
                      Tempo de Serviço*
                    </Label>
                    <Input
                      id="tempoServico"
                      type="text"
                      value={formData.tempoServico}
                      onChange={(event) => {
                        let valorDigitado = event.target.value;
                        valorDigitado = valorDigitado.replace(/\D/g, "");
                        if (valorDigitado.length > 3) {
                          valorDigitado = valorDigitado.slice(0, 3);
                        }
                        if (valorDigitado.length === 0) {
                          valorDigitado = "";
                        } else if (valorDigitado.length === 2) {
                          valorDigitado = `${valorDigitado[0]}:${valorDigitado[1]}`;
                        } else if (valorDigitado.length === 3) {
                          valorDigitado = `${valorDigitado[0]}:${valorDigitado.slice(1, 3)}`;
                        }
                        const partes = valorDigitado.split(":");
                        if (partes.length === 2 && parseInt(partes[1], 10) > 59) {
                          partes[1] = "59";
                          valorDigitado = `${partes[0]}:${partes[1]}`;
                        }
                        const horarioTermino = formData.horario ? calcularHorarioTermino(formData.horario, valorDigitado) : "";
                        setFormData({
                          ...formData,
                          tempoServico: valorDigitado,
                          horarioTermino
                        });
                      }}
                      onBlur={(event) => {
                        const regexFinal = /^[0-9]{1}:[0-5][0-9]$/;
                        if (event.target.value && !regexFinal.test(event.target.value)) {
                          alert("Formato inválido! Use o formato h:mm (exemplo: 1:30)");
                        }
                      }}
                      placeholder="0:00"
                      className="h-8 text-xs"
                      maxLength={4}
                      pattern="[0-9]{1}:[0-5][0-9]" />
                    
                  </div>
                </div>

                {/* Bloco de Serviços e Groomer do pet principal */}
                <div className="space-y-0.5">
                  <Label className="text-xs">
                    {additionalPets.length > 0 ? `${formData.pet}: Serviço(s) *` : 'Serviço(s) *'}
                  </Label>
                  <div className="space-y-2">
                    {servicosSelecionadosSimples.map((servicoItem, index) =>
                    <div key={servicoItem.instanceId} className="flex items-center gap-1">
                        <Popover
                        open={openServicoComboboxIndex === index}
                        onOpenChange={(open) => setOpenServicoComboboxIndex(open ? index : null)}>
                        
                          <PopoverTrigger asChild>
                            <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openServicoComboboxIndex === index}
                            className="h-8 flex-1 justify-between text-xs font-normal">
                            
                              {servicoItem.nome || "Selecione um serviço"}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0 bg-background z-50">
                            <Command>
                              <CommandInput placeholder="Buscar serviço..." className="h-9 text-xs" />
                              <CommandEmpty className="text-xs py-6 text-center text-muted-foreground">
                                {formData.raca ?
                              "Nenhum serviço cadastrado para este porte." :
                              "Selecione cliente e pet primeiro"}
                              </CommandEmpty>
                              {servicosFiltradosPorPorte.length > 0 &&
                            <CommandGroup heading="Serviços" className="text-xs">
                                  {servicosFiltradosPorPorte.map((servico) =>
                              <CommandItem
                                key={`servico-${servico.id}`}
                                value={`${servico.nome}__${servico.id}`}
                                onSelect={(currentValue) => {
                                  atualizarServicoSimples(servicoItem.instanceId, currentValue);
                                }}
                                className="text-xs">
                                
                                      <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    servicoItem.nome === servico.nome && servicoItem.valor === servico.valor ? "opacity-100" : "opacity-0"
                                  )} />
                                
                                      {servico.nome} — {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(servico.valor)}
                                    </CommandItem>
                              )}
                                </CommandGroup>
                            }
                            </Command>
                          </PopoverContent>
                        </Popover>
                        
                        {servicosSelecionadosSimples.length > 1 &&
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                        onClick={() => removerServicoSimples(servicoItem.instanceId)}>
                        
                            <X className="h-3 w-3" />
                          </Button>
                      }
                        
                        {index === servicosSelecionadosSimples.length - 1 && servicoItem.nome &&
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-primary hover:text-primary/80"
                        onClick={adicionarServicoSimples}>
                        
                            + Serviço
                          </Button>
                      }
                      </div>
                    )}
                  </div>
                </div>

                {/* Groomer do pet principal */}
                <div className="space-y-0.5">
                  <Label htmlFor="groomer" className="text-xs">
                    {additionalPets.length > 0 ? `${formData.pet}: Groomer` : 'Groomer'}
                  </Label>
                  <Select
                    value={formData.groomer}
                    onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      groomer: value
                    })
                    }>
                    
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione o groomer" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {groomers.length === 0 ?
                      <SelectItem value="none" disabled className="text-xs">
                          Nenhum groomer cadastrado
                        </SelectItem> :

                      groomers.map((g) =>
                      <SelectItem key={g.id} value={g.nome} className="text-xs">
                            {g.nome}
                          </SelectItem>
                      )
                      }
                    </SelectContent>
                  </Select>
                </div>

                {/* Blocos de horário + serviço + groomer para cada pet adicional */}
                {additionalPets.map((ap, apIdx) => {
                  const apServicosFiltrados = getServicosFiltradosPorPorteAdditional(ap.porte);
                  return (
                    <div key={ap.petName} className="space-y-2 border-t pt-2">
                      {/* Horários */}
                      <div className="grid grid-cols-4 gap-1.5">
                        <div className="flex items-center">
                          <span className="text-xs font-medium text-muted-foreground truncate">{ap.petName}:</span>
                        </div>
                        <div>
                          <TimeInput
                            value={ap.horario}
                            onChange={(value) => updateAdditionalPetTime(apIdx, 'horario', value)}
                            placeholder="00:00"
                            className="h-8 text-xs" />
                        </div>
                        <div>
                          <TimeInput
                            value={ap.horarioTermino}
                            onChange={(value) => updateAdditionalPetTime(apIdx, 'horarioTermino', value)}
                            placeholder="00:00"
                            className="h-8 text-xs" />
                        </div>
                        <div>
                          <Input
                            type="text"
                            value={ap.tempoServico}
                            onChange={(event) => {
                              let valorDigitado = event.target.value;
                              valorDigitado = valorDigitado.replace(/\D/g, "");
                              if (valorDigitado.length > 3) valorDigitado = valorDigitado.slice(0, 3);
                              if (valorDigitado.length === 0) valorDigitado = "";
                              else if (valorDigitado.length === 2) valorDigitado = `${valorDigitado[0]}:${valorDigitado[1]}`;
                              else if (valorDigitado.length === 3) valorDigitado = `${valorDigitado[0]}:${valorDigitado.slice(1, 3)}`;
                              const partes = valorDigitado.split(":");
                              if (partes.length === 2 && parseInt(partes[1], 10) > 59) {
                                partes[1] = "59";
                                valorDigitado = `${partes[0]}:${partes[1]}`;
                              }
                              updateAdditionalPetTime(apIdx, 'tempoServico', valorDigitado);
                            }}
                            placeholder="0:00"
                            className="h-8 text-xs"
                            maxLength={4} />
                        </div>
                      </div>

                      {/* Serviços do pet adicional */}
                      <div className="space-y-0.5">
                        <Label className="text-xs">{ap.petName}: Serviço(s) *</Label>
                        <div className="space-y-2">
                          {ap.servicos.map((servicoItem, sIdx) => {
                            const comboKey = `${apIdx}-${sIdx}`;
                            return (
                              <div key={servicoItem.instanceId} className="flex items-center gap-1">
                                <Popover
                                  open={openAdditionalServicoCombobox === comboKey}
                                  onOpenChange={(open) => setOpenAdditionalServicoCombobox(open ? comboKey : null)}>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className="h-8 flex-1 justify-between text-xs font-normal">
                                      {servicoItem.nome || "Selecione um serviço"}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[300px] p-0 bg-background z-50">
                                    <Command>
                                      <CommandInput placeholder="Buscar serviço..." className="h-9 text-xs" />
                                      <CommandEmpty className="text-xs py-6 text-center text-muted-foreground">
                                        Nenhum serviço cadastrado para este porte.
                                      </CommandEmpty>
                                      {apServicosFiltrados.length > 0 &&
                                        <CommandGroup heading="Serviços" className="text-xs">
                                          {apServicosFiltrados.map((servico) =>
                                            <CommandItem
                                              key={`ap-servico-${servico.id}`}
                                              value={`${servico.nome}__${servico.id}`}
                                              onSelect={(currentValue) => {
                                                atualizarServicoAdditionalPet(apIdx, servicoItem.instanceId, currentValue);
                                              }}
                                              className="text-xs">
                                              <Check
                                                className={cn(
                                                  "mr-2 h-4 w-4",
                                                  servicoItem.nome === servico.nome && servicoItem.valor === servico.valor ? "opacity-100" : "opacity-0"
                                                )} />
                                              {servico.nome} — {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(servico.valor)}
                                            </CommandItem>
                                          )}
                                        </CommandGroup>
                                      }
                                    </Command>
                                  </PopoverContent>
                                </Popover>
                                
                                {ap.servicos.length > 1 &&
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                    onClick={() => removerServicoAdditionalPet(apIdx, servicoItem.instanceId)}>
                                    <X className="h-3 w-3" />
                                  </Button>
                                }
                                
                                {sIdx === ap.servicos.length - 1 && servicoItem.nome &&
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs text-primary hover:text-primary/80"
                                    onClick={() => adicionarServicoAdditionalPet(apIdx)}>
                                    + Serviço
                                  </Button>
                                }
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Groomer do pet adicional */}
                      <div className="space-y-0.5">
                        <Label className="text-xs">{ap.petName}: Groomer</Label>
                        <Select
                          value={ap.groomer}
                          onValueChange={(value) => updateAdditionalPetGroomer(apIdx, value)}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione o groomer" />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            {groomers.length === 0 ?
                              <SelectItem value="none" disabled className="text-xs">
                                Nenhum groomer cadastrado
                              </SelectItem> :
                              groomers.map((g) =>
                                <SelectItem key={g.id} value={g.nome} className="text-xs">
                                  {g.nome}
                                </SelectItem>
                              )
                            }
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  );
                })}

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <Label htmlFor="dataVenda" className="text-xs">
                      Data da Venda do Serviço *
                    </Label>
                    <Input
                      id="dataVenda"
                      type="date"
                      value={formData.dataVenda}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          dataVenda: e.target.value
                        });
                        setDataVendaManual(true);
                      }}
                      className="h-8 text-xs"
                      required />
                    
                  </div>

                  <div className="space-y-0.5">
                    <Label htmlFor="taxiDog" className="text-xs">
                      Taxi Dog *
                    </Label>
                    <Select
                      value={formData.taxiDog}
                      onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        taxiDog: value
                      })
                      }
                      required>
                      
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        <SelectItem value="Sim" className="text-xs">
                          Sim
                        </SelectItem>
                        <SelectItem value="Não" className="text-xs">
                          Não
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="outline" onClick={resetForm} className="h-8 text-xs">
                    Cancelar
                  </Button>
                  <Button type="submit" className="h-8 text-xs" disabled={salvando}>
                    {salvando ? "Salvando..." : "Salvar"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isPacoteDialogOpen} onOpenChange={(open) => {
              if (!open) {
                resetPacoteForm();
              } else {
                setIsPacoteDialogOpen(true);
              }
            }}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-8 text-xs" variant="outline">
                <Package className="h-3 w-3" />
                Novo Pacote
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-lg">Agendar Pacote de Serviços</DialogTitle>
                <DialogDescription className="text-xs">
                  Preencha os dados para agendar um pacote de serviços
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handlePacoteSubmit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1 relative">
                    <Label htmlFor="nomeCliente" className="text-xs">
                      Nome do Cliente *
                    </Label>
                    <Input
                      id="nomeCliente"
                      value={clienteSearch}
                      onChange={(e) => setClienteSearch(e.target.value)}
                      placeholder="Digite o nome do cliente..."
                      className="h-8 text-xs" />
                    
                    {filteredClientes.length > 0 &&
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {filteredClientes.map((nome, idx) =>
                      <div
                        key={idx}
                        className="px-3 py-2 hover:bg-accent cursor-pointer text-xs"
                        onClick={() => handleClienteSelect(nome)}>
                        
                            {nome}
                          </div>
                      )}
                      </div>
                    }
                  </div>

                  <div className="space-y-1 relative">
                    <div className="flex items-center gap-1">
                      <Label htmlFor="nomePet" className="text-xs">
                        Nome do Pet *
                      </Label>
                      {pacoteFormData.nomePet && otherPetsFromClientPacote.length > 0 && (
                        <Popover open={showPacoteAdditionalPetsPopover} onOpenChange={setShowPacoteAdditionalPetsPopover}>
                          <PopoverTrigger asChild>
                            <Button type="button" variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-primary hover:text-primary/80">
                              + Agendar demais pets
                              {pacoteAdditionalPets.length > 0 && ` (${pacoteAdditionalPets.length})`}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[220px] p-2 z-50 bg-popover" align="start">
                            <p className="text-xs font-medium mb-2">Selecione os pets:</p>
                            {otherPetsFromClientPacote.map((pet) => (
                              <div
                                key={pet.id}
                                className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded cursor-pointer text-xs"
                                onClick={() => handleTogglePacoteAdditionalPet(pet)}
                              >
                                <Check className={cn("h-3 w-3", pacoteAdditionalPets.some(ap => ap.petName === pet.nome) ? "opacity-100" : "opacity-0")} />
                                {pet.nome} ({pet.raca})
                              </div>
                            ))}
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                    <Input
                      id="nomePet"
                      value={petSearch}
                      onChange={(e) => setPetSearch(e.target.value)}
                      placeholder="Digite o nome do pet..."
                      className="h-8 text-xs" />
                    
                    {filteredPets.length > 0 &&
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-40 overflow-y-auto">
                        {filteredPets.map((nome, idx) =>
                      <div
                        key={idx}
                        className="px-3 py-2 hover:bg-accent cursor-pointer text-xs"
                        onClick={() => handlePetSelect(nome)}>
                        
                            {nome}
                          </div>
                      )}
                      </div>
                    }
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label htmlFor="raca" className="text-xs">
                      Raça *
                    </Label>
                    <Select
                      value={pacoteFormData.raca}
                      onValueChange={handleRacaSelect}
                      disabled={availableRacas.length === 0}>
                      
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue
                          placeholder={
                          availableRacas.length === 0 ? "Selecione cliente e pet primeiro" : "Selecione a raça"
                          } />
                        
                      </SelectTrigger>
                      <SelectContent>
                        {availableRacas.map((raca, idx) =>
                        <SelectItem key={idx} value={raca} className="text-xs">
                            {raca}
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1 relative">
                    <Label htmlFor="whatsapp" className="text-xs">
                      WhatsApp
                    </Label>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                      <Input
                        id="whatsapp-pacote"
                        value={pacoteWhatsappSearch || (
                          pacoteFormData.whatsapp ?
                          `(${pacoteFormData.whatsapp.slice(0, 2)}) ${pacoteFormData.whatsapp.slice(2, 7)}-${pacoteFormData.whatsapp.slice(7)}` :
                          ""
                        )}
                        onChange={(e) => setPacoteWhatsappSearch(e.target.value.replace(/\D/g, ''))}
                        onFocus={() => {
                          if (pacoteFormData.whatsapp && !pacoteWhatsappSearch) {
                            setPacoteWhatsappSearch('');
                          }
                        }}
                        placeholder="Buscar por WhatsApp..."
                        className="h-8 text-xs pl-7" />
                    </div>
                    {pacoteFilteredWhatsapp.length > 0 &&
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {pacoteFilteredWhatsapp.map((item, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-2 hover:bg-accent cursor-pointer"
                        onClick={() => handlePacoteWhatsappSelect(item)}>
                        <div className="text-xs font-medium">
                          ({item.whatsapp.slice(0, 2)}) {item.whatsapp.slice(2, 7)}-{item.whatsapp.slice(7)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {item.nomeCliente}{item.nomePet ? ` • ${item.nomePet}` : ''}
                        </div>
                      </div>
                      ))}
                      </div>
                    }
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="taxiDog" className="text-xs">
                      Taxi Dog? *
                    </Label>
                    <Select
                      value={pacoteFormData.taxiDog}
                      onValueChange={(value) =>
                      setPacoteFormData({
                        ...pacoteFormData,
                        taxiDog: value
                      })
                      }>
                      
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Sim" className="text-xs">
                          Sim
                        </SelectItem>
                        <SelectItem value="Não" className="text-xs">
                          Não
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="nomePacote" className="text-xs">
                    Nome do Pacote de Serviço *
                  </Label>
                  <Select value={pacoteFormData.nomePacote} onValueChange={handlePacoteSelect}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecione o pacote" />
                    </SelectTrigger>
                    <SelectContent>
                      {pacotes.length === 0 ?
                      <SelectItem value="sem-pacote" disabled className="text-xs">
                          Nenhum pacote cadastrado
                        </SelectItem> :

                      pacotes.map((pacote) =>
                      <SelectItem key={pacote.id} value={pacote.nome} className="text-xs">
                            {pacote.nome}
                          </SelectItem>
                      )
                      }
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="dataVendaPacote" className="text-xs">
                    Data da Venda do Serviço *
                  </Label>
                  <Input
                    id="dataVendaPacote"
                    type="date"
                    value={pacoteFormData.dataVenda}
                    onChange={(e) =>
                    setPacoteFormData({
                      ...pacoteFormData,
                      dataVenda: e.target.value
                    })
                    }
                    className="h-8 text-xs"
                    required />
                  
                </div>

                {servicosAgendamento.length > 0 &&
                <div className="space-y-1.5 border rounded-md p-2 bg-secondary/20">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">
                        {pacoteAdditionalPets.length > 0 ? `🐶 ${pacoteFormData.nomePet} (${pacoteFormData.raca})` : "Agendamentos dos Serviços do Pacote"}
                      </Label>
                    </div>

                    {/* Header com títulos das colunas */}
                    <div className="flex gap-1.5 items-center">
                      <div className="w-16"></div>
                      <div className="flex-1 min-w-[80px]"></div>
                      <div className="w-28">
                        <Label className="text-muted-foreground text-[10px] font-bold">
                          Dia Agendamento
                        </Label>
                      </div>
                      <div className="w-[72px]">
                        <Label className="text-muted-foreground font-bold text-[10px]">Hora Início</Label>
                      </div>
                      <div className="w-[72px]">
                        <Label className="text-muted-foreground font-bold text-[10px]">
                          Tempo Serviço*
                        </Label>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {servicosAgendamento.map((servico, index) => {
                        const extrasLabel = servico.servicosExtras?.length
                          ? ` + ${servico.servicosExtras.map(e => e.nome).join(" + ")}`
                          : "";
                        return (
                        <div key={index} className="space-y-1">
                          <div className="flex gap-1.5 items-center">
                            <div className="w-16 flex items-center gap-0.5">
                              <div className="flex flex-col">
                                <button
                                  type="button"
                                  onClick={() => moveServico(index, "up")}
                                  disabled={index === 0}
                                  className="text-[10px] leading-none h-3 w-3 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity disabled:opacity-20 disabled:cursor-not-allowed"
                                  aria-label="Mover para cima"
                                >˄</button>
                                <button
                                  type="button"
                                  onClick={() => moveServico(index, "down")}
                                  disabled={index === servicosAgendamento.length - 1}
                                  className="text-[10px] leading-none h-3 w-3 flex items-center justify-center opacity-60 hover:opacity-100 transition-opacity disabled:opacity-20 disabled:cursor-not-allowed"
                                  aria-label="Mover para baixo"
                                >˅</button>
                              </div>
                              <Label className="text-[10px] text-primary font-semibold">{servico.numero}</Label>
                            </div>

                            <div className="flex-1 min-w-[80px] flex items-center gap-1">
                              <Label className="text-[10px] text-left truncate" title={`${servico.nomeServico}${extrasLabel}`}>
                                {servico.nomeServico}{extrasLabel}
                              </Label>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button type="button" variant="outline" size="sm" className="h-5 px-1.5 text-[9px] shrink-0 whitespace-nowrap">
                                    + Serviços
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[280px] p-2 z-50 bg-popover" align="start">
                                  <div className="space-y-2">
                                    <p className="text-xs font-medium">Adicionar serviço extra</p>
                                    {(() => {
                                      const pacoteAtual = pacotes.find(p => p.nome === pacoteFormData.nomePacote);
                                      const portePacote = pacoteAtual?.porte || "";
                                      const servicosSemPacotes = servicos.filter(s => !s.nome.toLowerCase().startsWith("pacote"));
                                      const servicosFiltrados = portePacote
                                        ? servicosSemPacotes.filter(s => normalizarPorte(s.porte) === normalizarPorte(portePacote) || normalizarPorte(s.porte) === "todos")
                                        : servicosSemPacotes;
                                      return (
                                        <Command className="rounded-md border">
                                          <CommandInput placeholder="Buscar serviço..." className="h-7 text-xs" />
                                          <CommandEmpty className="py-2 text-xs text-center">Nenhum serviço encontrado</CommandEmpty>
                                          <CommandGroup className="max-h-[200px] overflow-y-auto">
                                            {servicosFiltrados.map((s) => (
                                              <CommandItem
                                                key={s.id}
                                                value={`${s.nome} - R$ ${s.valor?.toFixed(2)}`}
                                                onSelect={() => handleAddServicoExtraAgendamento(index, s.id)}
                                                className="text-xs cursor-pointer"
                                              >
                                                <Search className="mr-1.5 h-3 w-3 opacity-50" />
                                                {s.nome} - R$ {s.valor?.toFixed(2)}
                                              </CommandItem>
                                            ))}
                                          </CommandGroup>
                                        </Command>
                                      );
                                    })()}
                                    {(servico.servicosExtras || []).length > 0 && (
                                      <div className="space-y-1">
                                        <p className="text-[10px] text-muted-foreground">Extras adicionados:</p>
                                        {servico.servicosExtras!.map((extra) => (
                                          <div key={extra.id} className="flex items-center justify-between bg-secondary/50 rounded px-1.5 py-0.5">
                                            <span className="text-[10px]">{extra.nome} - R$ {extra.valor?.toFixed(2)}</span>
                                            <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoveServicoExtraAgendamento(index, extra.id)} className="h-4 w-4 p-0 text-destructive hover:text-destructive">
                                              <X className="h-3 w-3" />
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>

                            <div className="w-28">
                              <Popover open={calendarServicoIndex === index} onOpenChange={(open) => setCalendarServicoIndex(open ? index : null)}>
                                <PopoverTrigger asChild>
                                  <Button variant="outline" className={cn("h-7 w-full justify-start text-left font-normal text-[10px] px-1.5", !servico.data && "text-muted-foreground")}>
                                    {servico.data ? toDisplayDate(servico.data) : "Data"}
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                  <Calendar
                                    mode="single"
                                    selected={servico.data ? parse(servico.data, "yyyy-MM-dd", new Date()) : undefined}
                                    onSelect={(date) => {
                                      if (date) {
                                        handleServicoAgendamentoChange(index, "data", format(date, "yyyy-MM-dd"));
                                      }
                                      setCalendarServicoIndex(null);
                                    }}
                                    locale={ptBR}
                                    initialFocus
                                    className="p-3 pointer-events-auto"
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>

                            <div className="w-[72px]">
                              <TimeInput value={servico.horarioInicio} onChange={(value) => handleServicoAgendamentoChange(index, "horarioInicio", value)} placeholder="00:00" className="h-7 text-[10px]" />
                            </div>

                            <div className="w-[72px]">
                              <TimeInput value={servico.tempoServico} onChange={(value) => handleServicoAgendamentoChange(index, "tempoServico", value)} placeholder="0:00" className="h-7 text-[10px]" allowSingleDigitHour={true} />
                            </div>
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                }




                {/* Blocos de serviços para pets adicionais do pacote */}
                {pacoteAdditionalPets.map((addPet, petIdx) => (
                  <div key={petIdx} className="space-y-1.5 border rounded-md p-2 bg-secondary/20">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-semibold">
                        🐶 {addPet.petName} ({addPet.raca})
                      </Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-destructive hover:text-destructive"
                        onClick={() => setPacoteAdditionalPets(prev => prev.filter((_, i) => i !== petIdx))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Header */}
                    <div className="flex gap-1.5 items-center">
                      <div className="w-12"></div>
                      <div className="flex-1 min-w-[80px]"></div>
                      <div className="w-28">
                        <Label className="text-muted-foreground text-[10px] font-bold">Dia Agendamento</Label>
                      </div>
                      <div className="w-[72px]">
                        <Label className="text-muted-foreground font-bold text-[10px]">Hora Início</Label>
                      </div>
                      <div className="w-[72px]">
                        <Label className="text-muted-foreground font-bold text-[10px]">Tempo Serviço*</Label>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      {addPet.servicosAgendamento.map((servico, svcIdx) => {
                        const extrasLabel = servico.servicosExtras?.length
                          ? ` + ${servico.servicosExtras.map(e => e.nome).join(" + ")}`
                          : "";
                        const calKey = `${petIdx}-${svcIdx}`;
                        return (
                          <div key={svcIdx} className="space-y-1">
                            <div className="flex gap-1.5 items-center">
                              <div className="w-12">
                                <Label className="text-[10px] text-primary font-semibold">{servico.numero}</Label>
                              </div>

                              <div className="flex-1 min-w-[80px] flex items-center gap-1">
                                <Label className="text-[10px] text-left truncate" title={`${servico.nomeServico}${extrasLabel}`}>
                                  {servico.nomeServico}{extrasLabel}
                                </Label>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button type="button" variant="outline" size="sm" className="h-5 px-1.5 text-[9px] shrink-0 whitespace-nowrap">
                                      + Serviços
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-[280px] p-2 z-50 bg-popover" align="start">
                                    <div className="space-y-2">
                                      <p className="text-xs font-medium">Adicionar serviço extra</p>
                                      {(() => {
                                        const pacoteAtual = pacotes.find(p => p.nome === pacoteFormData.nomePacote);
                                        const portePacote = pacoteAtual?.porte || "";
                                        const servicosSemPacotes = servicos.filter(s => !s.nome.toLowerCase().startsWith("pacote"));
                                        const servicosFiltrados = portePacote
                                          ? servicosSemPacotes.filter(s => normalizarPorte(s.porte) === normalizarPorte(portePacote) || normalizarPorte(s.porte) === "todos")
                                          : servicosSemPacotes;
                                        return (
                                          <Command className="rounded-md border">
                                            <CommandInput placeholder="Buscar serviço..." className="h-7 text-xs" />
                                            <CommandEmpty className="py-2 text-xs text-center">Nenhum serviço encontrado</CommandEmpty>
                                            <CommandGroup className="max-h-[200px] overflow-y-auto">
                                              {servicosFiltrados.map((s) => (
                                                <CommandItem
                                                  key={s.id}
                                                  value={`${s.nome} - R$ ${s.valor?.toFixed(2)}`}
                                                  onSelect={() => handleAddPacoteAdditionalExtra(petIdx, svcIdx, s.id)}
                                                  className="text-xs cursor-pointer"
                                                >
                                                  <Search className="mr-1.5 h-3 w-3 opacity-50" />
                                                  {s.nome} - R$ {s.valor?.toFixed(2)}
                                                </CommandItem>
                                              ))}
                                            </CommandGroup>
                                          </Command>
                                        );
                                      })()}
                                      {(servico.servicosExtras || []).length > 0 && (
                                        <div className="space-y-1">
                                          <p className="text-[10px] text-muted-foreground">Extras adicionados:</p>
                                          {servico.servicosExtras!.map((extra) => (
                                            <div key={extra.id} className="flex items-center justify-between bg-secondary/50 rounded px-1.5 py-0.5">
                                              <span className="text-[10px]">{extra.nome} - R$ {extra.valor?.toFixed(2)}</span>
                                              <Button type="button" variant="ghost" size="sm" onClick={() => handleRemovePacoteAdditionalExtra(petIdx, svcIdx, extra.id)} className="h-4 w-4 p-0 text-destructive hover:text-destructive">
                                                <X className="h-3 w-3" />
                                              </Button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </PopoverContent>
                                </Popover>
                              </div>

                              <div className="w-28">
                                <Popover open={pacoteAdditionalCalendarIndex === calKey} onOpenChange={(open) => setPacoteAdditionalCalendarIndex(open ? calKey : null)}>
                                  <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("h-7 w-full justify-start text-left font-normal text-[10px] px-1.5", !servico.data && "text-muted-foreground")}>
                                      {servico.data ? toDisplayDate(servico.data) : "Data"}
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={servico.data ? parse(servico.data, "yyyy-MM-dd", new Date()) : undefined}
                                      onSelect={(date) => {
                                        if (date) {
                                          handlePacoteAdditionalServicoChange(petIdx, svcIdx, "data", format(date, "yyyy-MM-dd"));
                                        }
                                        setPacoteAdditionalCalendarIndex(null);
                                      }}
                                      locale={ptBR}
                                      initialFocus
                                      className="p-3 pointer-events-auto"
                                    />
                                  </PopoverContent>
                                </Popover>
                              </div>

                              <div className="w-[72px]">
                                <TimeInput value={servico.horarioInicio} onChange={(value) => handlePacoteAdditionalServicoChange(petIdx, svcIdx, "horarioInicio", value)} placeholder="00:00" className="h-7 text-[10px]" />
                              </div>

                              <div className="w-[72px]">
                                <TimeInput value={servico.tempoServico} onChange={(value) => handlePacoteAdditionalServicoChange(petIdx, svcIdx, "tempoServico", value)} placeholder="0:00" className="h-7 text-[10px]" allowSingleDigitHour={true} />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={resetPacoteForm} className="h-8 text-xs">
                    Cancelar
                  </Button>
                  <Button type="submit" className="h-8 text-xs" disabled={salvando}>
                    {salvando ? "Salvando..." : "Agendar Pacote"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={gerenciamentoOpen} onOpenChange={handleGerenciamentoOpenChange}>
            <DialogTrigger asChild>
              <Button className="gap-2 h-8 text-xs" variant="secondary">
                <Settings className="h-3 w-3" />
                Gerenciamento de Agendamentos
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] max-h-[90vh] flex flex-col">
              <DialogHeader>
                <DialogTitle>Gerenciamento de Agendamento</DialogTitle>
                <p className="text-[10px] text-muted-foreground mt-1 my-0 px-0 py-[2px] mx-0">
                  Houve {totalAgendamentos} agendamentos realizados.
                </p>
              </DialogHeader>

              {/* Filtros */}
              <div className="space-y-3 border-b py-0 my-0">
                <div className="grid grid-cols-5 gap-2 mx-0 my-0 py-0">
                  <Input
                    placeholder="Buscar por Nome do Pet"
                    value={filtros.nomePet}
                    onChange={(e) =>
                    setFiltros({
                      ...filtros,
                      nomePet: e.target.value
                    })
                    }
                    className="h-8 text-xs my-[28px]" />
                  
                  <Input
                    placeholder="Buscar por Nome do Cliente"
                    value={filtros.nomeCliente}
                    onChange={(e) =>
                    setFiltros({
                      ...filtros,
                      nomeCliente: e.target.value
                    })
                    }
                    className="h-8 text-xs py-0 my-[28px]" />
                  
                  <div className="space-y-1 py-0">
                    <Label htmlFor="dataAgendada" className="text-[10px] font-medium">
                      Buscar por Data Agendada
                    </Label>
                    <Input
                      id="dataAgendada"
                      type="date"
                      value={filtros.dataAgendada}
                      onChange={(e) =>
                      setFiltros({
                        ...filtros,
                        dataAgendada: e.target.value
                      })
                      }
                      className="h-8 text-xs" />
                    
                  </div>
                  <div className="space-y-1 my-0 px-0 py-0">
                    <Label htmlFor="dataVenda" className="text-[10px] font-medium">
                      Buscar por Data da Venda do Serviço
                    </Label>
                    <Input
                      id="dataVenda"
                      type="date"
                      value={filtros.dataVenda}
                      onChange={(e) =>
                      setFiltros({
                        ...filtros,
                        dataVenda: e.target.value
                      })
                      }
                      className="h-8 text-xs" />
                    
                  </div>
                  <Input
                    placeholder="Nome do Pacote"
                    value={filtros.nomePacote}
                    onChange={(e) =>
                    setFiltros({
                      ...filtros,
                      nomePacote: e.target.value
                    })
                    }
                    className="h-8 text-xs my-[28px]" />
                  
                </div>
                <div className="flex gap-2 py-0 my-0">
                  <Button onClick={handleBuscar} className="h-8 text-xs">
                    Buscar
                  </Button>
                  <Button onClick={limparFiltros} variant="outline" className="h-8 text-xs">
                    Limpar Filtros
                  </Button>
                </div>
              </div>

              {/* Tabela */}
              <div className="flex-1 overflow-auto border rounded-md">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="text-[10px] p-1.5 h-8">Agendamento</TableHead>
                      <TableHead className="text-[10px] p-1.5 h-8">Horário</TableHead>
                      <TableHead className="text-[10px] p-1.5 h-8">Término</TableHead>
                      <TableHead className="text-[10px] p-1.5 h-8">Tutor</TableHead>
                      <TableHead className="text-[10px] p-1.5 h-8">Nome Pet</TableHead>
                      <TableHead className="text-[10px] p-1.5 h-8">Raça</TableHead>
                      <TableHead className="text-[10px] p-1.5 h-8">Serviço</TableHead>
                      <TableHead className="text-[10px] p-1.5 h-8">Pacote</TableHead>
                      <TableHead className="text-[10px] p-1.5 h-8">N° Pacote</TableHead>
                      <TableHead className="text-[10px] p-1.5 h-8">Taxi Dog</TableHead>
                      <TableHead className="text-[10px] p-1.5 h-8">Data da Venda</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agendamentosFiltrados.length === 0 ?
                    <TableRow>
                        <TableCell colSpan={11} className="text-center text-xs text-muted-foreground py-8">
                          Nenhum agendamento encontrado
                        </TableCell>
                      </TableRow> :

                    agendamentosFiltrados.map((agendamento) =>
                    <TableRow
                      key={agendamento.id}
                      className="cursor-pointer hover:bg-cyan-500/20"
                      onClick={() => handleEditarClick(agendamento)}>
                      
                          <TableCell className="text-[10px] p-1.5">
                            {agendamento.data ?
                        new Date(agendamento.data + "T00:00:00").toLocaleDateString("pt-BR") :
                        "-"}
                          </TableCell>
                          <TableCell className="text-[10px] p-1.5">
                            {agendamento.horarioInicio ? agendamento.horarioInicio.substring(0, 5) : "-"}
                          </TableCell>
                          <TableCell className="text-[10px] p-1.5">
                            {agendamento.horarioTermino ? agendamento.horarioTermino.substring(0, 5) : "-"}
                          </TableCell>
                          <TableCell className="text-[10px] p-1.5">{agendamento.cliente || "-"}</TableCell>
                          <TableCell className="text-[10px] p-1.5">{agendamento.pet || "-"}</TableCell>
                          <TableCell className="text-[10px] p-1.5">{agendamento.raca || "-"}</TableCell>
                          <TableCell className="text-[10px] p-1.5">{agendamento.servico || "-"}</TableCell>
                          <TableCell className="text-[10px] p-1.5">{agendamento.nomePacote || "-"}</TableCell>
                          <TableCell className="text-[10px] p-1.5">{agendamento.numeroPacote || "-"}</TableCell>
                          <TableCell className="text-[10px] p-1.5">{agendamento.taxiDog || "-"}</TableCell>
                          <TableCell className="text-[10px] p-1.5">
                            {agendamento.dataVenda ?
                        new Date(agendamento.dataVenda + "T00:00:00").toLocaleDateString("pt-BR") :
                        "-"}
                          </TableCell>
                        </TableRow>
                    )
                    }
                  </TableBody>
                </Table>
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog de Edição */}
          <Dialog open={editDialogGerenciamento} onOpenChange={setEditDialogGerenciamento}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Editar Agendamento</DialogTitle>
                <DialogDescription className="text-xs">
                  {editandoAgendamento?.tipo === "simples" ? "Agendamento Simples" : "Agendamento de Pacote"}
                </DialogDescription>
              </DialogHeader>

              {editandoAgendamento &&
              <div className="space-y-3">
                  <div className="grid grid-cols-4 gap-1.5">
                    <div className="space-y-1">
                      <Label className="text-xs">Data do Agendamento</Label>
                      <Popover open={calendarEditGerOpen} onOpenChange={setCalendarEditGerOpen}>
                        <PopoverTrigger asChild>
                          <Input
                             type="text"
                             placeholder="dd/mm/aaaa"
                            value={toDisplayDate(editandoAgendamento.data)}
                            onChange={(e) => {
                              const iso = fromDisplayDate(e.target.value);
                              setEditandoAgendamento({
                                ...editandoAgendamento,
                                data: iso
                              });
                            }
                            }
                            onDoubleClick={() => setCalendarEditGerOpen(true)}
                            className="h-8 text-xs" />
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={editandoAgendamento.data ? new Date(editandoAgendamento.data + "T00:00:00") : undefined}
                            onSelect={(date) => {
                              if (date) {
                                setEditandoAgendamento({
                                  ...editandoAgendamento,
                                  data: format(date, "yyyy-MM-dd")
                                });
                              }
                              setCalendarEditGerOpen(false);
                            }}
                            locale={ptBR}
                            initialFocus
                            className="p-3 pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Horário de Início</Label>
                      <TimeInput
                      value={editandoAgendamento.horarioInicio}
                      onChange={(value) => {
                        const horarioTermino = editandoAgendamento.tempoServico ? calcularHorarioTermino(value, editandoAgendamento.tempoServico) : editandoAgendamento.horarioTermino;
                        const tempoServico = !editandoAgendamento.tempoServico && editandoAgendamento.horarioTermino ? calcularTempoServico(value, editandoAgendamento.horarioTermino) : editandoAgendamento.tempoServico;
                        setEditandoAgendamento({
                          ...editandoAgendamento,
                          horarioInicio: value,
                          horarioTermino,
                          tempoServico
                        });
                      }}
                      className="h-8 text-xs" />
                    
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Horário de Fim</Label>
                      <TimeInput
                      value={editandoAgendamento.horarioTermino || ""}
                      onChange={(value) => {
                        const tempoServico = editandoAgendamento.horarioInicio ? calcularTempoServico(editandoAgendamento.horarioInicio, value) : "";
                        setEditandoAgendamento({
                          ...editandoAgendamento,
                          horarioTermino: value,
                          tempoServico
                        });
                      }}
                      placeholder="00:00"
                      className="h-8 text-xs" />
                    
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Tempo de Serviço</Label>
                      <TimeInput
                      value={editandoAgendamento.tempoServico}
                      onChange={(value) => {
                        const horarioTermino = calcularHorarioTermino(editandoAgendamento.horarioInicio, value);
                        setEditandoAgendamento({
                          ...editandoAgendamento,
                          tempoServico: value,
                          horarioTermino
                        });
                      }}
                      placeholder="0:00"
                      className="h-8 text-xs"
                      allowSingleDigitHour={true} />
                    
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Nome do Cliente</Label>
                      <Input
                      value={editandoAgendamento.cliente}
                      onChange={(e) =>
                      setEditandoAgendamento({
                        ...editandoAgendamento,
                        cliente: e.target.value
                      })
                      }
                      className="h-8 text-xs" />
                    
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Nome do Pet</Label>
                      <Input
                      value={editandoAgendamento.pet}
                      onChange={(e) =>
                      setEditandoAgendamento({
                        ...editandoAgendamento,
                        pet: e.target.value
                      })
                      }
                      className="h-8 text-xs" />
                    
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Raça</Label>
                      <Input
                      value={editandoAgendamento.raca}
                      onChange={(e) =>
                      setEditandoAgendamento({
                        ...editandoAgendamento,
                        raca: e.target.value
                      })
                      }
                      className="h-8 text-xs" />
                    
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">WhatsApp</Label>
                      <Input
                      value={editandoAgendamento.whatsapp}
                      onChange={(e) =>
                      setEditandoAgendamento({
                        ...editandoAgendamento,
                        whatsapp: e.target.value
                      })
                      }
                      className="h-8 text-xs" />
                    
                    </div>
                  </div>

                  {/* Serviço Principal - Dropdown Pesquisável */}
                  <div className="space-y-1">
                    <Label className="text-xs">Serviço</Label>
                    <div className="flex gap-2">
                      <Popover open={openServicoEdicao} onOpenChange={setOpenServicoEdicao}>
                        <PopoverTrigger asChild>
                          <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openServicoEdicao}
                          className="flex-1 h-8 text-xs justify-between">
                          
                            {servicoPrincipalEdicao || "Selecione o serviço..."}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0 z-50 bg-popover">
                          <Command>
                            <CommandInput placeholder="Buscar serviço..." className="h-9" />
                            <CommandEmpty>Nenhum serviço encontrado.</CommandEmpty>
                            <CommandGroup className="max-h-[200px] overflow-y-auto">
                              {servicos.map((s) =>
                            <CommandItem
                              key={s.id}
                              value={`${s.nome}__${s.id}`}
                              onSelect={() => {
                                setServicoPrincipalEdicao(s.nome);
                                setOpenServicoEdicao(false);
                              }}>
                              
                                  <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  servicoPrincipalEdicao === s.nome ? "opacity-100" : "opacity-0"
                                )} />
                              
                                  {s.nome} - R$ {s.valor?.toFixed(2)}
                                </CommandItem>
                            )}
                            </CommandGroup>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      
                      {/* Botão + Serviço */}
                      <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs whitespace-nowrap"
                      onClick={() => {
                        setServicosExtrasEdicao([
                        ...servicosExtrasEdicao,
                        { id: crypto.randomUUID(), nome: "", valor: 0 }]
                        );
                      }}>
                      
                        + Serviço
                      </Button>
                    </div>
                  </div>

                  {/* Serviços Extras */}
                  {servicosExtrasEdicao.length > 0 &&
                <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Serviços Extras</Label>
                      {servicosExtrasEdicao.map((extra, index) =>
                  <div key={extra.id} className="flex gap-2 items-center">
                          <ServicoExtraCombobox
                      extra={extra}
                      index={index}
                      servicos={servicos}
                      onSelect={(selectedServico) => {
                        const novosExtras = [...servicosExtrasEdicao];
                        novosExtras[index] = {
                          id: selectedServico.id,
                          nome: selectedServico.nome,
                          valor: selectedServico.valor
                        };
                        setServicosExtrasEdicao(novosExtras);
                      }} />
                    
                          
                          {/* Botão Remover */}
                          <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      onClick={() => {
                        setServicosExtrasEdicao(servicosExtrasEdicao.filter((_, i) => i !== index));
                      }}>
                      
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                  )}
                    </div>
                }

                  {/* Groomer - para ambos os tipos */}
                  <div className="space-y-1">
                    <Label className="text-xs">Groomer</Label>
                    <Select
                      value={editandoAgendamento.groomer}
                      onValueChange={(value) =>
                        setEditandoAgendamento({
                          ...editandoAgendamento,
                          groomer: value
                        })
                      }>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Selecione o groomer" />
                      </SelectTrigger>
                      <SelectContent className="bg-background z-50">
                        {groomers.length === 0 ?
                          <SelectItem value="none" disabled className="text-xs">
                            Nenhum groomer cadastrado
                          </SelectItem> :
                          groomers.map((g) =>
                            <SelectItem key={g.id} value={g.nome} className="text-xs">
                              {g.nome}
                            </SelectItem>
                          )
                        }
                      </SelectContent>
                    </Select>
                  </div>

                  {editandoAgendamento.tipo === "pacote" &&
                <>
                      <div className="space-y-1">
                        <Label className="text-xs">Nome do Pacote</Label>
                        <Input
                      value={editandoAgendamento.nomePacote}
                      onChange={(e) =>
                      setEditandoAgendamento({
                        ...editandoAgendamento,
                        nomePacote: e.target.value
                      })
                      }
                      className="h-8 text-xs" />
                    
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs">N° do Serviço do Pacote</Label>
                          <Input
                        value={editandoAgendamento.numeroPacote}
                        readOnly
                        className="h-8 text-xs bg-secondary" />
                      
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Taxi Dog</Label>
                          <Select
                        value={editandoAgendamento.taxiDog}
                        onValueChange={(value) =>
                        setEditandoAgendamento({
                          ...editandoAgendamento,
                          taxiDog: value
                        })
                        }>
                        
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                              <SelectItem value="Sim" className="text-xs">
                                Sim
                              </SelectItem>
                              <SelectItem value="Não" className="text-xs">
                                Não
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </>
                }

                  {editandoAgendamento.tipo === "simples" &&
                <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Data da Venda</Label>
                        <Input
                      type="date"
                      value={editandoAgendamento.dataVenda}
                      onChange={(e) =>
                      setEditandoAgendamento({
                        ...editandoAgendamento,
                        dataVenda: e.target.value
                      })
                      }
                      className="h-8 text-xs" />
                    
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs">Taxi Dog *</Label>
                        <Select
                      value={editandoAgendamento.taxiDog}
                      onValueChange={(value) =>
                      setEditandoAgendamento({
                        ...editandoAgendamento,
                        taxiDog: value
                      })
                      }>
                      
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent className="bg-background z-50">
                            <SelectItem value="Sim" className="text-xs">
                              Sim
                            </SelectItem>
                            <SelectItem value="Não" className="text-xs">
                              Não
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                }

                  {editandoAgendamento.tipo === "pacote" &&
                <div className="space-y-1">
                      <Label className="text-xs">Data da Venda</Label>
                      <Input
                    type="date"
                    value={editandoAgendamento.dataVenda}
                    onChange={(e) =>
                    setEditandoAgendamento({
                      ...editandoAgendamento,
                      dataVenda: e.target.value
                    })
                    }
                    className="h-8 text-xs" />
                  
                    </div>
                }

                  {/* Outros pets no mesmo agendamento */}
                  {editMultiPetGroup.length > 0 && (
                    <div className="space-y-2 border rounded-md p-3 bg-secondary/20">
                      <Label className="text-xs font-semibold">Outros pets neste agendamento</Label>
                      <div className="space-y-1.5">
                        {editMultiPetGroup.map((sibling) => (
                          <div key={sibling.id} className="flex items-center justify-between p-2 rounded border bg-background">
                            <div className="flex-1">
                              <div className="text-xs font-medium">{sibling.pet} <span className="text-muted-foreground">({sibling.raca})</span></div>
                              <div className="text-[10px] text-muted-foreground">
                                {sibling.horarioInicio?.substring(0, 5)} - {sibling.horarioTermino?.substring(0, 5)} • {sibling.servico} {sibling.groomer ? `• ${sibling.groomer}` : ''}
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] text-primary hover:text-primary/80"
                                onClick={() => handleEditarClick(sibling)}>
                                Editar
                              </Button>
                              <Button type="button" variant="ghost" size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                                onClick={() => { setPetParaDeletar(sibling); setDeletePetDialogOpen(true); }}>
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {editMultiPetGroup.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-xs font-semibold text-primary">Editando: {editandoAgendamento.pet}</span>
                      <Button type="button" variant="ghost" size="icon"
                        className="h-5 w-5 text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                        onClick={() => { setPetParaDeletar(editandoAgendamento); setDeletePetDialogOpen(true); }}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}

                  <div className="flex justify-between gap-2 pt-4">
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2 items-center">
                        <Button
                        type="button"
                        variant="destructive"
                        onClick={() => handleExcluirAgendamento(editandoAgendamento)}
                        className="h-8 text-xs gap-2">
                        
                          <Trash2 className="h-3 w-3" />
                          Excluir Agendamento
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Enviar WhatsApp"
                          onClick={(e) => enviarWhatsAppDireto(editandoAgendamento, e)}>
                          <i className="fi fi-brands-whatsapp text-green-600" style={{ fontSize: '14px' }}></i>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Pet Pronto"
                          onClick={(e) => handlePetProntoClick(editandoAgendamento, e)}>
                          <Check className="h-4 w-4 text-blue-600" />
                        </Button>
                      </div>
                      <Button
                        type="button"
                        className="h-8 text-xs gap-2 bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => setFinanceiroDialogOpen(true)}
                        disabled={!lancamentoVinculado}>
                        Financeiro
                      </Button>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditDialogGerenciamento(false);
                        setEditandoAgendamento(null);
                        setEditMultiPetGroup([]);
                        setLancamentoVinculado(null);
                        setLancamentoItensVinculado([]);
                      }}
                      className="h-8 text-xs">
                      
                        Cancelar
                      </Button>
                      <Button type="button" onClick={handleAtualizarAgendamento} className="h-8 text-xs">
                        Atualizar Agendamento
                      </Button>
                    </div>
                  </div>
                </div>
              }
            </DialogContent>
          </Dialog>

          {/* Dialog de Confirmação de Exclusão */}
          <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir este agendamento? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => {
                    setDeleteDialogOpen(false);
                    setAgendamentoParaDeletar(null);
                  }}>
                  
                  Cancelar
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmarExclusao}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Dialog Pet Pronto - Atualizar horário de fim */}
          <AlertDialog open={petProntoDialogOpen} onOpenChange={setPetProntoDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Pet Pronto</AlertDialogTitle>
                <AlertDialogDescription>
                  Deseja atualizar o horário do Fim do serviço para {petProntoHoraAtual}?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => handlePetProntoConfirm(false)}>
                  Não
                </AlertDialogCancel>
                <AlertDialogAction onClick={() => handlePetProntoConfirm(true)}>
                  Sim
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <FinanceiroEditDialog
            open={financeiroDialogOpen}
            onOpenChange={setFinanceiroDialogOpen}
            lancamento={lancamentoVinculado}
            itens={lancamentoItensVinculado}
            clientes={clientes}
            servicos={servicos}
            ownerId={ownerId || user?.id || ""}
            onUpdated={async (lancamentoId?: string) => {
              if (lancamentoId) {
                // Reload the specific lancamento by ID to ensure we get the exact updated record
                try {
                  const { data: lancamento } = await supabase
                    .from("lancamentos_financeiros")
                    .select("*")
                    .eq("id", lancamentoId)
                    .maybeSingle();
                  if (lancamento) {
                    setLancamentoVinculado(lancamento);
                    const { data: itens } = await supabase
                      .from("lancamentos_financeiros_itens")
                      .select("*")
                      .eq("lancamento_id", lancamentoId);
                    setLancamentoItensVinculado(itens || []);
                  }
                } catch (e) {
                  console.error("Erro ao recarregar lançamento:", e);
                }
              } else if (editandoAgendamento) {
                await loadFinanceiroVinculado(editandoAgendamento);
              }
            }}
          />
        </div>
      </div>

      <Card>
        <CardHeader className="py-2">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex gap-2 items-center mb-2">
                <Button
                  variant={viewMode === "semana" ? "default" : "outline"}
                  onClick={() => setViewMode("semana")}
                  className="h-7 text-xs">
                  
                  Semana
                </Button>
                <Button
                  variant={
                  selectedDate === formatDateForInput(new Date()) && viewMode === "dia" ? "default" : "outline"
                  }
                  onClick={() => {
                    setViewMode("dia");
                    const today = formatDateForInput(new Date());
                    setSelectedDate(today);
                    setCalendarDate(new Date());
                  }}
                  className="h-7 text-xs">
                  
                  Hoje
                </Button>
                {viewMode === "dia" &&
                <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                    <PopoverTrigger asChild>
                      <Button
                      variant={selectedDate !== formatDateForInput(new Date()) ? "default" : "outline"}
                      className="h-7 text-xs gap-2">
                      
                        <CalendarIcon className="h-3 w-3" />
                        {format(calendarDate, "dd/MM/yyyy", {
                        locale: ptBR
                      })}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                      mode="single"
                      selected={calendarDate}
                      onSelect={(date) => {
                        if (date) {
                          setCalendarDate(date);
                          setSelectedDate(formatDateForInput(date));
                          setShowCalendar(false);
                        }
                      }}
                      initialFocus
                      className="pointer-events-auto" />
                    
                    </PopoverContent>
                  </Popover>
                }
                {viewMode === "dia" &&
                <div className="flex items-center gap-1 ml-2 border rounded-md p-0.5">
                    <Button
                      variant={diaViewMode === "relatorio" ? "default" : "ghost"}
                      onClick={() => handleDiaViewModeChange("relatorio")}
                      className="h-6 text-xs px-2 gap-1">
                      <LayoutList className="h-3 w-3" />
                      Relatório
                    </Button>
                    <Button
                      variant={diaViewMode === "cards" ? "default" : "ghost"}
                      onClick={() => handleDiaViewModeChange("cards")}
                      className="h-6 text-xs px-2 gap-1">
                      <LayoutGrid className="h-3 w-3" />
                      Cards
                    </Button>
                  </div>
                }
              </div>

              {viewMode === "semana" ?
              <>
                  <CardTitle className="text-base">Agenda Semanal</CardTitle>
                  <CardDescription className="text-xs">
                    Semana de{" "}
                    {weekDates[0].toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long"
                  })}{" "}
                    a{" "}
                    {weekDates[6].toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "long"
                  })}
                  </CardDescription>
                  <p className="text-xs text-muted-foreground mt-1">
                    Houve {contarAgendamentos()} agendamentos realizados nesta semana.
                  </p>
                </> :

              <>
                  <CardTitle className="text-base">Agenda do Dia</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Houve {contarAgendamentos()} agendamentos realizados neste dia.
                  </p>
                </>
              }
            </div>
            {viewMode === "semana" &&
            <div className="flex gap-2">
                <Button variant="outline" onClick={() => navigateWeek(-1)} className="h-8 text-xs">
                  ← Semana Anterior
                </Button>
                <Button variant="outline" onClick={() => navigateWeek(1)} className="h-8 text-xs">
                  Próxima Semana →
                </Button>
              </div>
            }
            <div className="flex items-center gap-2">
              {viewMode !== "semana" && <div />}
              {whatsappConnected ? (
                <div className="flex items-center gap-1.5 text-green-600">
                  <Wifi className="h-4 w-4" />
                  <span className="text-xs font-medium hidden sm:inline">WhatsApp Conectado</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-destructive">
                  <WifiOff className="h-4 w-4" />
                  <span className="text-xs font-medium hidden sm:inline">WhatsApp Desconectado</span>
                </div>
              )}
              
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-2 px-1 overflow-visible">
          {viewMode === "semana" ?
           (() => {
                const slotH = 40; // px per 30-min slot
                const gridStartMin = timeToMinutes(horarios[0]);
                const gridEndMin = timeToMinutes(horarios[horarios.length - 1]) + 30;
                const totalSlots = horarios.length;
                const totalHeight = totalSlots * slotH;
                return (
                  <div className="w-full">
                    {/* Sticky header */}
                    <div className="sticky top-12 z-20 bg-card border-b grid" style={{ gridTemplateColumns: `36px repeat(${filteredWeekDates.length}, 1fr)` }}>
                      <div className="p-0.5 flex items-center justify-center">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                      </div>
                      {filteredWeekDates.map((date, idx) => (
                        <div key={idx} className="p-2 text-center border-l">
                          <div className="font-semibold text-sm">{diasSemana[date.getDay()]}</div>
                          <div className="text-xs text-muted-foreground">
                            {date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Time grid body */}
                    <div className="grid" style={{ gridTemplateColumns: `36px repeat(${filteredWeekDates.length}, 1fr)` }}>
                      {/* Time labels column */}
                      <div className="relative" style={{ height: totalHeight }}>
                        {horarios.map((h, i) => (
                          <div
                            key={h}
                            className="absolute left-0 right-0 text-[10px] leading-tight font-medium text-muted-foreground border-t flex items-start justify-center pt-px"
                            style={{ top: i * slotH, height: slotH }}
                          >
                            {h}
                          </div>
                        ))}
                      </div>

                      {/* Day columns */}
                      {filteredWeekDates.map((date, dayIdx) => {
                        const items = getUnifiedForDate(date);
                        // Calculate overlapping groups for side-by-side rendering
                        const positioned = items.map(item => {
                          const startMin = timeToMinutes(item.horarioInicio);
                          const endMin = timeToMinutes(item.horarioTermino);
                          const duration = endMin > startMin ? endMin - startMin : 60;
                          const top = ((startMin - gridStartMin) / (gridEndMin - gridStartMin)) * totalHeight;
                          const height = Math.max((duration / (gridEndMin - gridStartMin)) * totalHeight, 24);
                          return { item, startMin, endMin: startMin + duration, top, height };
                        });

                        // Simple overlap grouping
                        const groups: typeof positioned[] = [];
                        const used = new Set<number>();
                        positioned.forEach((p, i) => {
                          if (used.has(i)) return;
                          const group = [p];
                          used.add(i);
                          positioned.forEach((q, j) => {
                            if (used.has(j)) return;
                            if (q.startMin < p.endMin && q.endMin > p.startMin) {
                              group.push(q);
                              used.add(j);
                            }
                          });
                          groups.push(group);
                        });

                        // Assign column index within each group
                        const colMap = new Map<typeof positioned[0], { col: number; total: number }>();
                        groups.forEach(group => {
                          group.forEach((p, idx) => colMap.set(p, { col: idx, total: group.length }));
                        });

                        return (
                          <div key={dayIdx} className="relative border-l" style={{ height: totalHeight }}>
                            {/* Slot lines */}
                            {horarios.map((h, i) => (
                              <div
                                key={h}
                                className={`absolute left-0 right-0 border-t ${i % 2 === 0 ? 'border-border' : 'border-border/40'}`}
                                style={{ top: i * slotH, height: slotH }}
                              />
                            ))}

                            {/* Cards */}
                            {positioned.map((p) => {
                              const col = colMap.get(p) || { col: 0, total: 1 };
                              const widthPct = 100 / col.total;
                              const leftPct = col.col * widthPct;
                              return (
                                <div
                                  key={p.item.id}
                                  className="absolute p-1 rounded text-xs text-white cursor-pointer hover:brightness-110 transition-all overflow-hidden"
                                  style={{
                                    backgroundColor: '#1976D2',
                                    top: p.top,
                                    height: Math.max(p.height, 24),
                                    left: `${leftPct}%`,
                                    width: `calc(${widthPct}% - 4px)`,
                                    marginLeft: 2,
                                    zIndex: 10
                                  }}
                                  onClick={() => handleEditarClick(p.item)}
                                >
                                  <div className="font-bold break-words flex items-center gap-0.5">
                                    {p.item.tipo === "pacote" && <Package className="h-3 w-3 flex-shrink-0" />}
                                    {p.item.horarioInicio?.substring(0, 5)} - {p.item.cliente}
                                  </div>
                                  <div className="font-bold break-words">
                                    {p.item.pet} - {p.item.raca}
                                  </div>
                                  <div className="break-words text-white/80">{p.item.servico}</div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
               })() :

          diaViewMode === "cards" ?
          (() => {
                const SLOT_FULL = 60; // height for slots WITH events nearby
                const SLOT_EMPTY = 16; // reduced height for empty slots
                const todayDate = new Date(selectedDate + "T00:00:00");
                const items = getUnifiedForDate(todayDate);

                // Build positioned items with minute-based start/end
                const positioned = items.map(item => {
                  const startMin = timeToMinutes(item.horarioInicio);
                  const endMin = timeToMinutes(item.horarioTermino);
                  const duration = endMin > startMin ? endMin - startMin : 60;
                  return { item, startMin, endMin: startMin + duration };
                }).sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);

                // Build independent conflict groups (connected components of overlapping intervals)
                // Google Calendar style: cards expand rightward to fill unused columns
                const colMap = new Map<typeof positioned[0], { col: number; total: number; span: number }>();
                const visited = new Set<number>();
                
                for (let i = 0; i < positioned.length; i++) {
                  if (visited.has(i)) continue;
                  // BFS to find all transitively overlapping items
                  const group: number[] = [];
                  const queue = [i];
                  visited.add(i);
                  while (queue.length > 0) {
                    const cur = queue.shift()!;
                    group.push(cur);
                    for (let j = 0; j < positioned.length; j++) {
                      if (visited.has(j)) continue;
                      if (positioned[j].startMin < positioned[cur].endMin && positioned[j].endMin > positioned[cur].startMin) {
                        visited.add(j);
                        queue.push(j);
                      }
                    }
                  }
                  
                  // Assign columns within this isolated group using greedy colouring
                  const groupItems = group.map(idx => positioned[idx]).sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin);
                  const groupCols: (typeof positioned[0])[][] = [];
                  groupItems.forEach(p => {
                    let placed = false;
                    for (let c = 0; c < groupCols.length; c++) {
                      const lastInCol = groupCols[c][groupCols[c].length - 1];
                      if (p.startMin >= lastInCol.endMin) {
                        groupCols[c].push(p);
                        colMap.set(p, { col: c, total: 0, span: 1 });
                        placed = true;
                        break;
                      }
                    }
                    if (!placed) {
                      colMap.set(p, { col: groupCols.length, total: 0, span: 1 });
                      groupCols.push([p]);
                    }
                  });
                  
                  const totalCols = groupCols.length;
                  
                  // For each item, expand rightward into unused columns (Google Calendar style)
                  groupItems.forEach(p => {
                    const pData = colMap.get(p)!;
                    pData.total = totalCols;
                    // Check how far right this card can expand
                    let maxSpan = 1;
                    for (let c = pData.col + 1; c < totalCols; c++) {
                      const colOccupied = groupItems.some(
                        q => q !== p && colMap.get(q)!.col === c && q.startMin < p.endMin && q.endMin > p.startMin
                      );
                      if (colOccupied) break;
                      maxSpan++;
                    }
                    pData.span = maxSpan;
                  });
                  
                  // No separate equalization needed — greedy colouring + rightward
                  // expansion already guarantees equal widths for concurrent cards
                  // (same totalCols, same span) and no overlap.
                }

                // Determine which slots have events (for adaptive height)
                const gridStartMin = timeToMinutes(horarios[0]);
                const occupiedSlots = new Set<number>();
                positioned.forEach(p => {
                  horarios.forEach((h, idx) => {
                    const slotStart = timeToMinutes(h);
                    const slotEnd = slotStart + 30;
                    if (p.startMin < slotEnd && p.endMin > slotStart) {
                      occupiedSlots.add(idx);
                    }
                  });
                });

                // Calculate cumulative top for each slot
                const slotTops: number[] = [];
                let cumTop = 0;
                horarios.forEach((_, idx) => {
                  slotTops.push(cumTop);
                  cumTop += occupiedSlots.has(idx) ? SLOT_FULL : SLOT_EMPTY;
                });
                const totalHeight = cumTop;

                // Helper: minutes to pixel Y
                const minToY = (min: number) => {
                  for (let i = horarios.length - 1; i >= 0; i--) {
                    const slotStart = timeToMinutes(horarios[i]);
                    if (min >= slotStart) {
                      const slotH = occupiedSlots.has(i) ? SLOT_FULL : SLOT_EMPTY;
                      const frac = Math.min((min - slotStart) / 30, 1);
                      return slotTops[i] + frac * slotH;
                    }
                  }
                  return 0;
                };

                return (
                  <div className="w-full">
                    <div className="grid" style={{ gridTemplateColumns: `36px 1fr` }}>
                      <div className="relative" style={{ height: totalHeight }}>
                        {horarios.map((h, i) => {
                          const slotH = occupiedSlots.has(i) ? SLOT_FULL : SLOT_EMPTY;
                          return (
                            <div
                              key={h}
                              className="absolute left-0 right-0 text-[10px] leading-tight font-medium text-muted-foreground border-t flex items-start justify-center pt-px"
                              style={{ top: slotTops[i], height: slotH }}
                            >
                              {h}
                            </div>
                          );
                        })}
                      </div>
                      <div className="relative border-l" style={{ height: totalHeight }}>
                        {horarios.map((h, i) => {
                          const slotH = occupiedSlots.has(i) ? SLOT_FULL : SLOT_EMPTY;
                          return (
                            <div
                              key={h}
                              className={`absolute left-0 right-0 border-t ${i % 2 === 0 ? 'border-border' : 'border-border/40'}`}
                              style={{ top: slotTops[i], height: slotH }}
                            />
                          );
                        })}
                        {positioned.map((p) => {
                          const col = colMap.get(p) || { col: 0, total: 1, span: 1 };
                          const colWidthPct = 100 / col.total;
                          const leftPct = col.col * colWidthPct;
                          const widthPct = colWidthPct * col.span;
                          const top = minToY(p.startMin) + 1;
                          const height = Math.max(minToY(p.endMin) - minToY(p.startMin) - 2, 50);
                          const hasTaxiDog = p.item.taxiDog?.toLowerCase() === "sim";
                          return (
                            <div
                              key={p.item.id}
                              className="absolute p-1 rounded text-white cursor-pointer hover:brightness-110 transition-all overflow-hidden"
                              style={{
                                fontSize: '10px',
                                backgroundColor: '#1976D2',
                                top,
                                height,
                                left: `calc(${leftPct}% + 2px)`,
                                width: `calc(${widthPct}% - 4px)`,
                                zIndex: 10
                              }}
                              onClick={() => handleEditarClick(p.item)}
                            >
                              <div className="font-bold break-words flex items-center gap-0.5 leading-tight">
                                {p.item.tipo === "pacote" && <Package className="h-3 w-3 flex-shrink-0" />}
                                {hasTaxiDog && (
                                  <span title="Taxi Dog" className="flex-shrink-0">🚗</span>
                                )}
                                {p.item.horarioInicio?.substring(0, 5)} - {p.item.cliente}
                              </div>
                              <div className="font-bold break-words leading-tight">
                                {p.item.pet} - {p.item.raca}
                              </div>
                              <div className="break-words text-white/80 leading-tight">{p.item.servico}</div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })() :

          <div className="flex gap-2">
              {/* Gantt Chart */}
              <div className="flex-1 overflow-x-auto">
                <div className="min-w-[400px] relative">
                  {/* Header com horários */}
                  <div className="flex border-b pb-1 mb-2 relative">
                    {/* Linhas verticais de fundo */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {Array.from({
                      length: (horariosGantt.length - 1) * 2 + 1
                    }).map((_, i) =>
                    <div key={i} className="flex-1 border-r border-gray-300/30" />
                    )}
                    </div>

                    {horariosGantt.map((h) =>
                  <div
                    key={h}
                    className="flex-1 text-center text-[10px] font-semibold text-muted-foreground relative z-10">
                    
                        {h}
                      </div>
                  )}
                  </div>

                  {/* Barras de agendamentos */}
                  <div
                  className="space-y-0 relative"
                  style={{
                    minHeight: `${Math.max(agendamentosDia.length * 8 + 16, 200)}px`
                  }}>
                  
                    {/* Linhas verticais estendidas para a área de barras */}
                    <div className="absolute inset-0 flex pointer-events-none">
                      {Array.from({
                      length: (horariosGantt.length - 1) * 2 + 1
                    }).map((_, i) =>
                    <div key={i} className="flex-1 border-r border-gray-300/30 h-full" />
                    )}
                    </div>

                    {agendamentosDia.map((agendamento, index) => {
                    const [inicioH, inicioM] = agendamento.horarioInicio.split(":").map(Number);
                    const [fimH, fimM] = agendamento.horarioFim ?
                    agendamento.horarioFim.split(":").map(Number) :
                    [inicioH + 1, inicioM];
                    const [primeiroH] = horariosGantt[0].split(":").map(Number);
                    const [ultimoH] = horariosGantt[horariosGantt.length - 1].split(":").map(Number);
                    const totalMinutos = (ultimoH - primeiroH + 1) * 60;
                    const inicioMinutos = (inicioH - primeiroH) * 60 + inicioM;
                    const duracaoMinutos = (fimH - inicioH) * 60 + (fimM - inicioM);
                    const left = inicioMinutos / totalMinutos * 100;
                    const width = duracaoMinutos / totalMinutos * 100;
                    return (
                      <div
                        key={index}
                        className="absolute h-4 bg-orange-500 rounded flex items-center justify-center text-[8px] font-semibold text-black relative z-10"
                        style={{
                          left: `${left}%`,
                          width: `${Math.max(width, 5)}%`,
                          top: `${index * 8}px`
                        }}>
                        
                          {agendamento.horarioInicio.substring(0, 5)} -{" "}
                          {agendamento.horarioFim?.substring(0, 5) || agendamento.horarioInicio.substring(0, 5)}
                        </div>);

                  })}
                  </div>
                </div>
              </div>

              {/* Tabela de informações */}
              <div className="flex-1 overflow-visible">
                <table className="w-full text-[10px] border">
                  <thead className="bg-secondary sticky top-0">
                    <tr>
                      {/* Colunas A e B (Início e Fim) - Mais estreitas */}
                      <th className="p-1 border text-left w-[32px] whitespace-nowrap">Início</th>
                      <th className="p-1 border text-left w-[32px] whitespace-nowrap">Fim</th>

                      <th className="p-1 border text-left">Tutor</th>
                      <th className="p-1 border text-left">Pet</th>
                      <th className="p-1 border text-left">Raça</th>
                      <th className="p-1 border text-left">Serviço</th>

                      <th className="p-1 border text-left w-[40px] whitespace-nowrap">N° PCT</th>
                      <th className="p-1 border text-left w-[28px] whitespace-nowrap">Taxi</th>
                      <th className="p-1 border text-left w-[32px] whitespace-nowrap">Whats</th>
                      <th className="p-1 border text-center w-[38px] whitespace-nowrap">Pronto</th>
                      <th className="p-1 border text-left whitespace-nowrap">Groomer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agendamentosDia.map((agendamento, index) =>
                  <tr key={index} className={cn("transition-colors cursor-pointer", (agendamento as any).isCheckinExtra ? "bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-900/40" : "hover:bg-cyan-500/20")} onClick={() => handleEditarClick(convertDiaItemToUnificado(agendamento))}>
                        <td className="p-1 border whitespace-nowrap">
                          {agendamento.horarioInicio ? agendamento.horarioInicio.substring(0, 5) : "-"}
                        </td>
                        <td className="p-1 border whitespace-nowrap">
                          {agendamento.horarioFim ? agendamento.horarioFim.substring(0, 5) : "-"}
                        </td>
                        <td className="p-1 border">{agendamento.cliente}</td>
                        <td className="p-1 border">{agendamento.pet}</td>
                        <td className="p-1 border break-words">{agendamento.raca || "-"}</td>
                        <td className="p-1 border break-words">{agendamento.servico}</td>
                        <td className="p-1 border whitespace-nowrap">{agendamento.numeroPacote || ""}</td>
                        <td className="p-1 border whitespace-nowrap">
                          {agendamento.taxiDog === "Sim" ? "Sim" : agendamento.taxiDog === "Não" ? "Não" : ""}
                        </td>
                        <td className="p-1 border">
                          {(agendamento.tipo === "pacote" && agendamento.agendamentoPacote && agendamento.servicoAgendamento) ||
                      (agendamento.tipo === "simples" && (agendamento.agendamentoOriginal || agendamento.agendamento)) ?
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => enviarWhatsAppDireto(agendamento, e)}
                        className="h-5 w-5 p-0">
                        <i className="fi fi-brands-whatsapp text-green-600" style={{ fontSize: '12px' }}></i>
                      </Button> :
                      null}
                        </td>
                        <td className="p-1 border text-center">
                          <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handlePetProntoClick(agendamento, e)}
                        className="h-5 w-5 p-0">
                        
                            <i className="fi fi-tr-comment-alt-check" style={{ fontSize: '14px', color: '#2d6a1e' }}></i>
                          </Button>
                        </td>
                        <td className="p-1 border whitespace-nowrap">{agendamento.groomer || ""}</td>
                      </tr>
                  )}
                  </tbody>
                </table>
              </div>
            </div>
          }

          {/* Dialog de edição */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-lg">Editar Agendamento</DialogTitle>
                <DialogDescription className="text-xs">Altere as informações do agendamento</DialogDescription>
              </DialogHeader>

              {editingAgendamento &&
              <div className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Cliente</Label>
                    <Input value={editingAgendamento.cliente} disabled className="h-8 text-xs bg-secondary" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Pet</Label>
                    <Input value={editingAgendamento.pet} disabled className="h-8 text-xs bg-secondary" />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Serviço</Label>
                    <Popover open={openEditServicoCombobox} onOpenChange={setOpenEditServicoCombobox}>
                      <PopoverTrigger asChild>
                        <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openEditServicoCombobox}
                        className="h-8 w-full justify-between text-xs font-normal">
                        
                          {editFormData.servico || "Selecione um serviço"}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0 bg-background z-50">
                        <Command>
                          <CommandInput placeholder="Buscar serviço..." className="h-9 text-xs" />
                          <CommandEmpty className="text-xs py-6 text-center text-muted-foreground">
                            Nenhum serviço encontrado.
                          </CommandEmpty>
                          {servicos.length > 0 &&
                        <CommandGroup heading="Serviços Individuais" className="text-xs">
                              {servicos.map((servico) =>
                          <CommandItem
                            key={`servico-${servico.id}`}
                            value={`${servico.nome}__${servico.id}`}
                            onSelect={() => {
                              setEditFormData({
                                ...editFormData,
                                servico: servico.nome
                              });
                              setOpenEditServicoCombobox(false);
                            }}
                            className="text-xs">
                            
                                  <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                editFormData.servico === servico.nome ? "opacity-100" : "opacity-0"
                              )} />
                            
                                  {servico.nome} — {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(servico.valor)}
                                </CommandItem>
                          )}
                            </CommandGroup>
                        }
                          {pacotes.length > 0 &&
                        <CommandGroup heading="Pacotes de Serviços" className="text-xs">
                              {pacotes.map((pacote) =>
                          <CommandItem
                            key={`pacote-${pacote.id}`}
                            value={`${pacote.nome}__${pacote.id}`}
                            onSelect={() => {
                              setEditFormData({
                                ...editFormData,
                                servico: pacote.nome
                              });
                              setOpenEditServicoCombobox(false);
                            }}
                            className="text-xs">
                            
                                  <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                editFormData.servico === pacote.nome ? "opacity-100" : "opacity-0"
                              )} />
                            
                                  {pacote.nome}
                                </CommandItem>
                          )}
                            </CommandGroup>
                        }
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Data</Label>
                    <Popover open={calendarEditCalOpen} onOpenChange={setCalendarEditCalOpen}>
                      <PopoverTrigger asChild>
                        <Input
                           type="text"
                           placeholder="dd/mm/aaaa"
                          value={toDisplayDate(editFormData.data)}
                          onChange={(e) => {
                            const iso = fromDisplayDate(e.target.value);
                            setEditFormData({
                              ...editFormData,
                              data: iso
                            });
                          }
                          }
                          onDoubleClick={() => setCalendarEditCalOpen(true)}
                          className="h-8 text-xs" />
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={editFormData.data ? new Date(editFormData.data + "T00:00:00") : undefined}
                          onSelect={(date) => {
                            if (date) {
                              setEditFormData({
                                ...editFormData,
                                data: format(date, "yyyy-MM-dd")
                              });
                            }
                            setCalendarEditCalOpen(false);
                          }}
                          locale={ptBR}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                  <div className="space-y-1">
                    <Label className="text-xs">Horário de Início</Label>
                    <TimeInput
                    value={editFormData.horarioInicio}
                    onChange={(value) => {
                      const horarioTermino = editFormData.tempoServico ? calcularHorarioTermino(value, editFormData.tempoServico) : "";
                      const tempoServico = !editFormData.tempoServico && editFormData.horarioTermino ? calcularTempoServico(value, editFormData.horarioTermino) : editFormData.tempoServico;
                      setEditFormData({
                        ...editFormData,
                        horarioInicio: value,
                        horarioTermino,
                        tempoServico
                      });
                    }}
                    placeholder="00:00"
                    className="h-8 text-xs" />
                  
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Horário de Fim</Label>
                    <TimeInput
                    value={editFormData.horarioTermino || ""}
                    onChange={(value) => {
                      const tempoServico = editFormData.horarioInicio ? calcularTempoServico(editFormData.horarioInicio, value) : "";
                      setEditFormData({
                        ...editFormData,
                        horarioTermino: value,
                        tempoServico
                      });
                    }}
                    placeholder="00:00"
                    className="h-8 text-xs" />
                  
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs">Tempo de Serviço</Label>
                    <TimeInput
                    value={editFormData.tempoServico}
                    onChange={(value) => {
                      const horarioTermino = editFormData.horarioInicio ? calcularHorarioTermino(editFormData.horarioInicio, value) : "";
                      setEditFormData({
                        ...editFormData,
                        tempoServico: value,
                        horarioTermino
                      });
                    }}
                    placeholder="0:00"
                    className="h-8 text-xs"
                    allowSingleDigitHour={true} />
                  
                  </div>
                  </div>

                  <div className="flex justify-between gap-2 pt-2">
                    <div className="flex gap-2 items-center">
                      <Button
                        type="button"
                        variant="destructive"
                        className="h-8 text-xs"
                        onClick={() => {
                          if (editingAgendamento.tipo === "pacote") {
                            const updated = agendamentosPacotes.
                              map((p) => {
                                if (p.id === editingAgendamento.agendamentoPacote.id) {
                                  return {
                                    ...p,
                                    servicos: p.servicos.filter(
                                      (s) => s.numero !== editingAgendamento.servicoAgendamento.numero
                                    )
                                  };
                                }
                                return p;
                              }).
                              filter((p) => p.servicos.length > 0);
                            setAgendamentosPacotes(updated);
                            toast.success("Agendamento excluído!");
                            setEditDialogOpen(false);
                          }
                        }}>
                        Excluir Agendamento
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Enviar WhatsApp"
                        onClick={(e) => {
                          const agObj = {
                            ...editingAgendamento,
                            horarioInicio: editingAgendamento.servicoAgendamento?.horarioInicio || editFormData.horarioInicio,
                          };
                          enviarWhatsAppDireto(agObj, e);
                        }}>
                        <i className="fi fi-brands-whatsapp text-green-600" style={{ fontSize: '14px' }}></i>
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Pet Pronto"
                        onClick={(e) => handlePetProntoClick(editingAgendamento, e)}>
                        <Check className="h-4 w-4 text-blue-600" />
                      </Button>
                    </div>
                    <Button
                      type="button"
                      onClick={() => {
                        const horarioTerminoCheck = editFormData.horarioTermino || calcularHorarioTermino(editFormData.horarioInicio, editFormData.tempoServico);
                        if (horarioTerminoCheck && editFormData.horarioInicio && horarioTerminoCheck <= editFormData.horarioInicio) {
                          toast.error("O Horário de Fim não pode ser igual ou anterior ao Horário de Início. Por favor, corrija.");
                          return;
                        }
                        if (editingAgendamento.tipo === "pacote") {
                          const horarioTermino = editFormData.horarioTermino || calcularHorarioTermino(
                            editFormData.horarioInicio,
                            editFormData.tempoServico
                          );
                          const updated = agendamentosPacotes.map((p) => {
                            if (p.id === editingAgendamento.agendamentoPacote.id) {
                              return {
                                ...p,
                                servicos: p.servicos.map((s) => {
                                  if (s.numero === editingAgendamento.servicoAgendamento.numero) {
                                    return {
                                      ...s,
                                      nomeServico: editFormData.servico,
                                      data: editFormData.data,
                                      horarioInicio: editFormData.horarioInicio,
                                      tempoServico: editFormData.tempoServico,
                                      horarioTermino
                                    };
                                  }
                                  return s;
                                })
                              };
                            }
                            return p;
                          });
                          setAgendamentosPacotes(updated);
                          toast.success("Agendamento atualizado!");
                          setEditDialogOpen(false);
                        }
                      }}
                      className="h-8 text-xs">
                      Atualizar Agendamento
                    </Button>
                  </div>
                </div>
              }
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>);

};
export default Agendamentos;