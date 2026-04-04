-- Adicionar nova coluna para múltiplos serviços (JSON array)
ALTER TABLE public.agendamentos ADD COLUMN servicos jsonb DEFAULT '[]'::jsonb;

-- Migrar dados existentes (converter serviço único para array com nome e valor)
UPDATE public.agendamentos 
SET servicos = jsonb_build_array(jsonb_build_object('nome', servico, 'valor', 0))
WHERE servico IS NOT NULL AND servico != '' AND (servicos IS NULL OR servicos = '[]'::jsonb);