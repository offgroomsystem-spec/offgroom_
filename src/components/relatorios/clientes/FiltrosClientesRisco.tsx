import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Filter, X } from "lucide-react";

interface FiltrosClientesRiscoProps {
  filtros: {
    faixaDias: string;
    busca: string;
    dataInicio: string;
    dataFim: string;
  };
  setFiltros: (filtros: any) => void;
  onFiltrar: () => void;
}

export const FiltrosClientesRisco = ({
  filtros,
  setFiltros,
  onFiltrar
}: FiltrosClientesRiscoProps) => {
  const limparFiltros = () => {
    setFiltros({
      faixaDias: "todos",
      busca: "",
      dataInicio: "",
      dataFim: ""
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Filtros</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Dropdown: Intervalo de dias */}
          <div className="space-y-2">
            <Label>Intervalo de Dias</Label>
            <Select
              value={filtros.faixaDias}
              onValueChange={(value) =>
                setFiltros({ ...filtros, faixaDias: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="7-10">7-10 dias</SelectItem>
                <SelectItem value="11-15">11-15 dias</SelectItem>
                <SelectItem value="16-20">16-20 dias</SelectItem>
                <SelectItem value="21-30">21-30 dias</SelectItem>
                <SelectItem value="31-45">31-45 dias</SelectItem>
                <SelectItem value="46-90">46-90 dias</SelectItem>
                <SelectItem value="perdido">Mais de 90 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campo de busca: Cliente/Pet */}
          <div className="space-y-2">
            <Label>Buscar Cliente ou Pet</Label>
            <Input
              placeholder="Digite o nome..."
              value={filtros.busca}
              onChange={(e) =>
                setFiltros({ ...filtros, busca: e.target.value })
              }
            />
          </div>

          {/* Data Início */}
          <div className="space-y-2">
            <Label>Data Início (Opcional)</Label>
            <Input
              type="date"
              value={filtros.dataInicio}
              onChange={(e) =>
                setFiltros({ ...filtros, dataInicio: e.target.value })
              }
            />
          </div>

          {/* Data Fim */}
          <div className="space-y-2">
            <Label>Data Fim (Opcional)</Label>
            <Input
              type="date"
              value={filtros.dataFim}
              onChange={(e) =>
                setFiltros({ ...filtros, dataFim: e.target.value })
              }
            />
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-2 mt-4">
          <Button onClick={onFiltrar}>
            <Filter className="h-4 w-4 mr-2" />
            Filtrar
          </Button>
          <Button variant="outline" onClick={limparFiltros}>
            <X className="h-4 w-4 mr-2" />
            Limpar Filtros
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
