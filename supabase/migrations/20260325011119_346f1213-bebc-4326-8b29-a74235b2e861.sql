CREATE TABLE public.whatsapp_mensagens_risco (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  pets_incluidos jsonb NOT NULL DEFAULT '[]'::jsonb,
  mensagem text,
  numero_whatsapp text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  agendado_para timestamptz NOT NULL DEFAULT now(),
  enviado_em timestamptz,
  erro text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.whatsapp_mensagens_risco ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access whatsapp risco"
  ON public.whatsapp_mensagens_risco
  FOR ALL
  TO public
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Users can manage own whatsapp risco messages"
  ON public.whatsapp_mensagens_risco
  FOR ALL
  TO public
  USING (user_id = get_effective_user_id(auth.uid()))
  WITH CHECK (user_id = get_effective_user_id(auth.uid()));