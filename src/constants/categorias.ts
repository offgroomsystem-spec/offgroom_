// Categorias compartilhadas entre Controle Financeiro, Fluxo de Caixa e Compras Realizadas

export const categoriasDescricao1: { [key: string]: string[] } = {
  Receita: ["Receita Operacional", "Receita Não Operacional"],
  Despesa: ["Despesa Fixa", "Despesa Operacional", "Despesa Não Operacional"],
};

export const categoriasDescricao2: { [key: string]: string[] } = {
  "Receita Operacional": ["Serviços", "Venda", "Outras Receitas Operacionais"],
  "Receita Não Operacional": ["Venda de Ativo", "Resgate de Aplicação Financeira", "Outras Receitas Não Operacionais"],
  "Despesa Fixa": ["Aluguel", "Salários", "Impostos Fixos", "Financiamentos", "Sistemas e Softwares", "Outras Despesas Fixas"],
  "Despesa Operacional": [
    "Combustível",
    "Contador",
    "Freelancer",
    "Telefonia e internet",
    "Energia elétrica",
    "Água e esgoto",
    "Publicidade e marketing",
    "Produtos para Banho",
    "Material de Limpeza",
    "Outras Despesas Operacionais",
  ],
  "Despesa Não Operacional": [
    "Manutenção",
    "Aplicação Financeira",
    "Infraestrutura",
    "Retirada Caixa",
    "Retirada Sócio",
    "Outras Despesas Não Operacionais",
  ],
};
