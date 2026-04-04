import { useState } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { User, Mail, Phone, Lock } from "lucide-react";

const cadastroSchema = z
  .object({
    nome_completo: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(100, "Nome muito longo"),
    email_hotmart: z.string().email("E-mail inválido").max(255, "E-mail muito longo"),
    whatsapp: z.string().regex(/^\d{11}$/, "WhatsApp inválido. Digite 11 dígitos: DDD + número (ex: 61981468122)"),
    senha: z.string().min(8, "Senha deve ter no mínimo 8 caracteres").max(100, "Senha muito longa"),
    confirmar_senha: z.string(),
    
  })
  .refine((data) => data.senha === data.confirmar_senha, {
    message: "As senhas não coincidem",
    path: ["confirmar_senha"],
  });

type CadastroForm = z.infer<typeof cadastroSchema>;

const Cadastro = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
  } = useForm<CadastroForm>({
    resolver: zodResolver(cadastroSchema),
  });

  if (user) {
    return <Navigate to="/home" replace />;
  }

  const formatarWhatsApp = (value: string) => {
    return value.replace(/\D/g, "").slice(0, 11);
  };

  const onSubmit = async (data: CadastroForm) => {
    setLoading(true);
    try {
      const response = await supabase.functions.invoke("public-signup", {
        body: {
          email: data.email_hotmart,
          password: data.senha,
          nome_completo: data.nome_completo,
          whatsapp: data.whatsapp,
        },
      });

      if (response.error) {
        const errorMessage = response.data?.error || response.error.message || "Erro ao criar conta";
        toast.error(errorMessage);
        return;
      }

      if (response.data?.error) {
        toast.error(response.data.error);
        return;
      }


      // Auto-login after signup
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: data.email_hotmart,
        password: data.senha,
      });

      if (loginError) {
        toast.error("Conta criada! Faça login para continuar.");
        navigate("/login");
        return;
      }

      toast.success("Cadastro realizado! Escolha um plano para começar.");
      navigate("/pagamento");
    } catch (error) {
      toast.error("Erro ao criar conta. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-sm shadow-lg border-border/60">
        <CardHeader className="text-center pb-2 pt-5 px-5">
          <div className="mx-auto mb-2">
            <img src="/src/assets/logo-offgroom.png" alt="OffGroom" className="h-14 mx-auto" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">Criar conta</CardTitle>
          <CardDescription className="text-[12px]">Preencha os dados abaixo para se cadastrar</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-1.5 px-5 pt-2 pb-3">
            <div className="space-y-[2px]">
              <Label htmlFor="nome_completo" className="text-[11px] font-semibold">
                Nome Completo
              </Label>
              <div className="relative">
                <User className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="nome_completo"
                  type="text"
                  placeholder="João Silva"
                  className="pl-8 h-7 text-[12px]"
                  {...register("nome_completo")}
                />
              </div>
              {errors.nome_completo && <p className="text-[11px] text-destructive">{errors.nome_completo.message}</p>}
            </div>

            <div className="space-y-[2px]">
              <Label htmlFor="email_hotmart" className="text-[11px] font-semibold">
                E-mail para cadastro
              </Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="email_hotmart"
                  type="email"
                  placeholder="seu@email.com"
                  className="pl-8 h-7 text-[12px]"
                  {...register("email_hotmart")}
                />
              </div>
              {errors.email_hotmart && <p className="text-[11px] text-destructive">{errors.email_hotmart.message}</p>}
            </div>

            <div className="space-y-[2px]">
              <Label htmlFor="whatsapp" className="text-[11px] font-semibold">
                WhatsApp
              </Label>
              <div className="relative">
                <Phone className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="whatsapp"
                  type="text"
                  placeholder="61981468122"
                  maxLength={11}
                  className="pl-8 h-7 text-[12px]"
                  {...register("whatsapp")}
                  onChange={(e) => {
                    const formatted = formatarWhatsApp(e.target.value);
                    setValue("whatsapp", formatted);
                  }}
                />
              </div>
              {errors.whatsapp && <p className="text-[11px] text-destructive">{errors.whatsapp.message}</p>}
            </div>

            <div className="space-y-[2px]">
              <Label htmlFor="senha" className="text-[11px] font-semibold">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="senha"
                  type="password"
                  placeholder="••••••••"
                  className="pl-8 h-7 text-[12px]"
                  {...register("senha")}
                />
              </div>
              {errors.senha && <p className="text-[11px] text-destructive">{errors.senha.message}</p>}
            </div>

            <div className="space-y-[2px]">
              <Label htmlFor="confirmar_senha" className="text-[11px] font-semibold">
                Confirmar Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-2.5 top-1.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  id="confirmar_senha"
                  type="password"
                  placeholder="••••••••"
                  className="pl-8 h-7 text-[12px]"
                  {...register("confirmar_senha")}
                />
              </div>
              {errors.confirmar_senha && (
                <p className="text-[11px] text-destructive">{errors.confirmar_senha.message}</p>
              )}
            </div>

          </CardContent>

          <CardFooter className="flex flex-col space-y-3 px-5 pt-1 pb-5">
            <Button type="submit" className="w-full h-7 text-[12px] font-semibold" disabled={loading}>
              {loading ? "Criando conta..." : "Criar Conta"}
            </Button>

            <p className="text-[12px] text-center text-muted-foreground">
              Já tem uma conta?{" "}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Faça login
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Cadastro;