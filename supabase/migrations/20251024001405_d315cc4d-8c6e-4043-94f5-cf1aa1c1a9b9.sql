-- Criar tabela de pets
CREATE TABLE public.pets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cliente_id UUID NOT NULL,
  nome_pet TEXT NOT NULL,
  porte TEXT NOT NULL CHECK (porte IN ('pequeno', 'medio', 'grande')),
  raca TEXT NOT NULL,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela pets
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para pets
CREATE POLICY "Usuários podem ver seus próprios pets"
ON public.pets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios pets"
ON public.pets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios pets"
ON public.pets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios pets"
ON public.pets FOR DELETE
USING (auth.uid() = user_id);

-- Migrar dados existentes de clientes para pets
INSERT INTO public.pets (user_id, cliente_id, nome_pet, porte, raca, observacao)
SELECT 
  user_id,
  id as cliente_id,
  nome_pet,
  porte,
  raca,
  observacao
FROM public.clientes
WHERE nome_pet IS NOT NULL AND nome_pet != '';

-- Consolidar clientes duplicados usando ROW_NUMBER
WITH clientes_ranked AS (
  SELECT 
    id,
    nome_cliente,
    user_id,
    ROW_NUMBER() OVER (PARTITION BY nome_cliente, user_id ORDER BY created_at ASC) as rn
  FROM public.clientes
),
clientes_para_manter AS (
  SELECT id, nome_cliente, user_id
  FROM clientes_ranked
  WHERE rn = 1
),
clientes_para_remover AS (
  SELECT c1.id
  FROM clientes_ranked c1
  WHERE c1.rn > 1
)
-- Atualizar pets para apontar para o cliente mais antigo
UPDATE public.pets p
SET cliente_id = cpm.id
FROM clientes_para_remover cpr
CROSS JOIN LATERAL (
  SELECT id
  FROM clientes_para_manter
  WHERE clientes_para_manter.nome_cliente = (SELECT nome_cliente FROM public.clientes WHERE id = cpr.id)
    AND clientes_para_manter.user_id = (SELECT user_id FROM public.clientes WHERE id = cpr.id)
) cpm
WHERE p.cliente_id = cpr.id;

-- Deletar clientes duplicados (manter apenas o mais antigo)
WITH clientes_ranked AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY nome_cliente, user_id ORDER BY created_at ASC) as rn
  FROM public.clientes
)
DELETE FROM public.clientes
WHERE id IN (
  SELECT id FROM clientes_ranked WHERE rn > 1
);

-- Remover colunas de pet da tabela clientes
ALTER TABLE public.clientes DROP COLUMN IF EXISTS nome_pet;
ALTER TABLE public.clientes DROP COLUMN IF EXISTS porte;
ALTER TABLE public.clientes DROP COLUMN IF EXISTS raca;

-- Adicionar foreign key constraint
ALTER TABLE public.pets 
ADD CONSTRAINT pets_cliente_id_fkey 
FOREIGN KEY (cliente_id) 
REFERENCES public.clientes(id) 
ON DELETE CASCADE;

-- Trigger para atualizar updated_at em pets
CREATE OR REPLACE FUNCTION public.update_pets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_pets_updated_at
BEFORE UPDATE ON public.pets
FOR EACH ROW
EXECUTE FUNCTION public.update_pets_updated_at();