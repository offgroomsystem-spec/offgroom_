import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import type { TipoLogin, StaffAccount } from '@/types/permissions';

interface Profile {
  id: string;
  nome_completo: string;
  email_hotmart: string;
  whatsapp: string;
  login_count: number;
  created_at: string | null;
}

export interface SubscriptionStatus {
  hasAccess: boolean;
  type: 'vip' | 'trial' | 'subscription' | 'liberacao_manual' | 'expired' | 'payment_overdue' | 'error';
  daysRemaining?: number;
  productId?: string;
  productName?: string;
  subscriptionEnd?: string;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: string[];
  tipoLogin: TipoLogin | null;
  isAdministrador: boolean;
  isTaxiDog: boolean;
  isRecepcionista: boolean;
  staffAccount: StaffAccount | null;
  ownerId: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  loading: boolean;
  signOut: () => Promise<void>;
  incrementLoginCount: (userId?: string) => Promise<number>;
  hasRole: (role: string) => boolean;
  checkSubscription: () => Promise<SubscriptionStatus>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [tipoLogin, setTipoLogin] = useState<TipoLogin | null>(null);
  const [staffAccount, setStaffAccount] = useState<StaffAccount | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdministrador = tipoLogin === 'administrador';
  const isTaxiDog = tipoLogin === 'taxi_dog';
  const isRecepcionista = tipoLogin === 'recepcionista';
  const ownerId = staffAccount?.owner_id || user?.id || null;

  const loadProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error) {
      console.error('Erro ao carregar perfil:', error);
    }
  };

  const loadUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) throw error;
      setRoles((data || []).map(r => r.role));
      
      // Definir tipo de login baseado na role
      if (data && data.length > 0) {
        setTipoLogin(data[0].role as TipoLogin);
      }
    } catch (error) {
      console.error('Erro ao carregar roles:', error);
      setRoles([]);
    }
  };

  const loadStaffAccount = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('staff_accounts')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setStaffAccount(data);
      
      if (data) {
        setTipoLogin(data.tipo_login as TipoLogin);
        
        // Atualizar último acesso para usuários staff
        await supabase
          .from('staff_accounts')
          .update({ ultimo_acesso: new Date().toISOString() })
          .eq('user_id', userId);
      }
    } catch (error) {
      console.error('Erro ao carregar staff account:', error);
    }
  };

  const hasRole = (role: string) => roles.includes(role);

  const checkSubscription = async (retryCount = 0): Promise<SubscriptionStatus> => {
    const MAX_RETRIES = 3;
    const RETRY_DELAY_MS = 1000;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        const errorStatus: SubscriptionStatus = {
          hasAccess: false,
          type: 'error',
          message: 'Não autenticado'
        };
        setSubscriptionStatus(errorStatus);
        return errorStatus;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription-status', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) {
        console.error('Error checking subscription:', error);
        
        // Se ainda temos retries disponíveis, tentar novamente
        if (retryCount < MAX_RETRIES) {
          console.log(`Retry attempt ${retryCount + 1}/${MAX_RETRIES} for subscription check`);
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
          return checkSubscription(retryCount + 1);
        }
        
        // Após todas as tentativas, retornar erro mas NÃO bloquear
        const errorStatus: SubscriptionStatus = {
          hasAccess: false,
          type: 'error',
          message: 'Erro ao verificar assinatura. Tente novamente.'
        };
        setSubscriptionStatus(errorStatus);
        return errorStatus;
      }

      const status = data as SubscriptionStatus;
      setSubscriptionStatus(status);
      return status;
    } catch (error) {
      console.error('Error in checkSubscription:', error);
      
      // Se ainda temos retries disponíveis, tentar novamente
      if (retryCount < MAX_RETRIES) {
        console.log(`Retry attempt ${retryCount + 1}/${MAX_RETRIES} for subscription check (exception)`);
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
        return checkSubscription(retryCount + 1);
      }
      
      const errorStatus: SubscriptionStatus = {
        hasAccess: false,
        type: 'error',
        message: 'Erro ao verificar assinatura'
      };
      setSubscriptionStatus(errorStatus);
      return errorStatus;
    }
  };

  useEffect(() => {
    const loadUserData = async (userId: string) => {
      await loadProfile(userId);
      await loadUserRoles(userId);
      await loadStaffAccount(userId);
      setLoading(false);
    };

    // Verificar sessão atual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserData(session.user.id);
      } else {
        setLoading(false);
      }
    });

    // Listener de mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          loadUserData(session.user.id);
        } else {
          setProfile(null);
          setRoles([]);
          setTipoLogin(null);
          setStaffAccount(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);


  const incrementLoginCount = async (userId?: string): Promise<number> => {
    const targetUserId = userId || user?.id;
    if (!targetUserId) return 0;

    try {
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('login_count')
        .eq('id', targetUserId)
        .single();

      const newCount = (currentProfile?.login_count || 0) + 1;

      const { error } = await supabase
        .from('profiles')
        .update({ login_count: newCount })
        .eq('id', targetUserId);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, login_count: newCount } : null);
      return newCount;
    } catch (error) {
      console.error('Erro ao incrementar login_count:', error);
      return 0;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    
    // Clear all sensitive data from localStorage
    const keysToRemove = [
      'agendamentos',
      'agendamentosPacotes',
      'lancamentos_financeiros',
      'contas_bancarias',
      'empresaConfig',
      'groomers',
      'pacotes',
      'produtos',
      'receitas',
      'despesas',
      'servicos',
      'clientes',
      'racas'
    ];
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile, 
      roles, 
      tipoLogin,
      isAdministrador,
      isTaxiDog,
      isRecepcionista,
      staffAccount,
      ownerId,
      subscriptionStatus,
      loading, 
      signOut, 
      incrementLoginCount, 
      hasRole,
      checkSubscription
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};
