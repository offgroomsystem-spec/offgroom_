ALTER TABLE public.empresa_config
  ADD COLUMN IF NOT EXISTS confirmacao_periodo_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmacao_24h boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmacao_15h boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confirmacao_3h boolean NOT NULL DEFAULT true;