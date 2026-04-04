import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { addBusinessDays } from "@/utils/diasUteis";

export interface CRMLead {
  id: string;
  nome_empresa: string;
  nota_google: number | null;
  qtd_avaliacoes: number | null;
  telefone_empresa: string;
  nome_dono: string | null;
  telefone_dono: string | null;
  tentativa: number;
  teve_resposta: boolean;
  agendou_reuniao: boolean;
  data_reuniao: string | null;
  usando_acesso_gratis: boolean;
  dias_acesso_gratis: number;
  data_inicio_acesso_gratis: string | null;
  iniciou_acesso_pago: boolean;
  data_inicio_acesso_pago: string | null;
  plano_contratado: string | null;
  proximo_passo: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CRMMensagem {
  id: string;
  lead_id: string;
  tentativa: number;
  data_envio: string;
  observacao: string | null;
  fase: string | null;
  created_by: string | null;
  created_at: string;
}

// Tipo para representar a fase atual do lead
export type FaseLead = "prospecao" | "acesso_gratis" | "acesso_pago";

// Função para determinar a fase atual do lead
export const getFaseLead = (lead: Partial<CRMLead>): FaseLead => {
  if (lead.iniciou_acesso_pago) return "acesso_pago";
  if (lead.usando_acesso_gratis) return "acesso_gratis";
  return "prospecao";
};

/**
 * Calcula o próximo passo automaticamente baseado nas regras de negócio
 * Considera apenas dias úteis (segunda a sexta)
 */
export const calcularProximoPasso = (
  lead: Partial<CRMLead>,
  mensagensNaFase: number = 0,
  ultimoEnvio?: Date
): string | null => {
  const hoje = new Date();
  const fase = getFaseLead(lead);
  const baseDate = ultimoEnvio || hoje;

  // ===== LÓGICA 5: ACESSO PAGO =====
  if (fase === "acesso_pago") {
    // Se já enviou pelo menos 1 mensagem na fase acesso_pago, vai para Standby
    if (mensagensNaFase >= 1) {
      return null; // Standby - sem próximo passo
    }
    // Primeiro contato: 3 dias úteis após início do acesso pago
    if (lead.data_inicio_acesso_pago) {
      const dataInicio = new Date(lead.data_inicio_acesso_pago);
      return addBusinessDays(dataInicio, 3).toISOString().split('T')[0];
    }
    return addBusinessDays(hoje, 3).toISOString().split('T')[0];
  }

  // ===== LÓGICA 4: ACESSO GRÁTIS =====
  if (fase === "acesso_gratis") {
    // Intervalos de contato durante acesso grátis (6 momentos)
    const intervalosAcessoGratis = [3, 5, 6, 6, 5, 2];
    
    if (mensagensNaFase >= 6) {
      // Após 6 contatos, aguarda conversão ou fim do período
      return null;
    }
    
    if (mensagensNaFase === 0 && lead.data_inicio_acesso_gratis) {
      // Primeiro contato: 3 dias úteis após início do acesso grátis
      const dataInicio = new Date(lead.data_inicio_acesso_gratis);
      return addBusinessDays(dataInicio, 3).toISOString().split('T')[0];
    }
    
    // Próximo contato baseado no último envio
    const diasAteProximo = intervalosAcessoGratis[mensagensNaFase] || 5;
    return addBusinessDays(baseDate, diasAteProximo).toISOString().split('T')[0];
  }

  // ===== LÓGICA 3: REUNIÃO AGENDADA =====
  if (lead.agendou_reuniao && lead.data_reuniao) {
    const dataReuniao = new Date(lead.data_reuniao);
    const hojeNormalizado = new Date();
    hojeNormalizado.setHours(0, 0, 0, 0);
    dataReuniao.setHours(0, 0, 0, 0);
    
    // Se a reunião ainda não aconteceu, próximo passo é a data da reunião
    if (dataReuniao >= hojeNormalizado) {
      return lead.data_reuniao;
    }
    
    // Se a reunião já passou e ainda não iniciou acesso grátis,
    // próximo passo é 2 dias úteis após a reunião
    if (!lead.usando_acesso_gratis) {
      return addBusinessDays(dataReuniao, 2).toISOString().split('T')[0];
    }
  }

  // ===== LÓGICA 2: CLIENTE RESPONDEU (SEM REUNIÃO) =====
  if (lead.teve_resposta && !lead.agendou_reuniao) {
    return addBusinessDays(baseDate, 1).toISOString().split('T')[0];
  }

  // ===== LÓGICA 1: SEM RESPOSTA DO CLIENTE =====
  const tentativa = lead.tentativa || 0;

  // Tentativa 5+ sem resposta = Standby
  if (tentativa >= 5) {
    return null; // Standby
  }

  // Dias úteis para próximo contato baseado na tentativa atual
  // Tentativa 0 = lead novo (ainda não contatado) - próximo passo é HOJE
  const diasPorTentativa: Record<number, number> = {
    0: 0, // Lead novo - próximo passo é HOJE (0 dias úteis)
    1: 2, // Após tentativa 1 - próxima em 2 dias úteis
    2: 3, // Após tentativa 2 - próxima em 3 dias úteis
    3: 3, // Após tentativa 3 - próxima em 3 dias úteis
    4: 4, // Após tentativa 4 - próxima em 4 dias úteis
  };

  const diasUteis = diasPorTentativa[tentativa] ?? 2;
  return addBusinessDays(baseDate, diasUteis).toISOString().split('T')[0];
};

/**
 * Calcula o status automaticamente baseado no estado do lead
 */
export const calcularStatus = (lead: Partial<CRMLead>, mensagensNaFase: number = 0): string => {
  const fase = getFaseLead(lead);

  // Acesso pago
  if (fase === "acesso_pago") {
    if (mensagensNaFase >= 1) return "Standby"; // Após primeiro contato
    return "Acesso pago";
  }

  // Acesso grátis
  if (fase === "acesso_gratis") {
    return "Acesso grátis";
  }

  // Reunião agendada
  if (lead.agendou_reuniao) return "Reunião agendada";

  // Tentativa 5+ sem resposta = Standby (antes era "Sem interesse")
  const tentativa = lead.tentativa || 0;
  if (tentativa >= 5 && !lead.teve_resposta) return "Standby";

  // Em contato (respondeu ou tentativas em andamento)
  if (lead.teve_resposta) return "Em contato";
  if (tentativa > 0) return "Em contato";

  return "Novo";
};

export const useCRMLeads = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading, error } = useQuery({
    queryKey: ["crm-leads"],
    queryFn: async () => {
      // Buscar todos os leads em páginas de 1000 para contornar limite do Supabase
      const PAGE_SIZE = 1000;
      const allLeads: CRMLead[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("crm_leads")
          .select("*")
          // Ordenação estável: created_at + id para evitar duplicatas entre páginas
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(offset, offset + PAGE_SIZE - 1);

        if (error) throw error;
        
        if (data && data.length > 0) {
          allLeads.push(...(data as CRMLead[]));
          offset += PAGE_SIZE;
          // Se retornou menos que PAGE_SIZE, é a última página
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }

        // Fail-safe: máximo de 100.000 leads
        if (offset >= 100000) break;
      }

      // Deduplicar por ID para garantir que não há leads repetidos
      const uniqueLeadsMap = new Map<string, CRMLead>();
      for (const lead of allLeads) {
        if (!uniqueLeadsMap.has(lead.id)) {
          uniqueLeadsMap.set(lead.id, lead);
        }
      }

      return Array.from(uniqueLeadsMap.values());
    },
  });

  const createLead = useMutation({
    mutationFn: async (lead: Omit<CRMLead, "id" | "created_at" | "updated_at">) => {
      const { data: userData } = await supabase.auth.getUser();
      
      const proximo_passo = calcularProximoPasso(lead);
      const status = calcularStatus(lead);

      const { data, error } = await supabase
        .from("crm_leads")
        .insert({
          ...lead,
          proximo_passo,
          status,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      toast({ title: "Lead criado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar lead", description: error.message, variant: "destructive" });
    },
  });

  const updateLead = useMutation({
    mutationFn: async ({ id, mensagensNaFase = 0, ultimoEnvio, ...lead }: Partial<CRMLead> & { id: string; mensagensNaFase?: number; ultimoEnvio?: Date }) => {
      const proximo_passo = calcularProximoPasso(lead, mensagensNaFase, ultimoEnvio);
      const status = calcularStatus(lead, mensagensNaFase);

      const { data, error } = await supabase
        .from("crm_leads")
        .update({
          ...lead,
          proximo_passo,
          status,
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      toast({ title: "Lead atualizado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar lead", description: error.message, variant: "destructive" });
    },
  });

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("crm_leads")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      toast({ title: "Lead excluído com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir lead", description: error.message, variant: "destructive" });
    },
  });

  const importLeads = useMutation({
    mutationFn: async (leadsData: Array<{ nome_empresa: string; nota_google: number | null; qtd_avaliacoes: number | null; telefone_empresa: string }>) => {
      const { data: userData } = await supabase.auth.getUser();
      
      // Função para normalizar telefone
      const normalizePhone = (phone: string | null | undefined): string => {
        if (!phone) return "";
        return phone.replace(/[\s\(\)\-\+]/g, "");
      };

      // Buscar todos os telefones existentes no banco (em páginas de 1000)
      const PAGE_SIZE = 1000;
      const allExistingPhones: string[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data: existingLeads } = await supabase
          .from("crm_leads")
          .select("telefone_empresa")
          .range(offset, offset + PAGE_SIZE - 1);

        if (existingLeads && existingLeads.length > 0) {
          allExistingPhones.push(
            ...existingLeads.map(l => normalizePhone(l.telefone_empresa)).filter(p => p !== "")
          );
          offset += PAGE_SIZE;
          hasMore = existingLeads.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }

        if (offset >= 100000) break;
      }

      const existingPhones = new Set(allExistingPhones);

      // Filtrar leads que não existem no banco (por telefone)
      const newLeadsData = leadsData.filter(lead => {
        if (!lead.telefone_empresa) return true; // Sem telefone, permite importar
        const normalized = normalizePhone(lead.telefone_empresa);
        return !existingPhones.has(normalized);
      });

      const duplicatesSkipped = leadsData.length - newLeadsData.length;

      // Se não houver leads novos, retornar early
      if (newLeadsData.length === 0) {
        return { inserted: [], duplicatesSkipped };
      }

      const leadsToInsert = newLeadsData.map(lead => {
        const newLead = {
          ...lead,
          tentativa: 0, // Começa em 0 - lead novo ainda não contatado
          teve_resposta: false,
          agendou_reuniao: false,
          usando_acesso_gratis: false,
          dias_acesso_gratis: 30,
          iniciou_acesso_pago: false,
        };
        
        return {
          ...newLead,
          proximo_passo: calcularProximoPasso(newLead),
          status: "Novo",
          created_by: userData.user?.id,
        };
      });

      const { data, error } = await supabase
        .from("crm_leads")
        .insert(leadsToInsert)
        .select();

      if (error) throw error;
      return { inserted: data, duplicatesSkipped };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      const { inserted, duplicatesSkipped } = result;
      
      if (inserted.length === 0 && duplicatesSkipped > 0) {
        toast({ 
          title: "Nenhum lead novo importado", 
          description: `${duplicatesSkipped} contato${duplicatesSkipped > 1 ? 's' : ''} já existe${duplicatesSkipped > 1 ? 'm' : ''} na base.`,
          variant: "default" 
        });
      } else if (duplicatesSkipped > 0) {
        toast({ 
          title: `${inserted.length} lead${inserted.length > 1 ? 's' : ''} importado${inserted.length > 1 ? 's' : ''}!`,
          description: `${duplicatesSkipped} duplicado${duplicatesSkipped > 1 ? 's' : ''} ignorado${duplicatesSkipped > 1 ? 's' : ''}.`
        });
      } else {
        toast({ title: `${inserted.length} lead${inserted.length > 1 ? 's' : ''} importado${inserted.length > 1 ? 's' : ''} com sucesso!` });
      }
    },
    onError: (error) => {
      toast({ title: "Erro ao importar leads", description: error.message, variant: "destructive" });
    },
  });

  return {
    leads,
    isLoading,
    error,
    createLead,
    updateLead,
    deleteLead,
    importLeads,
  };
};

