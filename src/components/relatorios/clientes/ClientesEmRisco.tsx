// src/components/relatorios/clientes/ClientesEmRisco.tsx
import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye, Loader2, Filter, ChevronDown, ChevronUp } from "lucide-react";
import { format, differenceInDays, isValid } from "date-fns";
import { toast } from "sonner";
import { FiltrosClientesRisco } from "./FiltrosClientesRisco";
import { ModalDetalhesCliente } from "./ModalDetalhesCliente";
import { buildWhatsAppUrl, getInvalidPhoneMessage, normalizeBrazilPhone } from "@/utils/phone";

interface ClienteRisco {
  id: string;
  clienteId: string;
  petId: string;
  nomeCliente: string;
  nomePet: string;
  sexoPet: string | null;
  whatsapp: string;
  ultimoAgendamento: Date;
  diasSemAgendar: number;
  faixaRisco: string;
}

const classificarFaixaRisco = (dias: number): string => {
  if (dias >= 7 && dias <= 10) return "7-10";
  if (dias >= 11 && dias <= 15) return "11-15";
  if (dias >= 16 && dias <= 20) return "16-20";
  if (dias >= 21 && dias <= 30) return "21-30";
  if (dias >= 31 && dias <= 45) return "31-45";
  if (dias >= 46 && dias <= 90) return "46-90";
  if (dias > 90) return "perdido";
  return "sem-risco";
};

const obterVarianteBadge = (faixa: string) => {
  switch (faixa) {
    case "7-10":
      return "default";
    case "11-15":
    case "16-20":
    case "21-30":
    case "31-45":
      return "secondary";
    case "46-90":
    case "perdido":
      return "destructive";
    default:
      return "outline";
  }
};

const obterLabelFaixa = (faixa: string): string => {
  if (faixa === "perdido") return "Mais de 90 dias";
  return `${faixa} dias`;
};

const obterCorCard = (faixa: string) => {
  switch (faixa) {
    case "7-10":
      return "bg-green-50 border-green-200";
    case "11-15":
    case "16-20":
      return "bg-yellow-50 border-yellow-200";
    case "21-30":
    case "31-45":
      return "bg-orange-50 border-orange-200";
    case "46-90":
    case "perdido":
      return "bg-red-50 border-red-200";
    default:
      return "";
  }
};

const montarListaPets = (pets: { nomePet: string; sexoPet: string | null }[]): string => {
  return pets
    .map((p) => {
      const artigo = p.sexoPet?.toLowerCase() === "fêmea" || p.sexoPet?.toLowerCase() === "femea" ? "a" : "o";
      return `${artigo} ${p.nomePet}`;
    })
    .join(", ");
};

const isFemeaFe = (sexo: string | null): boolean => {
  const s = sexo?.toLowerCase();
  return s === "fêmea" || s === "femea";
};

const todosFemeaFe = (pets: { sexoPet: string | null }[]): boolean => {
  return pets.every((p) => isFemeaFe(p.sexoPet));
};

const gFe = (pets: { sexoPet: string | null }[], ms: string, fs: string, mp: string, fp: string): string => {
  if (pets.length === 1) return isFemeaFe(pets[0].sexoPet) ? fs : ms;
  return todosFemeaFe(pets) ? fp : mp;
};

