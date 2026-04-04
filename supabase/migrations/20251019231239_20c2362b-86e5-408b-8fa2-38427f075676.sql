-- Tabela de perfis de usuário vinculada ao auth.users
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome_completo TEXT NOT NULL,
  email_hotmart TEXT NOT NULL UNIQUE,
  whatsapp TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política: Usuário pode ler apenas seu próprio perfil
CREATE POLICY "Usuários podem ler seu próprio perfil"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Política: Usuário pode atualizar apenas seu próprio perfil
CREATE POLICY "Usuários podem atualizar seu próprio perfil"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política: Permitir inserção durante sign up
CREATE POLICY "Usuários podem inserir seu próprio perfil"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Função para criar perfil automaticamente após sign up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Trigger para executar a função após sign up
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Índices para performance
CREATE INDEX idx_profiles_email_hotmart ON public.profiles(email_hotmart);
CREATE INDEX idx_profiles_whatsapp ON public.profiles(whatsapp);

-- Tabela de Clientes
CREATE TABLE public.clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome_cliente TEXT NOT NULL,
  nome_pet TEXT NOT NULL,
  porte TEXT NOT NULL,
  raca TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  endereco TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver apenas seus próprios clientes"
  ON public.clientes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios clientes"
  ON public.clientes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios clientes"
  ON public.clientes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios clientes"
  ON public.clientes FOR DELETE
  USING (auth.uid() = user_id);

-- Tabela de Serviços
CREATE TABLE public.servicos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.servicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar seus próprios serviços"
  ON public.servicos FOR ALL
  USING (auth.uid() = user_id);

-- Tabela de Raças
CREATE TABLE public.racas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.racas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar suas próprias raças"
  ON public.racas FOR ALL
  USING (auth.uid() = user_id);

-- Tabela de Produtos
CREATE TABLE public.produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar seus próprios produtos"
  ON public.produtos FOR ALL
  USING (auth.uid() = user_id);

-- Tabela de Pacotes
CREATE TABLE public.pacotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  quantidade_servicos INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.pacotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar seus próprios pacotes"
  ON public.pacotes FOR ALL
  USING (auth.uid() = user_id);

-- Tabela de Agendamentos
CREATE TABLE public.agendamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  cliente TEXT NOT NULL,
  pet TEXT NOT NULL,
  raca TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  servico TEXT NOT NULL,
  data DATE NOT NULL,
  horario TIME NOT NULL,
  tempo_servico TEXT NOT NULL,
  horario_termino TIME NOT NULL,
  data_venda DATE NOT NULL,
  groomer TEXT NOT NULL,
  taxi_dog TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('confirmado', 'pendente', 'concluido', 'cancelado')),
  numero_servico_pacote TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar seus próprios agendamentos"
  ON public.agendamentos FOR ALL
  USING (auth.uid() = user_id);

-- Tabela de Contas Bancárias
CREATE TABLE public.contas_bancarias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  saldo DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contas_bancarias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar suas próprias contas"
  ON public.contas_bancarias FOR ALL
  USING (auth.uid() = user_id);

-- Tabela de Receitas
CREATE TABLE public.receitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  data DATE NOT NULL,
  conta_id UUID REFERENCES public.contas_bancarias(id) ON DELETE SET NULL,
  categoria TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.receitas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar suas próprias receitas"
  ON public.receitas FOR ALL
  USING (auth.uid() = user_id);

-- Tabela de Despesas
CREATE TABLE public.despesas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  descricao TEXT NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  data DATE NOT NULL,
  conta_id UUID REFERENCES public.contas_bancarias(id) ON DELETE SET NULL,
  categoria TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.despesas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar suas próprias despesas"
  ON public.despesas FOR ALL
  USING (auth.uid() = user_id);

-- Tabela de Configurações da Empresa
CREATE TABLE public.empresa_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome_empresa TEXT,
  telefone TEXT,
  endereco TEXT,
  bordao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.empresa_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem gerenciar sua própria configuração"
  ON public.empresa_config FOR ALL
  USING (auth.uid() = user_id);

-- Tabela de Assinaturas (preparação para Hotmart)
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  hotmart_transaction_id TEXT UNIQUE,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired', 'pending')) DEFAULT 'pending',
  plan_name TEXT NOT NULL,
  start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias assinaturas"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX idx_agendamentos_data ON public.agendamentos(data);
CREATE INDEX idx_agendamentos_user_id ON public.agendamentos(user_id);
CREATE INDEX idx_clientes_user_id ON public.clientes(user_id);
CREATE INDEX idx_servicos_user_id ON public.servicos(user_id);
CREATE INDEX idx_produtos_user_id ON public.produtos(user_id);
CREATE INDEX idx_pacotes_user_id ON public.pacotes(user_id);
CREATE INDEX idx_receitas_user_id ON public.receitas(user_id);
CREATE INDEX idx_receitas_data ON public.receitas(data);
CREATE INDEX idx_despesas_user_id ON public.despesas(user_id);
CREATE INDEX idx_despesas_data ON public.despesas(data);