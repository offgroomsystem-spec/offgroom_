ALTER TABLE public.creche_estadias 
ADD COLUMN modelo_preco text NOT NULL DEFAULT 'unico',
ADD COLUMN modelo_cobranca text NULL;