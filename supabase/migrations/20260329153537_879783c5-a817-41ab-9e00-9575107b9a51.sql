
CREATE TABLE public.servicos_creche (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL DEFAULT 'creche',
  modelo_preco TEXT NOT NULL DEFAULT 'unico',
  valor_unico NUMERIC DEFAULT 0,
  valor_pequeno NUMERIC DEFAULT 0,
  valor_medio NUMERIC DEFAULT 0,
  valor_grande NUMERIC DEFAULT 0,
  is_padrao BOOLEAN NOT NULL DEFAULT false,
  is_opcional BOOLEAN NOT NULL DEFAULT true,
  observacoes_internas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.servicos_creche ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own servicos_creche"
  ON public.servicos_creche
  FOR ALL
  TO public
  USING (user_id = get_effective_user_id(auth.uid()))
  WITH CHECK (user_id = get_effective_user_id(auth.uid()));

CREATE TRIGGER update_servicos_creche_updated_at
  BEFORE UPDATE ON public.servicos_creche
  FOR EACH ROW
  EXECUTE FUNCTION update_creche_estadia_updated_at();
