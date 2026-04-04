ALTER TABLE public.lancamentos_financeiros 
ADD COLUMN fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL;