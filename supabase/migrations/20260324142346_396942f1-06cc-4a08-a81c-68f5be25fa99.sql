ALTER TABLE public.lancamentos_financeiros
ADD COLUMN valor_juros numeric DEFAULT 0,
ADD COLUMN tipo_juros text,
ADD COLUMN modo_ajuste text DEFAULT 'deducao';