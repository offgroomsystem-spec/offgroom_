import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface NotaFiscal {
  id: string;
  user_id: string;
  tipo: string;
  nuvem_fiscal_id: string | null;
  numero: string | null;
  serie: string | null;
  status: string;
  valor_total: number;
  cliente_id: string | null;
  cliente_nome: string | null;
  cliente_documento: string | null;
  agendamento_id: string | null;
  lancamento_id: string | null;
  dados_nfe: Record<string, unknown> | null;
  dados_nfse: Record<string, unknown> | null;
  mensagem_erro: string | null;
  created_at: string;
  updated_at: string;
}

interface Filters {
  tipo?: string;
  status?: string;
  busca?: string;
  dataInicio?: string;
  dataFim?: string;
}

export async function callNuvemFiscal(action: string, params: Record<string, unknown> = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("Usuário não autenticado");

  const res = await supabase.functions.invoke("nuvem-fiscal", {
    body: { action, ...params },
  });

  if (res.error) throw new Error(res.error.message);
  return res.data;
}

export function useNotasFiscais(filters: Filters = {}) {
  const { ownerId } = useAuth();
  const queryClient = useQueryClient();

  const notasQuery = useQuery({
    queryKey: ["notas_fiscais", ownerId, filters],
    queryFn: async () => {
      let query = supabase
        .from("notas_fiscais")
        .select("*")
        .eq("user_id", ownerId!)
        .order("created_at", { ascending: false });

      if (filters.tipo && filters.tipo !== "todos") {
        query = query.eq("tipo", filters.tipo);
      }
      if (filters.status && filters.status !== "todos") {
        query = query.eq("status", filters.status);
      }
      if (filters.busca) {
        query = query.or(
          `cliente_nome.ilike.%${filters.busca}%,cliente_documento.ilike.%${filters.busca}%,numero.ilike.%${filters.busca}%`
        );
      }
      if (filters.dataInicio) {
        query = query.gte("created_at", filters.dataInicio);
      }
      if (filters.dataFim) {
        query = query.lte("created_at", filters.dataFim + "T23:59:59");
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as NotaFiscal[];
    },
    enabled: !!ownerId,
  });

  const emitirNFe = useMutation({
    mutationFn: async (params: Record<string, unknown>) => {
      return callNuvemFiscal("emitir_nfe", params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notas_fiscais"] });
      toast({ title: "NFe enviada para processamento" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao emitir NFe", description: err.message, variant: "destructive" });
    },
  });

  const emitirNFSe = useMutation({
    mutationFn: async (params: Record<string, unknown>) => {
      return callNuvemFiscal("emitir_nfse", params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notas_fiscais"] });
      toast({ title: "NFSe enviada para processamento" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao emitir NFSe", description: err.message, variant: "destructive" });
    },
  });

  const consultarNota = useMutation({
    mutationFn: async ({ id, tipo }: { id: string; tipo: string }) => {
      const action = tipo === "NFe" ? "consultar_nfe" : "consultar_nfse";
      return callNuvemFiscal(action, { id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notas_fiscais"] });
      toast({ title: "Status atualizado" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao consultar nota", description: err.message, variant: "destructive" });
    },
  });

  const baixarPdf = useMutation({
    mutationFn: async ({ id, tipo }: { id: string; tipo: string }) => {
      const action = tipo === "NFe" ? "baixar_pdf_nfe" : "baixar_pdf_nfse";
      return callNuvemFiscal(action, { id });
    },
    onSuccess: (data: { base64: string; contentType: string }) => {
      // Open PDF in new window for printing
      const byteCharacters = atob(data.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao baixar PDF", description: err.message, variant: "destructive" });
    },
  });

  const cancelarNota = useMutation({
    mutationFn: async ({ id, tipo, payload }: { id: string; tipo: string; payload?: Record<string, unknown> }) => {
      const action = tipo === "NFe" ? "cancelar_nfe" : "cancelar_nfse";
      return callNuvemFiscal(action, { id, payload });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notas_fiscais"] });
      toast({ title: "Nota cancelada com sucesso" });
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao cancelar nota", description: err.message, variant: "destructive" });
    },
  });

  return {
    notas: notasQuery.data || [],
    isLoading: notasQuery.isLoading,
    emitirNFe,
    emitirNFSe,
    consultarNota,
    baixarPdf,
    cancelarNota,
  };
}
