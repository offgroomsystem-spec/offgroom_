import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Mail, ArrowLeft } from 'lucide-react';

const esqueciSenhaSchema = z.object({
  email: z.string().email('E-mail inválido'),
});

type EsqueciSenhaForm = z.infer<typeof esqueciSenhaSchema>;

const EsqueciSenha = () => {
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<EsqueciSenhaForm>({
    resolver: zodResolver(esqueciSenhaSchema),
  });

  const onSubmit = async (data: EsqueciSenhaForm) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      setEnviado(true);
      toast.success('Link de recuperação enviado! Verifique seu e-mail.');
    } catch (error) {
      toast.error('Erro ao enviar link de recuperação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4">
            <img src="/src/assets/logo-offgroom.png" alt="OffGroom" className="h-16 mx-auto" />
          </div>
          <CardTitle className="text-2xl font-bold">Esqueci minha senha</CardTitle>
          <CardDescription>
            {enviado
              ? 'Enviamos um link de recuperação para seu e-mail'
              : 'Digite seu e-mail para receber o link de recuperação'}
          </CardDescription>
        </CardHeader>

        {!enviado ? (
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail cadastrado na Hotmart</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    className="pl-10"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar link de recuperação'}
              </Button>

              <Link to="/login" className="flex items-center justify-center text-sm text-primary hover:underline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar para login
              </Link>
            </CardFooter>
          </form>
        ) : (
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Verifique sua caixa de entrada e spam.
              </p>
              <p className="text-sm text-muted-foreground">
                Clique no link recebido para redefinir sua senha.
              </p>
            </div>

            <Link to="/login" className="flex items-center justify-center text-sm text-primary hover:underline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para login
            </Link>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default EsqueciSenha;
