import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface Props {
  periodo: { inicio: string; fim: string };
  onPeriodoChange: (p: { inicio: string; fim: string }) => void;
  tipoFilter: string;
  onTipoChange: (v: string) => void;
}

const CrecheRelatorioFilters = ({ periodo, onPeriodoChange, tipoFilter, onTipoChange }: Props) => {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="space-y-1">
        <Label className="text-xs">De</Label>
        <Input
          type="date"
          value={periodo.inicio}
          onChange={(e) => onPeriodoChange({ ...periodo, inicio: e.target.value })}
          className="h-8 text-xs w-36"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Até</Label>
        <Input
          type="date"
          value={periodo.fim}
          onChange={(e) => onPeriodoChange({ ...periodo, fim: e.target.value })}
          className="h-8 text-xs w-36"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Tipo</Label>
        <Select value={tipoFilter} onValueChange={onTipoChange}>
          <SelectTrigger className="h-8 text-xs w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="creche">Creche</SelectItem>
            <SelectItem value="hotel">Hotel</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default CrecheRelatorioFilters;
