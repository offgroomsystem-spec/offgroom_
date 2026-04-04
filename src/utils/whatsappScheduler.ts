import { supabase } from "@/integrations/supabase/client";

interface ScheduleParams {
  userId: string;
  agendamentoId?: string;
  agendamentoPacoteId?: string;
  servicoNumero?: string;
  nomeCliente: string;
  nomePet: string;
  sexoPet: string;
  raca: string;
  whatsapp: string;
  dataAgendamento: string; // YYYY-MM-DD
  horarioInicio: string; // HH:mm
  servicos: string;
  taxiDog: string; // "Sim" ou "Não"
  bordao: string;
  isPacote: boolean;
  isUltimoServicoPacote?: boolean;
  createdAt?: Date;
}

function getSexoPrefix(sexo: string, tipo: "do" | "o" | "ele"): string {
  const isFemea = sexo?.toLowerCase() === "fêmea" || sexo?.toLowerCase() === "femea";
  if (tipo === "do") return isFemea ? "da" : "do";
  if (tipo === "o") return isFemea ? "a" : "o";
  if (tipo === "ele") return isFemea ? "ela" : "ele";
  return "do";
}

function getPrimeiroNome(nomeCompleto: string): string {
  return nomeCompleto.split(" ")[0];
}

function formatDataBR(dataISO: string): string {
  const [year, month, day] = dataISO.split("-");
  return `${day}/${month}/${year}`;
}

function buildConfirmationMessage(params: ScheduleParams): string {
  const primeiroNome = getPrimeiroNome(params.nomeCliente);
  const doDa = getSexoPrefix(params.sexoPet, "do");
  const dataBR = formatDataBR(params.dataAgendamento);
  const bordaoLine = params.bordao ? `\n\n*${params.bordao}*` : "";

  if (!params.isPacote) {
    // Avulso
    return `Oi, ${primeiroNome}! Passando apenas para confirmar o agendamento ${doDa} ${params.nomePet} com a gente.\n\n*Dia:* ${dataBR}\n*Horario:* ${params.horarioInicio}\n*Serviço:* ${params.servicos}\n*Pacote de serviços:* Sem Pacote 😕\n*Taxi Dog:* ${params.taxiDog}${bordaoLine}`;
  }

  if (params.isUltimoServicoPacote) {
    // Pacote - último serviço
    return `Oi, ${primeiroNome}! Passando apenas para confirmar o agendamento ${doDa} ${params.nomePet} com a gente.\n\n*Dia:* ${dataBR}\n*Horario:* ${params.horarioInicio}\n*Serviço:* ${params.servicos}\n*N° do Pacote:* ${params.servicoNumero}\n*Taxi Dog:* ${params.taxiDog}\n\nNotei que hoje finalizamos o pacote atual. Que tal já renovar para manter a frequência ideal dos banhos ${doDa} ${params.nomePet}. Assim, você também garante os próximos horários com mais tranquilidade. 😊${bordaoLine}`;
  }

  // Pacote - não último
  return `Oi, ${primeiroNome}! Passando apenas para confirmar o agendamento ${doDa} ${params.nomePet} com a gente.\n\n*Dia:* ${dataBR}\n*Horario:* ${params.horarioInicio}\n*Serviço:* ${params.servicos}\n*N° do Pacote:* ${params.servicoNumero}\n*Taxi Dog:* ${params.taxiDog}${bordaoLine}`;
}

function buildReminderMessage(params: ScheduleParams, allPets?: Array<{nome: string, sexo: string}>): string {
  const primeiroNome = getPrimeiroNome(params.nomeCliente);
  const pets = allPets && allPets.length > 0
    ? allPets
    : [{ nome: params.nomePet, sexo: params.sexoPet }];

  const allFemale = pets.every(p => p.sexo?.toLowerCase() === "fêmea" || p.sexo?.toLowerCase() === "femea");
  const isSingular = pets.length === 1;

  // Concatenar nomes: 1="Rex", 2="Rex e Luna", 3+="Rex, Luna e Mel"
  let nomesConcat: string;
  if (pets.length === 1) {
    nomesConcat = pets[0].nome;
  } else if (pets.length === 2) {
    nomesConcat = `${pets[0].nome} e ${pets[1].nome}`;
  } else {
    nomesConcat = pets.slice(0, -1).map(p => p.nome).join(", ") + " e " + pets[pets.length - 1].nome;
  }

  const artigo = allFemale ? "a" : "o";
  const pronome = isSingular
    ? (allFemale ? "ela" : "ele")
    : (allFemale ? "elas" : "eles");

  return `Oi ${primeiroNome}! 😄\n\nNão esqueça de trazer ${artigo} ${nomesConcat} hoje às ${params.horarioInicio}.\n\nEsse horário estamos por aqui prontos para receber ${pronome}! 🐾💙`;
}

