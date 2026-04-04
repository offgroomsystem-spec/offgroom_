import { FormEvent, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Plus } from "lucide-react";
import { toast } from "sonner";
import { categoriasDescricao1, categoriasDescricao2 } from "@/constants/categorias";
import { supabase } from "@/integrations/supabase/client";

type PetOption = {
  id: string;
  nome: string;
  raca: string;
};

type ClienteOption = {
  id: string;
  nomeCliente: string;
  pets: PetOption[];
};

type ServicoOption = {
  id: string;
  nome: string;
  valor: number;
};

type ProdutoOption = {
  id: string;
  nome: string;
  valor: number;
};

type ContaOption = {
  id: string;
  nome: string;
};

type ItemFinanceiro = {
  id: string;
  descricao2: string;
  produtoServico: string;
  quantidade: number;
  valor: number;
};

type FormFinanceiro = {
  ano: string;
  mesCompetencia: string;
  tipo: "Receita" | "Despesa";
  descricao1: string;
  clienteId: string;
  petIds: string[];
  dataPagamento: string;
  contaId: string;
  pago: boolean;
  modoAjuste: "deducao" | "juros";
  valorDeducao: number;
  tipoDeducao: string;
  valorJuros: number;
  tipoJuros: string;
};

const MESES = [
  { value: "01", label: "Janeiro" },
  { value: "02", label: "Fevereiro" },
  { value: "03", label: "Março" },
  { value: "04", label: "Abril" },
  { value: "05", label: "Maio" },
  { value: "06", label: "Junho" },
  { value: "07", label: "Julho" },
  { value: "08", label: "Agosto" },
  { value: "09", label: "Setembro" },
  { value: "10", label: "Outubro" },
  { value: "11", label: "Novembro" },
  { value: "12", label: "Dezembro" },
];

interface FinanceiroEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lancamento: any | null;
  itens: any[];
  clientes: ClienteOption[];
  servicos: ServicoOption[];
  ownerId: string;
  onUpdated?: (lancamentoId?: string) => Promise<void> | void;
}

const defaultForm: FormFinanceiro = {
  ano: "",
  mesCompetencia: "",
  tipo: "Receita",
  descricao1: "",
  clienteId: "",
  petIds: [],
  dataPagamento: "",
  contaId: "",
  pago: false,
  modoAjuste: "deducao",
  valorDeducao: 0,
  tipoDeducao: "",
  valorJuros: 0,
  tipoJuros: "",
};

