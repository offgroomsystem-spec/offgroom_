import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, DollarSign } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ContasProximasVencimentoProps {
  lancamentos: any[];
}

export const ContasProximasVencimento = ({ lancamentos }: ContasProximasVencimentoProps) => {
  const contasAVencer = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const proximos7Dias = new Date(hoje);
    proximos7Dias.setDate(hoje.getDate() + 7);
    
    return lancamentos
      .filter((l) => {
        if (l.tipo !== "Despesa" || l.pago) return false;
        const dataVencimento = new Date(l.data_pagamento);
        dataVencimento.setHours(0, 0, 0, 0);
        
        // Incluir: vencidas (< hoje) OU próximos 7 dias (>= hoje && <= +7dias)
        return dataVencimento < hoje || (dataVencimento >= hoje && dataVencimento <= proximos7Dias);
      })
      .sort((a, b) => new Date(a.data_pagamento).getTime() - new Date(b.data_pagamento).getTime())
      .slice(0, 5);
  }, [lancamentos]);
  
  const totalAPagar = useMemo(() => {
    return contasAVencer.reduce((acc, l) => acc + Number(l.valor_total), 0);
  }, [contasAVencer]);
  
  const getUrgenciaBadge = (dataVencimento: string) => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const vencimento = new Date(dataVencimento);
    vencimento.setHours(0, 0, 0, 0);
    const diasRestantes = differenceInDays(vencimento, hoje);
    
    if (diasRestantes < 0) {
      return <Badge variant="destructive">Vencida</Badge>;
    } else if (diasRestantes <= 3) {
      return <Badge variant="destructive">Urgente</Badge>;
    } else if (diasRestantes <= 7) {
      return <Badge className="bg-yellow-500">Atenção</Badge>;
    }
    return <Badge variant="secondary">{diasRestantes} dias</Badge>;
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          Contas a Vencer
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">Dos próximos 7 dias</p>
      </CardHeader>
      <CardContent>
        {contasAVencer.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <DollarSign className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma conta próxima do vencimento</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[200px] mb-3">
              <div className="space-y-3">
                {contasAVencer.map((conta) => (
                  <div
                    key={conta.id}
                    className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium">{conta.descricao1}</p>
                      <p className="text-xs text-muted-foreground">
                        Vencimento: {format(new Date(conta.data_pagamento), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-sm font-semibold text-red-600">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(Number(conta.valor_total))}
                      </p>
                    </div>
                    <div className="ml-2">
                      {getUrgenciaBadge(conta.data_pagamento)}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Total a pagar:</span>
                <span className="text-lg font-bold text-red-600">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(totalAPagar)}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
