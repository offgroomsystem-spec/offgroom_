
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_agendamento_tipo_active
ON public.whatsapp_mensagens_agendadas (agendamento_id, tipo_mensagem)
WHERE agendamento_id IS NOT NULL
  AND status IN ('pendente', 'processando', 'enviado');

CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pacote_servico_tipo_active
ON public.whatsapp_mensagens_agendadas (agendamento_pacote_id, servico_numero, tipo_mensagem)
WHERE agendamento_pacote_id IS NOT NULL
  AND status IN ('pendente', 'processando', 'enviado');
