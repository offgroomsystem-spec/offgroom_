-- Add estoque_minimo column to produtos table
ALTER TABLE produtos 
ADD COLUMN estoque_minimo integer DEFAULT 0 NOT NULL;