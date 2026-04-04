
CREATE TABLE public.formas_pagamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  dias integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.formas_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own formas_pagamento"
  ON public.formas_pagamento FOR ALL
  TO public
  USING (user_id = get_effective_user_id(auth.uid()))
  WITH CHECK (user_id = get_effective_user_id(auth.uid()));
