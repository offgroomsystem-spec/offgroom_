
CREATE TABLE public.comissoes_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ativo BOOLEAN NOT NULL DEFAULT false,
  modelo TEXT NOT NULL DEFAULT 'groomer',
  comissao_faturamento NUMERIC DEFAULT 0,
  comissao_atendimento NUMERIC DEFAULT 0,
  bonus_meta NUMERIC DEFAULT 0,
  comissoes_groomers JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.comissoes_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own comissoes_config"
  ON public.comissoes_config
  FOR ALL
  TO public
  USING (user_id = get_effective_user_id(auth.uid()))
  WITH CHECK (user_id = get_effective_user_id(auth.uid()));
