import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface CrecheFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  tipoFilter: string;
  onTipoChange: (v: string) => void;
  statusFilter: string;
  onStatusChange: (v: string) => void;
  sortBy: string;
  onSortChange: (v: string) => void;
}

const CrecheFilters = ({
  search, onSearchChange,
  tipoFilter, onTipoChange,
  statusFilter, onStatusChange,
  sortBy, onSortChange,
}: CrecheFiltersProps) => {
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="relative flex-1 min-w-[180px]">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar pet ou tutor..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 text-sm pl-8"
        />
      </div>
      <Select value={tipoFilter} onValueChange={onTipoChange}>
        <SelectTrigger className="h-8 text-xs w-[110px]">
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="creche">Creche</SelectItem>
          <SelectItem value="hotel">Hotel</SelectItem>
        </SelectContent>
      </Select>
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="h-8 text-xs w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todos">Todos</SelectItem>
          <SelectItem value="ativo">Ativo</SelectItem>
          <SelectItem value="saida_hoje">Saída Hoje</SelectItem>
          <SelectItem value="observacao">Em Observação</SelectItem>
          <SelectItem value="atrasado">Atrasado</SelectItem>
        </SelectContent>
      </Select>
      <Select value={sortBy} onValueChange={onSortChange}>
        <SelectTrigger className="h-8 text-xs w-[130px]">
          <SelectValue placeholder="Ordenar" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="entrada">Entrada</SelectItem>
          <SelectItem value="saida">Prev. Saída</SelectItem>
          <SelectItem value="nome">Nome</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default CrecheFilters;
