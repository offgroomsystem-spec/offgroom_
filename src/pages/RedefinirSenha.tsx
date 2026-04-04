import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Lock } from 'lucide-react';

const redefinirSenhaSchema = z.object({
  senha: z.string()
    .min(8, 'Senha deve ter no mínimo 8 caracteres')
    .max(100, 'Senha muito longa'),
  confirmar_senha: z.string()
}).refine((data) => data.senha === data.confirmar_senha, {
  message: 'As senhas não coincidem',
  path: ['confirmar_senha']
});

type RedefinirSenhaForm = z.infer<typeof redefinirSenhaSchema>;

const RedefinirSenha = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<RedefinirSenhaForm>({
    resolver: zodResolver(redefinirSenhaSchema),
  });

  useEffect(() => {
    // Verificar se há um token de recuperação válido
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValidToken(true);
      } else {
        toast.error('Link de recuperação inválido ou expirado');
        navigate('/login');
      }
    });
  }, [navigate]);

  const onSubmit = async (data: RedefinirSenhaForm) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.senha
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success('Senha redefinida com sucesso!');
      navigate('/');
    } catch (error) {
      toast.error('Erro ao redefinir senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (!validToken) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4">
            <img src="/src/assets/logo-offgroom.png" alt="OffGroom" className="h-16 mx-auto" />
          </div>
          <CardTitle className="text-2xl font-bold">Redefinir senha</CardTitle>
          <CardDescription>Digite sua nova senha abaixo</CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="senha">Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="senha"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  {...register('senha')}
                />
              </div>
              {errors.senha && (
                <p className="text-sm text-destructive">{errors.senha.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmar_senha">Confirmar Nova Senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmar_senha"
                  type="password"
                  placeholder="••••••••"
                  className="pl-10"
                  {...register('confirmar_senha')}
                />
              </div>
              {errors.confirmar_senha && (
                <p className="text-sm text-destructive">{errors.confirmar_senha.message}</p>
              )}
            </div>
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Redefinindo...' : 'Redefinir Senha'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default RedefinirSenha;
