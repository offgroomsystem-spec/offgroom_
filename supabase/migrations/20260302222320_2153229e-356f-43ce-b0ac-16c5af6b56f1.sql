
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS danfe_pdf_base64 text;
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS danfe_pdf_cached_at timestamptz;
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS email_enviado boolean DEFAULT false;
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS chave_acesso text;
ALTER TABLE public.notas_fiscais ADD COLUMN IF NOT EXISTS protocolo_autorizacao text;
