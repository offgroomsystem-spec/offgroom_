import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Pencil, Trash2, Plus, Search, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Servico {
  id: string;
  nome: string;
  valor: number;
  porte: string;
}

interface ServicoExtra {
  id: string;
  nome: string;
  valor: number;
}

interface ServicoSelecionado {
  instanceId: string;
  id: string;
  nome: string;
  valor: number;
  servicosExtras?: ServicoExtra[];
}

interface Pacote {
  id: string;
  nome: string;
  servicos: ServicoSelecionado[];
  validade: string;
  descontoPercentual: number;
  descontoValor: number;
  valorFinal: number;
  porte: string;
}

const Pacotes = () => {
  const { user, ownerId } = useAuth();
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPacote, setEditingPacote] = useState<Pacote | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [servicosSelecionados, setServicosSelecionados] = useState<ServicoSelecionado[]>([]);
  const [servicoAtual, setServicoAtual] = useState<string>("");
  const [servicosFiltrados, setServicosFiltrados] = useState<Servico[]>([]);

  const [formData, setFormData] = useState({
    nome: "",
    porte: "",
    validade: "",
    descontoPercentual: "",
    descontoValor: "",
  });

  // Load data from Supabase
  useEffect(() => {
    if (user) {
      loadPacotes();
      loadServicos();
    }
  }, [user]);

  const loadPacotes = async () => {
    try {
      const { data, error } = await supabase
        .from('pacotes')
        .select('*')
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const pacotesFormatados = data.map((p: any) => ({
          id: p.id,
          nome: p.nome,
          servicos: p.servicos || [],
          validade: p.validade,
          descontoPercentual: Number(p.desconto_percentual || 0),
          descontoValor: Number(p.desconto_valor || 0),
          valorFinal: Number(p.valor_final || 0),
          porte: p.porte || "",
        }));
        setPacotes(pacotesFormatados);
      }
    } catch (error: any) {
      console.error('Erro ao carregar pacotes:', error);
      toast.error("Erro ao carregar pacotes");
    } finally {
      setLoading(false);
    }
  };

  const loadServicos = async () => {
    try {
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('user_id', ownerId)
        .order('nome');

      if (error) throw error;
      
      if (data) {
        const servicosFormatados = data.map((s: any) => ({
          id: s.id,
          nome: s.nome,
          valor: Number(s.valor || 0),
          porte: s.porte || "",
        }));
        setServicos(servicosFormatados);
      }
    } catch (error: any) {
      console.error('Erro ao carregar serviços:', error);
    }
  };

  // Filtrar serviços por porte
  useEffect(() => {
    if (formData.porte) {
      const filtrados = servicos.filter(s => s.porte === formData.porte);
      setServicosFiltrados(filtrados);
      
      // Remover serviços selecionados que não correspondem mais
      setServicosSelecionados(prev => 
        prev.filter(ss => {
          const servico = servicos.find(s => s.id === ss.id);
          return servico && servico.porte === formData.porte;
        })
      );
    } else {
      setServicosFiltrados([]);
    }
  }, [formData.porte, servicos]);

  // Calcular valor total dos serviços (incluindo extras)
  const valorTotalServicos = servicosSelecionados.reduce((acc, s) => {
    const valorExtras = (s.servicosExtras || []).reduce((sum, extra) => sum + extra.valor, 0);
    return acc + s.valor + valorExtras;
  }, 0);

  // Adicionar serviço extra a um banho específico
  const handleAddServicoExtra = (instanceId: string, servicoExtraId: string) => {
    const servicoExtra = servicos.find(s => s.id === servicoExtraId);
    if (!servicoExtra) return;
    
    setServicosSelecionados(prev => prev.map(servico => {
      if (servico.instanceId === instanceId) {
        const extras = servico.servicosExtras || [];
        if (extras.some(e => e.id === servicoExtraId)) {
          toast.error("Este serviço extra já foi adicionado");
          return servico;
        }
        return {
          ...servico,
          servicosExtras: [...extras, {
            id: servicoExtra.id,
            nome: servicoExtra.nome,
            valor: servicoExtra.valor
          }]
        };
      }
      return servico;
    }));
  };

  // Remover serviço extra
  const handleRemoveServicoExtra = (instanceId: string, servicoExtraId: string) => {
    setServicosSelecionados(prev => prev.map(servico => {
      if (servico.instanceId === instanceId) {
        return {
          ...servico,
          servicosExtras: (servico.servicosExtras || []).filter(e => e.id !== servicoExtraId)
        };
      }
      return servico;
    }));
  };

  // Calcular desconto em valor quando percentual é alterado
  const handleDescontoPercentualChange = (value: string) => {
    const percentual = parseFloat(value) || 0;
    const valorDesconto = (valorTotalServicos * percentual) / 100;
    setFormData({
      ...formData,
      descontoPercentual: value,
      descontoValor: valorDesconto.toFixed(2),
    });
  };

  // Calcular desconto em percentual quando valor é alterado
  const handleDescontoValorChange = (value: string) => {
    const valorDesconto = parseFloat(value) || 0;
    const percentual = valorTotalServicos > 0 ? (valorDesconto / valorTotalServicos) * 100 : 0;
    setFormData({
      ...formData,
      descontoValor: value,
      descontoPercentual: percentual.toFixed(2),
    });
  };

  // Adicionar serviço ao pacote
  const handleAddServico = () => {
    if (!servicoAtual) {
      toast.error("Selecione um serviço");
      return;
    }

    if (servicosSelecionados.length >= 10) {
      toast.error("Máximo de 10 serviços por pacote");
      return;
    }

    const servico = servicos.find(s => s.id === servicoAtual);
    if (servico) {
      const novoServico: ServicoSelecionado = {
        instanceId: Date.now().toString() + Math.random(),
        id: servico.id,
        nome: servico.nome,
        valor: servico.valor
      };
      setServicosSelecionados([...servicosSelecionados, novoServico]);
      setServicoAtual("");
    }
  };

  // Remover serviço do pacote
  const handleRemoveServico = (instanceId: string) => {
    setServicosSelecionados(servicosSelecionados.filter(s => s.instanceId !== instanceId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    if (!formData.nome || !formData.porte) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    if (servicosSelecionados.length === 0) {
      toast.error("Favor adicionar pelo menos um serviço!");
      return;
    }

    try {
      // Calcular valores (incluindo extras)
      const valorTotalSemDesconto = servicosSelecionados.reduce((acc, s) => {
        const valorExtras = (s.servicosExtras || []).reduce((sum, extra) => sum + extra.valor, 0);
        return acc + s.valor + valorExtras;
      }, 0);
      const descontoValor = parseFloat(formData.descontoValor) || 0;
      const descontoPercentual = parseFloat(formData.descontoPercentual) || 0;
      const valorFinal = valorTotalSemDesconto - descontoValor;

      const pacoteData = {
        nome: formData.nome,
        porte: formData.porte,
        servicos: servicosSelecionados as any,
        validade: formData.validade,
        desconto_percentual: descontoPercentual,
        desconto_valor: descontoValor,
        valor_final: valorFinal,
        valor: valorTotalSemDesconto,
        user_id: user.id
      };

      if (editingPacote) {
        const { error } = await supabase
          .from('pacotes')
          .update(pacoteData)
          .eq('id', editingPacote.id)
          .eq('user_id', user.id);

        if (error) throw error;
        toast.success("Pacote atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from('pacotes')
          .insert([pacoteData]);

        if (error) throw error;
        toast.success("Pacote cadastrado com sucesso!");
      }

      await loadPacotes();
      resetForm();
    } catch (error: any) {
      console.error('Erro ao salvar pacote:', error);
      toast.error("Erro ao salvar pacote");
    }
  };

  const resetForm = () => {
    setFormData({ nome: "", porte: "", validade: "", descontoPercentual: "", descontoValor: "" });
    setServicosSelecionados([]);
    setServicoAtual("");
    setEditingPacote(null);
    setIsDialogOpen(false);
  };

  const handleOpenDialog = () => {
    // Limpar campos de desconto ao abrir dialog para novo pacote
    setFormData({ nome: "", porte: "", validade: "", descontoPercentual: "", descontoValor: "" });
    setServicosSelecionados([]);
    setServicoAtual("");
    setEditingPacote(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (pacote: Pacote) => {
    setEditingPacote(pacote);
    setFormData({
      nome: pacote.nome,
      porte: pacote.porte || "",
      validade: pacote.validade,
      descontoPercentual: pacote.descontoPercentual.toString(),
      descontoValor: pacote.descontoValor.toString(),
    });
    setServicosSelecionados(pacote.servicos);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('pacotes')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      toast.success("Pacote removido com sucesso!");
      await loadPacotes();
    } catch (error: any) {
      console.error('Erro ao excluir pacote:', error);
      toast.error("Erro ao excluir pacote");
    }
  };

  const filteredPacotes = pacotes.filter(pacote =>
    pacote.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const valorFinalCalculado = valorTotalServicos - (parseFloat(formData.descontoValor) || 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="font-bold text-foreground">Pacotes</h1>
          <p className="text-muted-foreground text-xs">Gerencie os pacotes de serviços</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          if (open) {
            handleOpenDialog();
          } else {
            setIsDialogOpen(false);
          }
        }}>
          <DialogTrigger asChild>
            <Button className="gap-2 h-8 text-xs">
              <Plus className="h-3 w-3" />
              Novo Pacote
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg">{editingPacote ? "Editar Pacote" : "Novo Pacote"}</DialogTitle>
              <DialogDescription className="text-xs">
                Preencha os dados do pacote
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="nome" className="text-xs">Nome do Pacote</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Pacote Completo"
                  className="h-8 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="porte" className="text-xs">Porte do Pet *</Label>
                <Select
                  value={formData.porte}
                  onValueChange={(value) => setFormData({ ...formData, porte: value })}
                  required
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="Selecione o porte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pequeno">Pequeno</SelectItem>
                    <SelectItem value="Médio">Médio</SelectItem>
                    <SelectItem value="Grande">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Serviços do Pacote</Label>
                <div className="flex gap-2">
                  <Select 
                    value={servicoAtual} 
                    onValueChange={setServicoAtual}
                    disabled={!formData.porte}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder={
                        !formData.porte
                          ? "Selecione o porte primeiro"
                          : servicosFiltrados.length === 0
                          ? "Nenhum serviço disponível para este porte"
                          : "Selecione um serviço"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {servicosFiltrados.map((servico) => (
                        <SelectItem key={servico.id} value={servico.id}>
                          {servico.nome} - {formatCurrency(servico.valor)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" onClick={handleAddServico} size="sm" className="h-8 w-8 p-0">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
                
                {servicosSelecionados.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {servicosSelecionados.map((servico, index) => {
                      const total = servicosSelecionados.length;
                      const numero = String(index + 1).padStart(2, '0');
                      const totalFormatado = String(total).padStart(2, '0');
                      const valorExtras = (servico.servicosExtras || []).reduce((sum, e) => sum + e.valor, 0);
                      const valorTotalBanho = servico.valor + valorExtras;
                      
                      return (
                        <div key={servico.instanceId} className="bg-secondary/50 p-2 rounded text-xs space-y-1">
                          <div className="flex items-center justify-between">
                            <span>
                              <span className="font-semibold text-primary">{numero}/{totalFormatado}</span> - {servico.nome} - {formatCurrency(servico.valor)}
                            </span>
                            <div className="flex items-center gap-1">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button type="button" variant="outline" size="sm" className="h-6 text-[10px] px-2">
                                    + Serviço Extra
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-64 p-2" align="end">
                                  <div className="space-y-2">
                                    <p className="text-xs font-medium">Selecione um serviço extra:</p>
                                    <Select onValueChange={(value) => handleAddServicoExtra(servico.instanceId, value)}>
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue placeholder="Selecione..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {servicosFiltrados.map((s) => (
                                          <SelectItem key={s.id} value={s.id}>
                                            {s.nome} - {formatCurrency(s.valor)}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                </PopoverContent>
                              </Popover>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveServico(servico.instanceId)}
                                className="h-6 w-6 p-0"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                          
                          {/* Lista de serviços extras */}
                          {servico.servicosExtras && servico.servicosExtras.length > 0 && (
                            <div className="ml-8 space-y-1">
                              {servico.servicosExtras.map((extra) => (
                                <div key={extra.id} className="flex items-center justify-between text-muted-foreground">
                                  <span>+ {extra.nome} - {formatCurrency(extra.valor)}</span>
                                  <Button 
                                    type="button" 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => handleRemoveServicoExtra(servico.instanceId, extra.id)} 
                                    className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                                  >
                                    <X className="h-2 w-2" />
                                  </Button>
                                </div>
                              ))}
                              <div className="font-medium text-accent text-[10px]">
                                Subtotal banho: {formatCurrency(valorTotalBanho)}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="font-semibold text-xs mt-2">
                      Valor Total dos Serviços: {formatCurrency(valorTotalServicos)}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <Label htmlFor="validade" className="text-xs">Dias de Válidade do Pacote</Label>
                <Input
                  id="validade"
                  type="number"
                  min="1"
                  value={formData.validade}
                  onChange={(e) => setFormData({ ...formData, validade: e.target.value })}
                  placeholder="Ex: 30"
                  className="h-8 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label htmlFor="descontoPercentual" className="text-xs">Desconto (%)</Label>
                  <Input
                    id="descontoPercentual"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={formData.descontoPercentual}
                    onChange={(e) => handleDescontoPercentualChange(e.target.value)}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="descontoValor" className="text-xs">Desconto (R$)</Label>
                  <Input
                    id="descontoValor"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.descontoValor}
                    onChange={(e) => handleDescontoValorChange(e.target.value)}
                    placeholder="0.00"
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1 bg-secondary/30 p-3 rounded">
                <Label className="text-xs font-semibold">Valor Final do Pacote</Label>
                <div className="text-lg font-bold text-accent">
                  {formatCurrency(valorFinalCalculado)}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={resetForm} className="h-8 text-xs">
                  Cancelar
                </Button>
                <Button type="submit" className="h-8 text-xs">
                  {editingPacote ? "Atualizar" : "Salvar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="py-3">
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-base">Lista de Pacotes</CardTitle>
              <CardDescription className="text-xs">Total: {pacotes.length} pacotes cadastrados</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Buscar pacote..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 h-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-3">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 font-semibold text-xs">Pacote</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Porte</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Serviços</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Válidade</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Desconto</th>
                  <th className="text-left py-2 px-3 font-semibold text-xs">Valor Final</th>
                  <th className="text-right py-2 px-3 font-semibold text-xs">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredPacotes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                      Nenhum pacote cadastrado
                    </td>
                  </tr>
                ) : (
                  filteredPacotes.map((pacote) => (
                    <tr key={pacote.id} className="border-b hover:bg-secondary/50 transition-colors">
                      <td className="py-2 px-3 font-medium text-xs">{pacote.nome}</td>
                      <td className="py-2 px-3 text-xs">
                        <Badge variant="outline" className="text-[10px]">{pacote.porte}</Badge>
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {(() => {
                          // Agrupar serviços considerando extras
                          const servicosDescricao = pacote.servicos.map(servico => {
                            const extras = ((servico as any).servicosExtras || []) as ServicoExtra[];
                            if (extras.length > 0) {
                              return `${servico.nome} + ${extras.map(e => e.nome).join(' + ')}`;
                            }
                            return servico.nome;
                          });
                          
                          // Agrupar descrições iguais
                          const agrupados = servicosDescricao.reduce((acc, desc) => {
                            const existing = acc.find(s => s.desc === desc);
                            if (existing) {
                              existing.quantidade++;
                            } else {
                              acc.push({ desc, quantidade: 1 });
                            }
                            return acc;
                          }, [] as Array<{desc: string, quantidade: number}>);
                          
                          return agrupados.map(s => 
                            s.quantidade > 1 ? `${s.desc} x${s.quantidade}` : s.desc
                          ).join(", ");
                        })()}
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {pacote.validade} dias
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {pacote.descontoPercentual.toFixed(2)}% ({formatCurrency(pacote.descontoValor)})
                      </td>
                      <td className="py-2 px-3 text-xs">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full font-semibold bg-accent/10 text-accent text-xs">
                          {formatCurrency(pacote.valorFinal)}
                        </span>
                      </td>
                      <td className="py-2 px-3">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(pacote)} className="h-7 w-7 p-0">
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(pacote.id)} className="h-7 w-7 p-0">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Pacotes;
