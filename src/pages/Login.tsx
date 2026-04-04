import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, Lock } from 'lucide-react';
const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'Senha é obrigatória')
});
type LoginForm = z.infer<typeof loginSchema>;
const Login = () => {
  const navigate = useNavigate();
  const {
    user,
    profile,
    incrementLoginCount
  } = useAuth();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: {
      errors
    }
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema)
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const {
        data: authData,
        error
      } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.senha
      });
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('E-mail ou senha incorretos');
        } else {
          toast.error(error.message);
        }
        return;
      }
      // Incrementar login count
      const loginCount = await incrementLoginCount(authData.user?.id);
      
      // Verificar status da assinatura
      const { data: subscriptionData, error: subError } = await supabase.functions.invoke(
        'check-subscription-status',
        {
          headers: {
            Authorization: `Bearer ${authData.session.access_token}`
          }
        }
      );

      if (subError) {
        console.error('Error checking subscription:', subError);
        // Não bloquear por erro temporário - permitir acesso e logar
        console.warn('Erro temporário ao verificar assinatura, permitindo acesso');
      }

      // Tratamento por tipo de acesso
      if (subscriptionData?.type === 'payment_overdue') {
        toast.error('Favor regularizar pagamento da assinatura');
        navigate('/pagamento');
        return;
      }

      if (subscriptionData?.type === 'expired') {
        toast.warning('Seu acesso expirou. Escolha um plano para continuar utilizando o Offgroom.');
        navigate('/pagamento');
        return;
      }

      // Se não tem acesso por outro motivo
      if (subscriptionData && !subscriptionData.hasAccess && subscriptionData.type !== 'error') {
        toast.error(subscriptionData.message || 'Acesso não disponível. Por favor, assine um plano.');
        navigate('/pagamento');
        return;
      }

      // Exibir mensagem de boas-vindas baseada no tipo de acesso
      if (subscriptionData?.type === 'vip') {
        toast.success('🌟 Bem vindo(a) ao Offgroom! Acesso vitalício ativo.');
      } else if (subscriptionData?.type === 'trial') {
        toast.success(`✨ Bem vindo(a) ao Offgroom! ${subscriptionData.daysRemaining} dias de trial restantes.`);
      } else if (subscriptionData?.type === 'subscription') {
        toast.success(`🎉 Bem vindo(a) ao Offgroom! Plano ${subscriptionData.productName} ativo.`);
      } else if (subscriptionData?.type === 'liberacao_manual') {
        toast.success(`✨ Bem vindo(a) ao Offgroom! ${subscriptionData.daysRemaining} dias de acesso liberado.`);
      } else if (subscriptionData?.type === 'error') {
        // Erro ao verificar, mas não bloquear
        console.warn('Erro ao verificar assinatura, permitindo acesso temporário');
        toast.info('Bem vindo(a) ao Offgroom!');
      }
      
      // Carregar tipo de login do usuário
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authData.user?.id)
        .single();
      
      // Verificar se tem checkout pendente
      const pendingPlan = sessionStorage.getItem('pending_checkout_plan');
      if (pendingPlan) {
        sessionStorage.removeItem('pending_checkout_plan');
        navigate('/pagamento');
        return;
      }

      // Redirecionar baseado no tipo de login
      const tipoLogin = roleData?.role;
      
      // Admin master - redirecionar para painel exclusivo
      if (data.email === 'offgroom.system@gmail.com') {
        navigate('/admin-master');
        return;
      }

      if (tipoLogin === 'taxi_dog') {
        navigate('/agendamentos');
      } else if (tipoLogin === 'recepcionista') {
        navigate('/agendamentos');
      } else {
        // Administrador
        if (loginCount <= 2) {
          navigate('/empresa');
        } else {
          navigate('/home');
        }
      }
    } catch (error) {
      toast.error('Erro ao fazer login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4">
            <img alt="OffGroom" className="h-16 mx-auto" src="/lovable-uploads/dcfc9471-47bd-4487-98d4-f4bc63871713.png" />
          </div>
          <CardTitle className="text-2xl font-bold">Bem-vindo de volta</CardTitle>
          <CardDescription>Entre com suas credenciais para acessar o sistema</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="seu@email.com" className="pl-10" {...register('email')} />
              </div>
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input id="senha" type="password" placeholder="••••••••" className="pl-10" {...register('senha')} />
              </div>
              {errors.senha && <p className="text-sm text-destructive">{errors.senha.message}</p>}
            </div>

            <div className="text-right">
              <Link to="/esqueci-senha" className="text-sm text-primary hover:underline">
                Esqueci minha senha
              </Link>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>

            <p className="text-sm text-center text-muted-foreground">
              Não tem uma conta?{' '}
              <Link to="/cadastro" className="text-primary hover:underline font-medium">
                Cadastre-se
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>;
};
export default Login;