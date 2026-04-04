import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Intervalos em dias entre tentativas: [1a=0, 2a=+10, 3a=+12, 4a=+14, 5a=+16, 6a=+18, 7a=+20]
const INTERVALOS_TENTATIVAS = [0, 10, 12, 14, 16, 18, 20];
const MAX_TENTATIVAS = 7;
const MIN_DIAS = 9;
const MAX_DIAS = 110;
const LIMITE_DIARIO = 45;
const OFFSET_ENTRE_INSTANCIAS_MS = 5 * 1000; // 5 segundos entre instâncias

async function enviarMensagemEvolution(instanceName: string, number: string, text: string) {
  const baseUrl = Deno.env.get("EVOLUTION_API_URL")!;
  const apiKey = Deno.env.get("EVOLUTION_API_KEY")!;
  const res = await fetch(`${baseUrl}/message/sendText/${instanceName}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: apiKey },
    body: JSON.stringify({ number, text }),
  });
  const data = await res.text();
  if (!res.ok) throw new Error(`Evolution API error: ${res.status} - ${data}`);
  return data;
}

function isFemea(pet: { sexo: string | null }): boolean {
  const s = pet.sexo?.toLowerCase();
  return s === "fêmea" || s === "femea";
}

function todosFemea(pets: { sexo: string | null }[]): boolean {
  return pets.every((p) => isFemea(p));
}

function g(pets: { sexo: string | null }[], ms: string, fs: string, mp: string, fp: string): string {
  if (pets.length === 1) return isFemea(pets[0]) ? fs : ms;
  return todosFemea(pets) ? fp : mp;
}

function montarListaPets(pets: { nome_pet: string; sexo: string | null }[]): string {
  return pets
    .map((p) => `${isFemea(p) ? "a" : "o"} ${p.nome_pet}`)
    .join(", ");
}

type PetInfo = { nome_pet: string; sexo: string | null; dias_sem_agendar: number };

function gerarMensagemRisco(nome: string, pets: PetInfo[]): string {
  const maxDias = Math.max(...pets.map((p) => p.dias_sem_agendar));
  const singular = pets.length === 1;

  if (singular) {
    const p = pets[0];
    const art = isFemea(p) ? "A" : "O";
    const art_l = isFemea(p) ? "a" : "o";
    const ele = isFemea(p) ? "ela" : "ele";
    const dele = isFemea(p) ? "dela" : "dele";
    const cheiroso = isFemea(p) ? "cheirosa" : "cheiroso";
    const limpinho = isFemea(p) ? "limpinha" : "limpinho";
    const do_ = isFemea(p) ? "da" : "do";

    if (maxDias >= 7 && maxDias <= 10) {
      return `Oi, ${nome}!\nSeparei alguns horários especiais essa semana e lembrei de vocês 😊\n${art} ${p.nome_pet} já está na hora daquele banho caprichado 🛁✨ Quer que eu garanta um horário pra você?`;
    }
    if (maxDias >= 11 && maxDias <= 15) {
      return `🚨 Alerta banho atrasado! 😂🐶\nOi, ${nome}! ${art} ${p.nome_pet} já passou da fase do 'só mais uns dias' 😅\nQue tal garantir aquele banho caprichado e deixar ${ele} ${cheiroso} e confortável de novo? 🛁💚\nMe chama que te passo os horários disponíveis !`;
    }
    if (maxDias >= 16 && maxDias <= 20) {
      return `Oi, ${nome}!\n${art} ${p.nome_pet} já está há alguns dias além do ideal sem banho 😬\nNessa fase, pode começar a gerar desconfortos e até afetar a pele ${dele} 😕\nQue tal já agendarmos pra deixar ${ele} ${limpinho} e ${cheiroso} novamente? 🥰✨`;
    }
    if (maxDias >= 21 && maxDias <= 30) {
      return `Oi, ${nome}!\nJá faz um bom tempinho desde o último banho ${do_} ${p.nome_pet} 🐾\nCom ${maxDias} dias, é bem importante retomar os cuidados pra evitar desconfortos e manter a saúde ${dele} 🛁\nVamos agendar pra deixar ${ele} ${limpinho} e ${cheiroso} novamente? ✨\nTemos alguns horários disponiveis, vamos agendar ?`;
    }
    if (maxDias >= 31 && maxDias <= 45) {
      return `🚨 Atenção: nível máximo de 'precisando de banho' atingido! 😂🐶\nOi, ${nome}! ${art} ${p.nome_pet} já está pedindo socorro por um banho caprichado 🛁✨\nBora resolver isso e deixar ${ele} ${cheiroso} novamente?\nSe quiser, posso te sugerir os melhores horários disponíveis! 💚`;
    }
    if (maxDias >= 46 && maxDias <= 90) {
      return `Oi, ${nome}!\nPercebemos que ${art_l} ${p.nome_pet} não vem há um tempinho… sentimos falta ${dele} por aqui 😕\nQueremos muito continuar cuidando ${dele} como sempre fizemos 😔\nVamos agendar um horário pra retomar esse cuidado?`;
    }
    return `Oi, ${nome}!\nEstamos abrindo alguns horários especiais pra clientes que queremos muito receber de volta… e ${art_l} ${p.nome_pet} está nessa lista 🐶✨\nQue tal aproveitar e agendar um banho pra deixar ${ele} ${cheiroso} novamente? 🛁😊`;
  }

  // PLURAL (2+ pets)
  const lista = montarListaPets(pets);
  const eles = g(pets, "ele", "ela", "eles", "elas");
  const deles = g(pets, "dele", "dela", "deles", "delas");
  const cheirosos = g(pets, "cheiroso", "cheirosa", "cheirosos", "cheirosas");
  const limpinho = g(pets, "limpinho", "limpinha", "limpinho", "limpinha");

  if (maxDias >= 7 && maxDias <= 10) {
    return `Oi, ${nome}!\nSeparei alguns horários especiais essa semana e lembrei de vocês 😊\n${lista} já estão na hora daquele banho caprichado 🛁✨ Quer que eu garanta um horário pra você?`;
  }
  if (maxDias >= 11 && maxDias <= 15) {
    return `🚨 Alerta banho atrasado! 😂🐶\nOi, ${nome}! ${lista} já passou da fase do 'só mais uns dias' 😅\nQue tal garantir aquele banho caprichado e deixar ${eles} ${cheirosos} e confortável de novo? 🛁💚\nMe chama que te passo os horários disponíveis !`;
  }
  if (maxDias >= 16 && maxDias <= 20) {
    return `Oi, ${nome}!\n${lista} já estão há alguns dias além do ideal sem banho 😬\nNessa fase, pode começar a gerar desconfortos e até afetar a pele ${deles} 😕\nQue tal já agendarmos pra deixar ${eles} ${limpinho} e ${cheirosos} novamente? 🥰✨`;
  }
  if (maxDias >= 21 && maxDias <= 30) {
    return `Oi, ${nome}!\nJá faz um bom tempinho desde o último banho ${g(pets, "do", "da", "do", "da")} ${lista} 🐾\nCom ${maxDias} dias, é bem importante retomar os cuidados pra evitar desconfortos e manter a saúde ${deles} 🛁\nVamos agendar pra deixar ${eles} ${limpinho} e ${cheirosos} novamente? ✨\nTemos alguns horários disponiveis, vamos agendar ?`;
  }
  if (maxDias >= 31 && maxDias <= 45) {
    return `🚨 Atenção: nível máximo de 'precisando de banho' atingido! 😂🐶\nOi, ${nome}! ${lista} já está pedindo socorro por um banho caprichado 🛁✨\nBora resolver isso e deixar ${eles} ${cheirosos} novamente?\nSe quiser, posso te sugerir os melhores horários disponíveis! 💚`;
  }
  if (maxDias >= 46 && maxDias <= 90) {
    return `Oi, ${nome}!\nPercebemos que ${lista} não vem há um tempinho… sentimos falta ${deles} por aqui 😕\nQueremos muito continuar cuidando ${deles} como sempre fizemos 😔\nVamos agendar um horário pra retomar esse cuidado?`;
  }
  return `Oi, ${nome}!\nEstamos abrindo alguns horários especiais pra clientes que queremos muito receber de volta… e ${lista} está nessa lista 🐶✨\nQue tal aproveitar e agendar um banho pra deixar ${eles} ${cheirosos} novamente? 🛁😊`;
}

// Avança data para próximo dia útil se cair em sáb/dom
function proximoDiaUtil(d: Date): Date {
  const result = new Date(d);
  const day = result.getDay();
  if (day === 6) result.setDate(result.getDate() + 2);
  if (day === 0) result.setDate(result.getDate() + 1);
  return result;
}

// Gera número aleatório entre min e max (inclusive)
function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Gera slots de horário com intervalos aleatórios de 10-15min e 2-3 pausas de 20-30min
// Janela: 08:00 a 18:00 BRT, max LIMITE_DIARIO slots
function gerarSlotsHorarios(hojeStr: string): Date[] {
  // Base: 08:00 BRT = 11:00 UTC
  const baseUTC = new Date(hojeStr + "T11:00:00.000Z");
  // Fim: 18:00 BRT = 21:00 UTC
  const fimUTC = new Date(hojeStr + "T21:00:00.000Z");

  // Decidir quantas pausas (2 ou 3)
  const numPausas = randInt(2, 3);

  // Decidir em quais índices de mensagem inserir pausas (distribuídas aleatoriamente)
  // Vamos inserir pausas em posições aleatórias entre as mensagens
  const pauseAfterIndices = new Set<number>();
  while (pauseAfterIndices.size < numPausas) {
    // Pausas após mensagens 5-40 (distribuídas ao longo do dia)
    pauseAfterIndices.add(randInt(5, Math.min(40, LIMITE_DIARIO - 2)));
  }

  const slots: Date[] = [];
  let currentTime = baseUTC.getTime();

  for (let i = 0; i < LIMITE_DIARIO; i++) {
    if (currentTime >= fimUTC.getTime()) break;

    slots.push(new Date(currentTime));

    // Intervalo aleatório 10-15 minutos para a próxima mensagem
    let intervaloMs = randInt(10, 15) * 60 * 1000;

    // Verificar se devemos inserir uma pausa estratégica após esta mensagem
    if (pauseAfterIndices.has(i)) {
      const pausaMs = randInt(20, 30) * 60 * 1000;
      intervaloMs += pausaMs;
      console.log(`⏸️ Pausa estratégica de ${Math.round(pausaMs / 60000)}min após mensagem #${i + 1}`);
    }

    currentTime += intervaloMs;
  }

  return slots;
}

