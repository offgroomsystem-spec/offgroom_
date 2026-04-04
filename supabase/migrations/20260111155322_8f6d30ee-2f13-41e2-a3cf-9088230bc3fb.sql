-- Remover constraint antiga e adicionar nova permitindo tentativa >= 0
ALTER TABLE crm_leads DROP CONSTRAINT IF EXISTS crm_leads_tentativa_check;
ALTER TABLE crm_leads ADD CONSTRAINT crm_leads_tentativa_check CHECK (tentativa >= 0 AND tentativa <= 5);