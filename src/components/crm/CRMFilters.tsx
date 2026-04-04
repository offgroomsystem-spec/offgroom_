import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface CRMFiltersState {
  enviouMensagem: string;
  tentativa: string;
  teveResposta: string;
  agendouReuniao: string;
  usandoAcessoGratis: string;
  iniciouAcessoPago: string;
}

interface CRMFiltersProps {
  filters: CRMFiltersState;
  onChange: (filters: CRMFiltersState) => void;
}

const simNaoOptions = [
  { value: "sim", label: "Sim" },
  { value: "nao", label: "Não" },
];

const tentativaOptions = [
  { value: "0", label: "0" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
];

const CRMFilters = ({ filters, onChange }: CRMFiltersProps) => {
  const [open, setOpen] = useState(false);

  const handleChange = (key: keyof CRMFiltersState, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== "").length;

  const clearFilters = () => {
    onChange({
      enviouMensagem: "",
      tentativa: "",
      teveResposta: "",
      agendouReuniao: "",
      usandoAcessoGratis: "",
      iniciouAcessoPago: "",
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 gap-2">
          <Search className="h-4 w-4" />
          Aplicar Filtros
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Enviou mensagem?</label>
            <Select 
              value={filters.enviouMensagem || "placeholder"} 
              onValueChange={(v) => handleChange("enviouMensagem", v === "placeholder" ? "" : v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder" className="text-muted-foreground">Selecione...</SelectItem>
                {simNaoOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tentativa:</label>
            <Select 
              value={filters.tentativa || "placeholder"} 
              onValueChange={(v) => handleChange("tentativa", v === "placeholder" ? "" : v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder" className="text-muted-foreground">Selecione...</SelectItem>
                {tentativaOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Teve Resposta?</label>
            <Select 
              value={filters.teveResposta || "placeholder"} 
              onValueChange={(v) => handleChange("teveResposta", v === "placeholder" ? "" : v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder" className="text-muted-foreground">Selecione...</SelectItem>
                {simNaoOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Agendou Reunião?</label>
            <Select 
              value={filters.agendouReuniao || "placeholder"} 
              onValueChange={(v) => handleChange("agendouReuniao", v === "placeholder" ? "" : v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder" className="text-muted-foreground">Selecione...</SelectItem>
                {simNaoOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Usando Acesso Grátis?</label>
            <Select 
              value={filters.usandoAcessoGratis || "placeholder"} 
              onValueChange={(v) => handleChange("usandoAcessoGratis", v === "placeholder" ? "" : v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder" className="text-muted-foreground">Selecione...</SelectItem>
                {simNaoOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Iniciou acesso pago?</label>
            <Select 
              value={filters.iniciouAcessoPago || "placeholder"} 
              onValueChange={(v) => handleChange("iniciouAcessoPago", v === "placeholder" ? "" : v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="placeholder" className="text-muted-foreground">Selecione...</SelectItem>
                {simNaoOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {activeFiltersCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearFilters} 
              className="w-full h-9"
            >
              <X className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CRMFilters;
