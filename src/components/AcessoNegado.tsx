import { AlertTriangle, LogOut } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ROTAS_PERMITIDAS } from "@/types/permissions";

export const AcessoNegado = () => {
  const navigate = useNavigate();
  const { tipoLogin, signOut } = useAuth();
  
  const handleVoltar = () => {
    if (tipoLogin) {
      const rotasPermitidas = ROTAS_PERMITIDAS[tipoLogin];
      if (rotasPermitidas && rotasPermitidas.length > 0) {
        navigate(rotasPermitidas[0]);
      } else {
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  };
  
  const handleSair = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="rounded-full bg-destructive/10 p-3">
              <AlertTriangle className="h-10 w-10 text-destructive" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-bold tracking-tight">
                Acesso não permitido
              </h2>
              <p className="text-muted-foreground">
                Você não tem permissão para acessar esta página.
              </p>
            </div>

            <div className="flex flex-col gap-2 w-full">
              <Button 
                onClick={handleVoltar} 
                className="w-full"
              >
                Voltar
              </Button>
              
              <Button 
                onClick={handleSair} 
                variant="outline"
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
