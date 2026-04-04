-- Passo 1: Remover políticas que dependem do enum
DROP POLICY IF EXISTS "Only owners can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;
DROP POLICY IF EXISTS "Owners can manage staff permissions" ON staff_permissions;
DROP POLICY IF EXISTS "Staff can view own permissions" ON staff_permissions;

-- Passo 2: Remover função has_role que depende do enum
DROP FUNCTION IF EXISTS public.has_role(uuid, app_role);

-- Passo 3: Modificar enum app_role
ALTER TYPE app_role RENAME TO app_role_old;
CREATE TYPE app_role AS ENUM ('administrador', 'taxi_dog', 'recepcionista');

-- Passo 4: Atualizar user_roles para usar o novo enum
ALTER TABLE user_roles ALTER COLUMN role TYPE app_role USING 'administrador'::app_role;

-- Passo 5: Remover enum antigo
DROP TYPE app_role_old CASCADE;

-- Passo 6: Atualizar todos os usuários existentes para administrador
UPDATE user_roles SET role = 'administrador';

-- Passo 7: Atualizar staff_accounts
ALTER TABLE staff_accounts ADD COLUMN IF NOT EXISTS tipo_login app_role NOT NULL DEFAULT 'recepcionista';

-- Passo 8: Criar funções auxiliares com o novo enum
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_administrador(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
    AND role = 'administrador'
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_tipo_login(_user_id uuid)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Passo 9: Recriar políticas RLS
CREATE POLICY "Administradores podem gerenciar roles"
ON user_roles
FOR ALL
TO authenticated
USING (public.is_administrador(auth.uid()))
WITH CHECK (public.is_administrador(auth.uid()));

CREATE POLICY "Usuários podem ver suas próprias roles"
ON user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Políticas para staff_accounts
CREATE POLICY "Administradores podem gerenciar staff"
ON staff_accounts
FOR ALL
TO authenticated
USING (public.is_administrador(auth.uid()))
WITH CHECK (public.is_administrador(auth.uid()));

CREATE POLICY "Staff pode ver próprio registro"
ON staff_accounts
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Staff pode atualizar último acesso"
ON staff_accounts
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Passo 10: Função para tornar primeiro usuário administrador
CREATE OR REPLACE FUNCTION public.check_first_user_admin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (SELECT COUNT(*) FROM profiles) = 1 THEN
    INSERT INTO user_roles (user_id, role)
    VALUES (NEW.id, 'administrador')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

-- Passo 11: Criar trigger
DROP TRIGGER IF EXISTS ensure_first_user_admin ON profiles;
CREATE TRIGGER ensure_first_user_admin
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION check_first_user_admin();