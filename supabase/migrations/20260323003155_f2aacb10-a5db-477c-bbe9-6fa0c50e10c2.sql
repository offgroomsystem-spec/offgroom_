
CREATE TABLE public.whatsapp_mensagens_agendadas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  agendamento_id uuid,
  agendamento_pacote_id uuid,
  servico_numero text,
  tipo_mensagem text NOT NULL,
  status text NOT NULL DEFAULT 'pendente',
  mensagem text,
  numero_whatsapp text NOT NULL,
  agendado_para timestamptz NOT NULL,
  enviado_em timestamptz,
  erro text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.whatsapp_mensagens_agendadas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own whatsapp messages"
  ON public.whatsapp_mensagens_agendadas FOR ALL TO public
  USING (user_id = get_effective_user_id(auth.uid()))
  WITH CHECK (user_id = get_effective_user_id(auth.uid()));

CREATE POLICY "Service role full access whatsapp messages"
  ON public.whatsapp_mensagens_agendadas FOR ALL TO public
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);
