-- Adicionar coluna estoque_atual na tabela produtos
ALTER TABLE produtos 
ADD COLUMN estoque_atual numeric DEFAULT NULL;

COMMENT ON COLUMN produtos.estoque_atual IS 'Estoque manual ajustado pelo usuário. Se NULL, será calculado automaticamente (compras - vendas)';

-- Popular com estoque calculado atual baseado apenas em compras (vendas serão descontadas depois)
UPDATE produtos p
SET estoque_atual = COALESCE((
  SELECT SUM(quantidade)
  FROM compras_nf_itens
  WHERE produto_id = p.id
), 0);

-- Adicionar coluna quantidade na tabela lancamentos_financeiros_itens
ALTER TABLE lancamentos_financeiros_itens
ADD COLUMN quantidade numeric DEFAULT 1;

COMMENT ON COLUMN lancamentos_financeiros_itens.quantidade IS 'Quantidade de unidades vendidas do produto/serviço';

-- Atualizar registros existentes de vendas (assumindo quantidade = 1 para cada venda histórica)
UPDATE lancamentos_financeiros_itens
SET quantidade = 1
WHERE descricao2 = 'Venda';