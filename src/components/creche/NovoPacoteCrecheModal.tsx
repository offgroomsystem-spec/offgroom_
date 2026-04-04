import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Dog, Hotel, Plus, X, Search } from "lucide-react";
import { toast } from "sonner";

interface ServicoCreche {
  id: string;
  nome: string;
  tipo: string;
  modelo_preco: string;
  modelo_cobranca: string;
  valor_unico: number;
  valor_pequeno: number;
  valor_medio: number;
  valor_grande: number;
}

interface ServicoBanhoTosa {
  id: string;
  nome: string;
  porte: string;
  valor: number;
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

interface PacoteCreche {
  id: string;
  nome: string;
  tipo: string;
  servicos_ids: string[];
  desconto_percentual: number;
  desconto_valor: number;
  valor_total: number;
  valor_final: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingPacote?: PacoteCreche | null;
  onSaved: () => void;
}

const NovoPacoteCrecheModal = ({ open, onOpenChange, editingPacote, onSaved }: Props) => {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState<string>("creche");
  const [servicosSelecionados, setServicosSelecionados] = useState<ServicoSelecionado[]>([]);
  const [servicoAtual, setServicoAtual] = useState("");
  const [servicoSearchOpen, setServicoSearchOpen] = useState(false);
  const [descontoPct, setDescontoPct] = useState("");
  const [descontoVal, setDescontoVal] = useState("");
  const [lastEdited, setLastEdited] = useState<"pct" | "val">("pct");
  const [servicos, setServicos] = useState<ServicoCreche[]>([]);
  const [servicosExtrasBase, setServicosExtrasBase] = useState<ServicoBanhoTosa[]>([]);
  const [saving, setSaving] = useState(false);

  // Per-instance extras popover state
  const [extrasOpenId, setExtrasOpenId] = useState<string | null>(null);
  const [extrasPorteFilter, setExtrasPorteFilter] = useState<string>("");

  useEffect(() => {
    if (!open) return;
    loadServicos();
    loadServicosExtras();
    if (editingPacote) {
      setNome(editingPacote.nome);
      setTipo(editingPacote.tipo);
      setDescontoPct(editingPacote.desconto_percentual > 0 ? String(editingPacote.desconto_percentual) : "");
      setDescontoVal(editingPacote.desconto_valor > 0 ? String(editingPacote.desconto_valor) : "");
    } else {
      setNome("");
      setTipo("creche");
      setServicosSelecionados([]);
      setServicoAtual("");
      setDescontoPct("");
      setDescontoVal("");
    }
  }, [open, editingPacote]);

  useEffect(() => {
    if (!open || !editingPacote || servicos.length === 0) return;
    const rebuilt = (editingPacote.servicos_ids || []).map((id, idx) => {
      const s = servicos.find((sv) => sv.id === id);
      return {
        instanceId: `${Date.now()}-${idx}`,
        id,
        nome: s?.nome || "Serviço removido",
        valor: s ? getServicoValor(s) : 0,
        servicosExtras: [],
      };
    });
    setServicosSelecionados(rebuilt);
  }, [servicos, editingPacote, open]);

  const loadServicos = async () => {
    const { data } = await supabase.from("servicos_creche").select("*").order("nome");
    if (data) setServicos(data as any[]);
  };

  const loadServicosExtras = async () => {
    const { data } = await supabase.from("servicos").select("id, nome, porte, valor").order("nome");
    if (data) setServicosExtrasBase(data);
  };

  const filteredServicos = useMemo(() => servicos.filter((s) => s.tipo === tipo), [servicos, tipo]);

  const getServicoValor = (s: ServicoCreche) => {
    if (s.modelo_preco === "unico") return s.valor_unico || 0;
    return Math.max(s.valor_pequeno || 0, s.valor_medio || 0, s.valor_grande || 0);
  };

  const valorTotalServicos = useMemo(() => {
    return servicosSelecionados.reduce((acc, s) => {
      const valorExtras = (s.servicosExtras || []).reduce((sum, e) => sum + e.valor, 0);
      return acc + s.valor + valorExtras;
    }, 0);
  }, [servicosSelecionados]);

  useEffect(() => {
    if (valorTotalServicos <= 0) return;
    if (lastEdited === "pct") {
      const pct = parseFloat(descontoPct.replace(",", ".")) || 0;
      const val = (valorTotalServicos * pct) / 100;
      setDescontoVal(val > 0 ? val.toFixed(2) : "");
    } else {
      const val = parseFloat(descontoVal.replace(",", ".")) || 0;
      const pct = (val / valorTotalServicos) * 100;
      setDescontoPct(pct > 0 ? pct.toFixed(2) : "");
    }
  }, [descontoPct, descontoVal, lastEdited, valorTotalServicos]);

  const descontoNumerico = parseFloat(descontoVal.replace(",", ".")) || 0;
  const valorFinal = Math.max(0, valorTotalServicos - descontoNumerico);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleAddServico = () => {
    if (!servicoAtual) {
      toast.error("Selecione um serviço");
      return;
    }
    const servico = servicos.find((s) => s.id === servicoAtual);
    if (!servico) return;

    setServicosSelecionados((prev) => [
      ...prev,
      {
        instanceId: `${Date.now()}-${Math.random()}`,
        id: servico.id,
        nome: servico.nome,
        valor: getServicoValor(servico),
        servicosExtras: [],
      },
    ]);
    setServicoAtual("");
  };

  const handleRemoveServico = (instanceId: string) => {
    setServicosSelecionados((prev) => prev.filter((s) => s.instanceId !== instanceId));
  };

  const handleAddServicoExtra = (instanceId: string, servicoExtra: ServicoBanhoTosa) => {
    setServicosSelecionados((prev) =>
      prev.map((servico) => {
        if (servico.instanceId === instanceId) {
          const extras = servico.servicosExtras || [];
          if (extras.some((e) => e.id === servicoExtra.id)) {
            toast.error("Este serviço extra já foi adicionado");
            return servico;
          }
          return {
            ...servico,
            servicosExtras: [
              ...extras,
              { id: servicoExtra.id, nome: servicoExtra.nome, valor: servicoExtra.valor },
            ],
          };
        }
        return servico;
      })
    );
  };

  const handleRemoveServicoExtra = (instanceId: string, servicoExtraId: string) => {
    setServicosSelecionados((prev) =>
      prev.map((servico) => {
        if (servico.instanceId === instanceId) {
          return {
            ...servico,
            servicosExtras: (servico.servicosExtras || []).filter((e) => e.id !== servicoExtraId),
          };
        }
        return servico;
      })
    );
  };

  useEffect(() => {
    setServicosSelecionados((prev) =>
      prev.filter((sel) => servicos.find((s) => s.id === sel.id && s.tipo === tipo))
    );
    setServicoAtual("");
  }, [tipo, servicos]);

  const normalizePorte = (porte: string) => {
    const p = porte?.toLowerCase().trim() || "";
    if (p.includes("pequeno") || p === "p") return "pequeno";
    if (p.includes("medio") || p.includes("médio") || p === "m") return "medio";
    if (p.includes("grande") || p === "g") return "grande";
    if (p.includes("todos") || p.includes("all")) return "todos";
    return p;
  };

  const getFilteredExtras = (instanceId: string) => {
    const servico = servicosSelecionados.find((s) => s.instanceId === instanceId);
    const alreadyAddedIds = (servico?.servicosExtras || []).map((e) => e.id);

    return servicosExtrasBase.filter((s) => {
      // Exclude already added
      if (alreadyAddedIds.includes(s.id)) return false;
      // Exclude items starting with "Pacote"
      if (s.nome.toLowerCase().startsWith("pacote")) return false;
      // Apply porte filter
      if (extrasPorteFilter) {
        const normalized = normalizePorte(s.porte);
        if (extrasPorteFilter === "todos") {
          return normalized === "todos";
        }
        return normalized === extrasPorteFilter;
      }
      return true;
    });
  };

  const handleSave = async () => {
    if (!nome.trim()) {
      toast.error("Informe o nome do pacote");
      return;
    }
    if (servicosSelecionados.length === 0) {
      toast.error("Selecione ao menos um serviço");
      return;
    }

    setSaving(true);
    const payload = {
      nome: nome.trim(),
      tipo,
      servicos_ids: servicosSelecionados.map((s) => s.id),
      desconto_percentual: parseFloat(descontoPct.replace(",", ".")) || 0,
      desconto_valor: descontoNumerico,
      valor_total: valorTotalServicos,
      valor_final: valorFinal,
      user_id: user!.id,
    };

    let error;
    if (editingPacote) {
      ({ error } = await supabase
        .from("pacotes_creche" as any)
        .update(payload as any)
        .eq("id", editingPacote.id));
    } else {
      ({ error } = await supabase.from("pacotes_creche" as any).insert(payload as any));
    }

    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar pacote");
      console.error(error);
      return;
    }
    toast.success(editingPacote ? "Pacote atualizado" : "Pacote criado com sucesso");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">
            {editingPacote ? "Editar Pacote" : "Novo Pacote"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Preencha os dados do pacote de creche/hotel
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {/* Nome */}
          <div className="space-y-1">
            <Label className="text-xs">Nome do Pacote *</Label>
            <Input
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex: Pacote Mensal Creche"
              className="h-8 text-xs"
            />
          </div>

          {/* Tipo */}
          <div className="space-y-1">
            <Label className="text-xs">Tipo de Estadia *</Label>
            <ToggleGroup
              type="single"
              value={tipo}
              onValueChange={(v) => v && setTipo(v)}
              className="justify-start"
              size="sm"
            >
              <ToggleGroupItem value="creche" className="gap-1 h-7 px-2.5 text-xs">
                <Dog className="h-3 w-3" /> Creche
              </ToggleGroupItem>
              <ToggleGroupItem value="hotel" className="gap-1 h-7 px-2.5 text-xs">
                <Hotel className="h-3 w-3" /> Hotel
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {/* Serviços - Com busca por lupa */}
          <div className="space-y-1">
            <Label className="text-xs">Serviços do Pacote *</Label>
            <div className="flex gap-2">
              <Popover open={servicoSearchOpen} onOpenChange={setServicoSearchOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    className="h-8 text-xs flex-1 justify-between font-normal"
                  >
                    {servicoAtual
                      ? (() => {
                          const s = servicos.find((sv) => sv.id === servicoAtual);
                          return s ? `${s.nome} - ${formatCurrency(getServicoValor(s))}` : "Selecione um serviço";
                        })()
                      : filteredServicos.length === 0
                      ? "Nenhum serviço disponível"
                      : "Selecione um serviço"}
                    <Search className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar serviço..." className="h-8 text-xs" />
                    <CommandList className="max-h-60">
                      <CommandEmpty className="text-xs p-2">Nenhum serviço encontrado</CommandEmpty>
                      <CommandGroup>
                        {filteredServicos.map((s) => (
                          <CommandItem
                            key={s.id}
                            value={`${s.nome}`}
                            onSelect={() => {
                              setServicoAtual(s.id);
                              setServicoSearchOpen(false);
                            }}
                            className="text-xs cursor-pointer"
                          >
                            <span className="flex-1">{s.nome}</span>
                            <span className="text-muted-foreground ml-2">{formatCurrency(getServicoValor(s))}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button type="button" onClick={handleAddServico} size="sm" className="h-8 w-8 p-0">
                <Plus className="h-3 w-3" />
              </Button>
            </div>

            {servicosSelecionados.length > 0 && (
              <div className="mt-2 space-y-2">
                {servicosSelecionados.map((servico, index) => {
                  const total = servicosSelecionados.length;
                  const numero = String(index + 1).padStart(2, "0");
                  const totalFormatado = String(total).padStart(2, "0");
                  const valorExtras = (servico.servicosExtras || []).reduce((sum, e) => sum + e.valor, 0);
                  const valorTotalItem = servico.valor + valorExtras;
                  const isExtrasOpen = extrasOpenId === servico.instanceId;

                  return (
                    <div key={servico.instanceId} className="bg-secondary/50 p-2 rounded text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span>
                          <span className="font-semibold text-primary">
                            {numero}/{totalFormatado}
                          </span>{" "}
                          - {servico.nome} - {formatCurrency(servico.valor)}
                        </span>
                        <div className="flex items-center gap-1">
                          <Popover
                            open={isExtrasOpen}
                            onOpenChange={(open) => {
                              setExtrasOpenId(open ? servico.instanceId : null);
                              if (open) setExtrasPorteFilter("");
                            }}
                          >
                            <PopoverTrigger asChild>
                              <Button type="button" variant="outline" size="sm" className="h-6 text-[10px] px-2">
                                + Serviço Extra
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-0" align="end">
                              <div className="p-2 pb-1 space-y-2">
                                <p className="text-xs font-medium">Selecione um serviço extra:</p>
                                {/* Porte filter radio */}
                                <RadioGroup
                                  value={extrasPorteFilter}
                                  onValueChange={(v) => setExtrasPorteFilter(v === extrasPorteFilter ? "" : v)}
                                  className="flex flex-wrap gap-x-3 gap-y-1"
                                >
                                  {[
                                    { value: "pequeno", label: "Pequeno" },
                                    { value: "medio", label: "Médio" },
                                    { value: "grande", label: "Grande" },
                                    { value: "todos", label: "Para todos" },
                                  ].map((opt) => (
                                    <div key={opt.value} className="flex items-center gap-1">
                                      <RadioGroupItem
                                        value={opt.value}
                                        id={`porte-extra-${servico.instanceId}-${opt.value}`}
                                        className="h-3 w-3"
                                        onClick={() => {
                                          if (extrasPorteFilter === opt.value) {
                                            setExtrasPorteFilter("");
                                          }
                                        }}
                                      />
                                      <Label
                                        htmlFor={`porte-extra-${servico.instanceId}-${opt.value}`}
                                        className="text-[10px] cursor-pointer"
                                      >
                                        {opt.label}
                                      </Label>
                                    </div>
                                  ))}
                                </RadioGroup>
                              </div>
                              <Command>
                                <CommandInput placeholder="Buscar serviço extra..." className="h-8 text-xs" />
                                <CommandList className="max-h-48">
                                  <CommandEmpty className="text-xs p-2">Nenhum serviço encontrado</CommandEmpty>
                                  <CommandGroup>
                                    {getFilteredExtras(servico.instanceId).map((s) => (
                                      <CommandItem
                                        key={s.id}
                                        value={s.nome}
                                        onSelect={() => {
                                          handleAddServicoExtra(servico.instanceId, s);
                                        }}
                                        className="text-xs cursor-pointer"
                                      >
                                        <span className="flex-1 truncate">{s.nome}</span>
                                        <span className="text-muted-foreground ml-2 shrink-0">
                                          {formatCurrency(s.valor)}
                                        </span>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
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
                            Subtotal: {formatCurrency(valorTotalItem)}
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

          {/* Descontos */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Desconto (%)</Label>
              <Input
                value={descontoPct}
                onChange={(e) => {
                  setDescontoPct(e.target.value);
                  setLastEdited("pct");
                }}
                placeholder="0"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Desconto (R$)</Label>
              <Input
                value={descontoVal}
                onChange={(e) => {
                  setDescontoVal(e.target.value);
                  setLastEdited("val");
                }}
                placeholder="0,00"
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Valor Final */}
          <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">Valor Final</span>
            <span className="text-sm font-bold text-foreground">{formatCurrency(valorFinal)}</span>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {editingPacote ? "Atualizar" : "Criar Pacote"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NovoPacoteCrecheModal;
