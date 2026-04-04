-- Criar função que retorna o user_id efetivo (owner_id para staff, auth.uid() para admins)
CREATE OR REPLACE FUNCTION public.get_effective_user_id(_auth_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT owner_id FROM staff_accounts WHERE user_id = _auth_user_id),
    _auth_user_id
  )
$$;

-- Atualizar RLS policies para clientes
DROP POLICY IF EXISTS "Usuários podem ver apenas seus próprios clientes" ON clientes;
DROP POLICY IF EXISTS "Usuários podem inserir seus próprios clientes" ON clientes;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios clientes" ON clientes;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios clientes" ON clientes;

CREATE POLICY "Usuários podem ver apenas seus próprios clientes" ON clientes
  FOR SELECT USING (user_id = get_effective_user_id(auth.uid()));

CREATE POLICY "Usuários podem inserir seus próprios clientes" ON clientes
  FOR INSERT WITH CHECK (user_id = get_effective_user_id(auth.uid()));

CREATE POLICY "Usuários podem atualizar seus próprios clientes" ON clientes
  FOR UPDATE USING (user_id = get_effective_user_id(auth.uid()));

CREATE POLICY "Usuários podem deletar seus próprios clientes" ON clientes
  FOR DELETE USING (user_id = get_effective_user_id(auth.uid()));

-- Atualizar RLS policies para pets
DROP POLICY IF EXISTS "Usuários podem ver seus próprios pets" ON pets;
DROP POLICY IF EXISTS "Usuários podem inserir seus próprios pets" ON pets;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios pets" ON pets;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios pets" ON pets;

CREATE POLICY "Usuários podem ver seus próprios pets" ON pets
  FOR SELECT USING (user_id = get_effective_user_id(auth.uid()));

CREATE POLICY "Usuários podem inserir seus próprios pets" ON pets
  FOR INSERT WITH CHECK (user_id = get_effective_user_id(auth.uid()));

CREATE POLICY "Usuários podem atualizar seus próprios pets" ON pets
  FOR UPDATE USING (user_id = get_effective_user_id(auth.uid()));

CREATE POLICY "Usuários podem deletar seus próprios pets" ON pets
  FOR DELETE USING (user_id = get_effective_user_id(auth.uid()));

-- Atualizar RLS policies para agendamentos
DROP POLICY IF EXISTS "Users can view own agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "Users can insert own agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "Users can update own agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "Users can delete own agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "Usuários podem gerenciar seus próprios agendamentos" ON agendamentos;

CREATE POLICY "Users can view own agendamentos" ON agendamentos
  FOR SELECT USING (user_id = get_effective_user_id(auth.uid()));

CREATE POLICY "Users can insert own agendamentos" ON agendamentos
  FOR INSERT WITH CHECK (user_id = get_effective_user_id(auth.uid()));

CREATE POLICY "Users can update own agendamentos" ON agendamentos
  FOR UPDATE USING (user_id = get_effective_user_id(auth.uid()))
  WITH CHECK (user_id = get_effective_user_id(auth.uid()));

CREATE POLICY "Users can delete own agendamentos" ON agendamentos
  FOR DELETE USING (user_id = get_effective_user_id(auth.uid()));

-- Atualizar RLS policies para servicos
DROP POLICY IF EXISTS "Usuários podem gerenciar seus próprios serviços" ON servicos;

CREATE POLICY "Usuários podem gerenciar seus próprios serviços" ON servicos
  FOR ALL USING (user_id = get_effective_user_id(auth.uid()));

-- Atualizar RLS policies para produtos
DROP POLICY IF EXISTS "Usuários podem gerenciar seus próprios produtos" ON produtos;

CREATE POLICY "Usuários podem gerenciar seus próprios produtos" ON produtos
  FOR ALL USING (user_id = get_effective_user_id(auth.uid()));

-- Atualizar RLS policies para racas
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias raças" ON racas;

CREATE POLICY "Usuários podem gerenciar suas próprias raças" ON racas
  FOR ALL USING (user_id = get_effective_user_id(auth.uid()));

-- Atualizar RLS policies para pacotes
DROP POLICY IF EXISTS "Usuários podem gerenciar seus próprios pacotes" ON pacotes;

