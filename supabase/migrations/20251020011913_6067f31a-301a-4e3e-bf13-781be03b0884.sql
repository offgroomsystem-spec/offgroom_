-- Add porte column to racas table
ALTER TABLE public.racas ADD COLUMN IF NOT EXISTS porte text NOT NULL DEFAULT 'medio';