const TOLERANCIA_RISCO_MS = 10 * 60 * 1000; // 10 minutos de tolerância

// ===================== FASE 2: ENVIO =====================
async function faseEnvio(supabase: any, instances: any[], agora: Date): Promise<{ enviadas: number; erros: number; canceladas: number; expiradas: number }> {
  let totalEnviadas = 0;
  let totalErros = 0;
  let totalCanceladas = 0;
  let totalExpiradas = 0;

  const hojeStr = new Date(agora.getTime() - 3 * 60 * 60 * 1000).toISOString().split("T")[0];
  const hoje = new Date(hojeStr + "T00:00:00");
  const inicioHojeUTC = new Date(hojeStr + "T00:00:00.000Z");
  const fimHojeUTC = new Date(hojeStr + "T23:59:59.999Z");

  // Expirar mensagens de risco pendentes que ultrapassaram a tolerância de 10 minutos
  const limiteExpiracaoRisco = new Date(agora.getTime() - TOLERANCIA_RISCO_MS);
  const { data: riscoExpiradas } = await supabase
    .from("whatsapp_mensagens_risco")
    .select("id")
    .eq("status", "pendente")
    .lt("agendado_para", limiteExpiracaoRisco.toISOString());

  if (riscoExpiradas && riscoExpiradas.length > 0) {
    const idsExpiradas = riscoExpiradas.map((m: any) => m.id);
    await supabase
      .from("whatsapp_mensagens_risco")
      .update({ status: "expirado", erro: `Mensagem expirada - ultrapassou tolerância de 10 minutos` })
      .in("id", idsExpiradas);
    totalExpiradas = idsExpiradas.length;
    console.log(`⏰ ${idsExpiradas.length} mensagens de risco expiradas descartadas`);
  }

  for (const instance of instances) {
    // Verificar auto_send e risco_auto_send
    const { data: config } = await supabase
      .from("empresa_config")
      .select("evolution_auto_send, risco_auto_send")
      .eq("user_id", instance.user_id)
      .single();
    if (!config?.evolution_auto_send) continue;
    if (config?.risco_auto_send === false) {
      console.log(`⏭️ Risco auto send desativado para ${instance.instance_name}, pulando envio`);
      continue;
    }

    // Verificar limite diário: contar mensagens já enviadas hoje para este user
    const { count: enviadasHoje } = await supabase
      .from("whatsapp_mensagens_risco")
      .select("id", { count: "exact", head: true })
      .eq("user_id", instance.user_id)
      .eq("status", "enviado")
      .gte("enviado_em", inicioHojeUTC.toISOString())
      .lte("enviado_em", fimHojeUTC.toISOString());

    if ((enviadasHoje || 0) >= LIMITE_DIARIO) {
      console.log(`🚫 Limite diário de ${LIMITE_DIARIO} atingido para ${instance.instance_name}. Pendentes restantes serão mantidos para carry-over.`);
      continue;
    }

    // Buscar a mensagem pendente mais antiga DENTRO da tolerância
    const { data: mensagens } = await supabase
      .from("whatsapp_mensagens_risco")
      .select("*")
      .eq("user_id", instance.user_id)
      .eq("status", "pendente")
      .lte("agendado_para", agora.toISOString())
      .gte("agendado_para", limiteExpiracaoRisco.toISOString())
      .order("agendado_para", { ascending: true })
      .limit(1);

    if (!mensagens || mensagens.length === 0) continue;

    const msg = mensagens[0];

    // ========== VALIDAÇÃO EM TEMPO REAL ==========
    const motivoBloqueio = await validarElegibilidadeEnvio(supabase, msg, instance.user_id, hoje);

    if (motivoBloqueio) {
      await supabase
        .from("whatsapp_mensagens_risco")
        .update({
          status: "cancelado",
          erro: motivoBloqueio,
          enviado_em: agora.toISOString(),
        })
        .eq("id", msg.id);
      totalCanceladas++;
      console.log(`🚫 Mensagem risco cancelada para cliente ${msg.cliente_id}: ${motivoBloqueio}`);
      continue;
    }
    // ========== FIM VALIDAÇÃO ==========

    try {
      await enviarMensagemEvolution(instance.instance_name, msg.numero_whatsapp, msg.mensagem);
      await supabase
        .from("whatsapp_mensagens_risco")
        .update({ status: "enviado", enviado_em: agora.toISOString() })
        .eq("id", msg.id);
      totalEnviadas++;
      console.log(`✅ Mensagem risco #${msg.tentativa} enviada para cliente ${msg.cliente_id} via ${instance.instance_name}`);
    } catch (err) {
      const erroMsg = err instanceof Error ? err.message : String(err);
      await supabase
        .from("whatsapp_mensagens_risco")
        .update({ status: "erro", erro: erroMsg })
        .eq("id", msg.id);
      totalErros++;
      console.error(`❌ Erro ao enviar risco via ${instance.instance_name}:`, erroMsg);
    }
  }

  return { enviadas: totalEnviadas, erros: totalErros, canceladas: totalCanceladas, expiradas: totalExpiradas };
}

