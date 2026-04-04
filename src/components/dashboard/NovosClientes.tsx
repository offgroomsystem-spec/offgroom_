import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { UserPlus } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NovosClientesProps {
  clientes: any[];
}

export const NovosClientes = ({ clientes }: NovosClientesProps) => {
  const clientesRecentes = useMemo(() => {
    const ultimos30Dias = subDays(new Date(), 30);
    
    return clientes
      .filter((c) => {
        const dataCriacao = new Date(c.created_at);
        return dataCriacao >= ultimos30Dias;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5);
  }, [clientes]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Clientes Recentes
        </CardTitle>
      </CardHeader>
      <CardContent>
        {clientesRecentes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <UserPlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum cliente novo nos últimos 30 dias</p>
          </div>
        ) : (
          <ScrollArea className="h-[268px]">
            <div className="space-y-3">
              {clientesRecentes.map((cliente) => (
                <div
                  key={cliente.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{cliente.nome_cliente}</p>
                      <Badge variant="secondary" className="text-xs">Novo</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cadastrado em {format(new Date(cliente.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground">{cliente.whatsapp}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};
