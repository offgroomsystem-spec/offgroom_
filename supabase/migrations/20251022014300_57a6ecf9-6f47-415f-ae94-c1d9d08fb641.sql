-- Create table for global/standard pet breeds
CREATE TABLE public.racas_padrao (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  porte TEXT NOT NULL CHECK (porte IN ('pequeno', 'medio', 'grande')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.racas_padrao ENABLE ROW LEVEL SECURITY;

-- Create policy: all authenticated users can view standard breeds
CREATE POLICY "Authenticated users can view standard breeds"
ON public.racas_padrao
FOR SELECT
USING (auth.role() = 'authenticated');

-- Insert the 43 standard breeds
INSERT INTO public.racas_padrao (nome, porte) VALUES
  ('BACE', 'pequeno'),
  ('BICHON FRISÉ', 'pequeno'),
  ('BULDOGUE', 'pequeno'),
  ('CHIHUAHUA', 'pequeno'),
  ('GATO', 'pequeno'),
  ('JACK RUSSEL TERRIER', 'pequeno'),
  ('LULU DA POMERÂNIA', 'pequeno'),
  ('MALTÊS', 'pequeno'),
  ('PAPILLON', 'pequeno'),
  ('PEQUINÊS', 'pequeno'),
  ('PINSCHER', 'pequeno'),
  ('POODLE', 'pequeno'),
  ('PUG', 'pequeno'),
  ('SHIH TZU', 'pequeno'),
  ('SPITZ', 'pequeno'),
  ('SRD (SEM RAÇA DEFINIDA)', 'pequeno'),
  ('YORKSHIRE TERRIER', 'pequeno'),
  ('BEAGLE', 'medio'),
  ('BULLDOG FRANCÊS', 'medio'),
  ('CÃO DE FILA DE SÃO MIGUEL', 'medio'),
  ('COCKER SPANIEL', 'medio'),
  ('DACHSHUND (TECKEL)', 'medio'),
  ('POODLE', 'medio'),
  ('SRD (SEM RAÇA DEFINIDA)', 'medio'),
  ('AKITA INU', 'grande'),
  ('BOXER', 'grande'),
  ('BULDOGUE-CAMPEIRO', 'grande'),
  ('BULLMASTIFF', 'grande'),
  ('DOBERMAN PINSCHER', 'grande'),
  ('FILA', 'grande'),
  ('FOXHOUND INGLÊS', 'grande'),
  ('GOLDEN RETRIEVER', 'grande'),
  ('LABRADOR RETRIEVER', 'grande'),
  ('MASTIM NAPOLITANO', 'grande'),
  ('PASTOR ALEMÃO', 'grande'),
  ('POINTER INGLÊS', 'grande'),
  ('ROTTWEILER', 'grande'),
  ('SÃO BERNARDO', 'grande'),
  ('SETTER IRLANDÊS', 'grande'),
  ('SRD (SEM RAÇA DEFINIDA)', 'grande'),
  ('CHOW-CHOW', 'grande'),
  ('HUSKY SIBERIANO', 'grande');