CREATE POLICY "Usuários podem gerenciar seus próprios pacotes" ON pacotes
  FOR ALL USING (user_id = get_effective_user_id(auth.uid()));

-- Atualizar RLS policies para lancamentos_financeiros
DROP POLICY IF EXISTS "Users can view own financial entries" ON lancamentos_financeiros;
DROP POLICY IF EXISTS "Users can insert own financial entries" ON lancamentos_financeiros;
DROP POLICY IF EXISTS "Users can update own financial entries" ON lancamentos_financeiros;
DROP POLICY IF EXISTS "Users can delete own financial entries" ON lancamentos_financeiros;

CREATE POLICY "Users can view own financial entries" ON lancamentos_financeiros
  FOR SELECT USING (user_id = get_effective_user_id(auth.uid()));

CREATE POLICY "Users can insert own financial entries" ON lancamentos_financeiros
  FOR INSERT WITH CHECK (user_id = get_effective_user_id(auth.uid()));

CREATE POLICY "Users can update own financial entries" ON lancamentos_financeiros
  FOR UPDATE USING (user_id = get_effective_user_id(auth.uid()))
  WITH CHECK (user_id = get_effective_user_id(auth.uid()));

CREATE POLICY "Users can delete own financial entries" ON lancamentos_financeiros
  FOR DELETE USING (user_id = get_effective_user_id(auth.uid()));

-- Atualizar RLS policies para lancamentos_financeiros_itens
DROP POLICY IF EXISTS "Users can view own financial entry items" ON lancamentos_financeiros_itens;
DROP POLICY IF EXISTS "Users can insert own financial entry items" ON lancamentos_financeiros_itens;
DROP POLICY IF EXISTS "Users can update own financial entry items" ON lancamentos_financeiros_itens;
DROP POLICY IF EXISTS "Users can delete own financial entry items" ON lancamentos_financeiros_itens;

CREATE POLICY "Users can view own financial entry items" ON lancamentos_financeiros_itens
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM lancamentos_financeiros
    WHERE lancamentos_financeiros.id = lancamentos_financeiros_itens.lancamento_id
    AND lancamentos_financeiros.user_id = get_effective_user_id(auth.uid())
  ));

CREATE POLICY "Users can insert own financial entry items" ON lancamentos_financeiros_itens
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM lancamentos_financeiros
    WHERE lancamentos_financeiros.id = lancamentos_financeiros_itens.lancamento_id
    AND lancamentos_financeiros.user_id = get_effective_user_id(auth.uid())
  ));

CREATE POLICY "Users can update own financial entry items" ON lancamentos_financeiros_itens
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM lancamentos_financeiros
    WHERE lancamentos_financeiros.id = lancamentos_financeiros_itens.lancamento_id
    AND lancamentos_financeiros.user_id = get_effective_user_id(auth.uid())
  ));

CREATE POLICY "Users can delete own financial entry items" ON lancamentos_financeiros_itens
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM lancamentos_financeiros
    WHERE lancamentos_financeiros.id = lancamentos_financeiros_itens.lancamento_id
    AND lancamentos_financeiros.user_id = get_effective_user_id(auth.uid())
  ));

-- Atualizar RLS policies para contas_bancarias
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias contas" ON contas_bancarias;

CREATE POLICY "Usuários podem gerenciar suas próprias contas" ON contas_bancarias
  FOR ALL USING (user_id = get_effective_user_id(auth.uid()));

-- Atualizar RLS policies para empresa_config
DROP POLICY IF EXISTS "Usuários podem gerenciar sua própria configuração" ON empresa_config;

CREATE POLICY "Usuários podem gerenciar sua própria configuração" ON empresa_config
  FOR ALL USING (user_id = get_effective_user_id(auth.uid()));

-- Atualizar RLS policies para groomers
DROP POLICY IF EXISTS "Users can manage their own groomers" ON groomers;

CREATE POLICY "Users can manage their own groomers" ON groomers
  FOR ALL USING (user_id = get_effective_user_id(auth.uid()))
  WITH CHECK (user_id = get_effective_user_id(auth.uid()));

