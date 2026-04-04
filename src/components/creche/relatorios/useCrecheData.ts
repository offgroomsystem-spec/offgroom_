import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Estadia {
  id: string;
  tipo: string;
  data_entrada: string;
  hora_entrada: string;
  data_saida: string | null;
  data_saida_prevista: string | null;
  hora_saida: string | null;
  status: string;
  pet_id: string;
  cliente_id: string;
  created_at: string;
}

interface RegistroDiario {
  id: string;
  estadia_id: string;
  data_registro: string;
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

export interface CrecheReportData {
  estadias: (Estadia & { pet_nome: string; cliente_nome: string })[];
  registros: RegistroDiario[];
  loading: boolean;
}

export const useCrecheData = (periodo: { inicio: string; fim: string }, tipoFilter: string): CrecheReportData => {
  const { user } = useAuth();
  const [estadias, setEstadias] = useState<CrecheReportData["estadias"]>([]);
  const [registros, setRegistros] = useState<RegistroDiario[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      let query = supabase
        .from("creche_estadias")
        .select("id, tipo, data_entrada, hora_entrada, data_saida, data_saida_prevista, hora_saida, status, pet_id, cliente_id, created_at")
        .gte("data_entrada", periodo.inicio)
        .lte("data_entrada", periodo.fim);

      if (tipoFilter !== "todos") query = query.eq("tipo", tipoFilter);

      const { data } = await query.order("data_entrada", { ascending: false });
      if (!data || data.length === 0) {
        setEstadias([]);
        setRegistros([]);
        setLoading(false);
        return;
      }

      const petIds = [...new Set(data.map((d) => d.pet_id))];
      const clienteIds = [...new Set(data.map((d) => d.cliente_id))];
      const estadiaIds = data.map((d) => d.id);

      const [petsRes, clientesRes, registrosRes] = await Promise.all([
        supabase.from("pets").select("id, nome_pet").in("id", petIds),
        supabase.from("clientes").select("id, nome_cliente").in("id", clienteIds),
        supabase.from("creche_registros_diarios").select("*").in("estadia_id", estadiaIds),
      ]);

      const petMap = new Map(petsRes.data?.map((p) => [p.id, p.nome_pet]) || []);
      const clienteMap = new Map(clientesRes.data?.map((c) => [c.id, c.nome_cliente]) || []);

      setEstadias(
        data.map((d) => ({
          ...d,
          pet_nome: petMap.get(d.pet_id) || "Pet",
          cliente_nome: clienteMap.get(d.cliente_id) || "Cliente",
        }))
      );
      setRegistros((registrosRes.data as RegistroDiario[]) || []);
      setLoading(false);
    };
    load();
  }, [user, periodo.inicio, periodo.fim, tipoFilter]);

  return { estadias, registros, loading };
};