const gerarMensagemAgrupada = (
  primeiroNome: string,
  pets: { nomePet: string; sexoPet: string | null; diasSemAgendar: number }[]
): string => {
  const listaPets = montarListaPets(pets);
  const maxDias = Math.max(...pets.map((p) => p.diasSemAgendar));
  const singular = pets.length === 1;

  if (singular) {
    const p = pets[0];
    const art = isFemeaFe(p.sexoPet) ? "A" : "O";
    const art_l = isFemeaFe(p.sexoPet) ? "a" : "o";
    const ele = isFemeaFe(p.sexoPet) ? "ela" : "ele";
    const dele = isFemeaFe(p.sexoPet) ? "dela" : "dele";
    const cheiroso = isFemeaFe(p.sexoPet) ? "cheirosa" : "cheiroso";
    const limpinho = isFemeaFe(p.sexoPet) ? "limpinha" : "limpinho";
    const do_ = isFemeaFe(p.sexoPet) ? "da" : "do";

    if (maxDias >= 7 && maxDias <= 10)
      return `Oi, ${primeiroNome}!\nSeparei alguns horários especiais essa semana e lembrei de vocês 😊\n${art} ${p.nomePet} já está na hora daquele banho caprichado 🛁✨ Quer que eu garanta um horário pra você?`;
    if (maxDias >= 11 && maxDias <= 15)
      return `🚨 Alerta banho atrasado! 😂🐶\nOi, ${primeiroNome}! ${art} ${p.nomePet} já passou da fase do 'só mais uns dias' 😅\nQue tal garantir aquele banho caprichado e deixar ${ele} ${cheiroso} e confortável de novo? 🛁💚\nMe chama que te passo os horários disponíveis !`;
    if (maxDias >= 16 && maxDias <= 20)
      return `Oi, ${primeiroNome}!\n${art} ${p.nomePet} já está há alguns dias além do ideal sem banho 😬\nNessa fase, pode começar a gerar desconfortos e até afetar a pele ${dele} 😕\nQue tal já agendarmos pra deixar ${ele} ${limpinho} e ${cheiroso} novamente? 🥰✨`;
    if (maxDias >= 21 && maxDias <= 30)
      return `Oi, ${primeiroNome}!\nJá faz um bom tempinho desde o último banho ${do_} ${p.nomePet} 🐾\nCom ${maxDias} dias, é bem importante retomar os cuidados pra evitar desconfortos e manter a saúde ${dele} 🛁\nVamos agendar pra deixar ${ele} ${limpinho} e ${cheiroso} novamente? ✨\nTemos alguns horários disponiveis, vamos agendar ?`;
    if (maxDias >= 31 && maxDias <= 45)
      return `🚨 Atenção: nível máximo de 'precisando de banho' atingido! 😂🐶\nOi, ${primeiroNome}! ${art} ${p.nomePet} já está pedindo socorro por um banho caprichado 🛁✨\nBora resolver isso e deixar ${ele} ${cheiroso} novamente?\nSe quiser, posso te sugerir os melhores horários disponíveis! 💚`;
    if (maxDias >= 46 && maxDias <= 90)
      return `Oi, ${primeiroNome}!\nPercebemos que ${art_l} ${p.nomePet} não vem há um tempinho… sentimos falta ${dele} por aqui 😕\nQueremos muito continuar cuidando ${dele} como sempre fizemos 😔\nVamos agendar um horário pra retomar esse cuidado?`;
    return `Oi, ${primeiroNome}!\nEstamos abrindo alguns horários especiais pra clientes que queremos muito receber de volta… e ${art_l} ${p.nomePet} está nessa lista 🐶✨\nQue tal aproveitar e agendar um banho pra deixar ${ele} ${cheiroso} novamente? 🛁😊`;
  }

  const eles = gFe(pets, "ele", "ela", "eles", "elas");
  const deles = gFe(pets, "dele", "dela", "deles", "delas");
  const cheirosos = gFe(pets, "cheiroso", "cheirosa", "cheirosos", "cheirosas");
  const limpinho = gFe(pets, "limpinho", "limpinha", "limpinho", "limpinha");

  if (maxDias >= 7 && maxDias <= 10)
    return `Oi, ${primeiroNome}!\nSeparei alguns horários especiais essa semana e lembrei de vocês 😊\n${listaPets} já estão na hora daquele banho caprichado 🛁✨ Quer que eu garanta um horário pra você?`;
  if (maxDias >= 11 && maxDias <= 15)
    return `🚨 Alerta banho atrasado! 😂🐶\nOi, ${primeiroNome}! ${listaPets} já passou da fase do 'só mais uns dias' 😅\nQue tal garantir aquele banho caprichado e deixar ${eles} ${cheirosos} e confortável de novo? 🛁💚\nMe chama que te passo os horários disponíveis !`;
  if (maxDias >= 16 && maxDias <= 20)
    return `Oi, ${primeiroNome}!\n${listaPets} já estão há alguns dias além do ideal sem banho 😬\nNessa fase, pode começar a gerar desconfortos e até afetar a pele ${deles} 😕\nQue tal já agendarmos pra deixar ${eles} ${limpinho} e ${cheirosos} novamente? 🥰✨`;
  if (maxDias >= 21 && maxDias <= 30)
    return `Oi, ${primeiroNome}!\nJá faz um bom tempinho desde o último banho ${gFe(pets, "do", "da", "do", "da")} ${listaPets} 🐾\nCom ${maxDias} dias, é bem importante retomar os cuidados pra evitar desconfortos e manter a saúde ${deles} 🛁\nVamos agendar pra deixar ${eles} ${limpinho} e ${cheirosos} novamente? ✨\nTemos alguns horários disponiveis, vamos agendar ?`;
  if (maxDias >= 31 && maxDias <= 45)
    return `🚨 Atenção: nível máximo de 'precisando de banho' atingido! 😂🐶\nOi, ${primeiroNome}! ${listaPets} já está pedindo socorro por um banho caprichado 🛁✨\nBora resolver isso e deixar ${eles} ${cheirosos} novamente?\nSe quiser, posso te sugerir os melhores horários disponíveis! 💚`;
  if (maxDias >= 46 && maxDias <= 90)
    return `Oi, ${primeiroNome}!\nPercebemos que ${listaPets} não vem há um tempinho… sentimos falta ${deles} por aqui 😕\nQueremos muito continuar cuidando ${deles} como sempre fizemos 😔\nVamos agendar um horário pra retomar esse cuidado?`;
  return `Oi, ${primeiroNome}!\nEstamos abrindo alguns horários especiais pra clientes que queremos muito receber de volta… e ${listaPets} está nessa lista 🐶✨\nQue tal aproveitar e agendar um banho pra deixar ${eles} ${cheirosos} novamente? 🛁😊`;
};