function parseDateTime(date: string, time: string): Date {
  // Criar data em UTC representando horário de Brasília (UTC-3)
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hours + 3, minutes, 0, 0));
}

export async function deletePendingMessages(opts: {
  agendamentoId?: string;
  agendamentoPacoteId?: string;
  servicoNumero?: string;
}) {
  let query = supabase
    .from("whatsapp_mensagens_agendadas" as any)
    .delete()
    .eq("status", "pendente");

  if (opts.agendamentoId) {
    query = query.eq("agendamento_id", opts.agendamentoId);
  }
  if (opts.agendamentoPacoteId) {
    query = query.eq("agendamento_pacote_id", opts.agendamentoPacoteId);
  }
  if (opts.servicoNumero) {
    query = query.eq("servico_numero", opts.servicoNumero);
  }

  const { error } = await query;
  if (error) {
    console.error("Erro ao deletar mensagens pendentes:", error);
  }
}

export async function scheduleWhatsAppMessages(params: ScheduleParams & { clienteId?: string }) {
  const now = params.createdAt || new Date();

  // Verificar se o cliente tem WhatsApp ativo
  if (params.clienteId) {
    const { data: clienteData } = await supabase
      .from("clientes")
      .select("whatsapp_ativo")
      .eq("id", params.clienteId)
      .single();
    if (clienteData && (clienteData as any).whatsapp_ativo === false) {
      return;
    }

    // Verificar se o pet tem WhatsApp ativo
    const { data: petData } = await supabase
      .from("pets")
      .select("whatsapp_ativo")
      .eq("cliente_id", params.clienteId)
      .eq("nome_pet", params.nomePet)
      .limit(1);
    if (petData && petData.length > 0 && (petData[0] as any).whatsapp_ativo === false) {
      return;
    }
  }

  // Carregar config de período de confirmação
  let usarPeriodoCustom = false;
  let conf24h = false;
  let conf15h = false;
  let conf3h = true; // fallback padrão
  
  const { data: empresaConfig } = await supabase
    .from("empresa_config")
    .select("confirmacao_periodo_ativo, confirmacao_24h, confirmacao_15h, confirmacao_3h")
    .eq("user_id", params.userId)
    .maybeSingle();

  if (empresaConfig) {
    usarPeriodoCustom = (empresaConfig as any).confirmacao_periodo_ativo ?? true;
    if (usarPeriodoCustom) {
      conf24h = (empresaConfig as any).confirmacao_24h ?? false;
      conf15h = (empresaConfig as any).confirmacao_15h ?? false;
      conf3h = (empresaConfig as any).confirmacao_3h ?? true;
      // Se nenhuma opção selecionada, nenhuma confirmação será enviada (exceto 30min)
    }
  }

  const agendamentoDateTime = parseDateTime(params.dataAgendamento, params.horarioInicio);
  
  // Diferença em minutos entre agora e o agendamento
  const diffMinutes = (agendamentoDateTime.getTime() - now.getTime()) / (1000 * 60);

  // Se o agendamento está dentro de 60 minutos (passado ou futuro próximo), não enviar automático
  if (diffMinutes <= 60 && diffMinutes >= -60) {
    return;
  }

  const confirmationMsg = buildConfirmationMessage(params);
  const mensagensParaInserir: any[] = [];

  // Formatar número WhatsApp (garantir formato E.164)
  let numero = params.whatsapp.replace(/\D/g, "");
  if (!numero.startsWith("55")) {
    numero = "55" + numero;
  }

  const baseRecord = {
    user_id: params.userId,
    agendamento_id: params.agendamentoId || null,
    agendamento_pacote_id: params.agendamentoPacoteId || null,
    servico_numero: params.servicoNumero || null,
    numero_whatsapp: numero,
    status: "pendente",
  };

  // Set para evitar duplicidade de horários
  const horariosAgendados = new Set<string>();

  function addMensagem(tipoMsg: string, agendadoPara: Date) {
    const key = agendadoPara.toISOString().substring(0, 16); // minuto
    if (horariosAgendados.has(key)) return; // evitar duplicidade
    horariosAgendados.add(key);
    mensagensParaInserir.push({
      ...baseRecord,
      tipo_mensagem: tipoMsg,
      mensagem: confirmationMsg,
      agendado_para: agendadoPara.toISOString(),
    });
  }

  if (usarPeriodoCustom) {
    // === MODO PERSONALIZADO ===

    // 24h antes
    if (conf24h && diffMinutes > 24 * 60) {
      const agendadoPara = new Date(agendamentoDateTime.getTime() - 24 * 60 * 60 * 1000);
      if (agendadoPara.getTime() > now.getTime()) {
        addMensagem("24h", agendadoPara);
      }
    }

    // 15h antes (máximo 18h BRT)
    if (conf15h && diffMinutes > 15 * 60) {
      let agendadoPara = new Date(agendamentoDateTime.getTime() - 15 * 60 * 60 * 1000);
      const brtHour = (agendadoPara.getUTCHours() - 3 + 24) % 24;
      if (brtHour > 18) {
        agendadoPara.setUTCHours(21, 0, 0, 0); // 18h BRT = 21h UTC
      }
      if (agendadoPara.getTime() > now.getTime()) {
        addMensagem("15h", agendadoPara);
      }
    }

    // 3h antes (mínimo 07h BRT)
    if (conf3h && diffMinutes > 3 * 60) {
      let agendadoPara = new Date(agendamentoDateTime.getTime() - 3 * 60 * 60 * 1000);
      const brtHour = (agendadoPara.getUTCHours() - 3 + 24) % 24;
      if (brtHour < 7) {
        agendadoPara.setUTCHours(10, 0, 0, 0); // 7h BRT = 10h UTC
      }
      if (agendadoPara.getTime() > now.getTime()) {
        addMensagem("3h", agendadoPara);
      }
    }

    // Confirmação imediata quando está entre 61min e o menor período selecionado
    const menorPeriodoMinutos = conf3h ? 3 * 60 : conf15h ? 15 * 60 : conf24h ? 24 * 60 : 3 * 60;
    if (diffMinutes > 61 && diffMinutes <= menorPeriodoMinutos) {
      addMensagem("imediata", now);
    }

  } else {
    // === MODO PADRÃO (comportamento original) ===

    // MENSAGEM 3H ANTES
    if (diffMinutes > 3 * 60) {
      let agendadoPara3h = new Date(agendamentoDateTime.getTime() - 3 * 60 * 60 * 1000);
      const brtHour3h = (agendadoPara3h.getUTCHours() - 3 + 24) % 24;
      if (brtHour3h < 7) {
        agendadoPara3h.setUTCHours(10, 0, 0, 0);
      }
      if (agendadoPara3h.getTime() > now.getTime()) {
        addMensagem("3h", agendadoPara3h);
      }
    }

    // MENSAGEM DE CONFIRMAÇÃO IMEDIATA (entre 61min e 3h)
    if (diffMinutes > 61 && diffMinutes <= 3 * 60) {
      addMensagem("3h", now);
    }
  }

  // === MENSAGEM 30MIN ANTES (Apenas Taxi Dog = "Não") — sempre ativa ===
  if (params.taxiDog === "Não" && diffMinutes > 30) {
    const agendadoPara30min = new Date(agendamentoDateTime.getTime() - 30 * 60 * 1000);
    const brtHour30 = (agendadoPara30min.getUTCHours() - 3 + 24) % 24;
    if (brtHour30 < 7) {
      agendadoPara30min.setUTCHours(10, 0, 0, 0);
    }
    if (agendadoPara30min.getTime() > now.getTime()) {
      const reminderMsg = buildReminderMessage(params);
      const key30 = agendadoPara30min.toISOString().substring(0, 16);
      if (!horariosAgendados.has(key30)) {
        horariosAgendados.add(key30);
        mensagensParaInserir.push({
          ...baseRecord,
          tipo_mensagem: "30min",
          mensagem: reminderMsg,
          agendado_para: agendadoPara30min.toISOString(),
        });
      }
    }
  }

  // Inserir mensagens uma a uma para respeitar unique index e evitar duplicidades
  if (mensagensParaInserir.length > 0) {
    for (const msg of mensagensParaInserir) {
      const { error } = await supabase
        .from("whatsapp_mensagens_agendadas" as any)
        .insert(msg);

      if (error) {
        // 23505 = unique constraint violation (duplicate), silently skip
        if (error.code === "23505") {
          console.log(`Mensagem duplicada ignorada: ${msg.tipo_mensagem}`);
        } else {
          console.error("Erro ao agendar mensagem WhatsApp:", error);
        }
      }
    }
  }
}
