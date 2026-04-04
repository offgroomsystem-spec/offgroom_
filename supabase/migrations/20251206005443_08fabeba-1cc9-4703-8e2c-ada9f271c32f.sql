-- Add trial_end_date column to profiles table for manual override of trial periods
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS trial_end_date timestamp with time zone DEFAULT NULL;

COMMENT ON COLUMN public.profiles.trial_end_date IS 
'Data de término do período de teste. Quando NULL, usa cálculo padrão (created_at + 30 dias). Quando definido, permite override manual.';