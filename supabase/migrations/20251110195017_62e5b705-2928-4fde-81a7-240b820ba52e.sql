-- Permitir valor zero em despesas
ALTER TABLE despesas DROP CONSTRAINT IF EXISTS despesas_valor_positivo;
ALTER TABLE despesas ADD CONSTRAINT despesas_valor_positivo CHECK (valor >= 0);