import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function artigo(sexo: string | null | undefined): string {
  const s = (sexo || "").toLowerCase();
  return s === "fêmea" || s === "femea" ? "a" : "o";
}

function artigoCapital(sexo: string | null | undefined): string {
  const s = (sexo || "").toLowerCase();
  return s === "fêmea" || s === "femea" ? "A" : "O";
}

function pronomeEle(sexo: string | null | undefined): string {
  const s = (sexo || "").toLowerCase();
  return s === "fêmea" || s === "femea" ? "Ela" : "Ele";
}

interface RegistroDiario {
  data_registro: string;
  hora_registro: string;
  comeu: boolean | null;
  bebeu_agua: boolean | null;
  brincou: boolean | null;
  interagiu_bem: boolean | null;
  brigas: boolean | null;
  fez_necessidades: boolean | null;
  sinais_doenca: boolean | null;
  pulgas_carrapatos: boolean | null;
  observacoes: string | null;
}

interface Observacao {
  data_registro?: string;
  observacao: string;
  tipo?: string;
}

function buildRegistroFrases(pet: string, sexo: string | null, reg: RegistroDiario): { principais: string[]; observacao: string | null } {
  const art = artigo(sexo);
  const nome = `${art} ${pet}`;
  const principais: string[] = [];

  if (reg.comeu) principais.push(`${nome} se alimentou normalmente.`);
  if (reg.bebeu_agua) principais.push(`${nome} se manteve bem ${(sexo || "").toLowerCase() === "fêmea" || (sexo || "").toLowerCase() === "femea" ? "hidratada" : "hidratado"}.`);
  if (reg.brincou) principais.push(`${nome} brincou bastante ao longo do dia.`);
  if (reg.interagiu_bem) principais.push(`${nome} interagiu bem com outros pets.`);
  if (reg.brigas) principais.push(`${nome} se envolveu em alguns momentos de conflito.`);
  if (reg.fez_necessidades) principais.push(`${nome} realizou suas necessidades normalmente.`);
  if (reg.sinais_doenca) principais.push(`${nome} apresentou sinais de atenção relacionados à saúde.`);
  if (reg.pulgas_carrapatos) principais.push(`${nome} apresentou sinais de pulgas/carrapatos.`);

  const observacao = reg.observacoes?.trim() || null;

  return { principais, observacao };
}

function buildChecklistFrases(pet: string, sexo: string | null, checklist: any): string[] {
  if (!checklist) return [];
  const art = artigo(sexo);
  const nome = `${art} ${pet}`;
  const frases: string[] = [];

  if (checklist.comeu_antes) frases.push(`${nome} havia se alimentado antes de chegar.`);
  if (checklist.comportamento_normal) frases.push(`${nome} apresentou comportamento normal na chegada.`);
  if (checklist.sinais_doenca) frases.push(`${nome} apresentou sinais de atenção à saúde no check-in.`);
  if (checklist.pulgas_carrapatos) frases.push(`${nome} apresentou sinais de pulgas/carrapatos no check-in.`);
  if (checklist.agressivo) frases.push(`${nome} demonstrou comportamento agressivo na chegada.`);
  if (checklist.restricao) frases.push(`${nome} possui restrição informada pelo tutor.`);
  if (checklist.observacoes?.trim()) frases.push(`Nota do check-in: ${checklist.observacoes.trim()}`);

  return frases;
}

