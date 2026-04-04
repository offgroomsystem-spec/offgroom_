import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Filter, ChevronUp, ChevronDown, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface FilterPanelProps {
  filtros: {
    periodo: string;
    dataInicio: string;
    dataFim: string;
    bancosSelecionados: string[];
  };
  setFiltros: (filtros: any) => void;
  onAplicar: () => void;
  onLimpar: () => void;
}

export const FilterPanel = ({
  filtros,
  setFiltros,
  onAplicar,
  onLimpar
}: FilterPanelProps) => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [contas, setContas] = useState<{id: string; nomeBanco: string}[]>([]);

  useEffect(() => {
    const loadContas = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('id, nome')
        .eq('user_id', user.id);
      
      if (error) {
        console.error('Erro ao carregar contas:', error);
        return;
      }
      
      setContas((data || []).map(c => ({ id: c.id, nomeBanco: c.nome })));
    };
    
    loadContas();
  }, [user]);
  return <Card className="mb-3">
      <CardHeader onClick={() => setIsOpen(!isOpen)} className="cursor-pointer my-0 px-[18px] py-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <CardTitle className="text-lg">Filtros</CardTitle>
          </div>
          {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </div>
      </CardHeader>
      
      {isOpen && <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Filtro de Período */}
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={filtros.periodo} onValueChange={value => setFiltros({
            ...filtros,
            periodo: value
          })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hoje">Hoje</SelectItem>
                  <SelectItem value="semana">Esta Semana</SelectItem>
                  <SelectItem value="mes">Este Mês</SelectItem>
                  <SelectItem value="trimestre">Este Trimestre</SelectItem>
                  <SelectItem value="ano">Este Ano</SelectItem>
                  <SelectItem value="customizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Se customizado, mostrar seletores de data */}
            {filtros.periodo === "customizado" && <>
                <div className="space-y-2">
                  <Label>Data Início</Label>
                  <Input type="date" value={filtros.dataInicio} onChange={e => setFiltros({
              ...filtros,
              dataInicio: e.target.value
            })} />
                </div>
                <div className="space-y-2">
                  <Label>Data Fim</Label>
                  <Input type="date" value={filtros.dataFim} onChange={e => setFiltros({
              ...filtros,
              dataFim: e.target.value
            })} />
                </div>
              </>}
          </div>
          
          {/* Filtro por Banco */}
          {contas.length > 0 && (
            <div className="space-y-2 mt-3">
              <Label>Filtrar por Banco</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto p-2 border rounded">
                {contas.map((conta) => (
                  <div key={conta.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`filtro-banco-${conta.id}`}
                      checked={filtros.bancosSelecionados?.includes(conta.nomeBanco)}
                      onChange={(e) => {
                        const novosBancos = e.target.checked
                          ? [...(filtros.bancosSelecionados || []), conta.nomeBanco]
                          : filtros.bancosSelecionados.filter(b => b !== conta.nomeBanco);
                        
                        setFiltros({ ...filtros, bancosSelecionados: novosBancos });
                      }}
                      className="h-4 w-4"
                    />
                    <Label 
                      htmlFor={`filtro-banco-${conta.id}`} 
                      className="text-xs cursor-pointer font-normal"
                    >
                      {conta.nomeBanco}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex gap-2 mt-3">
            <Button onClick={() => {
              onAplicar();
              setIsOpen(false);
            }}>
              <Check className="h-4 w-4 mr-2" />
              Aplicar Filtros
            </Button>
            <Button variant="outline" onClick={onLimpar}>
              <X className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </div>
        </CardContent>}
    </Card>;
};