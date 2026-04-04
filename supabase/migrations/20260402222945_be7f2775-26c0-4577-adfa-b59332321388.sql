
CREATE TABLE public.pacotes_creche (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'creche',
  servicos_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  desconto_percentual NUMERIC NOT NULL DEFAULT 0,
  desconto_valor NUMERIC NOT NULL DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  valor_final NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.pacotes_creche ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own pacotes_creche"
  ON public.pacotes_creche
  FOR ALL
  TO public
  USING (user_id = get_effective_user_id(auth.uid()))
  WITH CHECK (user_id = get_effective_user_id(auth.uid()));
