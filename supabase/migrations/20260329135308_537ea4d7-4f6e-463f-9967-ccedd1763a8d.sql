
-- Tabela principal de estadias (creche/hotel)
CREATE TABLE public.creche_estadias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  pet_id UUID REFERENCES public.pets(id) ON DELETE CASCADE NOT NULL,
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'creche', -- 'creche' ou 'hotel'
  data_entrada DATE NOT NULL,
  hora_entrada TIME NOT NULL,
  data_saida_prevista DATE,
  hora_saida_prevista TIME,
  data_saida DATE,
  hora_saida TIME,
  status TEXT NOT NULL DEFAULT 'ativo', -- 'ativo', 'finalizado', 'cancelado'
  observacoes_entrada TEXT,
  observacoes_saida TEXT,
  checklist_entrada JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.creche_estadias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own creche_estadias"
  ON public.creche_estadias FOR ALL
  USING (user_id = get_effective_user_id(auth.uid()))
  WITH CHECK (user_id = get_effective_user_id(auth.uid()));

-- Tabela de registros diários durante a estadia
CREATE TABLE public.creche_registros_diarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  estadia_id UUID REFERENCES public.creche_estadias(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  data_registro DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_registro TIME NOT NULL DEFAULT CURRENT_TIME,
  comeu BOOLEAN DEFAULT false,
  bebeu_agua BOOLEAN DEFAULT false,
  brincou BOOLEAN DEFAULT false,
  interagiu_bem BOOLEAN DEFAULT false,
  brigas BOOLEAN DEFAULT false,
  fez_necessidades BOOLEAN DEFAULT false,
  sinais_doenca BOOLEAN DEFAULT false,
  pulgas_carrapatos BOOLEAN DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.creche_registros_diarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own creche_registros"
  ON public.creche_registros_diarios FOR ALL
  USING (user_id = get_effective_user_id(auth.uid()))
  WITH CHECK (user_id = get_effective_user_id(auth.uid()));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_creche_estadia_updated_at()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_creche_estadias_updated_at
  BEFORE UPDATE ON public.creche_estadias
  FOR EACH ROW
  EXECUTE FUNCTION public.update_creche_estadia_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.creche_estadias;
