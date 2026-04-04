-- Migration: Adicionar campos fiscais para emissão de NFe/NFSe

-- 1. Campos fiscais em empresa_config (dados do emissor)
ALTER TABLE empresa_config 
ADD COLUMN IF NOT EXISTS cnpj TEXT,
ADD COLUMN IF NOT EXISTS razao_social TEXT,
ADD COLUMN IF NOT EXISTS inscricao_estadual TEXT,
ADD COLUMN IF NOT EXISTS inscricao_municipal TEXT,
ADD COLUMN IF NOT EXISTS regime_tributario TEXT,
ADD COLUMN IF NOT EXISTS cep_fiscal TEXT,
ADD COLUMN IF NOT EXISTS logradouro_fiscal TEXT,
ADD COLUMN IF NOT EXISTS numero_endereco_fiscal TEXT,
ADD COLUMN IF NOT EXISTS complemento_fiscal TEXT,
ADD COLUMN IF NOT EXISTS bairro_fiscal TEXT,
ADD COLUMN IF NOT EXISTS cidade_fiscal TEXT,
ADD COLUMN IF NOT EXISTS codigo_ibge_cidade TEXT,
ADD COLUMN IF NOT EXISTS uf_fiscal TEXT,
ADD COLUMN IF NOT EXISTS email_fiscal TEXT,
ADD COLUMN IF NOT EXISTS codigo_cnae TEXT;

-- 2. Campos fiscais em clientes (dados do destinatário)
ALTER TABLE clientes 
ADD COLUMN IF NOT EXISTS cpf_cnpj TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS cep TEXT,
ADD COLUMN IF NOT EXISTS logradouro TEXT,
ADD COLUMN IF NOT EXISTS numero_endereco TEXT,
ADD COLUMN IF NOT EXISTS complemento TEXT,
ADD COLUMN IF NOT EXISTS bairro TEXT,
ADD COLUMN IF NOT EXISTS cidade TEXT,
ADD COLUMN IF NOT EXISTS codigo_ibge_cidade TEXT,
ADD COLUMN IF NOT EXISTS uf TEXT;

-- 3. Campos fiscais em servicos (dados tributários para NFSe)
ALTER TABLE servicos 
ADD COLUMN IF NOT EXISTS codigo_servico_municipal TEXT,
ADD COLUMN IF NOT EXISTS aliquota_iss NUMERIC DEFAULT 0;

-- 4. Campos fiscais em produtos (dados tributários para NFe)
ALTER TABLE produtos 
ADD COLUMN IF NOT EXISTS ncm TEXT,
ADD COLUMN IF NOT EXISTS cfop TEXT,
ADD COLUMN IF NOT EXISTS unidade_medida TEXT DEFAULT 'UN',
ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT '0';