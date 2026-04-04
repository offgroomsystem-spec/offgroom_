-- Add agendamento_id column to link financial entries to appointments
ALTER TABLE public.lancamentos_financeiros
ADD COLUMN agendamento_id uuid REFERENCES public.agendamentos(id) ON DELETE SET NULL;

-- Create unique index to prevent duplicate financial entries for the same appointment
-- NULL values are allowed (for manual entries) and don't conflict
CREATE UNIQUE INDEX idx_lancamentos_agendamento_unique 
ON public.lancamentos_financeiros(agendamento_id) 
WHERE agendamento_id IS NOT NULL;