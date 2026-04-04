-- Adicionar campo para armazenar múltiplos pet IDs em cada lançamento financeiro
ALTER TABLE lancamentos_financeiros 
ADD COLUMN pet_ids jsonb DEFAULT '[]'::jsonb;

-- Criar índice para melhorar performance de busca por pet
CREATE INDEX idx_lancamentos_pet_ids ON lancamentos_financeiros USING GIN (pet_ids);