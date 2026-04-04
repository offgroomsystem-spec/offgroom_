
-- Tabela para registrar notas fiscais emitidas
CREATE TABLE public.notas_fiscais (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  tipo text NOT NULL, -- 'NFe' ou 'NFSe'
  nuvem_fiscal_id text,
  numero text,
  serie text,
  status text NOT NULL DEFAULT 'processando', -- processando, autorizada, rejeitada, cancelada
  valor_total numeric NOT NULL DEFAULT 0,
  cliente_id uuid,
  cliente_nome text,
  cliente_documento text,
  agendamento_id uuid,
  lancamento_id uuid,
  dados_nfe jsonb,
  dados_nfse jsonb,
  mensagem_erro text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notas_fiscais ENABLE ROW LEVEL SECURITY;

-- RLS Policies usando get_effective_user_id
CREATE POLICY "Users can view own notas_fiscais"
  ON public.notas_fiscais FOR SELECT
  USING (user_id = get_effective_user_id(auth.uid()));

CREATE POLICY "Users can insert own notas_fiscais"
  ON public.notas_fiscais FOR INSERT
  WITH CHECK (user_id = get_effective_user_id(auth.uid()));

CREATE POLICY "Users can update own notas_fiscais"
  ON public.notas_fiscais FOR UPDATE
  USING (user_id = get_effective_user_id(auth.uid()));

CREATE POLICY "Users can delete own notas_fiscais"
  ON public.notas_fiscais FOR DELETE
  USING (user_id = get_effective_user_id(auth.uid()));

-- Trigger para updated_at
CREATE TRIGGER update_notas_fiscais_updated_at
  BEFORE UPDATE ON public.notas_fiscais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lancamento_updated_at();
