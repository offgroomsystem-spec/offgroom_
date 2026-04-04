-- Adicionar coluna login_count na tabela profiles para controle de onboarding
ALTER TABLE public.profiles 
ADD COLUMN login_count integer DEFAULT 0 NOT NULL;