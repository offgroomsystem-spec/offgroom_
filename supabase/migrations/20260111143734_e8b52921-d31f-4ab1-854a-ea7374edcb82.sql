-- Adicionar campo fase na tabela crm_mensagens para rastrear a fase do lead no momento do envio
ALTER TABLE public.crm_mensagens 
ADD COLUMN fase TEXT DEFAULT 'prospecao';

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.crm_mensagens.fase IS 'Fase do lead no momento do envio: prospecao, acesso_gratis, acesso_pago';