// Valida se o cliente ainda é elegível para receber a mensagem de risco
async function validarElegibilidadeEnvio(
  supabase: any,
  msg: any,
  userId: string,
  hoje: Date
): Promise<string | null> {
  const clienteId = msg.cliente_id;

  // 1. Verificar se o cliente existe e se whatsapp_ativo está ativo
  const { data: cliente } = await supabase
    .from("clientes")
    .select("id, whatsapp_ativo, nome_cliente")
    .eq("id", clienteId)
    .eq("user_id", userId)
    .single();

  if (!cliente) return "Cliente não encontrado no cadastro";
  if (!cliente.whatsapp_ativo) return "Envio bloqueado - WhatsApp automático desativado (cliente)";

  // 2. Verificar preferências dos pets incluídos na mensagem
  const petsIncluidos = msg.pets_incluidos || [];
  const petNames = petsIncluidos.map((p: any) => p.nome_pet);

  if (petNames.length > 0) {
    const { data: petsDb } = await supabase
      .from("pets")
      .select("nome_pet, whatsapp_ativo")
      .eq("cliente_id", clienteId)
      .eq("user_id", userId)
      .in("nome_pet", petNames);

    if (petsDb) {
      const allPetsDisabled = petsDb.length > 0 && petsDb.every((p: any) => !p.whatsapp_ativo);
      if (allPetsDisabled) return "Envio bloqueado - WhatsApp automático desativado (todos os pets)";
    }
  }

  // 3. Verificar agendamentos futuros
  const { data: agendamentosFuturos } = await supabase
    .from("agendamentos")
    .select("id")
    .eq("user_id", userId)
    .eq("cliente_id", clienteId)
    .gte("data", hoje.toISOString().split("T")[0])
    .limit(1);

  if (agendamentosFuturos && agendamentosFuturos.length > 0) {
    return "Cliente possui agendamento futuro - não está mais em risco";
  }

  // 3b. Por nome do cliente sem cliente_id
  const { data: agendamentosFuturosNome } = await supabase
    .from("agendamentos")
    .select("id")
    .eq("user_id", userId)
    .eq("cliente", cliente.nome_cliente)
    .is("cliente_id", null)
    .gte("data", hoje.toISOString().split("T")[0])
    .limit(1);

  if (agendamentosFuturosNome && agendamentosFuturosNome.length > 0) {
    return "Cliente possui agendamento futuro - não está mais em risco";
  }

  // 4. Verificar pacotes com serviços futuros
  const { data: pacotes } = await supabase
    .from("agendamentos_pacotes")
    .select("servicos")
    .eq("user_id", userId)
    .eq("nome_cliente", cliente.nome_cliente);

  if (pacotes) {
    for (const p of pacotes) {
      try {
        const servicos = typeof p.servicos === "string" ? JSON.parse(p.servicos) : p.servicos;
        if (Array.isArray(servicos)) {
          for (const s of servicos) {
            if (s.data) {
              const d = new Date(s.data + "T00:00:00");
              if (!isNaN(d.getTime()) && d >= hoje) {
                return "Cliente possui serviço de pacote futuro - não está mais em risco";
              }
            }
          }
        }
      } catch {}
    }
  }

  // 5. Verificar atendimento recente
  const limiteRecente = new Date(hoje);
  limiteRecente.setDate(limiteRecente.getDate() - MIN_DIAS);
  const limiteRecenteStr = limiteRecente.toISOString().split("T")[0];

  const { data: atendimentoRecente } = await supabase
    .from("agendamentos")
    .select("id")
    .eq("user_id", userId)
    .eq("cliente_id", clienteId)
    .gte("data", limiteRecenteStr)
    .lte("data", hoje.toISOString().split("T")[0])
    .limit(1);

  if (atendimentoRecente && atendimentoRecente.length > 0) {
    return "Cliente já atendido recentemente - não está mais em risco";
  }

  return null;
}

