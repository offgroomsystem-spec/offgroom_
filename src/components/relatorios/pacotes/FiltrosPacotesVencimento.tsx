import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Filter, Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Filtros {
  nomePacote: string;
  diasRestantes: string;
}

interface FiltrosPacotesVencimentoProps {
  filtros: Filtros;
  setFiltros: (filtros: Filtros) => void;
  pacotesDisponiveis: string[];
}

export const FiltrosPacotesVencimento = ({
  filtros,
  setFiltros,
  pacotesDisponiveis,
}: FiltrosPacotesVencimentoProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);

  const handleAplicarFiltros = () => {
    setIsOpen(false);
  };

  const handleLimparFiltros = () => {
    setFiltros({
      nomePacote: "",
      diasRestantes: "",
    });
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Filtros do Relatório</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Filtro: Nome do Pacote */}
          <div className="space-y-2">
            <Label>Nome do Pacote</Label>
            <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={openCombobox}
                  className="w-full justify-between"
                >
                  {filtros.nomePacote || "Selecione um pacote..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0">
                <Command>
                  <CommandInput placeholder="Buscar pacote..." />
                  <CommandEmpty>Nenhum pacote encontrado.</CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      value=""
                      onSelect={() => {
                        setFiltros({ ...filtros, nomePacote: "" });
                        setOpenCombobox(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          filtros.nomePacote === "" ? "opacity-100" : "opacity-0"
                        )}
                      />
                      Todos os pacotes
                    </CommandItem>
                    {pacotesDisponiveis.map((pacote) => (
                      <CommandItem
                        key={pacote}
                        value={pacote}
                        onSelect={(currentValue) => {
                          setFiltros({ ...filtros, nomePacote: currentValue });
                          setOpenCombobox(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            filtros.nomePacote === pacote ? "opacity-100" : "opacity-0"
                          )}
                        />
                        {pacote}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          
          {/* Filtro: Dias Restantes */}
          <div className="space-y-2">
            <Label>Dias Restantes para Vencimento</Label>
            <Select 
              value={filtros.diasRestantes}
              onValueChange={(value) => setFiltros({ ...filtros, diasRestantes: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos (0-7 dias)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos (0-7 dias)</SelectItem>
                <SelectItem value="0">0 dias (Vence Hoje)</SelectItem>
                <SelectItem value="1">1 dia</SelectItem>
                <SelectItem value="2">2 dias</SelectItem>
                <SelectItem value="3">3 dias</SelectItem>
                <SelectItem value="4">4 dias</SelectItem>
                <SelectItem value="5">5 dias</SelectItem>
                <SelectItem value="6">6 dias</SelectItem>
                <SelectItem value="7">7 dias</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        {/* Botões */}
        <div className="flex gap-2">
          <Button onClick={handleAplicarFiltros} className="flex-1">
            Aplicar Filtros
          </Button>
          <Button variant="outline" onClick={handleLimparFiltros}>
            Limpar Filtros
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