-- Atualizar RLS policies para fornecedores
DROP POLICY IF EXISTS "Usuários podem gerenciar seus próprios fornecedores" ON fornecedores;

CREATE POLICY "Usuários podem gerenciar seus próprios fornecedores" ON fornecedores
  FOR ALL USING (user_id = get_effective_user_id(auth.uid()));

-- Atualizar RLS policies para compras_nf
DROP POLICY IF EXISTS "Users can manage their own compras_nf" ON compras_nf;

CREATE POLICY "Users can manage their own compras_nf" ON compras_nf
  FOR ALL USING (user_id = get_effective_user_id(auth.uid()))
  WITH CHECK (user_id = get_effective_user_id(auth.uid()));

-- Atualizar RLS policies para compras_nf_itens
DROP POLICY IF EXISTS "Users can view own compras_nf_itens" ON compras_nf_itens;
DROP POLICY IF EXISTS "Users can insert own compras_nf_itens" ON compras_nf_itens;
DROP POLICY IF EXISTS "Users can update own compras_nf_itens" ON compras_nf_itens;
DROP POLICY IF EXISTS "Users can delete own compras_nf_itens" ON compras_nf_itens;

CREATE POLICY "Users can view own compras_nf_itens" ON compras_nf_itens
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM compras_nf
    WHERE compras_nf.id = compras_nf_itens.nf_id
    AND compras_nf.user_id = get_effective_user_id(auth.uid())
  ));

CREATE POLICY "Users can insert own compras_nf_itens" ON compras_nf_itens
  FOR INSERT WITH CHECK (EXISTS (
    SELECT 1 FROM compras_nf
    WHERE compras_nf.id = compras_nf_itens.nf_id
    AND compras_nf.user_id = get_effective_user_id(auth.uid())
  ));

CREATE POLICY "Users can update own compras_nf_itens" ON compras_nf_itens
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM compras_nf
    WHERE compras_nf.id = compras_nf_itens.nf_id
    AND compras_nf.user_id = get_effective_user_id(auth.uid())
  ));

CREATE POLICY "Users can delete own compras_nf_itens" ON compras_nf_itens
  FOR DELETE USING (EXISTS (
    SELECT 1 FROM compras_nf
    WHERE compras_nf.id = compras_nf_itens.nf_id
    AND compras_nf.user_id = get_effective_user_id(auth.uid())
  ));

-- Atualizar RLS policies para receitas
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias receitas" ON receitas;

CREATE POLICY "Usuários podem gerenciar suas próprias receitas" ON receitas
  FOR ALL USING (user_id = get_effective_user_id(auth.uid()));

-- Atualizar RLS policies para despesas
DROP POLICY IF EXISTS "Usuários podem gerenciar suas próprias despesas" ON despesas;

CREATE POLICY "Usuários podem gerenciar suas próprias despesas" ON despesas
  FOR ALL USING (user_id = get_effective_user_id(auth.uid()));

-- Atualizar RLS policies para agendamentos_pacotes
DROP POLICY IF EXISTS "Users can view own agendamentos_pacotes" ON agendamentos_pacotes;
DROP POLICY IF EXISTS "Users can insert own agendamentos_pacotes" ON agendamentos_pacotes;
DROP POLICY IF EXISTS "Users can update own agendamentos_pacotes" ON agendamentos_pacotes;
DROP POLICY IF EXISTS "Users can delete own agendamentos_pacotes" ON agendamentos_pacotes;

CREATE POLICY "Users can view own agendamentos_pacotes" ON agendamentos_pacotes
  FOR SELECT USING (user_id = get_effective_user_id(auth.uid()));

CREATE POLICY "Users can insert own agendamentos_pacotes" ON agendamentos_pacotes
  FOR INSERT WITH CHECK (user_id = get_effective_user_id(auth.uid()));

CREATE POLICY "Users can update own agendamentos_pacotes" ON agendamentos_pacotes
  FOR UPDATE USING (user_id = get_effective_user_id(auth.uid()))
  WITH CHECK (user_id = get_effective_user_id(auth.uid()));

CREATE POLICY "Users can delete own agendamentos_pacotes" ON agendamentos_pacotes
  FOR DELETE USING (user_id = get_effective_user_id(auth.uid()));