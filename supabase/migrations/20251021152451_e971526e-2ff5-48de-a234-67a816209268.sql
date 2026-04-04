-- Fix remaining function search path mutable security issues
-- All trigger functions need search_path set

DROP FUNCTION IF EXISTS public.update_agendamento_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_agendamento_pacote_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_lancamento_updated_at() CASCADE;

CREATE OR REPLACE FUNCTION public.update_agendamento_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_agendamento_pacote_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_lancamento_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Recreate triggers
CREATE TRIGGER update_agendamentos_updated_at
  BEFORE UPDATE ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agendamento_updated_at();

CREATE TRIGGER update_agendamentos_pacotes_updated_at
  BEFORE UPDATE ON public.agendamentos_pacotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_agendamento_pacote_updated_at();

CREATE TRIGGER update_lancamentos_updated_at
  BEFORE UPDATE ON public.lancamentos_financeiros
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lancamento_updated_at();