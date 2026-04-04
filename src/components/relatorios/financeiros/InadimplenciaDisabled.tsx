import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Filtros {
  periodo: string;
  dataInicio: string;
  dataFim: string;
}

interface InadimplenciaProps {
  filtros: Filtros;
}

export const Inadimplencia = ({ filtros }: InadimplenciaProps) => {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Inadimplência e Contas a Receber</h2>

      <Alert variant="default" className="border-yellow-500">
        <AlertCircle className="h-4 w-4 text-yellow-600" />
        <AlertTitle>Relatório Temporariamente Indisponível</AlertTitle>
        <AlertDescription>
          Este relatório está sendo migrado para a nova estrutura de banco de dados. 
          Ele estará disponível em breve com funcionalidades aprimoradas.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Migração em Andamento</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Estamos trabalhando para trazer de volta este relatório com melhorias significativas:
          </p>
          <ul className="list-disc list-inside mt-2 text-muted-foreground space-y-1">
            <li>Rastreamento de pagamentos em tempo real</li>
            <li>Alertas automáticos de vencimento</li>
            <li>Histórico completo de transações</li>
            <li>Melhor visualização de inadimplência</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};