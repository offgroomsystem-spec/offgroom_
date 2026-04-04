export type TipoLogin = 'administrador' | 'taxi_dog' | 'recepcionista';

export interface StaffAccount {
  id: string;
  owner_id: string;
  user_id: string;
  nome: string;
  email: string;
  tipo_login: TipoLogin;
  ativo: boolean;
  ultimo_acesso: string | null;
  created_at: string;
  updated_at: string;
}

// Mapeamento de permissões por tipo de login
export const PERMISSOES: Record<TipoLogin, string[]> = {
  administrador: ['*'], // Acesso total
  
  taxi_dog: [
    'agendamentos.visualizar_hoje',
  ],
  
  recepcionista: [
    // Agendamentos - acesso total
    'agendamentos.visualizar',
    'agendamentos.criar',
    'agendamentos.editar',
    'agendamentos.pacotes',
    'agendamentos.gerenciar',
    
    // Clientes - sem excluir
    'clientes.visualizar',
    'clientes.criar',
    'clientes.editar',
    
    // Raças - sem excluir
    'racas.visualizar',
    'racas.criar',
    'racas.editar',
    
    // Financeiro - apenas lançar
    'financeiro.lancar',
    
    // Relatórios - apenas clientes e pacotes
    'relatorios.pacotes_expirados',
    'relatorios.clientes_risco',
    'relatorios.pacotes_vencimento',
    'relatorios.pacotes_ativos',
  ],
};

// Rotas permitidas por tipo de login
export const ROTAS_PERMITIDAS: Record<TipoLogin, string[]> = {
  administrador: ['*'], // Todas as rotas
  
  taxi_dog: [
    '/agendamentos',
  ],
  
  recepcionista: [
    '/home',
    '/agendamentos',
    '/clientes',
    '/racas',
    '/controle-financeiro',
    '/relatorios',
  ],
};

export const hasPermission = (tipoLogin: TipoLogin | null, permission: string): boolean => {
  if (!tipoLogin) return false;
  if (tipoLogin === 'administrador') return true;
  
  const permissions = PERMISSOES[tipoLogin] || [];
  return permissions.includes(permission);
};

export const hasRouteAccess = (tipoLogin: TipoLogin | null, route: string): boolean => {
  if (!tipoLogin) return false;
  if (tipoLogin === 'administrador') return true;
  
  const allowedRoutes = ROTAS_PERMITIDAS[tipoLogin] || [];
  return allowedRoutes.some(allowed => route.startsWith(allowed));
};
