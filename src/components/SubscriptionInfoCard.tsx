import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Rocket, Zap, Shield, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
export const SubscriptionInfoCard = () => {
  const {
    subscriptionStatus
  } = useAuth();
  const navigate = useNavigate();

  // Usar dados do subscriptionStatus que vem do check-subscription-status
  const diasRestantes = subscriptionStatus?.daysRemaining ?? 0;
  const tipo = subscriptionStatus?.type ?? 'trial';
  const productName = subscriptionStatus?.productName;
  const isSubscription = tipo === 'subscription';
  const isVip = tipo === 'vip';
  const isLiberacaoManual = tipo === 'liberacao_manual';

  // Se é VIP, assinante ativo ou liberação manual, mostrar card de sucesso
  if (isVip || isSubscription || isLiberacaoManual) {
    return <Card className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200/50 dark:border-green-800/50">
        <div className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span>
              {isVip ? "Você tem acesso vitalício ao Offgroom!" : 
               isLiberacaoManual ? (
                 <>
                   Acesso liberado manualmente - <span className="font-semibold text-foreground">{diasRestantes} dias restantes</span>
                 </>
               ) : (
                 <>
                   Plano <span className="font-semibold text-foreground">{productName || 'Ativo'}</span> - 
                   {diasRestantes > 0 && ` ${diasRestantes} dias restantes`}
                 </>
               )}
            </span>
          </div>
        </div>
      </Card>;
  }
  return <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200/50 dark:border-blue-800/50">
      <div className="p-4 space-y-3">
        {/* Trial Info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>
            Você ainda tem <span className="font-semibold text-foreground">{diasRestantes} dias</span> para uso do Offgroom.
          </span>
        </div>
        
        {/* Main CTA */}
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <Rocket className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Pronto para Transformar seu Petshop?
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Junte-se a centenas de petshops que já estão economizando tempo e aumentando lucros com o Offgroom.
              </p>
            </div>
          </div>
          
          <Button onClick={() => navigate('/pagamento')} className="w-full sm:w-auto mt-2">
            🎯 Ativar Offgroom
          </Button>
        </div>
        
        {/* Trust Signals */}
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground pt-2 border-t border-border/50">
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3" />
            Ativação imediata
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            Pagamento 100% seguro
          </span>
        </div>
      </div>
    </Card>;
};