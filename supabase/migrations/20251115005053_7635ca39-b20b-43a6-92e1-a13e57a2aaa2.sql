-- Tornar o campo raca nullable nas tabelas servicos e pacotes
ALTER TABLE servicos ALTER COLUMN raca DROP NOT NULL;
ALTER TABLE pacotes ALTER COLUMN raca DROP NOT NULL;