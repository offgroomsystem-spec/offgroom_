ALTER TABLE empresa_config
  ADD COLUMN IF NOT EXISTS evolution_instance_name text,
  ADD COLUMN IF NOT EXISTS evolution_auto_send boolean DEFAULT false;