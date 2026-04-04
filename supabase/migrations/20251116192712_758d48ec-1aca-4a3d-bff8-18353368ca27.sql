-- Criar tabela de fornecedores
CREATE TABLE public.fornecedores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  nome_fornecedor TEXT NOT NULL,
  cnpj_cpf TEXT NOT NULL,
  nome_fantasia TEXT,
  tipo_fornecedor TEXT NOT NULL,
  whatsapp TEXT,
  telefone TEXT,
  email TEXT,
  site TEXT,
  cep TEXT,
  rua TEXT,
  numero TEXT,
  complemento TEXT,
  bairro TEXT,
  cidade TEXT,
  estado TEXT,
  forma_pagamento TEXT,
  condicao_pagamento TEXT,
  banco TEXT,
  chave_pix TEXT,
  nome_titular TEXT,
  CONSTRAINT unique_cnpj_cpf_per_user UNIQUE (user_id, cnpj_cpf)
);

-- Habilitar RLS
ALTER TABLE public.fornecedores ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Usuários podem gerenciar seus próprios fornecedores"
  ON public.fornecedores
  FOR ALL
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_fornecedores_updated_at
  BEFORE UPDATE ON public.fornecedores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pets_updated_at();

-- Adicionar campos na tabela produtos para relacionamento com fornecedores
ALTER TABLE public.produtos 
ADD COLUMN IF NOT EXISTS fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS data_ultima_compra DATE;

-- Criar índice para melhor performance nas consultas
CREATE INDEX idx_produtos_fornecedor ON public.produtos(fornecedor_id);
CREATE INDEX idx_fornecedores_user ON public.fornecedores(user_id);
CREATE INDEX idx_fornecedores_tipo ON public.fornecedores(tipo_fornecedor);