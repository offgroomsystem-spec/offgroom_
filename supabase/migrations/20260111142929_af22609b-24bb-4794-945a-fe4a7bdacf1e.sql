-- Tabela de leads do CRM
CREATE TABLE public.crm_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_empresa TEXT NOT NULL,
  nota_google NUMERIC,
  qtd_avaliacoes INTEGER,
  telefone_empresa TEXT NOT NULL,
  nome_dono TEXT,
  telefone_dono TEXT,
  tentativa INTEGER DEFAULT 1 CHECK (tentativa >= 1 AND tentativa <= 5),
  teve_resposta BOOLEAN DEFAULT false,
  agendou_reuniao BOOLEAN DEFAULT false,
  data_reuniao DATE,
  usando_acesso_gratis BOOLEAN DEFAULT false,
  dias_acesso_gratis INTEGER DEFAULT 30,
  data_inicio_acesso_gratis DATE,
  iniciou_acesso_pago BOOLEAN DEFAULT false,
  data_inicio_acesso_pago DATE,
  plano_contratado TEXT CHECK (plano_contratado IS NULL OR plano_contratado IN ('Offgroom Flex', 'Offgroom Power 12')),
  proximo_passo DATE,
  status TEXT DEFAULT 'Novo',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Tabela de mensagens do CRM
CREATE TABLE public.crm_mensagens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
  tentativa INTEGER NOT NULL,
  data_envio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  observacao TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela de usuários autorizados do CRM
CREATE TABLE public.crm_usuarios_autorizados (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Função para verificar se o usuário tem acesso ao CRM
CREATE OR REPLACE FUNCTION public.is_crm_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.crm_usuarios_autorizados
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
$$;

-- Enable RLS
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_usuarios_autorizados ENABLE ROW LEVEL SECURITY;

-- RLS Policies para crm_leads
CREATE POLICY "CRM users can view all leads"
ON public.crm_leads
FOR SELECT
USING (public.is_crm_user());

CREATE POLICY "CRM users can insert leads"
ON public.crm_leads
FOR INSERT
WITH CHECK (public.is_crm_user());

CREATE POLICY "CRM users can update leads"
ON public.crm_leads
FOR UPDATE
USING (public.is_crm_user());

CREATE POLICY "CRM users can delete leads"
ON public.crm_leads
FOR DELETE
USING (public.is_crm_user());

-- RLS Policies para crm_mensagens
CREATE POLICY "CRM users can view all messages"
ON public.crm_mensagens
FOR SELECT
USING (public.is_crm_user());

CREATE POLICY "CRM users can insert messages"
ON public.crm_mensagens
FOR INSERT
WITH CHECK (public.is_crm_user());

CREATE POLICY "CRM users can update messages"
ON public.crm_mensagens
FOR UPDATE
USING (public.is_crm_user());

CREATE POLICY "CRM users can delete messages"
ON public.crm_mensagens
FOR DELETE
USING (public.is_crm_user());

-- RLS Policies para crm_usuarios_autorizados (apenas admin pode gerenciar)
CREATE POLICY "Admins can manage authorized users"
ON public.crm_usuarios_autorizados
FOR ALL
USING (public.is_administrador(auth.uid()));

CREATE POLICY "CRM users can view authorized users"
ON public.crm_usuarios_autorizados
FOR SELECT
USING (public.is_crm_user());

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_crm_leads_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_crm_leads_updated_at
BEFORE UPDATE ON public.crm_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_crm_leads_updated_at();

-- Inserir usuários autorizados iniciais
INSERT INTO public.crm_usuarios_autorizados (email, nome) VALUES
('rodrygo.sv12@gmail.com', 'Rodrygo'),
('rodrygolindo2@gmail.com', 'Rodrygo Lindo');