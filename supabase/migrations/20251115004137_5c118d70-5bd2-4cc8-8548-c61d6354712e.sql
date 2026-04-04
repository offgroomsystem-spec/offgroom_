-- Adicionar colunas na tabela servicos
ALTER TABLE servicos ADD COLUMN porte TEXT NOT NULL DEFAULT 'Pequeno';
ALTER TABLE servicos ADD COLUMN raca TEXT NOT NULL DEFAULT '';

-- Remover defaults para forçar preenchimento em novos cadastros
ALTER TABLE servicos ALTER COLUMN porte DROP DEFAULT;
ALTER TABLE servicos ALTER COLUMN raca DROP DEFAULT;

-- Adicionar colunas na tabela pacotes
ALTER TABLE pacotes ADD COLUMN porte TEXT NOT NULL DEFAULT 'Pequeno';
ALTER TABLE pacotes ADD COLUMN raca TEXT NOT NULL DEFAULT '';

-- Remover defaults para forçar preenchimento em novos cadastros
ALTER TABLE pacotes ALTER COLUMN porte DROP DEFAULT;
ALTER TABLE pacotes ALTER COLUMN raca DROP DEFAULT;