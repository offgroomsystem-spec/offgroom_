-- Adicionar colunas para controle do período grátis (Trial)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS periodo_gratis_dias INTEGER DEFAULT 30 NOT NULL,
ADD COLUMN IF NOT EXISTS data_inicio_periodo_gratis TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS data_fim_periodo_gratis TIMESTAMP WITH TIME ZONE;

-- Adicionar colunas para liberação manual temporária
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS dias_liberacao_extra INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS data_fim_liberacao_extra TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS liberacao_manual_ativa BOOLEAN DEFAULT FALSE NOT NULL;

-- Criar função para calcular datas de acesso automaticamente
CREATE OR REPLACE FUNCTION public.calculate_access_dates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Para INSERT: definir data_inicio_periodo_gratis como created_at se não definida
  IF TG_OP = 'INSERT' THEN
    IF NEW.data_inicio_periodo_gratis IS NULL THEN
      NEW.data_inicio_periodo_gratis := COALESCE(NEW.created_at, NOW());
    END IF;
  END IF;

  -- Calcular data_fim_periodo_gratis baseado em periodo_gratis_dias
  IF NEW.data_inicio_periodo_gratis IS NOT NULL THEN
    NEW.data_fim_periodo_gratis := NEW.data_inicio_periodo_gratis + 
      (NEW.periodo_gratis_dias || ' days')::INTERVAL;
  END IF;
  
  -- Calcular data_fim_liberacao_extra quando dias_liberacao_extra > 0
  IF NEW.dias_liberacao_extra > 0 THEN
    -- Se está sendo alterado (aumentado ou definido pela primeira vez)
    IF OLD IS NULL OR OLD.dias_liberacao_extra IS DISTINCT FROM NEW.dias_liberacao_extra THEN
      NEW.data_fim_liberacao_extra := NOW() + (NEW.dias_liberacao_extra || ' days')::INTERVAL;
    END IF;
    NEW.liberacao_manual_ativa := TRUE;
  ELSIF NEW.dias_liberacao_extra = 0 THEN
    -- Desativar liberação manual quando dias_liberacao_extra = 0
    IF OLD IS NOT NULL AND OLD.dias_liberacao_extra > 0 THEN
      NEW.liberacao_manual_ativa := FALSE;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para INSERT
DROP TRIGGER IF EXISTS calculate_access_dates_insert ON public.profiles;
CREATE TRIGGER calculate_access_dates_insert
  BEFORE INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_access_dates();

-- Criar trigger para UPDATE
DROP TRIGGER IF EXISTS calculate_access_dates_update ON public.profiles;
CREATE TRIGGER calculate_access_dates_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_access_dates();

-- Migrar dados existentes: preencher as novas colunas para usuários existentes
UPDATE public.profiles
SET 
  data_inicio_periodo_gratis = created_at,
  data_fim_periodo_gratis = COALESCE(
    trial_end_date,
    created_at + (periodo_gratis_dias || ' days')::INTERVAL
  ),
  periodo_gratis_dias = CASE 
    WHEN trial_end_date IS NOT NULL THEN 
      GREATEST(1, EXTRACT(DAY FROM (trial_end_date - created_at))::INTEGER)
    ELSE 30
  END
WHERE data_inicio_periodo_gratis IS NULL;