-- Adicionar coluna plano_ativo para mostrar o plano atual do usuário
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS plano_ativo TEXT DEFAULT 'Periodo Gratis';

-- Adicionar coluna pagamento_em_dia para mostrar status do pagamento
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS pagamento_em_dia TEXT DEFAULT 'Periodo Gratis Ativo';

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.profiles.plano_ativo IS 'Plano ativo do usuário: Periodo Gratis, Offgroom Flex, Offgroom Power 12';
COMMENT ON COLUMN public.profiles.pagamento_em_dia IS 'Status do pagamento: Sim, Nao, Periodo Gratis Ativo';