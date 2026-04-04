
CREATE OR REPLACE FUNCTION public.cancel_risk_messages_on_new_appointment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Cancel all pending risk messages for this client
  IF NEW.cliente_id IS NOT NULL THEN
    UPDATE public.whatsapp_mensagens_risco
    SET status = 'cancelado'
    WHERE cliente_id = NEW.cliente_id
      AND status = 'pendente';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_agendamento_cancel_risk_messages
  AFTER INSERT ON public.agendamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.cancel_risk_messages_on_new_appointment();