export const FinanceiroEditDialog = ({
  open,
  onOpenChange,
  lancamento,
  itens,
  clientes,
  servicos,
  ownerId,
  onUpdated,
}: FinanceiroEditDialogProps) => {
  // When linked to an appointment, lock client/pet editing
  const isLinkedToAgendamento = Boolean(lancamento?.agendamento_id);
  const [form, setForm] = useState<FormFinanceiro>(defaultForm);
  const [itensForm, setItensForm] = useState<ItemFinanceiro[]>([]);
  const [produtos, setProdutos] = useState<ProdutoOption[]>([]);
  const [contas, setContas] = useState<ContaOption[]>([]);
  const [openAddPetPopover, setOpenAddPetPopover] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !ownerId) return;

    const loadData = async () => {
      const [{ data: contasData }, { data: produtosData }] = await Promise.all([
        supabase
          .from("contas_bancarias")
          .select("id, nome")
          .eq("user_id", ownerId)
          .order("created_at", { ascending: true }),
        supabase
          .from("produtos")
          .select("id, nome, valor")
          .eq("user_id", ownerId)
          .order("nome", { ascending: true }),
      ]);

      setContas((contasData || []).map((c: any) => ({ id: c.id, nome: c.nome })));
      setProdutos((produtosData || []).map((p: any) => ({ id: p.id, nome: p.nome, valor: Number(p.valor) || 0 })));
    };

    loadData();
  }, [open, ownerId]);

  useEffect(() => {
    if (!open || !lancamento) {
      setForm(defaultForm);
      setItensForm([]);
      return;
    }

    const petIds = Array.isArray(lancamento.pet_ids)
      ? lancamento.pet_ids.filter((value: unknown): value is string => typeof value === "string")
      : [];

    // Find clienteId from lancamento or by matching pet IDs
    let clienteId = typeof lancamento.cliente_id === "string" ? lancamento.cliente_id : "";
    
    // Verify clienteId exists in our clientes list
    if (clienteId && !clientes.find((c) => c.id === clienteId)) {
      clienteId = "";
    }
    
    // If clienteId not found, try to find by any pet ID
    if (!clienteId && petIds.length > 0) {
      for (const pId of petIds) {
        const clienteByPet = clientes.find((cliente) => cliente.pets.some((pet) => pet.id === pId));
        if (clienteByPet) {
          clienteId = clienteByPet.id;
          break;
        }
      }
    }

    // Ensure all pet IDs actually belong to this client's pets
    const clientePets = clientes.find((c) => c.id === clienteId)?.pets || [];
    const validPetIds = petIds.filter((pId) => clientePets.some((p) => p.id === pId));
    
    

    setForm({
      ano: lancamento.ano || "",
      mesCompetencia: lancamento.mes_competencia || "",
      tipo: lancamento.tipo === "Despesa" ? "Despesa" : "Receita",
      descricao1: lancamento.descricao1 || "",
      clienteId,
      petIds: validPetIds,
      dataPagamento: lancamento.data_pagamento || "",
      contaId: lancamento.conta_id || "",
      pago: Boolean(lancamento.pago),
      modoAjuste: lancamento.modo_ajuste === "juros" ? "juros" : "deducao",
      valorDeducao: Number(lancamento.valor_deducao) || 0,
      tipoDeducao: lancamento.tipo_deducao || "",
      valorJuros: Number(lancamento.valor_juros) || 0,
      tipoJuros: lancamento.tipo_juros || "",
    });

    if ((itens || []).length > 0) {
      // Collect all pet names from the selected client to detect "PetName - Service" prefixes
      const allPetNames = new Set<string>();
      const petIds = Array.isArray(lancamento.pet_ids)
        ? lancamento.pet_ids.filter((v: unknown): v is string => typeof v === "string")
        : [];
      for (const c of clientes) {
        for (const p of c.pets) {
          if (petIds.includes(p.id)) {
            allPetNames.add(p.nome.toLowerCase());
          }
        }
      }

      setItensForm(
        itens.map((item: any) => {
          // Strip "PetName - " prefix ONLY when the part before " - " is a known pet name
          let produtoServico = item.produto_servico || "";
          if (produtoServico.includes(" - ")) {
            const prefix = produtoServico.split(" - ")[0].trim();
            if (allPetNames.has(prefix.toLowerCase())) {
              produtoServico = produtoServico.split(" - ").slice(1).join(" - ");
            }
          }
          return {
            id: item.id || crypto.randomUUID(),
            descricao2: item.descricao2 || "",
            produtoServico,
            quantidade: Number(item.quantidade) > 0 ? Number(item.quantidade) : 1,
            valor: Number(item.valor) || 0,
          };
        }),
      );
      return;
    }

    setItensForm([
      { id: crypto.randomUUID(), descricao2: "Serviços", produtoServico: "", quantidade: 1, valor: 0 },
    ]);
  }, [open, lancamento, itens, clientes]);

  const petsDoCliente = useMemo(
    () => clientes.find((cliente) => cliente.id === form.clienteId)?.pets || [],
    [clientes, form.clienteId],
  );

  const descricao2Options = useMemo(() => {
    if (!form.descricao1) return [];
    return categoriasDescricao2[form.descricao1] || [];
  }, [form.descricao1]);

  const subtotal = useMemo(
    () => itensForm.reduce((sum, item) => sum + (Number(item.valor) || 0) * (Number(item.quantidade) || 1), 0),
    [itensForm],
  );

  const valorTotal = useMemo(() => {
    if (form.modoAjuste === "juros") {
      return subtotal + (Number(form.valorJuros) || 0);
    }
    return subtotal - (Number(form.valorDeducao) || 0);
  }, [subtotal, form.modoAjuste, form.valorJuros, form.valorDeducao]);

  const addItem = () => {
    setItensForm((prev) => [...prev, { id: crypto.randomUUID(), descricao2: "", produtoServico: "", quantidade: 1, valor: 0 }]);
  };

  const removeItem = (id: string) => {
    if (itensForm.length === 1) return;
    setItensForm((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItem = (id: string, patch: Partial<ItemFinanceiro>) => {
    setItensForm((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!lancamento) return;
    if (!form.ano || !form.mesCompetencia || !form.tipo || !form.descricao1) {
      toast.error("Preencha os campos obrigatórios do lançamento.");
      return;
    }

    if (!form.dataPagamento) {
      toast.error("Informe a data de pagamento.");
      return;
    }

    if (!form.contaId) {
      toast.error("Selecione a conta bancária.");
      return;
    }

    const itensValidos = itensForm.filter((item) => item.descricao2 && Number(item.valor) > 0);
    if (itensValidos.length === 0) {
      toast.error("Inclua ao menos um item válido.");
      return;
    }

    if (form.modoAjuste === "deducao" && Number(form.valorDeducao) >= 0.01 && !form.tipoDeducao) {
      toast.error("Selecione o tipo de dedução.");
      return;
    }

    if (form.modoAjuste === "juros" && Number(form.valorJuros) >= 0.01 && !form.tipoJuros) {
      toast.error("Selecione o motivo dos juros.");
      return;
    }

    setSaving(true);

    try {
      const petIds = form.petIds.filter(Boolean);

      const { data: updateData, error: updateError } = await supabase
        .from("lancamentos_financeiros")
        .update({
          ano: form.ano,
          mes_competencia: form.mesCompetencia,
          tipo: form.tipo,
          descricao1: form.descricao1,
          cliente_id: form.clienteId || null,
          pet_ids: petIds,
          valor_total: valorTotal,
          data_pagamento: form.dataPagamento,
          conta_id: form.contaId,
          pago: form.pago,
          valor_deducao: form.modoAjuste === "deducao" ? Number(form.valorDeducao) || 0 : 0,
          tipo_deducao: form.modoAjuste === "deducao" ? form.tipoDeducao || null : null,
          valor_juros: form.modoAjuste === "juros" ? Number(form.valorJuros) || 0 : 0,
          tipo_juros: form.modoAjuste === "juros" ? form.tipoJuros || null : null,
          modo_ajuste: form.modoAjuste,
        })
        .eq("id", lancamento.id)
        .select();

      if (updateError) throw updateError;
      
      if (!updateData || updateData.length === 0) {
        throw new Error("Nenhum registro foi atualizado. Verifique as permissões.");
      }

      const { error: deleteError } = await supabase
        .from("lancamentos_financeiros_itens")
        .delete()
        .eq("lancamento_id", lancamento.id);

      if (deleteError) throw deleteError;

      const payloadItens = itensValidos.map((item) => ({
        lancamento_id: lancamento.id,
        descricao2: item.descricao2,
        produto_servico: item.produtoServico || null,
        quantidade: Number(item.quantidade) > 0 ? Number(item.quantidade) : 1,
        valor: Number(item.valor) || 0,
      }));

      const { error: insertError } = await supabase.from("lancamentos_financeiros_itens").insert(payloadItens);
      if (insertError) throw insertError;

      toast.success("Lançamento financeiro atualizado com sucesso!");
      await onUpdated?.(lancamento.id);
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao atualizar lançamento financeiro:", error);
      toast.error("Erro ao atualizar lançamento financeiro.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base">Editar Lançamento</DialogTitle>
          <DialogDescription className="text-[10px]">Atualize os dados do lançamento financeiro</DialogDescription>
        </DialogHeader>

        {!lancamento ? (
          <p className="text-xs text-muted-foreground">Nenhum lançamento financeiro vinculado encontrado.</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Ano *</Label>
                <Input
                  type="number"
                  min="2020"
                  max="2050"
                  value={form.ano}
                  onChange={(e) => setForm((prev) => ({ ...prev, ano: e.target.value }))}
                  className="h-7 text-xs"
                />
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Mês Competência *</Label>
                <Select value={form.mesCompetencia} onValueChange={(value) => setForm((prev) => ({ ...prev, mesCompetencia: value }))}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {MESES.map((mes) => (
                      <SelectItem key={mes.value} value={mes.value} className="text-xs">
                        {mes.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Tipo *</Label>
                <Select
                  value={form.tipo}
                  onValueChange={(value: "Receita" | "Despesa") =>
                    setForm((prev) => ({ ...prev, tipo: value, descricao1: "" }))
                  }
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Receita" className="text-xs">Receita</SelectItem>
                    <SelectItem value="Despesa" className="text-xs">Despesa</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Descrição 1 *</Label>
                <Select
                  value={form.descricao1}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, descricao1: value }))}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categoriasDescricao1[form.tipo] || []).map((desc) => (
                      <SelectItem key={desc} value={desc} className="text-xs">
                        {desc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Nome do Cliente *</Label>
                <Select
                  value={form.clienteId}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, clienteId: value, petIds: [] }))
                  }
                  disabled={isLinkedToAgendamento}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id} className="text-xs">
                        {cliente.nomeCliente}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-[10px] font-semibold">Pets *</Label>
                  {petsDoCliente.filter((pet) => !form.petIds.includes(pet.id)).length > 0 && (
                    <Popover open={openAddPetPopover} onOpenChange={setOpenAddPetPopover}>
                      <PopoverTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="h-6 text-[10px] px-2 gap-1">
                          <Plus className="h-3 w-3" /> Pet
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2">
                        <div className="space-y-1 max-h-44 overflow-y-auto">
                          {petsDoCliente
                            .filter((pet) => !form.petIds.includes(pet.id))
                            .map((pet) => (
                              <Button
                                key={pet.id}
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start h-8 text-xs"
                                onClick={() =>
                                  setForm((prev) => ({ ...prev, petIds: [...prev.petIds, pet.id] }))
                                }
                              >
                                {pet.nome} ({pet.raca})
                              </Button>
                            ))}
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                {form.petIds.length > 0 ? (
                  <div className="flex flex-wrap gap-1 min-h-[28px] border rounded-md p-1.5">
                    {form.petIds.map((petId) => {
                      const pet = petsDoCliente.find((p) => p.id === petId);
                      if (!pet) return null;
                      return (
                        <div key={petId} className="inline-flex items-center gap-1 rounded-md bg-accent px-2 py-0.5 text-[10px]">
                          {pet.nome}
                          <button
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                petIds: prev.petIds.filter((id) => id !== petId),
                              }))
                            }
                            disabled={isLinkedToAgendamento}
                            className={isLinkedToAgendamento ? "opacity-30 cursor-not-allowed" : ""}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-7 border rounded-md flex items-center px-3 text-xs text-muted-foreground">
                    Nenhum pet selecionado
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2 border rounded-md p-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Itens do Lançamento</Label>
                <Button type="button" variant="outline" size="sm" className="h-6 text-[10px] gap-1" onClick={addItem}>
                  <Plus className="h-3 w-3" /> Adicionar Item
                </Button>
              </div>

              {itensForm.map((item) => {
                let optionsProdutoServico =
                  item.descricao2 === "Serviços"
                    ? servicos.map((servico) => ({ value: servico.nome, label: servico.nome, valor: servico.valor }))
                    : item.descricao2 === "Venda"
                      ? produtos.map((produto) => ({ value: produto.nome, label: produto.nome, valor: produto.valor }))
                      : [];

                // If current value (e.g. package name) isn't in the options list, add it so Select displays it
                if (item.produtoServico && optionsProdutoServico.length > 0 && !optionsProdutoServico.some(o => o.value === item.produtoServico)) {
                  optionsProdutoServico = [{ value: item.produtoServico, label: item.produtoServico, valor: item.valor }, ...optionsProdutoServico];
                }

                return (
                  <div key={item.id} className="grid grid-cols-[2fr_2fr_0.7fr_1fr_1fr_auto] gap-1.5 items-end border rounded-md p-2">
                    <div className="space-y-0.5">
                      <Label className="text-[10px] font-semibold">Descrição 2 *</Label>
                      <Select
                        value={item.descricao2}
                        onValueChange={(value) => updateItem(item.id, { descricao2: value, produtoServico: "" })}
                      >
                        <SelectTrigger className="h-7 text-xs">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {descricao2Options.map((option) => (
                            <SelectItem key={option} value={option} className="text-xs">
                              {option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-0.5">
                      <Label className="text-[10px] font-semibold">Serviço/Produto *</Label>
                      {optionsProdutoServico.length > 0 ? (
                        <Select
                          value={item.produtoServico}
                          onValueChange={(value) => {
                            const selected = optionsProdutoServico.find((option) => option.value === value);
                            updateItem(item.id, { produtoServico: value, valor: selected?.valor ?? item.valor });
                          }}
                        >
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            {optionsProdutoServico.map((option) => (
                              <SelectItem key={option.value} value={option.value} className="text-xs">
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={item.produtoServico}
                          onChange={(e) => updateItem(item.id, { produtoServico: e.target.value })}
                          className="h-7 text-xs"
                        />
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <Label className="text-[10px] font-semibold">Qtd</Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantidade}
                        onChange={(e) => updateItem(item.id, { quantidade: Number(e.target.value) || 1 })}
                        className="h-7 text-xs"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <Label className="text-[10px] font-semibold">Valor *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.valor}
                        onChange={(e) => updateItem(item.id, { valor: Number(e.target.value) || 0 })}
                        className="h-7 text-xs"
                      />
                    </div>

                    <div className="space-y-0.5">
                      <Label className="text-[10px] font-semibold">Total</Label>
                      <Input value={((item.valor || 0) * (item.quantidade || 1)).toFixed(2)} readOnly className="h-7 text-xs" />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => removeItem(item.id)}
                      disabled={itensForm.length === 1}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                );
              })}

              <div className="flex items-end justify-between gap-2 pt-1">
                <div className="flex items-end gap-2">
                  <div className="inline-flex rounded-md border overflow-hidden h-7">
                    <Button
                      type="button"
                      variant={form.modoAjuste === "deducao" ? "default" : "ghost"}
                      className="h-7 rounded-none text-[10px] px-3"
                      onClick={() => setForm((prev) => ({ ...prev, modoAjuste: "deducao" }))}
                    >
                      Dedução
                    </Button>
                    <Button
                      type="button"
                      variant={form.modoAjuste === "juros" ? "default" : "ghost"}
                      className="h-7 rounded-none text-[10px] px-3"
                      onClick={() => setForm((prev) => ({ ...prev, modoAjuste: "juros" }))}
                    >
                      Juros
                    </Button>
                  </div>

                  {form.modoAjuste === "deducao" ? (
                    <>
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold">Valor da Dedução</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={form.valorDeducao}
                          onChange={(e) => setForm((prev) => ({ ...prev, valorDeducao: Number(e.target.value) || 0 }))}
                          className="h-7 text-xs w-28"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold">Tipo de Dedução</Label>
                        <Select
                          value={form.tipoDeducao}
                          onValueChange={(value) => setForm((prev) => ({ ...prev, tipoDeducao: value }))}
                        >
                          <SelectTrigger className="h-7 text-xs w-36">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Tarifa Bancária" className="text-xs">Tarifa Bancária</SelectItem>
                            <SelectItem value="Desconto" className="text-xs">Desconto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold">Valor do Juros</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={form.valorJuros}
                          onChange={(e) => setForm((prev) => ({ ...prev, valorJuros: Number(e.target.value) || 0 }))}
                          className="h-7 text-xs w-28"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <Label className="text-[10px] font-semibold">Motivo do Juros</Label>
                        <Select
                          value={form.tipoJuros}
                          onValueChange={(value) => setForm((prev) => ({ ...prev, tipoJuros: value }))}
                        >
                          <SelectTrigger className="h-7 text-xs w-36">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Mora" className="text-xs">Mora</SelectItem>
                            <SelectItem value="Multa" className="text-xs">Multa</SelectItem>
                            <SelectItem value="Correção" className="text-xs">Correção</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>

                <div className="text-right">
                  <Label className="text-xs font-semibold">Valor Total:</Label>
                  <p className="text-xl font-bold text-primary">R$ {valorTotal.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Data de Pagamento</Label>
                <Input
                  type="date"
                  value={form.dataPagamento}
                  onChange={(e) => setForm((prev) => ({ ...prev, dataPagamento: e.target.value }))}
                  className="h-7 text-xs"
                />
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Conta Bancária *</Label>
                <Select value={form.contaId} onValueChange={(value) => setForm((prev) => ({ ...prev, contaId: value }))}>
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {contas.map((conta) => (
                      <SelectItem key={conta.id} value={conta.id} className="text-xs">
                        {conta.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Pago *</Label>
                <Select
                  value={form.pago ? "sim" : "nao"}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, pago: value === "sim" }))}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim" className="text-xs">Sim</SelectItem>
                    <SelectItem value="nao" className="text-xs">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-8 text-xs" disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" className="h-8 text-xs" disabled={saving}>
                {saving ? "Atualizando..." : "Atualizar"}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};