export const ClientesEmRisco = () => {
  const { user, ownerId } = useAuth();
  const [clientes, setClientes] = useState<ClienteRisco[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<ClienteRisco[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    faixaDias: "todos",
    busca: "",
    dataInicio: "",
    dataFim: "",
  });
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteSelecionado, setClienteSelecionado] = useState<ClienteRisco | null>(null);
  const [filtrosVisiveis, setFiltrosVisiveis] = useState(false);
  const [enviandoWhatsApp, setEnviandoWhatsApp] = useState<string | null>(null);
  const whatsappInstanceRef = useRef<{ name: string; connected: boolean }>({ name: "", connected: false });
  const filtrosRef = useRef(filtros);
  filtrosRef.current = filtros;

  // Carregar instância WhatsApp
  useEffect(() => {
    const loadInstance = async () => {
      if (!ownerId) return;
      try {
        const { data: instances } = await supabase
          .from("whatsapp_instances")
          .select("instance_name, status")
          .eq("user_id", ownerId)
          .limit(1);

        if (instances && instances.length > 0) {
          const inst = instances[0];
          whatsappInstanceRef.current.name = inst.instance_name;

          if (inst.status === "connected") {
            try {
              const { data } = await supabase.functions.invoke("evolution-api", {
                body: { action: "check-status", instanceName: inst.instance_name },
              });
              whatsappInstanceRef.current.connected = data?.instance?.state === "open";
            } catch {
              whatsappInstanceRef.current.connected = false;
            }
          }
        }
      } catch (err) {
        console.error("Erro ao carregar instância WhatsApp:", err);
      }
    };
    loadInstance();
  }, [ownerId]);

  // Enviar WhatsApp diretamente via Evolution API
  const enviarWhatsAppDireto = async (clienteClicado: ClienteRisco, todosClientes: ClienteRisco[]) => {
    if (!clienteClicado.whatsapp) return toast.error("Número de WhatsApp não informado");

    const petsDoCliente = todosClientes
      .filter((c) => c.clienteId === clienteClicado.clienteId)
      .map((c) => ({ nomePet: c.nomePet, sexoPet: c.sexoPet, diasSemAgendar: c.diasSemAgendar }));

    const primeiroNome = clienteClicado.nomeCliente.split(" ")[0];
    const mensagem = gerarMensagemAgrupada(primeiroNome, petsDoCliente);

    const numeroCompleto = normalizeBrazilPhone(clienteClicado.whatsapp);
    if (!numeroCompleto) {
      return toast.error(getInvalidPhoneMessage(clienteClicado.whatsapp));
    }

    const { name: instanceName, connected } = whatsappInstanceRef.current;

    if (!connected || !instanceName) {
      const link = buildWhatsAppUrl(numeroCompleto, mensagem);
      if (!link) return toast.error(getInvalidPhoneMessage(clienteClicado.whatsapp));
      window.open(link, "_blank");
      return;
    }

    setEnviandoWhatsApp(clienteClicado.clienteId);

    try {
      const { data, error } = await supabase.functions.invoke("evolution-api", {
        body: {
          action: "send-message",
          instanceName,
          number: numeroCompleto,
          text: mensagem,
        },
      });

      if (error) {
        const detail = data?.error || data?.details || error?.message || "Erro desconhecido";
        throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
      }
      toast.success(`Mensagem enviada para ${clienteClicado.nomeCliente}!`);
    } catch (err) {
      console.error("Erro ao enviar WhatsApp:", err);
      toast.error("Erro ao enviar mensagem. Abrindo link manual...");
      const link = buildWhatsAppUrl(numeroCompleto, mensagem);
      if (link) window.open(link, "_blank");
    } finally {
      setEnviandoWhatsApp(null);
    }
  };

  // Apply filters helper
  const aplicarFiltrosInterno = useCallback((base: ClienteRisco[], f: typeof filtros) => {
    let resultado = [...base];

    if (f.faixaDias !== "todos") resultado = resultado.filter((c) => c.faixaRisco === f.faixaDias);

    if (f.busca.trim()) {
      const termo = f.busca.toLowerCase();
      resultado = resultado.filter(
        (c) => c.nomeCliente.toLowerCase().includes(termo) || c.nomePet.toLowerCase().includes(termo),
      );
    }

    if (f.dataInicio) resultado = resultado.filter((c) => c.ultimoAgendamento >= new Date(f.dataInicio + "T00:00:00"));
    if (f.dataFim) resultado = resultado.filter((c) => c.ultimoAgendamento <= new Date(f.dataFim + "T00:00:00"));

    return resultado;
  }, []);

  // Main data loading function — uses IDs exclusively
  const carregarClientesEmRisco = useCallback(async () => {
    if (!ownerId) return;
    setLoading(true);

    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      // 1. Fetch ALL pets with their client info (source of truth for identity)
      const { data: petsData } = await supabase
        .from("pets")
        .select("id, cliente_id, nome_pet, sexo")
        .eq("user_id", ownerId);

      // 2. Fetch ALL clients (for names and whatsapp — always fresh from cadastro)
      const { data: clientesData } = await supabase
        .from("clientes")
        .select("id, nome_cliente, whatsapp")
        .eq("user_id", ownerId);

      const clienteMap = new Map<string, { nome: string; whatsapp: string }>();
      (clientesData || []).forEach((c) => {
        clienteMap.set(c.id, { nome: c.nome_cliente, whatsapp: c.whatsapp });
      });

      const petMap = new Map<string, { nome: string; sexo: string | null; clienteId: string }>();
      (petsData || []).forEach((p) => {
        petMap.set(p.id, { nome: p.nome_pet, sexo: p.sexo, clienteId: p.cliente_id });
      });

      // Build a reverse lookup: cliente_id + pet_name → pet_id (for agendamentos that don't have pet_id)
      const clientePetNameToId = new Map<string, string>();
      (petsData || []).forEach((p) => {
        clientePetNameToId.set(`${p.cliente_id}_${p.nome_pet}`, p.id);
      });

      // Build whatsapp → cliente_id lookup (for agendamentos without cliente_id)
      const whatsappToClienteId = new Map<string, string>();
      (clientesData || []).forEach((c) => {
        const normalized = c.whatsapp?.replace(/\D/g, "");
        if (normalized && !whatsappToClienteId.has(normalized)) {
          whatsappToClienteId.set(normalized, c.id);
        }
      });

      // Valid statuses for counting activity
      const statusInvalidos = ["cancelado", "Cancelado", "cancelada", "Cancelada"];

      // 3. Fetch ALL agendamentos with pagination
      const allAgendamentos: any[] = [];
      let page = 0;
      while (true) {
        const { data, error } = await supabase
          .from("agendamentos")
          .select("cliente_id, cliente, data, pet, whatsapp, status")
          .eq("user_id", ownerId)
          .order("data", { ascending: false })
          .range(page * 1000, (page + 1) * 1000 - 1);
        if (error) throw error;
        if (data) allAgendamentos.push(...data);
        if (!data || data.length < 1000) break;
        page++;
      }

      // 4. Fetch ALL pacotes with pagination
      const allPacotes: any[] = [];
      page = 0;
      while (true) {
        const { data, error } = await supabase
          .from("agendamentos_pacotes")
          .select("id, nome_cliente, data_venda, nome_pet, whatsapp, servicos")
          .eq("user_id", ownerId)
          .range(page * 1000, (page + 1) * 1000 - 1);
        if (error) throw error;
        if (data) allPacotes.push(...data);
        if (!data || data.length < 1000) break;
        page++;
      }

      // Build a lookup: nome_cliente → cliente_id (for pacotes that don't have cliente_id)
      const nomeToClienteId = new Map<string, string>();
      (clientesData || []).forEach((c) => {
        // Use first match (if duplicate names, the ID-based matching via pets will be more accurate)
        if (!nomeToClienteId.has(c.nome_cliente)) {
          nomeToClienteId.set(c.nome_cliente, c.id);
        }
      });

      // 5. Build the risk map using pet_id as the unique key (immutable)
      // Key: petId (uuid) → ensures no duplicates, no orphans
      const riskMap = new Map<string, {
        petId: string;
        clienteId: string;
        ultimoAgendamento: Date;
      }>();

      const updateRiskEntry = (petId: string, clienteId: string, dataStr: string) => {
        if (!dataStr || !petId || !clienteId) return;
        const data = new Date(dataStr + "T00:00:00");
        if (!isValid(data)) return;

        const existing = riskMap.get(petId);
        if (!existing) {
          riskMap.set(petId, { petId, clienteId, ultimoAgendamento: data });
        } else if (data > existing.ultimoAgendamento) {
          existing.ultimoAgendamento = data;
        }
      };

      // Process agendamentos — resolve pet_id via cliente_id + pet name
      allAgendamentos.forEach((a) => {
        // Skip cancelled/invalid agendamentos
        if (statusInvalidos.includes(a.status)) return;

        // Resolve cliente_id: use directly if available, fallback to whatsapp lookup
        let clienteId = a.cliente_id;
        if (!clienteId && a.whatsapp) {
          const normalizedWa = a.whatsapp.replace(/\D/g, "");
          clienteId = whatsappToClienteId.get(normalizedWa);
        }
        if (!clienteId) return; // Skip records we can't resolve

        const petId = clientePetNameToId.get(`${clienteId}_${a.pet}`);
        if (!petId) return; // Skip if pet not found in cadastro

        updateRiskEntry(petId, clienteId, a.data);
      });

      // Process pacotes — resolve cliente_id via name lookup, then pet_id
      allPacotes.forEach((p) => {
        const clienteId = nomeToClienteId.get(p.nome_cliente);
        if (!clienteId) return;

        const petId = clientePetNameToId.get(`${clienteId}_${p.nome_pet}`);
        if (!petId) return;

        let ultimaDataServico: string | null = null;
        try {
          const servicos = typeof p.servicos === "string" ? JSON.parse(p.servicos) : p.servicos;
          if (Array.isArray(servicos)) {
            const datasValidas = servicos
              .map((s: any) => new Date(s.data + "T00:00:00"))
              .filter((d: Date) => isValid(d));
            if (datasValidas.length > 0) {
              const maxDate = new Date(Math.max(...datasValidas.map((d: Date) => d.getTime())));
              ultimaDataServico = maxDate.toISOString().split("T")[0];
            }
          }
        } catch {}

        updateRiskEntry(petId, clienteId, ultimaDataServico || p.data_venda);
      });

      // 6. Check for future appointments (using IDs)
      const hasFutureAppointment = (petId: string, clienteId: string): boolean => {
        // Check agendamentos (excluding cancelled)
        const hasAgendamento = allAgendamentos.some((a) => {
          if (statusInvalidos.includes(a.status)) return false;
          // Resolve cliente_id with fallback
          let aClienteId = a.cliente_id;
          if (!aClienteId && a.whatsapp) {
            const normalizedWa = a.whatsapp.replace(/\D/g, "");
            aClienteId = whatsappToClienteId.get(normalizedWa);
          }
          if (aClienteId !== clienteId) return false;
          const aPetId = clientePetNameToId.get(`${aClienteId}_${a.pet}`);
          return aPetId === petId && new Date(a.data + "T00:00:00") >= hoje;
        });
        if (hasAgendamento) return true;

        // Check pacotes
        const hasPacote = allPacotes.some((p) => {
          const pClienteId = nomeToClienteId.get(p.nome_cliente);
          if (pClienteId !== clienteId) return false;
          const pPetId = clientePetNameToId.get(`${pClienteId}_${p.nome_pet}`);
          if (pPetId !== petId) return false;

          try {
            const servicos = typeof p.servicos === "string" ? JSON.parse(p.servicos) : p.servicos;
            if (Array.isArray(servicos)) {
              return servicos.some((s: any) => {
                const d = new Date(s.data + "T00:00:00");
                return isValid(d) && d >= hoje;
              });
            }
          } catch {}
          return new Date(p.data_venda + "T00:00:00") >= hoje;
        });

        return hasPacote;
      };

      // 7. Build the risk list
      const listaRisco: ClienteRisco[] = [];

      riskMap.forEach((entry) => {
        const dias = differenceInDays(hoje, entry.ultimoAgendamento);

        if (dias < 7) return; // Not at risk yet
        if (hasFutureAppointment(entry.petId, entry.clienteId)) return; // Has future appointment

        const pet = petMap.get(entry.petId);
        const cliente = clienteMap.get(entry.clienteId);
        if (!pet || !cliente) return; // Skip orphans

        const faixa = classificarFaixaRisco(dias);

        listaRisco.push({
          id: entry.petId, // Use petId as unique key
          clienteId: entry.clienteId,
          petId: entry.petId,
          nomeCliente: cliente.nome, // Always from cadastro (fresh)
          nomePet: pet.nome, // Always from cadastro (fresh)
          sexoPet: pet.sexo,
          whatsapp: cliente.whatsapp, // Always from cadastro (fresh)
          ultimoAgendamento: entry.ultimoAgendamento,
          diasSemAgendar: dias,
          faixaRisco: faixa,
        });
      });

      listaRisco.sort((a, b) => b.diasSemAgendar - a.diasSemAgendar);
      setClientes(listaRisco);
      setClientesFiltrados(aplicarFiltrosInterno(listaRisco, filtrosRef.current));
    } catch (err) {
      console.error("Erro ao carregar clientes em risco:", err);
      toast.error("Erro ao carregar dados dos clientes");
    } finally {
      setLoading(false);
    }
  }, [ownerId, aplicarFiltrosInterno]);

  // Initial load
  useEffect(() => {
    carregarClientesEmRisco();
  }, [carregarClientesEmRisco]);

  // Realtime: reload on any relevant table change
  useEffect(() => {
    if (!ownerId) return;

    const channel = supabase
      .channel('risk-list-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamentos' }, () => {
        carregarClientesEmRisco();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'agendamentos_pacotes' }, () => {
        carregarClientesEmRisco();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, () => {
        carregarClientesEmRisco();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pets' }, () => {
        carregarClientesEmRisco();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [ownerId, carregarClientesEmRisco]);

  // Apply filters on filter change
  const aplicarFiltros = useCallback((base: ClienteRisco[] = clientes) => {
    setClientesFiltrados(aplicarFiltrosInterno(base, filtros));
  }, [clientes, filtros, aplicarFiltrosInterno]);

  const handleFiltrar = () => {
    aplicarFiltros();
    setFiltrosVisiveis(false);
  };

  useEffect(() => {
    const padrao =
      filtros.faixaDias === "todos" &&
      filtros.busca.trim() === "" &&
      filtros.dataInicio === "" &&
      filtros.dataFim === "";

    if (padrao) {
      setFiltrosVisiveis(false);
    }
    aplicarFiltros();
  }, [filtros]); // eslint-disable-line

  const abrirModalDetalhes = (c: ClienteRisco) => {
    setClienteSelecionado(c);
    setModalAberto(true);
  };

  const contadores = {
    "7-10": clientes.filter((c) => c.faixaRisco === "7-10").length,
    "11-15": clientes.filter((c) => c.faixaRisco === "11-15").length,
    "16-20": clientes.filter((c) => c.faixaRisco === "16-20").length,
    "21-30": clientes.filter((c) => c.faixaRisco === "21-30").length,
    "31-45": clientes.filter((c) => c.faixaRisco === "31-45").length,
    "46-90": clientes.filter((c) => c.faixaRisco === "46-90").length,
    perdido: clientes.filter((c) => c.faixaRisco === "perdido").length,
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {Object.keys(contadores).map((key) => (
          <Card key={key} className={obterCorCard(key)}>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-center">{contadores[key as keyof typeof contadores]}</div>
              <div className="text-xs text-center text-muted-foreground">{obterLabelFaixa(key)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => setFiltrosVisiveis((s) => !s)}
          title={filtrosVisiveis ? "Recolher filtros" : "Exibir filtros"}
        >
          <Filter className="h-4 w-4 mr-2" />
          {filtrosVisiveis ? "Recolher Filtros" : "Exibir Filtros"}
          {filtrosVisiveis ? <ChevronUp className="h-4 w-4 ml-2" /> : <ChevronDown className="h-4 w-4 ml-2" />}
        </Button>
      </div>

      {filtrosVisiveis && (
        <div>
          <FiltrosClientesRisco filtros={filtros} setFiltros={setFiltros} onFiltrar={handleFiltrar} />
        </div>
      )}

      <Card>
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Clientes em Risco ({clientesFiltrados.length})</CardTitle>
        </CardHeader>

        <CardContent>
          {clientesFiltrados.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Nenhum cliente encontrado com os filtros aplicados</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Pet</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Último Agendamento</TableHead>
                    <TableHead>Dias sem Agendar</TableHead>
                    <TableHead>Faixa de Risco</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {clientesFiltrados.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nomeCliente}</TableCell>
                      <TableCell>{c.nomePet}</TableCell>
                      <TableCell>{c.whatsapp}</TableCell>
                      <TableCell>{format(c.ultimoAgendamento as unknown as Date, "dd/MM/yyyy")}</TableCell>
                      <TableCell>{c.diasSemAgendar} dias</TableCell>
                      <TableCell>
                        <Badge variant={obterVarianteBadge(c.faixaRisco)}>{obterLabelFaixa(c.faixaRisco)}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => abrirModalDetalhes(c)}
                            title="Ver Detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => enviarWhatsAppDireto(c, clientesFiltrados)}
                            title="Enviar WhatsApp"
                            disabled={enviandoWhatsApp === c.clienteId}
                          >
                            {enviandoWhatsApp === c.clienteId ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <i className="fi fi-brands-whatsapp text-green-600" style={{ fontSize: '16px' }}></i>
                            )}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ModalDetalhesCliente aberto={modalAberto} cliente={clienteSelecionado} onFechar={() => setModalAberto(false)} />
    </div>
  );
};
