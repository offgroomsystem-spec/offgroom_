-- Adicionar coluna meta_faturamento_mensal na tabela empresa_config
ALTER TABLE empresa_config 
ADD COLUMN meta_faturamento_mensal numeric DEFAULT 10000;

-- Atualizar registros existentes que ainda não possuem valor
UPDATE empresa_config 
SET meta_faturamento_mensal = 10000 
WHERE meta_faturamento_mensal IS NULL;