export async function gerarHistoricoDiario(
  estadiaId: string,
  petNome: string,
  petSexo: string | null,
  clienteNome: string,
): Promise<string> {
  const hoje = format(new Date(), "yyyy-MM-dd");
  const pro = pronomeEle(petSexo);
  const artDoDa = (petSexo || "").toLowerCase() === "fêmea" || (petSexo || "").toLowerCase() === "femea" ? "da" : "do";

  const { data: registros } = await supabase
    .from("creche_registros_diarios")
    .select("*")
    .eq("estadia_id", estadiaId)
    .eq("data_registro", hoje)
    .order("hora_registro", { ascending: true });

  if (!registros || registros.length === 0) {
    return `Olá, ${clienteNome}! 😊\n\nHoje não houve registros relevantes para ${artigo(petSexo)} ${petNome}. Qualquer novidade, avisaremos! 🐾`;
  }

  const consolidated: RegistroDiario = {
    data_registro: hoje,
    hora_registro: "",
    comeu: registros.some(r => r.comeu),
    bebeu_agua: registros.some(r => r.bebeu_agua),
    brincou: registros.some(r => r.brincou),
    interagiu_bem: registros.some(r => r.interagiu_bem),
    brigas: registros.some(r => r.brigas),
    fez_necessidades: registros.some(r => r.fez_necessidades),
    sinais_doenca: registros.some(r => r.sinais_doenca),
    pulgas_carrapatos: registros.some(r => r.pulgas_carrapatos),
    observacoes: registros
      .map(r => r.observacoes?.trim())
      .filter(Boolean)
      .join("; ") || null,
  };

  const { principais, observacao } = buildRegistroFrases(petNome, petSexo, consolidated);

  let msg = `Olá, ${clienteNome}! 😊\n\nSegue o resumo do dia ${artDoDa} ${petNome}:\n\n`;
  msg += principais.join("\n");
  if (observacao) {
    msg += `\n\n*Observação adicional:* ${observacao}`;
  }
  msg += `\n\n${pro} está sendo muito bem ${(petSexo || "").toLowerCase() === "fêmea" || (petSexo || "").toLowerCase() === "femea" ? "cuidada" : "cuidado"}! Qualquer dúvida, estamos à disposição. 🐾`;

  return msg;
}

export async function gerarHistoricoCompleto(
  estadiaId: string,
  petNome: string,
  petSexo: string | null,
  clienteNome: string,
  checklistEntrada: any,
  dataEntrada: string,
  horaEntrada?: string,
): Promise<string> {
  const pro = pronomeEle(petSexo);
  const artDoDa = (petSexo || "").toLowerCase() === "fêmea" || (petSexo || "").toLowerCase() === "femea" ? "da" : "do";

  const { data: registros } = await supabase
    .from("creche_registros_diarios")
    .select("*")
    .eq("estadia_id", estadiaId)
    .order("data_registro", { ascending: true })
    .order("hora_registro", { ascending: true });

  let msg = `Olá, ${clienteNome}! 😊\n\nSegue o histórico completo da estadia ${artDoDa} ${petNome}:\n\n`;

  // Checklist inicial
  const checklistFrases = buildChecklistFrases(petNome, petSexo, checklistEntrada);
  if (checklistFrases.length > 0) {
    const horaFormatada = horaEntrada ? ` às ${horaEntrada.substring(0, 5)}` : "";
    msg += `📋 *Check-in (${format(new Date(dataEntrada + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })}${horaFormatada})*\n`;
    msg += checklistFrases.join("\n");
    msg += "\n\n";
  }

  if (!registros || registros.length === 0) {
    msg += `Até o momento, não houve registros diários para ${artigo(petSexo)} ${petNome}.\n`;
  } else {
    const byDate = new Map<string, RegistroDiario[]>();
    registros.forEach(r => {
      const list = byDate.get(r.data_registro) || [];
      list.push(r as RegistroDiario);
      byDate.set(r.data_registro, list);
    });

    for (const [date, regs] of byDate) {
      const consolidated: RegistroDiario = {
        data_registro: date,
        hora_registro: "",
        comeu: regs.some(r => r.comeu),
        bebeu_agua: regs.some(r => r.bebeu_agua),
        brincou: regs.some(r => r.brincou),
        interagiu_bem: regs.some(r => r.interagiu_bem),
        brigas: regs.some(r => r.brigas),
        fez_necessidades: regs.some(r => r.fez_necessidades),
        sinais_doenca: regs.some(r => r.sinais_doenca),
        pulgas_carrapatos: regs.some(r => r.pulgas_carrapatos),
        observacoes: regs
          .map(r => r.observacoes?.trim())
          .filter(Boolean)
          .join("; ") || null,
      };

      const { principais, observacao } = buildRegistroFrases(petNome, petSexo, consolidated);
      if (principais.length > 0 || observacao) {
        msg += `📅 *${format(new Date(date + "T00:00:00"), "dd/MM/yyyy (EEEE)", { locale: ptBR })}*\n`;
        if (principais.length > 0) {
          msg += principais.join("\n");
        }
        if (observacao) {
          msg += `\n\n*Observação adicional:* ${observacao}`;
        }
        msg += "\n\n";
      }
    }
  }

  msg += `${pro} está recebendo todo carinho e atenção! Qualquer dúvida, estamos à disposição. 🐾`;

  return msg;
}
