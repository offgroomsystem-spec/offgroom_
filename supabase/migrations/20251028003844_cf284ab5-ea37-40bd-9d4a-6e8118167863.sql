-- Adicionar coluna dias_funcionamento na tabela empresa_config
ALTER TABLE empresa_config 
ADD COLUMN dias_funcionamento jsonb DEFAULT '{"segunda": true, "terca": true, "quarta": true, "quinta": true, "sexta": true, "sabado": false, "domingo": false}'::jsonb;