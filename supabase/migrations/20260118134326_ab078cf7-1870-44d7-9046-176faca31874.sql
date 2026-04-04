-- Adicionar coluna email na tabela subscriptions
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS customer_email TEXT;

-- Adicionar constraint UNIQUE para stripe_subscription_id (necessário para upsert)
ALTER TABLE public.subscriptions ADD CONSTRAINT subscriptions_stripe_subscription_id_unique 
UNIQUE (stripe_subscription_id);

-- Atualizar o email da cliente existente
UPDATE public.subscriptions 
SET customer_email = 'eixospetcare@gmail.com' 
WHERE stripe_subscription_id = 'sub_1SmvyeKHKMPhWHpBPhia6RPh';

-- CORREÇÃO IMEDIATA: Atualizar perfil da cliente com dados corretos
UPDATE public.profiles 
SET plano_ativo = 'Offgroom Flex', 
    pagamento_em_dia = 'Sim',
    updated_at = now()
WHERE email_hotmart = 'eixospetcare@gmail.com';

-- Criar função para sincronização automática
CREATE OR REPLACE FUNCTION public.sync_profile_subscription_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles
  SET 
    plano_ativo = NEW.plan_name,
    pagamento_em_dia = CASE 
      WHEN NEW.is_active = true THEN 'Sim'
      ELSE 'Nao'
    END,
    updated_at = now()
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$;

-- Criar trigger para sincronização automática
CREATE TRIGGER on_subscription_update
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_profile_subscription_status();