// ===================== FASE 1: AGENDAMENTO =====================
async function faseAgendamento(supabase: any, instances: any[], hoje: Date, hojeStr: string): Promise<{ agendadas: number }> {
  let totalAgendadas = 0;

  for (let instIdx = 0; instIdx < instances.length; instIdx++) {
    const instance = instances[instIdx];
    const userId = instance.user_id;

    // Verificar auto_send e risco_auto_send
    const { data: config } = await supabase
      .from("empresa_config")
      .select("evolution_auto_send, risco_auto_send")
      .eq("user_id", userId)
      .single();
    if (!config?.evolution_auto_send) continue;
    if (config?.risco_auto_send === false) {
      console.log(`⏭️ Risco auto send desativado para ${instance.instance_name}, pulando agendamento`);
      continue;
    }

    // Tratar mensagens pendentes de dias anteriores:
    // - 2+ dias pendente → descarte definitivo
    // - 1 dia pendente → manter como carry-over para reaproveitamento
    const inicioHojeUTC = new Date(hojeStr + "T00:00:00.000Z");
    const limite2DiasAtras = new Date(inicioHojeUTC);
    limite2DiasAtras.setDate(limite2DiasAtras.getDate() - 2);

    // Descartar mensagens pendentes com 2+ dias (created_at <= 2 dias atrás)
    const { data: antigasPendentes2Dias } = await supabase
      .from("whatsapp_mensagens_risco")
      .select("id, cliente_id")
      .eq("user_id", userId)
      .eq("status", "pendente")
      .lt("agendado_para", inicioHojeUTC.toISOString())
      .lt("created_at", limite2DiasAtras.toISOString());

    if (antigasPendentes2Dias && antigasPendentes2Dias.length > 0) {
      const ids = antigasPendentes2Dias.map((m: any) => m.id);
      await supabase
        .from("whatsapp_mensagens_risco")
        .update({ status: "descartado", erro: "Descartado definitivamente - 2 dias consecutivos sem envio" })
        .in("id", ids);
      console.log(`🗑️ ${ids.length} mensagens descartadas definitivamente (2+ dias pendentes) para ${instance.instance_name}`);
    }

    // Buscar mensagens pendentes de 1 dia atrás (carry-over) para reaproveitamento
    const { data: carryOverPendentes } = await supabase
      .from("whatsapp_mensagens_risco")
      .select("id, cliente_id, tentativa, pets_incluidos, mensagem, numero_whatsapp")
      .eq("user_id", userId)
      .eq("status", "pendente")
      .lt("agendado_para", inicioHojeUTC.toISOString())
      .gte("created_at", limite2DiasAtras.toISOString());

    // Coletar cliente_ids do carry-over para não duplicar
    const carryOverClienteIds = new Set<string>();
    if (carryOverPendentes && carryOverPendentes.length > 0) {
      for (const m of carryOverPendentes) {
        carryOverClienteIds.add(m.cliente_id);
      }
      // Descartar as mensagens antigas - serão reagendadas com novos slots
      const carryIds = carryOverPendentes.map((m: any) => m.id);
      await supabase
        .from("whatsapp_mensagens_risco")
        .update({ status: "descartado", erro: "Reagendado para hoje - carry-over" })
        .in("id", carryIds);
      console.log(`🔄 ${carryOverPendentes.length} mensagens carry-over serão reaproveitadas para ${instance.instance_name}`);
    }

    // Verificar se já existem mensagens pendentes hoje para este user
    const fimHojeUTC = new Date(hojeStr + "T23:59:59.999Z");
    const { data: existentes } = await supabase
      .from("whatsapp_mensagens_risco")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "pendente")
      .gte("agendado_para", inicioHojeUTC.toISOString())
      .lte("agendado_para", fimHojeUTC.toISOString())
      .limit(1);

    if (existentes && existentes.length > 0) {
      console.log(`⏭️ Instância ${instance.instance_name}: já existem mensagens pendentes hoje, pulando agendamento`);
      continue;
    }

    // Buscar agendamentos paginados
    const allAgendamentos: any[] = [];
    let page = 0;
    while (true) {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("cliente_id, cliente, data, pet, whatsapp")
        .eq("user_id", userId)
        .order("data", { ascending: false })
        .range(page * 1000, (page + 1) * 1000 - 1);
      if (error) throw error;
      if (data) allAgendamentos.push(...data);
      if (!data || data.length < 1000) break;
      page++;
    }

    // Buscar pacotes paginados
    const allPacotes: any[] = [];
    page = 0;
    while (true) {
      const { data, error } = await supabase
        .from("agendamentos_pacotes")
        .select("id, nome_cliente, data_venda, nome_pet, whatsapp, servicos")
        .eq("user_id", userId)
        .range(page * 1000, (page + 1) * 1000 - 1);
      if (error) throw error;
      if (data) allPacotes.push(...data);
      if (!data || data.length < 1000) break;
      page++;
    }

    // Buscar clientes
    const { data: clientes } = await supabase
      .from("clientes")
      .select("id, nome_cliente, whatsapp, whatsapp_ativo")
      .eq("user_id", userId);
    if (!clientes) continue;

    // Buscar pets
    const { data: allPets } = await supabase
      .from("pets")
      .select("id, cliente_id, nome_pet, sexo, whatsapp_ativo")
      .eq("user_id", userId);
    if (!allPets) continue;

    const clienteMap = new Map(clientes.map((c: any) => [c.id, c]));

    const clienteByNomeWhatsapp = new Map<string, string>();
    for (const c of clientes) {
      const whatsLimpo = c.whatsapp.replace(/\D/g, "");
      clienteByNomeWhatsapp.set(`${c.nome_cliente}|${whatsLimpo}`, c.id);
      if (!clienteByNomeWhatsapp.has(`|${whatsLimpo}`)) {
        clienteByNomeWhatsapp.set(`|${whatsLimpo}`, c.id);
      }
    }

    function resolverClienteId(a: any): string | null {
      if (a.cliente_id) return a.cliente_id;
      const whatsLimpo = (a.whatsapp || "").replace(/\D/g, "");
      const byNome = clienteByNomeWhatsapp.get(`${a.cliente}|${whatsLimpo}`);
      if (byNome) return byNome;
      const byWhats = clienteByNomeWhatsapp.get(`|${whatsLimpo}`);
      if (byWhats) return byWhats;
      const byNomeOnly = clientes.find((c: any) => c.nome_cliente === a.cliente);
      return byNomeOnly?.id || null;
    }

    const parseData = (str: string) => {
      const d = new Date(str + "T00:00:00");
      return isNaN(d.getTime()) ? null : d;
    };

    // Último agendamento por chave cliente_id + pet
    const ultimoAgendamento = new Map<string, { data: Date; clienteId: string; nomePet: string; whatsapp: string }>();

    for (const a of allAgendamentos) {
      const d = parseData(a.data);
      if (!d) continue;
      const clienteId = resolverClienteId(a);
      if (!clienteId) continue;
      const chave = `${clienteId}_${a.pet}`;
      const existente = ultimoAgendamento.get(chave);
      if (!existente || d > existente.data) {
        ultimoAgendamento.set(chave, { data: d, clienteId, nomePet: a.pet, whatsapp: a.whatsapp });
      }
    }

    for (const p of allPacotes) {
      const clienteMatch = clientes.find((c: any) => c.nome_cliente === p.nome_cliente);
      if (!clienteMatch) continue;
      let ultimaData: Date | null = null;
      try {
        const servicos = typeof p.servicos === "string" ? JSON.parse(p.servicos) : p.servicos;
        if (Array.isArray(servicos)) {
          for (const s of servicos) {
            const d = parseData(s.data);
            if (d && (!ultimaData || d > ultimaData)) ultimaData = d;
          }
        }
      } catch {}
      const dataFinal = ultimaData || parseData(p.data_venda);
      if (!dataFinal) continue;
      const chave = `${clienteMatch.id}_${p.nome_pet}`;
      const existente = ultimoAgendamento.get(chave);
      if (!existente || dataFinal > existente.data) {
        ultimoAgendamento.set(chave, { data: dataFinal, clienteId: clienteMatch.id, nomePet: p.nome_pet, whatsapp: p.whatsapp });
      }
    }

    // Verificar agendamentos futuros
    const temFuturo = new Set<string>();
    for (const a of allAgendamentos) {
      const clienteId = resolverClienteId(a);
      if (!clienteId) continue;
      const d = parseData(a.data);
      if (d && d >= hoje) temFuturo.add(`${clienteId}_${a.pet}`);
    }
    for (const p of allPacotes) {
      const clienteMatch = clientes.find((c: any) => c.nome_cliente === p.nome_cliente);
      if (!clienteMatch) continue;
      try {
        const servicos = typeof p.servicos === "string" ? JSON.parse(p.servicos) : p.servicos;
        if (Array.isArray(servicos)) {
          for (const s of servicos) {
            const d = parseData(s.data);
            if (d && d >= hoje) temFuturo.add(`${clienteMatch.id}_${p.nome_pet}`);
          }
        }
      } catch {}
    }

    // Agrupar pets em risco por cliente_id
    const clientesPetsRisco = new Map<string, { clienteId: string; pets: PetInfo[]; whatsapp: string }>();

    for (const [chave, info] of ultimoAgendamento.entries()) {
      if (temFuturo.has(chave)) continue;
      const dias = Math.floor((hoje.getTime() - info.data.getTime()) / (1000 * 60 * 60 * 24));
      if (dias < MIN_DIAS || dias > MAX_DIAS) continue;

      const cliente = clienteMap.get(info.clienteId);
      if (!cliente || !cliente.whatsapp_ativo) continue;

      const petRecord = allPets.find((p: any) => p.cliente_id === info.clienteId && p.nome_pet === info.nomePet);
      if (petRecord && !petRecord.whatsapp_ativo) continue;

      const grupo = clientesPetsRisco.get(info.clienteId);
      const petInfo: PetInfo = { nome_pet: info.nomePet, sexo: petRecord?.sexo || null, dias_sem_agendar: dias };

      if (grupo) {
        grupo.pets.push(petInfo);
      } else {
        clientesPetsRisco.set(info.clienteId, {
          clienteId: info.clienteId,
          pets: [petInfo],
          whatsapp: info.whatsapp || cliente.whatsapp,
        });
      }
    }

    // Buscar histórico de tentativas
    const clienteIds = Array.from(clientesPetsRisco.keys());
    if (clienteIds.length === 0) {
      console.log(`📋 Instância ${instance.instance_name}: nenhum cliente em risco elegível`);
      continue;
    }

    const { data: historicoRisco } = await supabase
      .from("whatsapp_mensagens_risco")
      .select("cliente_id, tentativa, created_at, status")
      .eq("user_id", userId)
      .in("cliente_id", clienteIds)
      .in("status", ["enviado", "pendente"])
      .order("tentativa", { ascending: false });

    const historicoMap = new Map<string, { maxTentativa: number; dataUltimoEnvio: Date }>();
    for (const h of (historicoRisco || [])) {
      const existing = historicoMap.get(h.cliente_id);
      if (!existing || h.tentativa > existing.maxTentativa) {
        historicoMap.set(h.cliente_id, {
          maxTentativa: h.tentativa,
          dataUltimoEnvio: new Date(h.created_at),
        });
      }
    }

    // Preparar lista de envios pendentes
    const enviosPendentes: { clienteId: string; grupo: { pets: PetInfo[]; whatsapp: string }; tentativa: number; maxDias: number; isCarryOver: boolean }[] = [];

    for (const [clienteId, grupo] of clientesPetsRisco.entries()) {
      const historico = historicoMap.get(clienteId);
      const maxDias = Math.max(...grupo.pets.map((p) => p.dias_sem_agendar));

      if (!historico) {
        enviosPendentes.push({ clienteId, grupo, tentativa: 1, maxDias, isCarryOver: carryOverClienteIds.has(clienteId) });
        continue;
      }

      if (historico.maxTentativa >= MAX_TENTATIVAS) continue;

      const proximaTentativa = historico.maxTentativa + 1;
      const intervalo = INTERVALOS_TENTATIVAS[proximaTentativa - 1];

      let dataPrevista = new Date(historico.dataUltimoEnvio);
      dataPrevista.setDate(dataPrevista.getDate() + intervalo);
      dataPrevista = proximoDiaUtil(dataPrevista);

      const dataPrevistaStr = dataPrevista.toISOString().split("T")[0];

      if (hojeStr >= dataPrevistaStr) {
        enviosPendentes.push({ clienteId, grupo, tentativa: proximaTentativa, maxDias, isCarryOver: carryOverClienteIds.has(clienteId) });
      }
    }

    // Incluir carry-over clients que NÃO apareceram na lista de risco atual
    if (carryOverPendentes && carryOverPendentes.length > 0) {
      for (const co of carryOverPendentes) {
        if (clientesPetsRisco.has(co.cliente_id)) continue; // já incluído acima
        const cliente = clienteMap.get(co.cliente_id);
        if (!cliente || !cliente.whatsapp_ativo) continue;
        const pets: PetInfo[] = (co.pets_incluidos || []).map((p: any) => ({
          nome_pet: p.nome_pet,
          sexo: p.sexo || null,
          dias_sem_agendar: (p.dias_sem_agendar || MIN_DIAS) + 1, // +1 dia desde ontem
        }));
        if (pets.length === 0) continue;
        const maxDias = Math.max(...pets.map((p) => p.dias_sem_agendar));
        const numeroLimpo = (co.numero_whatsapp || cliente.whatsapp).replace(/\D/g, "");
        enviosPendentes.push({
          clienteId: co.cliente_id,
          grupo: { pets, whatsapp: numeroLimpo },
          tentativa: co.tentativa,
          maxDias,
          isCarryOver: true,
        });
      }
    }

    // ✅ PRIORIZAÇÃO: Ordenar por dias sem agendar DECRESCENTE (mais críticos primeiro)
    // Clientes novos (não carry-over) com mesmo maxDias têm prioridade
    enviosPendentes.sort((a, b) => {
      if (b.maxDias !== a.maxDias) return b.maxDias - a.maxDias;
      // Novos primeiro quando empate em dias
      if (a.isCarryOver !== b.isCarryOver) return a.isCarryOver ? 1 : -1;
      return 0;
    });

    // Limitar a LIMITE_DIARIO mensagens - excedentes ficam como pendentes para amanhã
    const enviosLimitados = enviosPendentes.slice(0, LIMITE_DIARIO);
    const excedentes = enviosPendentes.slice(LIMITE_DIARIO);

    if (excedentes.length > 0) {
      const novos = excedentes.filter(e => !e.isCarryOver).length;
      const carryOvers = excedentes.filter(e => e.isCarryOver).length;
      console.log(`⏳ ${excedentes.length} clientes excederam limite diário (${novos} novos, ${carryOvers} carry-over) - ficarão pendentes para amanhã`);
    }

    // Gerar slots de horário aleatórios com pausas
    const slots = gerarSlotsHorarios(hojeStr);
    const instanceOffset = instIdx * OFFSET_ENTRE_INSTANCIAS_MS;

    console.log(`📊 Instância ${instance.instance_name}: ${enviosLimitados.length} mensagens a agendar, ${slots.length} slots gerados`);

    for (let i = 0; i < enviosLimitados.length && i < slots.length; i++) {
      const envio = enviosLimitados[i];
      const cliente = clienteMap.get(envio.clienteId);
      if (!cliente) continue;

      const primeiroNome = cliente.nome_cliente.split(" ")[0];
      const mensagem = gerarMensagemRisco(primeiroNome, envio.grupo.pets);

      const numeroLimpo = envio.grupo.whatsapp.replace(/\D/g, "");
      const numeroCompleto = numeroLimpo.startsWith("55") ? numeroLimpo : `55${numeroLimpo}`;

      // Usar slot + offset da instância
      const agendadoPara = new Date(slots[i].getTime() + instanceOffset);

      const { error: insertErr } = await supabase
        .from("whatsapp_mensagens_risco")
        .insert({
          user_id: userId,
          cliente_id: envio.clienteId,
          pets_incluidos: envio.grupo.pets,
          mensagem,
          numero_whatsapp: numeroCompleto,
          status: "pendente",
          agendado_para: agendadoPara.toISOString(),
          tentativa: envio.tentativa,
        });

      if (insertErr) {
        console.error(`Erro ao inserir registro risco para ${envio.clienteId}:`, insertErr);
      } else {
        totalAgendadas++;
        const horaBRT = new Date(agendadoPara.getTime() - 3 * 60 * 60 * 1000);
        const horaFmt = `${String(horaBRT.getUTCHours()).padStart(2, "0")}:${String(horaBRT.getUTCMinutes()).padStart(2, "0")}`;
        console.log(`📋 Agendada risco #${envio.tentativa} para ${cliente.nome_cliente} (${envio.maxDias}d) às ${horaFmt} BRT via ${instance.instance_name}`);
      }
    }
  }

  return { agendadas: totalAgendadas };
}

