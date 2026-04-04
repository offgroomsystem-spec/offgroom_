ALTER TABLE public.empresa_config ALTER COLUMN confirmacao_periodo_ativo SET DEFAULT true;
UPDATE public.empresa_config SET confirmacao_periodo_ativo = true WHERE confirmacao_periodo_ativo = false;