export const useCRMMensagens = (leadId: string | null) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: mensagens = [], isLoading } = useQuery({
    queryKey: ["crm-mensagens", leadId],
    queryFn: async () => {
      if (!leadId) return [];
      
      const { data, error } = await supabase
        .from("crm_mensagens")
        .select("*")
        .eq("lead_id", leadId)
        .order("data_envio", { ascending: false });

      if (error) throw error;
      return data as CRMMensagem[];
    },
    enabled: !!leadId,
  });

  const createMensagem = useMutation({
    mutationFn: async ({ lead_id, tentativa, observacao, fase }: { lead_id: string; tentativa: number; observacao?: string; fase?: string }) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("crm_mensagens")
        .insert({
          lead_id,
          tentativa,
          observacao,
          fase: fase || "prospecao",
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-mensagens", leadId] });
      queryClient.invalidateQueries({ queryKey: ["crm-leads"] });
      toast({ title: "Mensagem registrada com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao registrar mensagem", description: error.message, variant: "destructive" });
    },
  });

  return {
    mensagens,
    isLoading,
    createMensagem,
  };
};

export const useCRMAccess = () => {
  const { data: hasAccess, isLoading } = useQuery({
    queryKey: ["crm-access"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return false;

      const { data, error } = await supabase
        .from("crm_usuarios_autorizados")
        .select("id")
        .eq("email", userData.user.email)
        .maybeSingle();

      if (error) return false;
      return !!data;
    },
  });

  return { hasAccess: hasAccess ?? false, isLoading };
};

/**
 * Hook para contar mensagens por fase do lead
 */
export const useMensagensPorFase = (leadId: string | null, fase: FaseLead) => {
  const { data: count = 0 } = useQuery({
    queryKey: ["crm-mensagens-fase", leadId, fase],
    queryFn: async () => {
      if (!leadId) return 0;
      
      const { count, error } = await supabase
        .from("crm_mensagens")
        .select("*", { count: "exact", head: true })
        .eq("lead_id", leadId)
        .eq("fase", fase);

      if (error) return 0;
      return count || 0;
    },
    enabled: !!leadId,
  });

  return count;
};
