// Utilitários para campos fiscais NFe/NFSe

// Máscaras de formatação
export const formatCNPJ = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 14);
  return numbers
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
};

export const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 11);
  return numbers
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1-$2');
};

export const formatCPFCNPJ = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 11) {
    return formatCPF(value);
  }
  return formatCNPJ(value);
};

export const formatCEP = (value: string): string => {
  const numbers = value.replace(/\D/g, '').slice(0, 8);
  return numbers.replace(/(\d{5})(\d)/, '$1-$2');
};

// Removedores de máscara
export const unformatDocument = (value: string): string => {
  return value.replace(/\D/g, '');
};

// Validação de CNPJ
export const validarCNPJ = (cnpj: string): boolean => {
  const numbers = cnpj.replace(/\D/g, '');
  
  if (numbers.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(numbers)) return false;
  
  // Validação do primeiro dígito verificador
  let soma = 0;
  let peso = 5;
  for (let i = 0; i < 12; i++) {
    soma += parseInt(numbers[i]) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  let resto = soma % 11;
  let digito1 = resto < 2 ? 0 : 11 - resto;
  
  if (parseInt(numbers[12]) !== digito1) return false;
  
  // Validação do segundo dígito verificador
  soma = 0;
  peso = 6;
  for (let i = 0; i < 13; i++) {
    soma += parseInt(numbers[i]) * peso;
    peso = peso === 2 ? 9 : peso - 1;
  }
  resto = soma % 11;
  let digito2 = resto < 2 ? 0 : 11 - resto;
  
  return parseInt(numbers[13]) === digito2;
};

// Validação de CPF
export const validarCPF = (cpf: string): boolean => {
  const numbers = cpf.replace(/\D/g, '');
  
  if (numbers.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(numbers)) return false;
  
  // Validação do primeiro dígito verificador
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(numbers[i]) * (10 - i);
  }
  let resto = (soma * 10) % 11;
  let digito1 = resto === 10 ? 0 : resto;
  
  if (parseInt(numbers[9]) !== digito1) return false;
  
  // Validação do segundo dígito verificador
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(numbers[i]) * (11 - i);
  }
  resto = (soma * 10) % 11;
  let digito2 = resto === 10 ? 0 : resto;
  
  return parseInt(numbers[10]) === digito2;
};

// Validação de CPF ou CNPJ
export const validarCPFCNPJ = (value: string): boolean => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length === 11) return validarCPF(value);
  if (numbers.length === 14) return validarCNPJ(value);
  return false;
};

// Interface para resposta do ViaCEP
export interface ViaCEPResponse {
  cep: string;
  logradouro: string;
  complemento: string;
  bairro: string;
  localidade: string;
  uf: string;
  ibge: string;
  erro?: boolean;
}

// Busca de CEP via ViaCEP
export const buscarCEP = async (cep: string): Promise<ViaCEPResponse | null> => {
  const numbers = cep.replace(/\D/g, '');
  
  if (numbers.length !== 8) {
    return null;
  }
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${numbers}/json/`);
    const data = await response.json();
    
    if (data.erro) {
      return null;
    }
    
    return data as ViaCEPResponse;
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
};

// Lista de UFs brasileiras
export const UF_BRASIL = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' },
];

// Opções de Regime Tributário
export const REGIMES_TRIBUTARIOS = [
  { value: '1', label: 'Simples Nacional' },
  { value: '2', label: 'Simples Nacional - Excesso de Sublimite' },
  { value: '3', label: 'Regime Normal (Lucro Presumido/Real)' },
];

// Opções de Unidade de Medida
export const UNIDADES_MEDIDA = [
  { value: 'UN', label: 'Unidade (UN)' },
  { value: 'KG', label: 'Quilograma (KG)' },
  { value: 'L', label: 'Litro (L)' },
  { value: 'M', label: 'Metro (M)' },
  { value: 'M2', label: 'Metro Quadrado (M²)' },
  { value: 'M3', label: 'Metro Cúbico (M³)' },
  { value: 'CX', label: 'Caixa (CX)' },
  { value: 'PC', label: 'Peça (PC)' },
  { value: 'PAR', label: 'Par (PAR)' },
  { value: 'PCT', label: 'Pacote (PCT)' },
];

// Opções de Origem do Produto
export const ORIGENS_PRODUTO = [
  { value: '0', label: '0 - Nacional' },
  { value: '1', label: '1 - Estrangeira (Importação Direta)' },
  { value: '2', label: '2 - Estrangeira (Adquirida no Mercado Interno)' },
  { value: '3', label: '3 - Nacional (Conteúdo Importação > 40%)' },
  { value: '4', label: '4 - Nacional (Processos Básicos)' },
  { value: '5', label: '5 - Nacional (Conteúdo Importação ≤ 40%)' },
  { value: '6', label: '6 - Estrangeira (Importação Direta, sem Similar Nacional)' },
  { value: '7', label: '7 - Estrangeira (Adquirida Internamente, sem Similar Nacional)' },
  { value: '8', label: '8 - Nacional (Conteúdo Importação > 70%)' },
];
