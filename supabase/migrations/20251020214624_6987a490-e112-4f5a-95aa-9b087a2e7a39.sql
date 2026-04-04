-- Migration: Create agendamentos table
CREATE TABLE IF NOT EXISTS public.agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cliente TEXT NOT NULL,
  pet TEXT NOT NULL,
  raca TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  servico TEXT NOT NULL,
  data DATE NOT NULL,
  horario TEXT NOT NULL,
  tempo_servico INTEGER NOT NULL,
  horario_termino TEXT NOT NULL,
  data_venda DATE NOT NULL,
  groomer TEXT NOT NULL,
  taxi_dog TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'agendado',
  numero_servico_pacote INTEGER,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create agendamentos_pacotes table
CREATE TABLE IF NOT EXISTS public.agendamentos_pacotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome_cliente TEXT NOT NULL,
  nome_pet TEXT NOT NULL,
  raca TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  nome_pacote TEXT NOT NULL,
  taxi_dog TEXT NOT NULL,
  data_venda DATE NOT NULL,
  servicos JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create lancamentos_financeiros table
CREATE TABLE IF NOT EXISTS public.lancamentos_financeiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ano TEXT NOT NULL,
  mes_competencia TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('Receita', 'Despesa')),
  descricao1 TEXT NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  observacao TEXT,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  data_pagamento DATE NOT NULL,
  conta_id UUID REFERENCES public.contas_bancarias(id) ON DELETE SET NULL,
  pago BOOLEAN NOT NULL DEFAULT false,
  data_cadastro TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create lancamentos_financeiros_itens table
CREATE TABLE IF NOT EXISTS public.lancamentos_financeiros_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lancamento_id UUID REFERENCES public.lancamentos_financeiros(id) ON DELETE CASCADE NOT NULL,
  descricao2 TEXT NOT NULL,
  produto_servico TEXT,
  valor NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agendamentos_user_id ON public.agendamentos(user_id);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data ON public.agendamentos(data);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON public.agendamentos(status);
CREATE INDEX IF NOT EXISTS idx_agendamentos_pacotes_user_id ON public.agendamentos_pacotes(user_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_user_id ON public.lancamentos_financeiros(user_id);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data_pagamento ON public.lancamentos_financeiros(data_pagamento);
CREATE INDEX IF NOT EXISTS idx_lancamentos_tipo ON public.lancamentos_financeiros(tipo);
CREATE INDEX IF NOT EXISTS idx_lancamentos_pago ON public.lancamentos_financeiros(pago);
CREATE INDEX IF NOT EXISTS idx_lancamentos_itens_lancamento_id ON public.lancamentos_financeiros_itens(lancamento_id);

-- Enable RLS
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos_pacotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_financeiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos_financeiros_itens ENABLE ROW LEVEL SECURITY;

-- RLS Policies for agendamentos
CREATE POLICY "Users can view own agendamentos"
ON public.agendamentos FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own agendamentos"
ON public.agendamentos FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agendamentos"
ON public.agendamentos FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own agendamentos"
ON public.agendamentos FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for agendamentos_pacotes
CREATE POLICY "Users can view own agendamentos_pacotes"
ON public.agendamentos_pacotes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own agendamentos_pacotes"
ON public.agendamentos_pacotes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own agendamentos_pacotes"
ON public.agendamentos_pacotes FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own agendamentos_pacotes"
ON public.agendamentos_pacotes FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for lancamentos_financeiros
CREATE POLICY "Users can view own financial entries"
ON public.lancamentos_financeiros FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own financial entries"
ON public.lancamentos_financeiros FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own financial entries"
ON public.lancamentos_financeiros FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own financial entries"
ON public.lancamentos_financeiros FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for lancamentos_financeiros_itens
CREATE POLICY "Users can view own financial entry items"
ON public.lancamentos_financeiros_itens FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.lancamentos_financeiros
    WHERE lancamentos_financeiros.id = lancamentos_financeiros_itens.lancamento_id
    AND lancamentos_financeiros.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert own financial entry items"
ON public.lancamentos_financeiros_itens FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.lancamentos_financeiros
    WHERE lancamentos_financeiros.id = lancamentos_financeiros_itens.lancamento_id
    AND lancamentos_financeiros.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update own financial entry items"
ON public.lancamentos_financeiros_itens FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.lancamentos_financeiros
    WHERE lancamentos_financeiros.id = lancamentos_financeiros_itens.lancamento_id
    AND lancamentos_financeiros.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete own financial entry items"
ON public.lancamentos_financeiros_itens FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.lancamentos_financeiros
    WHERE lancamentos_financeiros.id = lancamentos_financeiros_itens.lancamento_id
    AND lancamentos_financeiros.user_id = auth.uid()
  )
);

-- Functions for updated_at triggers
CREATE OR REPLACE FUNCTION public.update_agendamento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_agendamento_pacote_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_lancamento_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_agendamentos_updated_at
  BEFORE UPDATE ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agendamento_updated_at();

CREATE TRIGGER update_agendamentos_pacotes_updated_at
  BEFORE UPDATE ON public.agendamentos_pacotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agendamento_pacote_updated_at();

CREATE TRIGGER update_lancamentos_financeiros_updated_at
  BEFORE UPDATE ON public.lancamentos_financeiros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lancamento_updated_at();