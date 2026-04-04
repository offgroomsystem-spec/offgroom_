-- Criar tabela de compras (notas fiscais)
CREATE TABLE public.compras_nf (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  chave_nf TEXT NOT NULL,
  fornecedor_id UUID REFERENCES public.fornecedores(id),
  data_compra DATE NOT NULL,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, chave_nf)
);

-- Criar tabela de itens da NF
CREATE TABLE public.compras_nf_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nf_id UUID NOT NULL REFERENCES public.compras_nf(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id),
  quantidade NUMERIC NOT NULL,
  valor_compra NUMERIC NOT NULL,
  data_validade DATE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.compras_nf ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compras_nf_itens ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para compras_nf
CREATE POLICY "Users can manage their own compras_nf"
ON public.compras_nf
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Políticas RLS para compras_nf_itens
CREATE POLICY "Users can view own compras_nf_itens"
ON public.compras_nf_itens
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.compras_nf
  WHERE compras_nf.id = compras_nf_itens.nf_id
  AND compras_nf.user_id = auth.uid()
));

CREATE POLICY "Users can insert own compras_nf_itens"
ON public.compras_nf_itens
FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM public.compras_nf
  WHERE compras_nf.id = compras_nf_itens.nf_id
  AND compras_nf.user_id = auth.uid()
));

CREATE POLICY "Users can update own compras_nf_itens"
ON public.compras_nf_itens
FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM public.compras_nf
  WHERE compras_nf.id = compras_nf_itens.nf_id
  AND compras_nf.user_id = auth.uid()
));

CREATE POLICY "Users can delete own compras_nf_itens"
ON public.compras_nf_itens
FOR DELETE
USING (EXISTS (
  SELECT 1 FROM public.compras_nf
  WHERE compras_nf.id = compras_nf_itens.nf_id
  AND compras_nf.user_id = auth.uid()
));

-- Criar índices para melhor performance
CREATE INDEX idx_compras_nf_user_id ON public.compras_nf(user_id);
CREATE INDEX idx_compras_nf_fornecedor_id ON public.compras_nf(fornecedor_id);
CREATE INDEX idx_compras_nf_data_compra ON public.compras_nf(data_compra);
CREATE INDEX idx_compras_nf_itens_nf_id ON public.compras_nf_itens(nf_id);
CREATE INDEX idx_compras_nf_itens_produto_id ON public.compras_nf_itens(produto_id);
CREATE INDEX idx_compras_nf_itens_data_validade ON public.compras_nf_itens(data_validade);

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION public.update_compras_nf_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.update_compras_nf_itens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers para atualizar updated_at automaticamente
CREATE TRIGGER update_compras_nf_updated_at
BEFORE UPDATE ON public.compras_nf
FOR EACH ROW
EXECUTE FUNCTION public.update_compras_nf_updated_at();

CREATE TRIGGER update_compras_nf_itens_updated_at
BEFORE UPDATE ON public.compras_nf_itens
FOR EACH ROW
EXECUTE FUNCTION public.update_compras_nf_itens_updated_at();