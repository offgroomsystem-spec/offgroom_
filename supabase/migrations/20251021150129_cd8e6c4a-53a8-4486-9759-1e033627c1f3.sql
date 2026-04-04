-- Fix function search path mutable security issue
-- The handle_new_user function needs to have search_path set to prevent mutable search path vulnerabilities

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, nome_completo, email_hotmart, whatsapp)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'nome_completo', ''),
    COALESCE(new.raw_user_meta_data->>'email_hotmart', new.email),
    COALESCE(new.raw_user_meta_data->>'whatsapp', '')
  );
  RETURN new;
END;
$function$;

-- Recreate the trigger since we dropped the function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();