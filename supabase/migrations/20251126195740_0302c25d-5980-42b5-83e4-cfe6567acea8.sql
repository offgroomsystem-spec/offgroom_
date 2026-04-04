-- Remover o trigger antigo que cria roles automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Criar nova versão do trigger que APENAS cria o perfil, sem roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles only (no automatic role assignment)
  INSERT INTO public.profiles (id, nome_completo, email_hotmart, whatsapp)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nome_completo', ''),
    COALESCE(new.raw_user_meta_data->>'email_hotmart', new.email),
    COALESCE(new.raw_user_meta_data->>'whatsapp', '')
  );
  
  RETURN new;
END;
$$;

-- Recriar o trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Manter o trigger que verifica se é o primeiro usuário e atribui admin
-- Este trigger só age no primeiro perfil criado
CREATE OR REPLACE FUNCTION public.check_first_user_admin()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se for o primeiro usuário do sistema, criar role de administrador
  IF (SELECT COUNT(*) FROM profiles) = 1 THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.id, 'administrador')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_first_user_admin ON profiles;
CREATE TRIGGER ensure_first_user_admin
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_first_user_admin();