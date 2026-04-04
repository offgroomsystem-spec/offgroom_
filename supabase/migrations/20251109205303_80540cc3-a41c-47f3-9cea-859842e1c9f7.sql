-- Adicionar campos de dedução na tabela lancamentos_financeiros
ALTER TABLE lancamentos_financeiros 
ADD COLUMN valor_deducao numeric DEFAULT 0,
ADD COLUMN tipo_deducao text;