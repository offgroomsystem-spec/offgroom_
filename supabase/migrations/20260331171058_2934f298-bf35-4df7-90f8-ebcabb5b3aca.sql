
-- Trigger for agendamentos_pacotes: cancel risk messages when a package appointment is created
CREATE OR REPLACE FUNCTION public.cancel_risk_messages_on_new_pacote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id uuid;
BEGIN
  -- Find the client ID by matching nome_cliente and user_id
  SELECT id INTO v_cliente_id
  FROM public.clientes
  WHERE nome_cliente = NEW.nome_cliente
    AND user_id = NEW.user_id
  LIMIT 1;

  IF v_cliente_id IS NOT NULL THEN
    UPDATE public.whatsapp_mensagens_risco
    SET status = 'cancelado'
    WHERE cliente_id = v_cliente_id
      AND status = 'pendente';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_pacote_cancel_risk_messages
  AFTER INSERT ON public.agendamentos_pacotes
  FOR EACH ROW
  EXECUTE FUNCTION public.cancel_risk_messages_on_new_pacote();

-- Also fire on agendamento UPDATE/DELETE so frontend refreshes (realtime picks it up)
-- No additional trigger needed - realtime already listens to all events on agendamentos