// ===================== MAIN =====================
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verificar horário BRT (UTC-3)
    const agora = new Date();
    const agoraBRT = new Date(agora.getTime() - 3 * 60 * 60 * 1000);
    const horaBRT = agoraBRT.getUTCHours();
    const diaSemana = agoraBRT.getUTCDay();

    if (diaSemana === 0 || diaSemana === 6 || horaBRT < 8 || horaBRT >= 18) {
      return new Response(
        JSON.stringify({ message: "Fora do horário comercial (seg-sex 08h-18h BRT)" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hojeStr = agoraBRT.toISOString().split("T")[0];
    const hoje = new Date(hojeStr + "T00:00:00");

    // Buscar instâncias ativas
    const { data: instances } = await supabase
      .from("whatsapp_instances")
      .select("user_id, instance_name, status")
      .eq("status", "connected");

    if (!instances || instances.length === 0) {
      return new Response(JSON.stringify({ message: "Nenhuma instância ativa" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verificar se existem mensagens pendentes hoje (qualquer instância)
    const inicioHojeUTC = new Date(hojeStr + "T00:00:00.000Z");
    const fimHojeUTC = new Date(hojeStr + "T23:59:59.999Z");
    const { data: pendentesHoje } = await supabase
      .from("whatsapp_mensagens_risco")
      .select("id")
      .eq("status", "pendente")
      .gte("agendado_para", inicioHojeUTC.toISOString())
      .lte("agendado_para", fimHojeUTC.toISOString())
      .limit(1);

    const temPendentes = pendentesHoje && pendentesHoje.length > 0;

    if (temPendentes) {
      // FASE 2: Enviar mensagens pendentes
      console.log(`📤 Fase Envio: processando mensagens pendentes...`);
      const resultado = await faseEnvio(supabase, instances, agora);
      return new Response(
        JSON.stringify({ fase: "envio", ...resultado }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Sem pendentes: verificar se é hora de agendar (08h BRT)
    if (horaBRT === 8) {
      console.log(`📋 Fase Agendamento: criando fila com intervalos aleatórios e pausas...`);
      const resultado = await faseAgendamento(supabase, instances, hoje, hojeStr);

      // Se agendou, tentar enviar as primeiras
      if (resultado.agendadas > 0) {
        const envioResult = await faseEnvio(supabase, instances, agora);
        return new Response(
          JSON.stringify({ fase: "agendamento+envio", agendadas: resultado.agendadas, ...envioResult }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ fase: "agendamento", agendadas: resultado.agendadas }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ message: "Nenhuma ação necessária neste ciclo" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Erro geral whatsapp-risco-scheduler:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
