import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  TrendingUp,
  TrendingDown,
  Filter,
  X,
  Check,
  ChevronsUpDown,
  RefreshCw,
  Edit2,
  Trash2,
  Plus,
  CalendarIcon,
  Download,
  FileText,
  Minus,
  ArrowLeftRight,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFinancialData } from "@/hooks/useFinancialData";
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Interfaces
interface ItemLancamento {
  id: string;
  descricao2: string;
  produtoServico: string;
  valor: number;
}

interface Fornecedor {
  id: string;
  nome_fornecedor: string;
  cnpj_cpf: string;
  nome_fantasia: string | null;
}

interface LancamentoFluxo {
  id: string;
  ano: string;
  mesCompetencia: string;
  tipo: "Receita" | "Despesa";
  descricao1: string;
  nomeFornecedor: string;
  fornecedorId: string;
  nomeCliente: string;
  nomePet: string;
  pets: Pet[];
  itens: ItemLancamento[];
  valorTotal: number;
  dataPagamento: string;
  nomeBanco: string;
  pago: boolean;
  dataCadastro: string;
  valorDeducao: number;
  tipoDeducao: string;
  observacao: string;
  valorJuros: number;
  tipoJuros: string;
  modoAjuste: "deducao" | "juros";
}

interface Pet {
  id: string;
  clienteId: string;
  nomePet: string;
  raca: string;
  porte: string;
}

interface Cliente {
  id: string;
  nomeCliente: string;
}

interface ContaBancaria {
  id: string;
  nomeBanco: string;
  saldo: number;
}

interface Servico {
  id: string;
  nome: string;
  valor: number;
}

interface Pacote {
  id: string;
  nome: string;
  valorFinal: number;
}

interface Produto {
  id: string;
  descricao: string;
  valorVenda: number;
}

const meses = [
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

import { categoriasDescricao1, categoriasDescricao2 } from "@/constants/categorias";

// Componente ComboboxField
interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: string[] | ComboboxOption[];
  placeholder: string;
  searchPlaceholder: string;
  id: string;
  disabled?: boolean;
}

const ComboboxField = ({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  id,
  disabled = false,
}: ComboboxFieldProps) => {
  const [open, setOpen] = useState(false);

  const handleOpenChange = (nextOpen: boolean) => {
    if (disabled) {
      setOpen(false);
      return;
    }
    setOpen(nextOpen);
  };

  const normalizedOptions: ComboboxOption[] = options.map((opt) =>
    typeof opt === "string" ? { value: opt, label: opt } : opt
  );

  const selectedLabel = normalizedOptions.find((o) => o.value === value)?.label;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between h-7 text-xs", disabled ? "opacity-50 cursor-not-allowed" : "")}
          disabled={disabled}
        >
          <span className="truncate">{selectedLabel || value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="text-xs" />
          <CommandEmpty className="text-xs">Nenhum resultado encontrado.</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {normalizedOptions.map((option) => (
              <CommandItem
                key={option.value}
                value={option.label}
                onSelect={() => {
                  if (disabled) return;
                  onChange(option.value);
                  setOpen(false);
                }}
                className="text-xs"
              >
                <Check className={cn("mr-2 h-3 w-3", value === option.value ? "opacity-100" : "opacity-0")} />
                {option.label}
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// Componente ItemLancamentoForm
interface ItemLancamentoFormProps {
  item: ItemLancamento;
  index: number;
  formData: any;
  servicos: Servico[];
  pacotes: Pacote[];
  produtos: Produto[];
  onChange: (item: ItemLancamento) => void;
  onRemove: () => void;
  canRemove: boolean;
  onAdd?: () => void;
  isLast?: boolean;
  canAdd?: boolean;
}

const ItemLancamentoForm = ({
  item,
  index,
  formData,
  servicos,
  pacotes,
  produtos,
  onChange,
  onRemove,
  canRemove,
  onAdd,
  isLast,
  canAdd,
}: ItemLancamentoFormProps) => {
  const opcoesDescricao2 = formData.descricao1 ? categoriasDescricao2[formData.descricao1] || [] : [];

  const isServicos = item.descricao2 === "Serviços";
  const isVenda = item.descricao2 === "Venda";
  const isObrigatorio = isServicos || isVenda;

  const opcoesProdutoServico = useMemo(() => {
    if (isServicos) {
      return [
        ...servicos.map((s) => ({ nome: s.nome, valor: s.valor })),
        ...pacotes.map((p) => ({ nome: p.nome, valor: p.valorFinal })),
      ];
    } else if (isVenda) {
      return produtos.map((p) => ({ nome: p.descricao, valor: p.valorVenda }));
    }
    return [];
  }, [isServicos, isVenda, servicos, pacotes, produtos]);

  const handleProdutoServicoChange = (nomeSelecionado: string) => {
    const itemSelecionado = opcoesProdutoServico.find((o) => o.nome === nomeSelecionado);

    onChange({
      ...item,
      produtoServico: nomeSelecionado,
      valor: itemSelecionado ? itemSelecionado.valor : item.valor,
    });
  };

  return (
    <div className="grid grid-cols-12 gap-2 p-2 border rounded bg-background relative">
      {canRemove && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="absolute -top-2 -right-2 h-5 w-5 p-0 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
        >
          <X className="h-3 w-3" />
        </Button>
      )}

      <div className="col-span-4 space-y-0.5">
        <Label className="text-[10px] font-semibold">Descrição 2 *</Label>
        <Select
          value={item.descricao2}
          onValueChange={(value) => onChange({ ...item, descricao2: value, produtoServico: "", valor: 0 })}
          disabled={!formData.descricao1}
        >
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder={formData.descricao1 ? "Selecione" : "Selecione Desc1"} />
          </SelectTrigger>
          <SelectContent>
            {opcoesDescricao2.map((desc) => (
              <SelectItem key={desc} value={desc} className="text-xs">
                {desc}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="col-span-5 space-y-0.5">
        <Label className="text-[10px] font-semibold">
          {isServicos ? "Serviço" : isVenda ? "Produto" : "Observação"}
          {isObrigatorio && " *"}
        </Label>

        {isObrigatorio ? (
          <ComboboxField
            value={item.produtoServico}
            onChange={handleProdutoServicoChange}
            options={opcoesProdutoServico.map((o) => o.nome)}
            placeholder={`Selecione ${isServicos ? "serviço" : "produto"}`}
            searchPlaceholder={`Buscar ${isServicos ? "serviço" : "produto"}...`}
            id={`item-produto-${item.id}`}
          />
        ) : (
          <Input
            value={item.produtoServico}
            onChange={(e) => onChange({ ...item, produtoServico: e.target.value })}
            placeholder="Observação"
            className="h-7 text-xs"
          />
        )}
      </div>

      <div className="col-span-3 space-y-0.5">
        <div className="flex items-end justify-between gap-1">
          <div className="flex-1">
            <Label className="text-[10px] font-semibold">Valor *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={item.valor}
              onChange={(e) => onChange({ ...item, valor: parseFloat(e.target.value) || 0 })}
              className="h-7 text-xs"
            />
          </div>
          {isLast && canAdd && onAdd && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onAdd}
              className="h-7 px-2 text-[10px] text-primary hover:text-primary hover:bg-primary/10"
              title="Adicionar novo item"
            >
              + Item
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper components for financial cards
const VariationBadge = ({ value, suffix = "%", invertColors = false }: { value: number; suffix?: string; invertColors?: boolean }) => {
  const isPositive = value > 0;
  const colorClass = invertColors
    ? (isPositive ? "text-red-600" : "text-green-600")
    : (isPositive ? "text-green-600" : "text-red-600");
  const Icon = value === 0 ? Minus : isPositive ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-medium ${colorClass}`}>
      <Icon className="h-4 w-4" />
      {value > 0 ? "+" : ""}{value.toFixed(1)}{suffix}
    </span>
  );
};

const getTooltipText = (tipo: string, comparativo: any, periodo: "atual" | "anterior" = "atual"): string => {
  if (!comparativo) return "";
  const label = periodo === "atual" ? "mês atual" : "mês anterior";
  switch (tipo) {
    case "receita": {
      const base = `💰 Receita do ${label}. Todo o dinheiro que entrou no seu negócio neste período.`;
      if (comparativo.varReceita > 0) return `${base}\n📈 Seu faturamento aumentou!`;
      if (comparativo.varReceita < 0) return `${base}\n📉 Você faturou menos que no período anterior.`;
      return `${base}\n➡️ Faturamento estável.`;
    }
    case "despesas": {
      const base = `💸 Despesas do ${label}. Todos os gastos do negócio.`;
      const v = comparativo.varDespesa;
      if (v < 0) return `${base}\n✅ Redução de despesas melhora a rentabilidade.`;
      if (v <= 15) return `${base}\n🔹 Leve crescimento nos gastos.`;
      if (v <= 50) return `${base}\n🔸 Os custos cresceram de forma perceptível.`;
      return `${base}\n🔴 Os gastos aumentaram significativamente.`;
    }
    case "lucro": {
      const base = `💰 Lucro do ${label}. Quanto sobrou após todas as despesas.`;
      if (comparativo.lucro < 0) return `${base}\n🚨 O negócio operou no prejuízo.`;
      if (comparativo.varLucro > 0) return `${base}\n📈 Seu negócio ficou mais lucrativo.`;
      if (comparativo.varLucro < 0) return `${base}\n📉 O lucro caiu.`;
      return `${base}\n➡️ Lucro estável.`;
    }
    case "margem": {
      const base = `📊 Margem de lucro do ${label}. Qual % do faturamento virou lucro.`;
      if (comparativo.diffMargem > 0) return `${base}\n📈 Você está lucrando mais proporcionalmente.`;
      if (comparativo.diffMargem < 0) return `${base}\n📉 Uma parte menor virou lucro.`;
      return `${base}\nℹ️ Variação medida em pontos percentuais (pp).`;
    }
    default: return "";
  }
};

const FluxoDeCaixa = () => {
  const { user, ownerId } = useAuth();
  const { comparativo, dadosMensais } = useFinancialData();
  const [loading, setLoading] = useState(true);
  const [lancamentos, setLancamentos] = useState<LancamentoFluxo[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [fornecedorSearch, setFornecedorSearch] = useState("");

  const [mostrarFiltros, setMostrarFiltros] = useState(false);

  const [filtros, setFiltros] = useState({
    dataInicio: "",
    dataFim: "",
    mes: "",
    ano: "",
    nomePet: "",
    nomeCliente: "",
    nomeFornecedor: "",
    tipo: "" as "Receita" | "Despesa" | "",
    descricao1: "",
    dataPagamento: "",
    nomeBanco: "",
    pago: null as boolean | null,
  });

  const [filtroDataAtivo, setFiltroDataAtivo] = useState<"periodo" | "mesano" | null>(null);
  const [filtrosAplicados, setFiltrosAplicados] = useState(false);

  // Estados para Atualizar Saldo
  const [dialogSaldoOpen, setDialogSaldoOpen] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState("");
  const [novoSaldo, setNovoSaldo] = useState("");
  const [dataAjusteSaldo, setDataAjusteSaldo] = useState<Date>(new Date());
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  // Estados para Transferência de Saldo
  const [dialogTransferenciaOpen, setDialogTransferenciaOpen] = useState(false);
  const [contaOrigem, setContaOrigem] = useState("");
  const [contaDestino, setContaDestino] = useState("");
  const [valorTransferencia, setValorTransferencia] = useState("");
  const [dataTransferencia, setDataTransferencia] = useState<Date>(new Date());
  const [confirmTransferenciaOpen, setConfirmTransferenciaOpen] = useState(false);
  const [alertaSaldoInsuficiente, setAlertaSaldoInsuficiente] = useState(false);
  const [saldoResultanteOrigem, setSaldoResultanteOrigem] = useState(0);

  // Estados para Criação, Edição e Exclusão
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [fornecedorPopoverOpen, setFornecedorPopoverOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState<LancamentoFluxo | null>(null);
  const [formData, setFormData] = useState({
    ano: new Date().getFullYear().toString(),
    mesCompetencia: String(new Date().getMonth() + 1).padStart(2, "0"),
    tipo: "" as "Receita" | "Despesa" | "",
    descricao1: "",
    nomeCliente: "",
    nomePet: "",
    petsSelecionados: [] as Pet[],
    dataPagamento: "",
    nomeBanco: "",
    pago: false,
    valorDeducao: 0,
    tipoDeducao: "",
    fornecedorId: "",
    valorJuros: 0,
    tipoJuros: "",
    modoAjuste: "deducao" as "deducao" | "juros",
  });
  const [itensLancamento, setItensLancamento] = useState<ItemLancamento[]>([
    { id: Date.now().toString(), descricao2: "", produtoServico: "", valor: 0 },
  ]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Load financial data from Supabase
  const loadLancamentos = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("lancamentos_financeiros")
        .select(
          `
          *,
          lancamentos_financeiros_itens (*)
        `,
        )
        .eq("user_id", user.id)
        .order("data_pagamento", { ascending: false });

      if (error) throw error;

      const lancamentosFormatados = (data || []).map((l: any) => ({
        id: l.id,
        ano: l.ano,
        mesCompetencia: l.mes_competencia,
        tipo: l.tipo as "Receita" | "Despesa",
        descricao1: l.descricao1,
        nomeFornecedor: "",
        fornecedorId: l.fornecedor_id || "",
        nomeCliente: "",
        nomePet: "",
        pets: [],
        itens: (l.lancamentos_financeiros_itens || []).map((i: any) => ({
          id: i.id,
          descricao2: i.descricao2,
          produtoServico: i.produto_servico || "",
          valor: Number(i.valor),
        })),
        valorTotal: Number(l.valor_total),
        dataPagamento: l.data_pagamento,
        nomeBanco: "",
        pago: l.pago,
        dataCadastro: l.data_cadastro || l.created_at,
        valorDeducao: Number(l.valor_deducao) || 0,
        tipoDeducao: l.tipo_deducao || "",
        observacao: l.observacao || "",
        valorJuros: Number((l as any).valor_juros) || 0,
        tipoJuros: (l as any).tipo_juros || "",
        modoAjuste: ((l as any).modo_ajuste || "deducao") as "deducao" | "juros",
      }));

      // Map cliente_id and conta_id to names
      const clientesData = await supabase.from("clientes").select("*").eq("user_id", ownerId);
      const petsData = await supabase.from("pets").select("*").eq("user_id", ownerId);
      const contasData = await supabase.from("contas_bancarias").select("*").eq("user_id", ownerId);
      const fornecedoresData = await supabase.from("fornecedores").select("id, nome_fornecedor").eq("user_id", ownerId);

      if (clientesData.data && petsData.data && contasData.data) {
        const clientesMap = new Map(clientesData.data.map((c: any) => [c.id, c.nome_cliente]));
        const fornecedoresMap = new Map((fornecedoresData.data || []).map((f: any) => [f.id, f.nome_fornecedor]));
        const petsMapById = new Map(
          petsData.data.map((p: any) => [
            p.id,
            { nomePet: p.nome_pet, raca: p.raca, porte: p.porte, clienteId: p.cliente_id, id: p.id },
          ]),
        );
        const petsMap = new Map(petsData.data.map((p: any) => [p.cliente_id, p.nome_pet]));
        const contasMap = new Map(contasData.data.map((c: any) => [c.id, c.nome]));

        lancamentosFormatados.forEach((l: any) => {
          const lancOriginal = data?.find((lo: any) => lo.id === l.id);
          if (lancOriginal) {
            l.nomeFornecedor = fornecedoresMap.get(lancOriginal.fornecedor_id) || "";
            l.nomeCliente = clientesMap.get(lancOriginal.cliente_id) || "";
            l.nomePet = petsMap.get(lancOriginal.cliente_id) || "";
            l.nomeBanco = contasMap.get(lancOriginal.conta_id) || "";

            // Carregar array de pets a partir de pet_ids
            if (lancOriginal.pet_ids && Array.isArray(lancOriginal.pet_ids)) {
              l.pets = lancOriginal.pet_ids
                .map((petId: string) => petsMapById.get(petId))
                .filter((pet: any) => pet !== undefined);

              // Definir o primeiro pet como principal
              if (l.pets.length > 0) {
                l.nomePet = l.pets[0].nomePet;
              }
            } else {
              l.pets = [];
            }
          }
        });
      }

      setLancamentos(lancamentosFormatados);
    } catch (error) {
      console.error("Erro ao carregar lançamentos:", error);
      toast.error("Erro ao carregar lançamentos");
    } finally {
      setLoading(false);
    }
  };

  // Load related data
  const loadRelatedData = async () => {
    if (!user) return;

    try {
      const [clientesRes, petsRes, contasRes, servicosRes, pacotesRes, produtosRes, fornecedoresRes] = await Promise.all([
        supabase.from("clientes").select("*").eq("user_id", ownerId),
        supabase.from("pets").select("*").eq("user_id", ownerId),
        supabase.from("contas_bancarias").select("*").eq("user_id", ownerId),
        supabase.from("servicos").select("*").eq("user_id", ownerId),
        supabase.from("pacotes").select("*").eq("user_id", ownerId),
        supabase.from("produtos").select("*").eq("user_id", ownerId),
        supabase.from("fornecedores").select("id, nome_fornecedor, cnpj_cpf, nome_fantasia").eq("user_id", ownerId),
      ]);

      if (clientesRes.data) {
        setClientes(
          clientesRes.data.map((c: any) => ({
            id: c.id,
            nomeCliente: c.nome_cliente,
          })),
        );
      }

      if (petsRes.data) {
        setPets(
          petsRes.data.map((p: any) => ({
            id: p.id,
            clienteId: p.cliente_id,
            nomePet: p.nome_pet,
            raca: p.raca || "",
            porte: p.porte || "",
          })),
        );
      }

      if (contasRes.data) {
        setContas(
          contasRes.data.map((c: any) => ({
            id: c.id,
            nomeBanco: c.nome,
            saldo: Number(c.saldo) || 0,
          })),
        );
      }

      if (servicosRes.data) {
        setServicos(
          servicosRes.data.map((s: any) => ({
            id: s.id,
            nome: s.nome,
            valor: Number(s.valor),
          })),
        );
      }

      if (pacotesRes.data) {
        setPacotes(
          pacotesRes.data.map((p: any) => ({
            id: p.id,
            nome: p.nome,
            valorFinal: Number(p.valor_final),
          })),
        );
      }

      if (produtosRes.data) {
        setProdutos(
          produtosRes.data.map((p: any) => ({
            id: p.id,
            descricao: p.nome,
            valorVenda: Number(p.valor),
          })),
        );
      }

      if (fornecedoresRes.data) {
        setFornecedores(
          fornecedoresRes.data.map((f: any) => ({
            id: f.id,
            nome_fornecedor: f.nome_fornecedor,
            cnpj_cpf: f.cnpj_cpf,
            nome_fantasia: f.nome_fantasia,
          })),
        );
      }
    } catch (error) {
      console.error("Erro ao carregar dados relacionados:", error);
    }
  };

  useEffect(() => {
    if (user) {
      loadLancamentos();
      loadRelatedData();
    }
  }, [user]);

  const fornecedoresFiltrados = useMemo(() => {
    if (!fornecedorSearch) return fornecedores;
    const search = fornecedorSearch.toLowerCase();
    return fornecedores.filter(
      (f) =>
        f.nome_fornecedor.toLowerCase().includes(search) ||
        f.cnpj_cpf.toLowerCase().includes(search) ||
        (f.nome_fantasia || "").toLowerCase().includes(search),
    );
  }, [fornecedorSearch, fornecedores]);

  const aplicarFiltros = () => {
    setFiltrosAplicados(true);
    setMostrarFiltros(false);
    toast.success("Filtros aplicados!");
  };

  const limparFiltros = () => {
    setFiltros({
      dataInicio: "",
      dataFim: "",
      mes: "",
      ano: "",
      nomePet: "",
      nomeCliente: "",
      nomeFornecedor: "",
      tipo: "",
      descricao1: "",
      dataPagamento: "",
      nomeBanco: "",
      pago: null,
    });
    setFiltroDataAtivo(null);
    setFiltrosAplicados(false);
    toast.success("Filtros limpos!");
  };

  const lancamentosFiltrados = useMemo(() => {
    if (!filtrosAplicados) return lancamentos;

    let resultado = [...lancamentos];

    if (filtroDataAtivo === "periodo") {
      if (filtros.dataInicio || filtros.dataFim) {
        resultado = resultado.filter((l) => {
          if (!l.dataPagamento) return false;
          if (filtros.dataInicio && l.dataPagamento < filtros.dataInicio) return false;
          if (filtros.dataFim && l.dataPagamento > filtros.dataFim) return false;
          return true;
        });
      }
    } else if (filtroDataAtivo === "mesano") {
      if (filtros.mes || filtros.ano) {
        resultado = resultado.filter((l) => {
          if (filtros.mes && filtros.ano) {
            return l.mesCompetencia === filtros.mes && l.ano === filtros.ano;
          }
          if (filtros.mes) return l.mesCompetencia === filtros.mes;
          if (filtros.ano) return l.ano === filtros.ano;
          return true;
        });
      }
    }

    if (filtros.nomePet) {
      resultado = resultado.filter((l) => {
        // Buscar no pet principal
        if (l.nomePet === filtros.nomePet) return true;

        // Buscar nos pets adicionais
        if (l.pets && l.pets.length > 0) {
          return l.pets.some((p) => p.nomePet === filtros.nomePet);
        }

        return false;
      });
    }
    if (filtros.nomeCliente) {
      resultado = resultado.filter((l) => l.nomeCliente === filtros.nomeCliente);
    }
    if (filtros.tipo) {
      resultado = resultado.filter((l) => l.tipo === filtros.tipo);
    }
    if (filtros.descricao1) {
      resultado = resultado.filter((l) => l.descricao1 === filtros.descricao1);
    }
    if (filtros.dataPagamento) {
      resultado = resultado.filter((l) => l.dataPagamento === filtros.dataPagamento);
    }
    if (filtros.nomeBanco) {
      resultado = resultado.filter((l) => l.nomeBanco === filtros.nomeBanco);
    }
    if (filtros.pago !== null) {
      resultado = resultado.filter((l) => l.pago === filtros.pago);
    }
    if (filtros.nomeFornecedor) {
      resultado = resultado.filter((l) => l.nomeFornecedor === filtros.nomeFornecedor);
    }

    return resultado;
  }, [lancamentos, filtros, filtroDataAtivo, filtrosAplicados]);

  const metricas = useMemo(() => {
    const dados = filtrosAplicados ? lancamentosFiltrados : lancamentos;

    const recebido = dados.filter((l) => l.tipo === "Receita" && l.pago && l.observacao !== "Transferência entre contas");
    const aReceber = dados.filter((l) => l.tipo === "Receita" && !l.pago && l.observacao !== "Transferência entre contas");
    const pago = dados.filter((l) => l.tipo === "Despesa" && l.pago && l.observacao !== "Transferência entre contas");
    const aPagar = dados.filter((l) => l.tipo === "Despesa" && !l.pago && l.observacao !== "Transferência entre contas");

    return {
      recebido: {
        valor: recebido.reduce((acc, l) => acc + l.valorTotal, 0),
        qtd: recebido.length,
      },
      aReceber: {
        valor: aReceber.reduce((acc, l) => acc + l.valorTotal, 0),
        qtd: aReceber.length,
      },
      pago: {
        valor: pago.reduce((acc, l) => acc + l.valorTotal, 0),
        qtd: pago.length,
      },
      aPagar: {
        valor: aPagar.reduce((acc, l) => acc + l.valorTotal, 0),
        qtd: aPagar.length,
      },
    };
  }, [lancamentos, lancamentosFiltrados, filtrosAplicados]);

  // Calcular saldos por banco
  const saldosPorBanco = useMemo(() => {
    return contas.map((conta) => {
      const lancamentosConta = lancamentos.filter((l) => l.nomeBanco === conta.nomeBanco && l.pago);
      const receitas = lancamentosConta.filter((l) => l.tipo === "Receita").reduce((acc, l) => acc + l.valorTotal, 0);
      const despesas = lancamentosConta.filter((l) => l.tipo === "Despesa").reduce((acc, l) => acc + l.valorTotal, 0);
      const saldoAtual = receitas - despesas;

      return {
        nome: conta.nomeBanco,
        saldoInicial: conta.saldo,
        saldoAtual,
      };
    });
  }, [contas, lancamentos]);

  const saldoTotalAtual = useMemo(() => {
    return saldosPorBanco.reduce((acc, banco) => acc + banco.saldoAtual, 0);
  }, [saldosPorBanco]);

  // Calcular saldos por banco na data da transferência selecionada
  const saldosPorBancoNaData = useMemo(() => {
    const dataRef = format(dataTransferencia, "yyyy-MM-dd");
    return contas.map((conta) => {
      const lancamentosConta = lancamentos.filter(
        (l) => l.nomeBanco === conta.nomeBanco && l.pago && l.dataPagamento <= dataRef
      );
      const receitas = lancamentosConta
        .filter((l) => l.tipo === "Receita")
        .reduce((acc, l) => acc + l.valorTotal, 0);
      const despesas = lancamentosConta
        .filter((l) => l.tipo === "Despesa")
        .reduce((acc, l) => acc + l.valorTotal, 0);
      return { nome: conta.nomeBanco, saldo: receitas - despesas };
    });
  }, [dataTransferencia, contas, lancamentos]);

  // Detectar período filtrado ativo
  const periodoFiltrado = useMemo(() => {
    if (!filtrosAplicados || !filtroDataAtivo) return null;

    if (filtroDataAtivo === "periodo") {
      if (!filtros.dataInicio && !filtros.dataFim) return null;
      return {
        inicio: filtros.dataInicio || "0000-01-01",
        fim: filtros.dataFim || "9999-12-31",
      };
    }

    if (filtroDataAtivo === "mesano") {
      if (!filtros.mes && !filtros.ano) return null;
      const ano = filtros.ano || new Date().getFullYear().toString();
      const mes = filtros.mes || "01";
      const inicioMes = `${ano}-${mes}-01`;
      const lastDay = new Date(parseInt(ano), parseInt(mes), 0).getDate();
      const fimMes = `${ano}-${mes}-${String(lastDay).padStart(2, "0")}`;
      return { inicio: inicioMes, fim: fimMes };
    }

    return null;
  }, [filtrosAplicados, filtroDataAtivo, filtros.dataInicio, filtros.dataFim, filtros.mes, filtros.ano]);

  // Calcular Saldo Inicial e Saldo Final por banco (apenas quando filtro de data ativo)
  const saldosPeriodo = useMemo(() => {
    if (!periodoFiltrado) return null;

    const porBanco = contas.map((conta) => {
      const lancamentosConta = lancamentos.filter((l) => l.nomeBanco === conta.nomeBanco && l.pago);

      // Saldo Inicial: tudo ANTES do período
      const receitasAntes = lancamentosConta
        .filter((l) => l.tipo === "Receita" && l.dataPagamento < periodoFiltrado.inicio)
        .reduce((acc, l) => acc + l.valorTotal, 0);
      const despesasAntes = lancamentosConta
        .filter((l) => l.tipo === "Despesa" && l.dataPagamento < periodoFiltrado.inicio)
        .reduce((acc, l) => acc + l.valorTotal, 0);
      const saldoInicial = receitasAntes - despesasAntes;

      // Movimentação dentro do período
      const receitasPeriodo = lancamentosConta
        .filter((l) => l.tipo === "Receita" && l.dataPagamento >= periodoFiltrado.inicio && l.dataPagamento <= periodoFiltrado.fim)
        .reduce((acc, l) => acc + l.valorTotal, 0);
      const despesasPeriodo = lancamentosConta
        .filter((l) => l.tipo === "Despesa" && l.dataPagamento >= periodoFiltrado.inicio && l.dataPagamento <= periodoFiltrado.fim)
        .reduce((acc, l) => acc + l.valorTotal, 0);
      const saldoFinal = saldoInicial + receitasPeriodo - despesasPeriodo;

      return { nome: conta.nomeBanco, saldoInicial, saldoFinal };
    });

    const saldoInicialTotal = porBanco.reduce((acc, b) => acc + b.saldoInicial, 0);
    const saldoFinalTotal = porBanco.reduce((acc, b) => acc + b.saldoFinal, 0);

    return { porBanco, saldoInicialTotal, saldoFinalTotal };
  }, [periodoFiltrado, contas, lancamentos]);

  // Filtros para pets e clientes
  const petsFiltro = useMemo(() => {
    if (!filtros.nomeCliente) {
      return [...new Set(pets.map((p) => p.nomePet))];
    }
    const clienteSelecionado = clientes.find((c) => c.nomeCliente === filtros.nomeCliente);
    if (!clienteSelecionado) return [];

    return pets.filter((p) => p.clienteId === clienteSelecionado.id).map((p) => p.nomePet);
  }, [filtros.nomeCliente, clientes, pets]);

  const clientesFiltro = useMemo(() => {
    if (!filtros.nomePet) {
      return [...new Set(clientes.map((c) => c.nomeCliente))];
    }
    const petSelecionado = pets.find((p) => p.nomePet === filtros.nomePet);
    if (!petSelecionado) return [];

    const clienteDonoPet = clientes.find((c) => c.id === petSelecionado.clienteId);
    return clienteDonoPet ? [clienteDonoPet.nomeCliente] : [];
  }, [filtros.nomePet, clientes, pets]);

  // Filtros para formulário
  const clientesFormulario = useMemo(() => {
    return clientes.map((c) => c.nomeCliente);
  }, [clientes]);

  const petsFormulario = useMemo(() => {
    if (!formData.nomeCliente) {
      return pets.map((p) => p.nomePet);
    }
    const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === formData.nomeCliente);
    if (clientesComMesmoNome.length === 0) return [];

    const idsClientes = clientesComMesmoNome.map((c) => c.id);
    return pets.filter((p) => idsClientes.includes(p.clienteId)).map((p) => p.nomePet);
  }, [formData.nomeCliente, clientes, pets]);

  const temPetsAdicionais = useMemo(() => {
    if (!formData.nomeCliente || !formData.nomePet) return false;
    const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === formData.nomeCliente);
    let clienteSelecionado: typeof clientes[0] | undefined;
    for (const cliente of clientesComMesmoNome) {
      const petEncontrado = pets.find((p) => p.nomePet === formData.nomePet && p.clienteId === cliente.id);
      if (petEncontrado) { clienteSelecionado = cliente; break; }
    }
    if (!clienteSelecionado) return false;
    const petsDisponiveis = pets.filter(
      (p) => p.clienteId === clienteSelecionado!.id
        && p.nomePet !== formData.nomePet
        && !formData.petsSelecionados.some((ps) => ps.id === p.id)
    );
    return petsDisponiveis.length > 0;
  }, [formData.nomeCliente, formData.nomePet, formData.petsSelecionados, clientes, pets]);

  // Funções para Atualizar Saldo
  const abrirDialogoSaldo = () => {
    setContaSelecionada("");
    setNovoSaldo("");
    setDataAjusteSaldo(new Date());
    setDialogSaldoOpen(true);
  };

  const abrirConfirmacao = () => {
    if (!contaSelecionada || !novoSaldo) {
      toast.error("Preencha todos os campos!");
      return;
    }
    setDialogSaldoOpen(false);
    setConfirmDialogOpen(true);
  };

  // Funções de Transferência de Saldo
  const formatarMoeda = (valor: string) => {
    const numeros = valor.replace(/\D/g, "");
    const numero = parseInt(numeros || "0", 10) / 100;
    return numero.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleValorTransferenciaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (raw === "") {
      setValorTransferencia("");
      return;
    }
    setValorTransferencia(formatarMoeda(raw));
  };

  const getValorNumericoTransferencia = () => {
    if (!valorTransferencia) return 0;
    return parseFloat(valorTransferencia.replace(/\./g, "").replace(",", ".")) || 0;
  };

  const abrirDialogoTransferencia = () => {
    setContaOrigem("");
    setContaDestino("");
    setValorTransferencia("");
    setDataTransferencia(new Date());
    setDialogTransferenciaOpen(true);
  };

  const validarTransferencia = () => {
    if (!contaOrigem) {
      toast.error("Selecione a conta de origem!");
      return false;
    }
    if (!contaDestino) {
      toast.error("Selecione a conta de destino!");
      return false;
    }
    if (contaOrigem === contaDestino) {
      toast.error("As contas de origem e destino devem ser diferentes!");
      return false;
    }
    const valor = getValorNumericoTransferencia();
    if (!valor || valor <= 0) {
      toast.error("Informe um valor válido para a transferência!");
      return false;
    }

    // Calcular saldo da conta de origem até a data selecionada
    const dataRef = format(dataTransferencia, "yyyy-MM-dd");
    const lancamentosConta = lancamentos.filter(
      (l) => l.nomeBanco === contaOrigem && l.pago && l.dataPagamento <= dataRef
    );
    const receitasAteData = lancamentosConta
      .filter((l) => l.tipo === "Receita")
      .reduce((acc, l) => acc + l.valorTotal, 0);
    const despesasAteData = lancamentosConta
      .filter((l) => l.tipo === "Despesa")
      .reduce((acc, l) => acc + l.valorTotal, 0);
    const saldoAteData = receitasAteData - despesasAteData;

    // Guardar saldo resultante para possível alerta
    const saldoResultante = saldoAteData - valor;
    setSaldoResultanteOrigem(saldoResultante);

    return true;
  };

  const abrirConfirmacaoTransferencia = () => {
    if (!validarTransferencia()) return;
    if (saldoResultanteOrigem < 0) {
      setDialogTransferenciaOpen(false);
      setAlertaSaldoInsuficiente(true);
    } else {
      setDialogTransferenciaOpen(false);
      setConfirmTransferenciaOpen(true);
    }
  };

  const handleConfirmarTransferencia = async () => {
    if (!user) return;

    try {
      const contaOrigemObj = contas.find((c) => c.nomeBanco === contaOrigem);
      const contaDestinoObj = contas.find((c) => c.nomeBanco === contaDestino);
      if (!contaOrigemObj || !contaDestinoObj) {
        toast.error("Conta não encontrada!");
        return;
      }

      const valor = getValorNumericoTransferencia();
      const dataFormatada = format(dataTransferencia, "yyyy-MM-dd");
      const anoTransf = dataTransferencia.getFullYear().toString();
      const mesTransf = String(dataTransferencia.getMonth() + 1).padStart(2, "0");

      // 1. Criar lançamento de DESPESA na conta de origem
      const { data: lancDespesa, error: errDespesa } = await supabase
        .from("lancamentos_financeiros")
        .insert([{
          user_id: user.id,
          ano: anoTransf,
          mes_competencia: mesTransf,
          tipo: "Despesa",
          descricao1: "Despesa Não Operacional",
          valor_total: valor,
          data_pagamento: dataFormatada,
          conta_id: contaOrigemObj.id,
          pago: true,
          observacao: "Transferência entre contas",
        }])
        .select()
        .single();

      if (errDespesa) throw errDespesa;

      // 2. Criar lançamento de RECEITA na conta de destino
      const { data: lancReceita, error: errReceita } = await supabase
        .from("lancamentos_financeiros")
        .insert([{
          user_id: user.id,
          ano: anoTransf,
          mes_competencia: mesTransf,
          tipo: "Receita",
          descricao1: "Receita Não Operacional",
          valor_total: valor,
          data_pagamento: dataFormatada,
          conta_id: contaDestinoObj.id,
          pago: true,
          observacao: "Transferência entre contas",
        }])
        .select()
        .single();

      if (errReceita) throw errReceita;

      // 3. Criar itens dos lançamentos
      await Promise.all([
        supabase.from("lancamentos_financeiros_itens").insert([{
          lancamento_id: lancDespesa.id,
          descricao2: "Outras Despesas Não Operacionais",
          produto_servico: "Transferência entre contas",
          valor: valor,
        }]),
        supabase.from("lancamentos_financeiros_itens").insert([{
          lancamento_id: lancReceita.id,
          descricao2: "Outras Receitas Não Operacionais",
          produto_servico: "Transferência entre contas",
          valor: valor,
        }]),
      ]);

      toast.success("Transferência realizada com sucesso!");
      setConfirmTransferenciaOpen(false);
      await loadLancamentos();
      await loadRelatedData();
    } catch (error) {
      console.error("Erro ao realizar transferência:", error);
      toast.error("Erro ao realizar transferência");
    }
  };

  // Funções de Criação, Edição e Exclusão
  const resetForm = () => {
    setFormData({
      ano: new Date().getFullYear().toString(),
      mesCompetencia: String(new Date().getMonth() + 1).padStart(2, "0"),
      tipo: "",
      descricao1: "",
      nomeCliente: "",
      nomePet: "",
      petsSelecionados: [],
      dataPagamento: "",
      nomeBanco: "",
      pago: false,
      valorDeducao: 0,
      tipoDeducao: "",
      fornecedorId: "",
      valorJuros: 0,
      tipoJuros: "",
      modoAjuste: "deducao",
    });
    setItensLancamento([{ id: Date.now().toString(), descricao2: "", produtoServico: "", valor: 0 }]);
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setFornecedorSearch("");
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.ano) { toast.error("Favor selecionar o Ano de competência!"); return; }
    if (!formData.mesCompetencia) { toast.error("Favor selecionar o Mês de competência!"); return; }
    if (!formData.tipo) { toast.error("Favor selecionar o Tipo financeiro!"); return; }
    if (!formData.descricao1) { toast.error("Favor preencher a Descrição 1!"); return; }

    const clientePetObrigatorios = formData.tipo === "Receita" && formData.descricao1 === "Receita Operacional";
    if (clientePetObrigatorios) {
      if (!formData.nomeCliente || formData.nomeCliente === "Não aplicável") { toast.error("Favor selecionar o nome do Cliente!"); return; }
      if (!formData.nomePet || formData.nomePet === "Não aplicável") { toast.error("Favor selecionar o nome do Pet!"); return; }
    }

    for (let i = 0; i < itensLancamento.length; i++) {
      const item = itensLancamento[i];
      if (!item.descricao2) { toast.error(`Item ${i + 1}: Favor preencher a Descrição 2!`); return; }
      if ((item.descricao2 === "Serviços" || item.descricao2 === "Venda") && !item.produtoServico) {
        toast.error(`Item ${i + 1}: Favor selecionar ${item.descricao2 === "Serviços" ? "o serviço" : "o produto"}!`); return;
      }
      if (item.valor <= 0) { toast.error(`Item ${i + 1}: Favor preencher o valor!`); return; }
    }

    if (!formData.nomeBanco) { toast.error("Favor selecionar o Banco!"); return; }

    if (formData.modoAjuste === "deducao" && (formData.valorDeducao || 0) >= 0.01 && !formData.tipoDeducao) {
      toast.error("Favor selecionar o Tipo de Dedução!"); return;
    }
    if (formData.modoAjuste === "juros" && (formData.valorJuros || 0) >= 0.01 && !formData.tipoJuros) {
      toast.error("Favor selecionar o Motivo do Juros!"); return;
    }

    const subtotal = itensLancamento.reduce((acc, item) => acc + item.valor, 0);
    const valorTotal = formData.modoAjuste === "juros"
      ? subtotal + (formData.valorJuros || 0)
      : subtotal - (formData.valorDeducao || 0);

    try {
      let clienteId = null;

      if (clientePetObrigatorios) {
        const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === formData.nomeCliente);
        let clienteEncontrado: Cliente | null = null;

        for (const cliente of clientesComMesmoNome) {
          const pet = pets.find((p) => p.nomePet === formData.nomePet && p.clienteId === cliente.id);
          if (pet) { clienteEncontrado = cliente; break; }
        }

        if (!clienteEncontrado) { toast.error("Cliente/Pet não encontrado ou não correspondem!"); return; }
        clienteId = clienteEncontrado.id;
      } else if (formData.nomeCliente && formData.nomePet) {
        const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === formData.nomeCliente);
        for (const cliente of clientesComMesmoNome) {
          const pet = pets.find((p) => p.nomePet === formData.nomePet && p.clienteId === cliente.id);
          if (pet) { clienteId = cliente.id; break; }
        }
      }

      const conta = contas.find((c) => c.nomeBanco === formData.nomeBanco);
      if (!conta) { toast.error("Conta bancária não encontrada!"); return; }

      const clientesComMesmoNomeParaPet = clientes.filter((c) => c.nomeCliente === formData.nomeCliente);
      let petPrincipal: Pet | null = null;
      for (const cliente of clientesComMesmoNomeParaPet) {
        const pet = pets.find((p) => p.nomePet === formData.nomePet && p.clienteId === cliente.id);
        if (pet) { petPrincipal = pet; break; }
      }
      const petIds = petPrincipal ? [petPrincipal.id, ...formData.petsSelecionados.map((p) => p.id)] : [];

      const { data: lancamentoData, error: lancamentoError } = await supabase
        .from("lancamentos_financeiros")
        .insert([{
          user_id: ownerId,
          ano: formData.ano,
          mes_competencia: formData.mesCompetencia,
          tipo: formData.tipo,
          descricao1: formData.descricao1,
          cliente_id: clienteId,
          pet_ids: petIds,
          valor_total: valorTotal,
          data_pagamento: formData.dataPagamento,
          conta_id: conta.id,
           pago: formData.pago,
           observacao: null,
           valor_deducao: formData.modoAjuste === "deducao" ? (formData.valorDeducao || 0) : 0,
           tipo_deducao: formData.modoAjuste === "deducao" ? (formData.tipoDeducao || null) : null,
           valor_juros: formData.modoAjuste === "juros" ? (formData.valorJuros || 0) : 0,
           tipo_juros: formData.modoAjuste === "juros" ? (formData.tipoJuros || null) : null,
           modo_ajuste: formData.modoAjuste,
           fornecedor_id: formData.tipo === "Despesa" && formData.fornecedorId ? formData.fornecedorId : null,
        }])
        .select()
        .single();

      if (lancamentoError) throw lancamentoError;

      const { error: itensError } = await supabase.from("lancamentos_financeiros_itens").insert(
        itensLancamento.map((item) => ({
          lancamento_id: lancamentoData.id,
          descricao2: item.descricao2,
          produto_servico: item.produtoServico,
          valor: item.valor,
        })),
      );

      if (itensError) throw itensError;

      toast.success("Lançamento cadastrado com sucesso!");
      await loadLancamentos();
      resetForm();
    } catch (error) {
      console.error("Erro ao criar lançamento:", error);
      toast.error("Erro ao criar lançamento");
    }
  };

  const abrirEdicao = (lancamento: LancamentoFluxo) => {
    setLancamentoSelecionado(lancamento);

    const petPrincipal = lancamento.pets && lancamento.pets.length > 0 ? lancamento.pets[0] : null;
    const petsAdicionais = lancamento.pets && lancamento.pets.length > 1 ? lancamento.pets.slice(1) : [];

    setFormData({
      ano: lancamento.ano,
      mesCompetencia: lancamento.mesCompetencia,
      tipo: lancamento.tipo,
      descricao1: lancamento.descricao1,
      nomeCliente: lancamento.nomeCliente,
      nomePet: petPrincipal ? petPrincipal.nomePet : lancamento.nomePet,
      petsSelecionados: petsAdicionais,
      dataPagamento: lancamento.dataPagamento,
      nomeBanco: lancamento.nomeBanco,
      pago: lancamento.pago,
      valorDeducao: lancamento.valorDeducao || 0,
      tipoDeducao: lancamento.tipoDeducao || "",
      fornecedorId: lancamento.fornecedorId || "",
      valorJuros: lancamento.valorJuros || 0,
      tipoJuros: lancamento.tipoJuros || "",
      modoAjuste: lancamento.modoAjuste || "deducao",
    });
    setItensLancamento(lancamento.itens);
    setFornecedorSearch("");
    setIsEditDialogOpen(true);
  };

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lancamentoSelecionado || !user) return;

    if (!formData.ano || !formData.mesCompetencia || !formData.tipo || !formData.descricao1) {
      toast.error("Favor preencher todos os campos obrigatórios!");
      return;
    }

    for (let i = 0; i < itensLancamento.length; i++) {
      const item = itensLancamento[i];
      if (!item.descricao2 || item.valor <= 0) {
        toast.error(`Item ${i + 1}: Favor preencher todos os campos!`);
        return;
      }
    }

    if (formData.modoAjuste === "deducao" && (formData.valorDeducao || 0) >= 0.01 && !formData.tipoDeducao) {
      toast.error("Favor selecionar o Tipo de Dedução!"); return;
    }
    if (formData.modoAjuste === "juros" && (formData.valorJuros || 0) >= 0.01 && !formData.tipoJuros) {
      toast.error("Favor selecionar o Motivo do Juros!"); return;
    }

    const subtotalEdit = itensLancamento.reduce((acc, item) => acc + item.valor, 0);
    const valorTotal = formData.modoAjuste === "juros"
      ? subtotalEdit + (formData.valorJuros || 0)
      : subtotalEdit - (formData.valorDeducao || 0);

    try {
      let clienteId = null;

      const clientePetObrigatorios = itensLancamento.some(
        (item) => item.descricao2 === "Serviços" || item.descricao2 === "Venda",
      );

      if (clientePetObrigatorios) {
        const cliente = clientes.find((c) => c.nomeCliente === formData.nomeCliente);
        const pet = pets.find((p) => p.nomePet === formData.nomePet && p.clienteId === cliente?.id);

        if (!pet || !cliente) {
          toast.error("Cliente/Pet não encontrado ou não correspondem!");
          return;
        }

        clienteId = cliente.id;
      }

      const conta = contas.find((c) => c.nomeBanco === formData.nomeBanco);
      if (!conta) {
        toast.error("Conta bancária não encontrada!");
        return;
      }

      const cliente = clientes.find((c) => c.nomeCliente === formData.nomeCliente);
      const petPrincipal = pets.find((p) => p.nomePet === formData.nomePet && p.clienteId === cliente?.id);
      const petIds = petPrincipal ? [petPrincipal.id, ...formData.petsSelecionados.map((p) => p.id)] : [];

      await supabase
        .from("lancamentos_financeiros")
        .update({
          ano: formData.ano,
          mes_competencia: formData.mesCompetencia,
          tipo: formData.tipo,
          descricao1: formData.descricao1,
          cliente_id: clienteId,
          pet_ids: petIds,
          valor_total: valorTotal,
          data_pagamento: formData.dataPagamento,
          conta_id: conta.id,
          pago: formData.pago,
          valor_deducao: formData.modoAjuste === "deducao" ? (formData.valorDeducao || 0) : 0,
          tipo_deducao: formData.modoAjuste === "deducao" ? (formData.tipoDeducao || null) : null,
          valor_juros: formData.modoAjuste === "juros" ? (formData.valorJuros || 0) : 0,
          tipo_juros: formData.modoAjuste === "juros" ? (formData.tipoJuros || null) : null,
          modo_ajuste: formData.modoAjuste,
          fornecedor_id: formData.tipo === "Despesa" && formData.fornecedorId ? formData.fornecedorId : null,
        })
        .eq("id", lancamentoSelecionado.id);

      await supabase.from("lancamentos_financeiros_itens").delete().eq("lancamento_id", lancamentoSelecionado.id);
      await supabase.from("lancamentos_financeiros_itens").insert(
        itensLancamento.map((item) => ({
          lancamento_id: lancamentoSelecionado.id,
          descricao2: item.descricao2,
          produto_servico: item.produtoServico,
          valor: item.valor,
        })),
      );

      toast.success("Lançamento atualizado com sucesso!");
      await loadLancamentos();
      resetForm();
      setLancamentoSelecionado(null);
    } catch (error) {
      console.error("Erro ao atualizar:", error);
      toast.error("Erro ao atualizar lançamento");
    }
  };

  const handleExcluir = async () => {
    if (!lancamentoSelecionado || !user) return;
    try {
      await supabase.from("lancamentos_financeiros").delete().eq("id", lancamentoSelecionado.id);
      toast.success("Lançamento excluído com sucesso!");
      await loadLancamentos();
      setIsDeleteDialogOpen(false);
      setLancamentoSelecionado(null);
    } catch (error) {
      console.error("Erro ao excluir:", error);
      toast.error("Erro ao excluir lançamento");
    }
  };

  const handleConfirmarAtualizacao = async () => {
    if (!user || !contaSelecionada || !novoSaldo) return;

    try {
      const conta = contas.find((c) => c.nomeBanco === contaSelecionada);
      if (!conta) {
        toast.error("Conta não encontrada!");
        return;
      }

      // Calcular saldo acumulado ATÉ a data de referência selecionada (inclusive)
      const dataRef = format(dataAjusteSaldo, "yyyy-MM-dd");
      const lancamentosConta = lancamentos.filter(
        (l) => l.nomeBanco === contaSelecionada && l.pago && l.dataPagamento <= dataRef
      );
      const receitasAteData = lancamentosConta
        .filter((l) => l.tipo === "Receita")
        .reduce((acc, l) => acc + l.valorTotal, 0);
      const despesasAteData = lancamentosConta
        .filter((l) => l.tipo === "Despesa")
        .reduce((acc, l) => acc + l.valorTotal, 0);
      const saldoAteData = receitasAteData - despesasAteData;

      const novoSaldoNumerico = parseFloat(novoSaldo);
      const diferenca = novoSaldoNumerico - saldoAteData;

      if (diferenca === 0) {
        toast.error("O novo saldo é igual ao saldo atual!");
        return;
      }

      const tipo = diferenca > 0 ? "Receita" : "Despesa";
      const valorAjuste = Math.abs(diferenca);

      const dataAjuste = format(dataAjusteSaldo, "yyyy-MM-dd");
      const anoAtual = dataAjusteSaldo.getFullYear().toString();
      const mesAtual = String(dataAjusteSaldo.getMonth() + 1).padStart(2, "0");

      // Criar lançamento de ajuste
      const { data: lancamentoData, error: lancamentoError } = await supabase
        .from("lancamentos_financeiros")
        .insert([
          {
            user_id: user.id,
            ano: anoAtual,
            mes_competencia: mesAtual,
            tipo,
            descricao1: tipo === "Receita" ? "Receita Não Operacional" : "Despesa Não Operacional",
            cliente_id: null,
            pet_ids: [],
            valor_total: valorAjuste,
            data_pagamento: dataAjuste,
            conta_id: conta.id,
            pago: true,
            observacao: "Ajuste de saldo",
          },
        ])
        .select()
        .single();

      if (lancamentoError) throw lancamentoError;

      // Criar item do lançamento
      await supabase.from("lancamentos_financeiros_itens").insert([
        {
          lancamento_id: lancamentoData.id,
          descricao2:
            tipo === "Receita" ? "Outras Receitas Não Operacionais" : "Outras Despesas Não Operacionais",
          produto_servico: "Ajuste de saldo bancário",
          valor: valorAjuste,
        },
      ]);

      toast.success("Saldo atualizado com sucesso!");
      setConfirmDialogOpen(false);
      await loadLancamentos();
      await loadRelatedData();
    } catch (error) {
      console.error("Erro ao atualizar saldo:", error);
      toast.error("Erro ao atualizar saldo");
    }
  };

  // Dados para exportação
  const dadosExportacao = useMemo(() => {
    const dados = filtrosAplicados ? lancamentosFiltrados : lancamentos;
    return dados.map((l) => ({
      "Data do Pagamento": new Date(l.dataPagamento + "T00:00:00").toLocaleDateString("pt-BR"),
      "Ano/Mês": `${l.ano}/${l.mesCompetencia}`,
      Tipo: l.tipo,
      Fornecedor: l.nomeFornecedor || "-",
      Cliente: l.nomeCliente || "-",
      Pet: l.nomePet || "-",
      "Descrição 1": l.descricao1,
      "Descrições 2": l.itens.map((i) => i.descricao2).join(", "),
      Itens: l.itens.map((i) => `${i.produtoServico || i.descricao2} (${formatCurrency(i.valor)})`).join("; "),
      "Valor Total": formatCurrency(l.valorTotal),
      Banco: l.nomeBanco,
      Status: l.pago ? "Pago" : "Pendente",
    }));
  }, [lancamentos, lancamentosFiltrados, filtrosAplicados]);

  // Compute comparativoAnterior (mês anterior) para cards
  const comparativoAnterior = useMemo(() => {
    if (dadosMensais.length < 3) return null;
    const anterior = dadosMensais[dadosMensais.length - 2];
    const doisAtras = dadosMensais[dadosMensais.length - 3];
    const varReceita = doisAtras.receitas > 0 ? ((anterior.receitas - doisAtras.receitas) / doisAtras.receitas) * 100 : 0;
    const varDespesa = doisAtras.despesas > 0 ? ((anterior.despesas - doisAtras.despesas) / doisAtras.despesas) * 100 : 0;
    const varLucro = doisAtras.lucro !== 0 ? ((anterior.lucro - doisAtras.lucro) / Math.abs(doisAtras.lucro)) * 100 : 0;
    const diffMargem = anterior.margem - doisAtras.margem;
    return {
      receita: anterior.receitas,
      despesa: anterior.despesas,
      lucro: anterior.lucro,
      margem: anterior.margem,
      varReceita,
      varDespesa,
      varLucro,
      diffMargem,
    };
  }, [dadosMensais]);

  // Nomes dos meses em português
  const nomesMeses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  // Função auxiliar para calcular métricas de um mês/ano específico a partir dos lancamentos carregados
  // IMPORTANTE: Usa data_pagamento (não mes_competencia/ano) para garantir paridade com useFinancialData e gráficos
  const calcularMetricasMes = (mes: number, ano: number) => {
    const inicioStr = `${ano}-${String(mes).padStart(2, "0")}-01`;
    const lastDay = new Date(ano, mes, 0).getDate();
    const fimStr = `${ano}-${String(mes).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const filtrados = lancamentos.filter(
      (l) => l.pago && l.dataPagamento && l.dataPagamento >= inicioStr && l.dataPagamento <= fimStr && l.observacao !== "Transferência entre contas"
    );
    const receitas = filtrados.filter(l => l.tipo === "Receita").reduce((a, l) => a + l.valorTotal, 0);
    const despesas = filtrados.filter(l => l.tipo === "Despesa").reduce((a, l) => a + l.valorTotal, 0);
    const lucro = receitas - despesas;
    const margem = receitas > 0 ? (lucro / receitas) * 100 : 0;
    return { receitas, despesas, lucro, margem };
  };

  // Detecta o período de referência com base no filtro ativo
  const periodoReferencia = useMemo(() => {
    if (!filtrosAplicados) return null;

    // Caso 1: filtro por Mês da Competência + Ano
    if (filtroDataAtivo === "mesano" && filtros.mes && filtros.ano) {
      return {
        mesRef: parseInt(filtros.mes),
        anoRef: parseInt(filtros.ano),
      };
    }

    // Caso 2: filtro por Período — detectar se cobre um mês completo
    if (filtroDataAtivo === "periodo" && filtros.dataInicio && filtros.dataFim) {
      const inicio = new Date(filtros.dataInicio + "T00:00:00");
      const fim = new Date(filtros.dataFim + "T00:00:00");

      // Devem estar no mesmo mês/ano
      if (inicio.getMonth() !== fim.getMonth() || inicio.getFullYear() !== fim.getFullYear()) {
        return null;
      }

      const mesRef = inicio.getMonth() + 1;
      const anoRef = inicio.getFullYear();

      const primeiroDia = new Date(anoRef, mesRef - 1, 1);
      const ultimoDia = new Date(anoRef, mesRef, 0);

      // Verificar se cobre o mês completo (do 1° ao último dia)
      const cobretudo = inicio <= primeiroDia && fim >= ultimoDia;

      // Verificar se cobre do primeiro ao último dia útil (seg-sex)
      let primeiroUtil = new Date(primeiroDia);
      while (primeiroUtil.getDay() === 0 || primeiroUtil.getDay() === 6) {
        primeiroUtil.setDate(primeiroUtil.getDate() + 1);
      }
      let ultimoUtil = new Date(ultimoDia);
      while (ultimoUtil.getDay() === 0 || ultimoUtil.getDay() === 6) {
        ultimoUtil.setDate(ultimoUtil.getDate() - 1);
      }
      const cobretudoUtil = inicio >= primeiroDia && inicio <= primeiroUtil && fim <= ultimoDia && fim >= ultimoUtil;

      if (cobretudo || cobretudoUtil) {
        return { mesRef, anoRef };
      }
    }

    return null;
  }, [filtrosAplicados, filtroDataAtivo, filtros]);

  // Cards dinâmicos baseados no periodoReferencia
  const comparativoCards = useMemo(() => {
    if (!periodoReferencia) return comparativo;

    const { mesRef, anoRef } = periodoReferencia;
    const atual = calcularMetricasMes(mesRef, anoRef);
    const mesAntNum = mesRef === 1 ? 12 : mesRef - 1;
    const anoAntNum = mesRef === 1 ? anoRef - 1 : anoRef;
    const ant = calcularMetricasMes(mesAntNum, anoAntNum);

    return {
      receita: atual.receitas,
      despesa: atual.despesas,
      lucro: atual.lucro,
      margem: atual.margem,
      varReceita: ant.receitas > 0 ? ((atual.receitas - ant.receitas) / ant.receitas) * 100 : 0,
      varDespesa: ant.despesas > 0 ? ((atual.despesas - ant.despesas) / ant.despesas) * 100 : 0,
      varLucro: ant.lucro !== 0 ? ((atual.lucro - ant.lucro) / Math.abs(ant.lucro)) * 100 : 0,
      diffMargem: atual.margem - ant.margem,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoReferencia, lancamentos, comparativo]);

  const comparativoAnteriorCards = useMemo(() => {
    if (!periodoReferencia) return comparativoAnterior;

    const { mesRef, anoRef } = periodoReferencia;
    const mesAntNum = mesRef === 1 ? 12 : mesRef - 1;
    const anoAntNum = mesRef === 1 ? anoRef - 1 : anoRef;
    const ant = calcularMetricasMes(mesAntNum, anoAntNum);
    const mesDoisAtrasNum = mesAntNum === 1 ? 12 : mesAntNum - 1;
    const anoDoisAtrasNum = mesAntNum === 1 ? anoAntNum - 1 : anoAntNum;
    const doisAtras = calcularMetricasMes(mesDoisAtrasNum, anoDoisAtrasNum);

    return {
      receita: ant.receitas,
      despesa: ant.despesas,
      lucro: ant.lucro,
      margem: ant.margem,
      varReceita: doisAtras.receitas > 0 ? ((ant.receitas - doisAtras.receitas) / doisAtras.receitas) * 100 : 0,
      varDespesa: doisAtras.despesas > 0 ? ((ant.despesas - doisAtras.despesas) / doisAtras.despesas) * 100 : 0,
      varLucro: doisAtras.lucro !== 0 ? ((ant.lucro - doisAtras.lucro) / Math.abs(doisAtras.lucro)) * 100 : 0,
      diffMargem: ant.margem - doisAtras.margem,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodoReferencia, lancamentos, comparativoAnterior]);

  // Labels dinâmicos dos cards
  const labelCardAnterior = useMemo(() => {
    if (!periodoReferencia) return "Mês Anterior";
    const { mesRef, anoRef } = periodoReferencia;
    const mesAntNum = mesRef === 1 ? 12 : mesRef - 1;
    const anoAntNum = mesRef === 1 ? anoRef - 1 : anoRef;
    return `${nomesMeses[mesAntNum - 1]}/${anoAntNum}`;
  }, [periodoReferencia]);

  const labelCardAtual = useMemo(() => {
    if (!periodoReferencia) return "Mês Atual";
    const { mesRef, anoRef } = periodoReferencia;
    return `${nomesMeses[mesRef - 1]}/${anoRef}`;
  }, [periodoReferencia]);

  const exportCSV = () => {
    const dados = filtrosAplicados ? lancamentosFiltrados : lancamentos;
    if (dados.length === 0) {
      toast.error("Não há dados para exportar");
      return;
    }
    const columns = [
      "Data do Pagamento", "Ano/Mês", "Tipo", "Fornecedor", "Cliente", "Pet",
      "Descrição 1", "Descrições 2", "Itens", "Valor Total", "Banco", "Status",
    ];
    const rows = dadosExportacao.map((row: any) =>
      columns.map((col) => {
        const v = row[col];
        if (typeof v === "string" && (v.includes(",") || v.includes('"'))) return `"${v.replace(/"/g, '""')}"`;
        return v ?? "";
      }).join(",")
    );
    const csv = [columns.join(","), ...rows].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `fluxo-de-caixa_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    toast.success("Relatório CSV exportado com sucesso!");
  };

  const handleExportarPDF = () => {
    if (!filtrosAplicados) {
      toast.error("Favor selecionar no filtro o período que deseja extrair no relatório.");
      return;
    }

    const fmt = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
    const periodo = [
      filtros.dataInicio && filtros.dataFim
        ? `${filtros.dataInicio.split("-").reverse().join("/")} a ${filtros.dataFim.split("-").reverse().join("/")}`
        : "",
      filtros.mes && filtros.ano ? `${filtros.mes}/${filtros.ano}` : "",
      filtros.mes && !filtros.ano ? `Mês ${filtros.mes}` : "",
      !filtros.mes && filtros.ano ? `Ano ${filtros.ano}` : "",
    ].find(Boolean) || "Período filtrado";

    const tabelaLinhas = lancamentosFiltrados.map((l) => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:3px 6px;font-size:11px;">${new Date(l.dataPagamento + "T00:00:00").toLocaleDateString("pt-BR")}</td>
        <td style="padding:3px 6px;font-size:11px;">${l.ano}/${l.mesCompetencia}</td>
        <td style="padding:3px 6px;font-size:11px;color:${l.tipo === "Receita" ? "#16a34a" : "#dc2626"};">${l.tipo}</td>
        <td style="padding:3px 6px;font-size:11px;">${l.nomeFornecedor || "-"}</td>
        <td style="padding:3px 6px;font-size:11px;">${l.nomeCliente || "-"}</td>
        <td style="padding:3px 6px;font-size:11px;">${l.descricao1}</td>
        <td style="padding:3px 6px;font-size:11px;">${l.itens.map((i) => i.descricao2).join(", ")}</td>
        <td style="padding:3px 6px;font-size:11px;font-weight:bold;color:${l.tipo === "Receita" ? "#16a34a" : "#dc2626"};">${fmt(l.valorTotal)}</td>
        <td style="padding:3px 6px;font-size:11px;">${l.nomeBanco}</td>
        <td style="padding:3px 6px;font-size:11px;">${l.pago ? "Pago" : "Pendente"}</td>
      </tr>
    `).join("");

    const cardsMesAnterior = comparativoAnteriorCards ? `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px;">
        <div style="border:1px solid #d1fae5;border-radius:8px;padding:10px;background:#f0fdf4;">
          <p style="font-size:11px;color:#6b7280;margin:0;">Receita — ${labelCardAnterior}</p>
          <p style="font-size:15px;font-weight:bold;color:#16a34a;margin:4px 0;">${fmt(comparativoAnteriorCards.receita)}</p>
          <p style="font-size:11px;color:${comparativoAnteriorCards.varReceita >= 0 ? "#16a34a" : "#dc2626"};margin:0;">${comparativoAnteriorCards.varReceita >= 0 ? "+" : ""}${comparativoAnteriorCards.varReceita.toFixed(1)}%</p>
        </div>
        <div style="border:1px solid #fee2e2;border-radius:8px;padding:10px;background:#fff1f2;">
          <p style="font-size:11px;color:#6b7280;margin:0;">Despesas — ${labelCardAnterior}</p>
          <p style="font-size:15px;font-weight:bold;color:#dc2626;margin:4px 0;">${fmt(comparativoAnteriorCards.despesa)}</p>
          <p style="font-size:11px;color:${comparativoAnteriorCards.varDespesa <= 0 ? "#16a34a" : "#dc2626"};margin:0;">${comparativoAnteriorCards.varDespesa >= 0 ? "+" : ""}${comparativoAnteriorCards.varDespesa.toFixed(1)}%</p>
        </div>
        <div style="border:1px solid #dbeafe;border-radius:8px;padding:10px;background:#eff6ff;">
          <p style="font-size:11px;color:#6b7280;margin:0;">Lucro — ${labelCardAnterior}</p>
          <p style="font-size:15px;font-weight:bold;color:${comparativoAnteriorCards.lucro >= 0 ? "#16a34a" : "#dc2626"};margin:4px 0;">${fmt(comparativoAnteriorCards.lucro)}</p>
          <p style="font-size:11px;color:${comparativoAnteriorCards.varLucro >= 0 ? "#16a34a" : "#dc2626"};margin:0;">${comparativoAnteriorCards.varLucro >= 0 ? "+" : ""}${comparativoAnteriorCards.varLucro.toFixed(1)}%</p>
        </div>
        <div style="border:1px solid #f3e8ff;border-radius:8px;padding:10px;background:#faf5ff;">
          <p style="font-size:11px;color:#6b7280;margin:0;">Margem — ${labelCardAnterior}</p>
          <p style="font-size:15px;font-weight:bold;color:${comparativoAnteriorCards.margem >= 0 ? "#16a34a" : "#dc2626"};margin:4px 0;">${comparativoAnteriorCards.margem.toFixed(1)}%</p>
          <p style="font-size:11px;color:${comparativoAnteriorCards.diffMargem >= 0 ? "#16a34a" : "#dc2626"};margin:0;">${comparativoAnteriorCards.diffMargem >= 0 ? "+" : ""}${comparativoAnteriorCards.diffMargem.toFixed(1)}pp</p>
        </div>
      </div>
    ` : "";

    const cardsMesAtual = comparativoCards ? `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px;">
        <div style="border:1px solid #d1fae5;border-radius:8px;padding:10px;background:#f0fdf4;">
          <p style="font-size:11px;color:#6b7280;margin:0;">Receita — ${labelCardAtual}</p>
          <p style="font-size:15px;font-weight:bold;color:#16a34a;margin:4px 0;">${fmt(comparativoCards.receita)}</p>
          <p style="font-size:11px;color:${comparativoCards.varReceita >= 0 ? "#16a34a" : "#dc2626"};margin:0;">${comparativoCards.varReceita >= 0 ? "+" : ""}${comparativoCards.varReceita.toFixed(1)}%</p>
        </div>
        <div style="border:1px solid #fee2e2;border-radius:8px;padding:10px;background:#fff1f2;">
          <p style="font-size:11px;color:#6b7280;margin:0;">Despesas — ${labelCardAtual}</p>
          <p style="font-size:15px;font-weight:bold;color:#dc2626;margin:4px 0;">${fmt(comparativoCards.despesa)}</p>
          <p style="font-size:11px;color:${comparativoCards.varDespesa <= 0 ? "#16a34a" : "#dc2626"};margin:0;">${comparativoCards.varDespesa >= 0 ? "+" : ""}${comparativoCards.varDespesa.toFixed(1)}%</p>
        </div>
        <div style="border:1px solid #dbeafe;border-radius:8px;padding:10px;background:#eff6ff;">
          <p style="font-size:11px;color:#6b7280;margin:0;">Lucro — ${labelCardAtual}</p>
          <p style="font-size:15px;font-weight:bold;color:${comparativoCards.lucro >= 0 ? "#16a34a" : "#dc2626"};margin:4px 0;">${fmt(comparativoCards.lucro)}</p>
          <p style="font-size:11px;color:${comparativoCards.varLucro >= 0 ? "#16a34a" : "#dc2626"};margin:0;">${comparativoCards.varLucro >= 0 ? "+" : ""}${comparativoCards.varLucro.toFixed(1)}%</p>
        </div>
        <div style="border:1px solid #f3e8ff;border-radius:8px;padding:10px;background:#faf5ff;">
          <p style="font-size:11px;color:#6b7280;margin:0;">Margem — ${labelCardAtual}</p>
          <p style="font-size:15px;font-weight:bold;color:${comparativoCards.margem >= 0 ? "#16a34a" : "#dc2626"};margin:4px 0;">${comparativoCards.margem.toFixed(1)}%</p>
          <p style="font-size:11px;color:${comparativoCards.diffMargem >= 0 ? "#16a34a" : "#dc2626"};margin:0;">${comparativoCards.diffMargem >= 0 ? "+" : ""}${comparativoCards.diffMargem.toFixed(1)}pp</p>
        </div>
      </div>
    ` : "";

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Fluxo de Caixa - ${periodo}</title>
  <style>
    @page { size: A4 landscape; margin: 10mm; }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 0; padding: 0; }
    h1 { font-size: 16px; margin: 0 0 4px 0; }
    p { margin: 0 0 12px 0; font-size: 11px; color: #555; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    thead tr { background: #f3f4f6; }
    th { padding: 5px 6px; text-align: left; font-weight: 600; border-bottom: 2px solid #d1d5db; }
    tr:nth-child(even) { background: #f9fafb; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <h1>Fluxo de Caixa</h1>
  <p>Período: ${periodo} — Gerado em ${new Date().toLocaleDateString("pt-BR")}</p>
  ${cardsMesAnterior}
  ${cardsMesAtual}
  <table>
    <thead>
      <tr>
        <th>Data Pagto.</th><th>Ano/Mês</th><th>Tipo</th><th>Fornecedor</th>
        <th>Cliente</th><th>Descrição 1</th><th>Itens</th>
        <th>Valor Total</th><th>Banco</th><th>Status</th>
      </tr>
    </thead>
    <tbody>${tabelaLinhas}</tbody>
  </table>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Não foi possível abrir a janela de impressão. Verifique se o bloqueador de pop-ups está ativo.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-bold">Fluxo de Caixa</h2>

        <div className="flex items-center gap-2">
          {/* Botão Lançar Financeiro */}
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={(open) => {
              setIsCreateDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2 h-8 text-xs bg-green-600 hover:bg-green-700">
                <Plus className="h-3 w-3" />
                Lançar Financeiro
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-base">Lançar Financeiro</DialogTitle>
                <DialogDescription className="text-[10px]">
                  Preencha os dados do lançamento financeiro
                </DialogDescription>
              </DialogHeader>

              <form onSubmit={handleCreateSubmit} className="space-y-2">
                <div className="grid grid-cols-4 gap-2">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-semibold">Ano *</Label>
                    <Input type="number" min="2020" max="2050" value={formData.ano} onChange={(e) => setFormData({ ...formData, ano: e.target.value })} className="h-7 text-xs" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-semibold">Mês Competência *</Label>
                    <Select value={formData.mesCompetencia} onValueChange={(value) => setFormData({ ...formData, mesCompetencia: value })}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{meses.map((mes) => (<SelectItem key={mes.value} value={mes.value} className="text-xs">{mes.label}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-semibold">Tipo *</Label>
                    <Select value={formData.tipo} onValueChange={(value: any) => setFormData({ ...formData, tipo: value, descricao1: "", nomeCliente: "", nomePet: "", petsSelecionados: [], fornecedorId: "" })}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Receita" className="text-xs">Receita</SelectItem>
                        <SelectItem value="Despesa" className="text-xs">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-semibold">Descrição 1 *</Label>
                    <Select value={formData.descricao1} onValueChange={(value) => setFormData({ ...formData, descricao1: value })} disabled={!formData.tipo}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder={formData.tipo ? "Selecione" : "Selecione tipo"} /></SelectTrigger>
                      <SelectContent>{formData.tipo && categoriasDescricao1[formData.tipo].map((desc) => (<SelectItem key={desc} value={desc} className="text-xs">{desc}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    {formData.tipo === "Despesa" ? (
                      <>
                        <Label className="text-[10px] font-semibold">Fornecedor</Label>
                        <Popover open={fornecedorPopoverOpen} onOpenChange={setFornecedorPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" role="combobox" className="w-full justify-between h-7 text-xs">
                              {formData.fornecedorId ? (() => { const f = fornecedores.find((f) => f.id === formData.fornecedorId); return f ? f.nome_fornecedor : "Selecione"; })() : "Selecione o fornecedor"}
                              <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command shouldFilter={false}>
                              <CommandInput placeholder="Buscar por nome, CNPJ/CPF ou fantasia..." className="text-xs" value={fornecedorSearch} onValueChange={setFornecedorSearch} />
                              <CommandEmpty className="text-xs">Nenhum fornecedor encontrado.</CommandEmpty>
                              <CommandGroup className="max-h-60 overflow-y-auto">
                                {fornecedoresFiltrados.map((f) => (
                                  <CommandItem key={f.id} value={f.id} onSelect={() => { setFormData({ ...formData, fornecedorId: formData.fornecedorId === f.id ? "" : f.id }); setFornecedorSearch(""); setFornecedorPopoverOpen(false); }} className="text-xs">
                                    <Check className={cn("mr-2 h-3 w-3", formData.fornecedorId === f.id ? "opacity-100" : "opacity-0")} />
                                    <div className="flex flex-col">
                                      <span>{f.nome_fornecedor}</span>
                                      <span className="text-[10px] text-muted-foreground">{f.cnpj_cpf}{f.nome_fantasia ? ` • ${f.nome_fantasia}` : ""}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </>
                    ) : (
                      <>
                        <Label className="text-[10px] font-semibold">
                          Nome do Cliente{" "}
                          {formData.tipo === "Receita" && formData.descricao1 === "Receita Operacional" ? "*" : ""}
                        </Label>
                        <ComboboxField
                          value={formData.nomeCliente}
                          onChange={(value) => {
                            const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === value);
                            if (clientesComMesmoNome.length > 0 && formData.nomePet) {
                              const petAtual = pets.find((p) => p.nomePet === formData.nomePet);
                              const petPertenceAoCliente = petAtual && clientesComMesmoNome.some((c) => c.id === petAtual.clienteId);
                              if (!petPertenceAoCliente) {
                                setFormData({ ...formData, nomeCliente: value, nomePet: "", petsSelecionados: [] });
                              } else {
                                setFormData({ ...formData, nomeCliente: value });
                              }
                            } else {
                              setFormData({ ...formData, nomeCliente: value });
                            }
                          }}
                          options={clientesFormulario}
                          placeholder="Selecione o cliente"
                          searchPlaceholder="Buscar cliente..."
                          id="create-form-cliente"
                        />
                      </>
                    )}
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Label className="text-[10px] font-semibold">
                        Pets {formData.tipo === "Receita" && formData.descricao1 === "Receita Operacional" ? "*" : ""}
                      </Label>
                      {formData.tipo === "Receita" && formData.nomeCliente && formData.nomePet && temPetsAdicionais && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm" className="h-5 text-[10px] px-2 gap-1">
                              <Plus className="h-3 w-3" />Pet
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-64 p-2">
                            <div className="space-y-2">
                              <Label className="text-xs font-semibold">Adicionar Pet</Label>
                              <div className="max-h-48 overflow-y-auto space-y-1">
                                {(() => {
                                  const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === formData.nomeCliente);
                                  let clienteSelecionado: Cliente | undefined;
                                  for (const cliente of clientesComMesmoNome) {
                                    const petEncontrado = pets.find((p) => p.nomePet === formData.nomePet && p.clienteId === cliente.id);
                                    if (petEncontrado) { clienteSelecionado = cliente; break; }
                                  }
                                  if (!clienteSelecionado) return <div className="text-xs text-muted-foreground">Nenhum pet disponível</div>;
                                  const petsDisponiveis = pets.filter((p) => p.clienteId === clienteSelecionado!.id && p.nomePet !== formData.nomePet && !formData.petsSelecionados.some((ps) => ps.id === p.id));
                                  if (petsDisponiveis.length === 0) return <div className="text-xs text-muted-foreground p-2">Nenhum pet adicional disponível</div>;
                                  return petsDisponiveis.map((pet) => (
                                    <Button key={pet.id} variant="ghost" size="sm" className="w-full justify-start text-xs h-8" onClick={() => {
                                      if (!formData.petsSelecionados.some((p) => p.id === pet.id)) {
                                        setFormData({ ...formData, petsSelecionados: [...formData.petsSelecionados, pet] });
                                        toast.success(`${pet.nomePet} adicionado!`);
                                      }
                                    }}>
                                      <div className="flex flex-col items-start">
                                        <span className="font-medium">{pet.nomePet}</span>
                                        <span className="text-[10px] text-muted-foreground">{pet.raca} - {pet.porte}</span>
                                      </div>
                                    </Button>
                                  ));
                                })()}
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>

                    {formData.tipo === "Despesa" ? (
                      <div className="h-7 flex items-center px-3 text-xs border rounded-md bg-muted text-muted-foreground">Não aplicável</div>
                    ) : (
                      <div className="space-y-2">
                        <ComboboxField
                          value={formData.nomePet}
                          onChange={(value) => {
                            if (!formData.nomeCliente) {
                              const petSelecionado = pets.find((p) => p.nomePet === value);
                              if (petSelecionado) {
                                const clienteDoPet = clientes.find((c) => c.id === petSelecionado.clienteId);
                                if (clienteDoPet) {
                                  setFormData({ ...formData, nomePet: value, nomeCliente: clienteDoPet.nomeCliente, petsSelecionados: [] });
                                } else {
                                  setFormData({ ...formData, nomePet: value, petsSelecionados: [] });
                                }
                              } else {
                                setFormData({ ...formData, nomePet: value, petsSelecionados: [] });
                              }
                            } else {
                              const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === formData.nomeCliente);
                              const petPertenceAAlgum = pets.find((p) => p.nomePet === value && clientesComMesmoNome.some((c) => c.id === p.clienteId));
                              if (petPertenceAAlgum) {
                                setFormData({ ...formData, nomePet: value, petsSelecionados: [] });
                              } else {
                                const petReal = pets.find((p) => p.nomePet === value);
                                if (petReal) {
                                  const donoReal = clientes.find((c) => c.id === petReal.clienteId);
                                  if (donoReal) {
                                    setFormData({ ...formData, nomePet: value, nomeCliente: donoReal.nomeCliente, petsSelecionados: [] });
                                  } else {
                                    setFormData({ ...formData, nomePet: value, nomeCliente: "", petsSelecionados: [] });
                                  }
                                } else {
                                  setFormData({ ...formData, nomePet: value, nomeCliente: "", petsSelecionados: [] });
                                }
                              }
                            }
                          }}
                          options={petsFormulario}
                          placeholder="Selecione o pet principal"
                          searchPlaceholder="Buscar pet..."
                          id="create-form-pet"
                          disabled={false}
                        />
                        {formData.petsSelecionados.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1">
                            {formData.petsSelecionados.map((pet) => (
                              <Badge key={pet.id} variant="secondary" className="text-[10px] px-2 py-0.5 gap-1">
                                {pet.nomePet}
                                <button type="button" onClick={() => { setFormData({ ...formData, petsSelecionados: formData.petsSelecionados.filter((p) => p.id !== pet.id) }); toast.success(`${pet.nomePet} removido`); }} className="ml-1 hover:text-destructive">
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {itensLancamento.map((item, index) => (
                  <ItemLancamentoForm
                    key={item.id} item={item} index={index} formData={formData} servicos={servicos} pacotes={pacotes} produtos={produtos}
                    onChange={(novoItem) => { setItensLancamento(itensLancamento.map((i) => (i.id === item.id ? novoItem : i))); }}
                    onRemove={() => { if (itensLancamento.length > 1) { setItensLancamento(itensLancamento.filter((i) => i.id !== item.id)); } else { toast.error("É necessário ter pelo menos 1 item"); } }}
                    canRemove={itensLancamento.length > 1}
                    onAdd={() => { if (itensLancamento.length < 10) { setItensLancamento([...itensLancamento, { id: Date.now().toString(), descricao2: "", produtoServico: "", valor: 0 }]); } else { toast.error("Limite máximo de 10 itens atingido"); } }}
                    isLast={index === itensLancamento.length - 1}
                    canAdd={itensLancamento.length < 10}
                  />
                ))}

                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="inline-flex rounded-md border border-input overflow-hidden">
                      <button type="button" className={cn("px-3 py-1 text-[10px] font-medium transition-colors", formData.modoAjuste === "deducao" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")} onClick={() => setFormData({ ...formData, modoAjuste: "deducao", valorJuros: 0, tipoJuros: "" })}>Dedução</button>
                      <button type="button" className={cn("px-3 py-1 text-[10px] font-medium transition-colors", formData.modoAjuste === "juros" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")} onClick={() => setFormData({ ...formData, modoAjuste: "juros", valorDeducao: 0, tipoDeducao: "" })}>Juros</button>
                    </div>
                    {formData.modoAjuste === "deducao" ? (
                      <>
                        <div className="space-y-0.5">
                          <Label className="text-[10px]">Valor da Dedução</Label>
                          <Input type="number" step="0.01" min="0" placeholder="R$ 0,00" value={formData.valorDeducao || ""} onChange={(e) => setFormData({ ...formData, valorDeducao: parseFloat(e.target.value) || 0 })} className="h-7 text-xs w-24" />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[10px]">Tipo de Dedução</Label>
                          <Select value={formData.tipoDeducao} onValueChange={(value) => setFormData({ ...formData, tipoDeducao: value })}>
                            <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Selecione" /></SelectTrigger>
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
                          <Label className="text-[10px]">Valor do Juros</Label>
                          <Input type="number" step="0.01" min="0" placeholder="R$ 0,00" value={formData.valorJuros || ""} onChange={(e) => setFormData({ ...formData, valorJuros: parseFloat(e.target.value) || 0 })} className="h-7 text-xs w-24" />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[10px]">Motivo do Juros</Label>
                          <Select value={formData.tipoJuros} onValueChange={(value) => setFormData({ ...formData, tipoJuros: value })}>
                            <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Juros de Mora" className="text-xs">Juros de Mora</SelectItem>
                              <SelectItem value="Multa" className="text-xs">Multa</SelectItem>
                              <SelectItem value="Correção Monetária" className="text-xs">Correção Monetária</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                    <div className="flex items-end gap-2 h-7 ml-auto">
                      <Label className="text-xs font-semibold whitespace-nowrap">Valor Total:</Label>
                      <span className="text-base font-bold text-primary">
                        {formatCurrency(formData.modoAjuste === "juros" ? itensLancamento.reduce((acc, item) => acc + item.valor, 0) + (formData.valorJuros || 0) : itensLancamento.reduce((acc, item) => acc + item.valor, 0) - (formData.valorDeducao || 0))}
                      </span>
                    </div>
                  </div>
                  {formData.modoAjuste === "deducao" && formData.valorDeducao > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Subtotal: {formatCurrency(itensLancamento.reduce((acc, item) => acc + item.valor, 0))} - Dedução ({formData.tipoDeducao}): {formatCurrency(formData.valorDeducao)}
                    </div>
                  )}
                  {formData.modoAjuste === "juros" && formData.valorJuros > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Subtotal: {formatCurrency(itensLancamento.reduce((acc, item) => acc + item.valor, 0))} + Juros ({formData.tipoJuros}): {formatCurrency(formData.valorJuros)}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-semibold">Data do Pagamento</Label>
                    <Input type="date" value={formData.dataPagamento} onChange={(e) => setFormData({ ...formData, dataPagamento: e.target.value })} className="h-7 text-xs" />
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-semibold">Conta Bancária *</Label>
                    <Select value={formData.nomeBanco} onValueChange={(value) => setFormData({ ...formData, nomeBanco: value })}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{contas.map((c) => (<SelectItem key={c.id} value={c.nomeBanco} className="text-xs">{c.nomeBanco}</SelectItem>))}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-semibold">Pago *</Label>
                    <Select value={formData.pago ? "sim" : "nao"} onValueChange={(value) => setFormData({ ...formData, pago: value === "sim" })}>
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sim" className="text-xs">Sim</SelectItem>
                        <SelectItem value="nao" className="text-xs">Não</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={resetForm} className="h-7 text-xs">Cancelar</Button>
                  <Button type="submit" className="h-7 text-xs">Salvar Lançamento</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          {/* Botão Transferência de Saldo */}
          <Button
            variant="outline"
            onClick={abrirDialogoTransferencia}
            className="h-8 text-xs gap-2"
          >
            <ArrowLeftRight className="h-3 w-3" />
            Transferência de Saldo
          </Button>

          <Button
            variant="outline"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="h-8 text-xs gap-2"
          >
            <Filter className="h-3 w-3" />
            {mostrarFiltros ? "Ocultar" : "Mostrar"} Filtros
          </Button>

          {/* Botão Atualizar Saldo */}
          <Dialog open={dialogSaldoOpen} onOpenChange={setDialogSaldoOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={abrirDialogoSaldo} className="h-8 text-xs gap-2">
                <RefreshCw className="h-3 w-3" />
                Atualizar Saldo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Atualizar Saldo Bancário</DialogTitle>
                <DialogDescription>
                  Atualize o saldo de uma conta bancária. Um lançamento de ajuste será criado automaticamente.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Conta Bancária</Label>
                  <Select value={contaSelecionada} onValueChange={setContaSelecionada}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {contas.map((conta) => (
                        <SelectItem key={conta.id} value={conta.nomeBanco}>
                          {conta.nomeBanco}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Data de Referência</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dataAjusteSaldo && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dataAjusteSaldo ? format(dataAjusteSaldo, "dd/MM/yyyy") : <span>Selecione a data</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dataAjusteSaldo}
                        onSelect={(date) => date && setDataAjusteSaldo(date)}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {contaSelecionada && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">Saldo Atual</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(
                        saldosPorBanco.find((s) => s.nome === contaSelecionada)?.saldoAtual ||
                          contas.find((c) => c.nomeBanco === contaSelecionada)?.saldo ||
                          0,
                      )}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Novo Saldo</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Digite o novo saldo"
                    value={novoSaldo}
                    onChange={(e) => setNovoSaldo(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDialogSaldoOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={abrirConfirmacao}>Atualizar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button variant="outline" size="sm" onClick={handleExportarPDF} className="h-8 text-xs">
            <FileText className="h-3 w-3 mr-1" />
            Exportar PDF
          </Button>
        </div>
      </div>

      {/* Modal Transferência de Saldo */}
      <Dialog open={dialogTransferenciaOpen} onOpenChange={setDialogTransferenciaOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Transferência de Saldo</DialogTitle>
            <DialogDescription>
              Transfira valores entre suas contas bancárias cadastradas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Lista de contas com saldos na data selecionada */}
            <div className="space-y-1.5 p-3 bg-muted rounded-md">
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                Saldos disponíveis ({format(dataTransferencia, "dd/MM/yyyy")})
              </p>
              {saldosPorBancoNaData.map((banco) => (
                <p key={banco.nome} className="text-xs">
                  <span className="font-medium">{banco.nome}</span> — Saldo disponível:{" "}
                  <span className={banco.saldo >= 0 ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}>
                    {formatCurrency(banco.saldo)}
                  </span>
                </p>
              ))}
            </div>

            {/* Conta de origem */}
            <div className="space-y-2">
              <Label>Conta que irá transferir:</Label>
              <Select value={contaOrigem} onValueChange={(v) => { setContaOrigem(v); if (v === contaDestino) setContaDestino(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta de origem" />
                </SelectTrigger>
                <SelectContent>
                  {contas.map((conta) => (
                    <SelectItem key={conta.id} value={conta.nomeBanco}>
                      {conta.nomeBanco}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Conta de destino */}
            <div className="space-y-2">
              <Label>Conta que irá receber:</Label>
              <Select value={contaDestino} onValueChange={setContaDestino}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a conta de destino" />
                </SelectTrigger>
                <SelectContent>
                  {contas.filter((c) => c.nomeBanco !== contaOrigem).map((conta) => (
                    <SelectItem key={conta.id} value={conta.nomeBanco}>
                      {conta.nomeBanco}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <Label>Valor da transferência</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  className="pl-10"
                  placeholder="0,00"
                  value={valorTransferencia}
                  onChange={handleValorTransferenciaChange}
                />
              </div>
            </div>

            {/* Data */}
            <div className="space-y-2">
              <Label>Data da transferência</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dataTransferencia && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dataTransferencia ? format(dataTransferencia, "dd/MM/yyyy") : <span>Selecione a data</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dataTransferencia}
                    onSelect={(date) => date && setDataTransferencia(date)}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogTransferenciaOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={abrirConfirmacaoTransferencia}>Confirmar Transferência</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog Confirmação de Transferência */}
      <AlertDialog open={confirmTransferenciaOpen} onOpenChange={setConfirmTransferenciaOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Transferência</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>Confirme os dados da transferência:</p>
                <div className="p-3 bg-muted rounded-md space-y-1">
                  <p><strong>Conta de origem:</strong> {contaOrigem}</p>
                  <p><strong>Conta de destino:</strong> {contaDestino}</p>
                  <p><strong>Valor:</strong> R$ {valorTransferencia}</p>
                  <p><strong>Data:</strong> {dataTransferencia ? format(dataTransferencia, "dd/MM/yyyy") : ""}</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmarTransferencia}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* AlertDialog Saldo Insuficiente */}
      <AlertDialog open={alertaSaldoInsuficiente} onOpenChange={setAlertaSaldoInsuficiente}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Atenção</AlertDialogTitle>
            <AlertDialogDescription>
              Atenção: ao transferir o valor de R$ {valorTransferencia}, o saldo da conta {contaOrigem} na data da transferência ficará em R$ {saldoResultanteOrigem.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Deseja realmente prosseguir com essa operação?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setAlertaSaldoInsuficiente(false)}>Não</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setAlertaSaldoInsuficiente(false); setConfirmTransferenciaOpen(true); }}>Sim</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cards Mês Anterior */}
      {comparativoAnteriorCards && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-help">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Receita</p>
                    <p className="text-[10px] text-muted-foreground">{labelCardAnterior}</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(comparativoAnteriorCards.receita)}</p>
                    <VariationBadge value={comparativoAnteriorCards.varReceita} />
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-sm whitespace-pre-line">
                <p>{getTooltipText("receita", comparativoAnteriorCards, "anterior")}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>

          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-help">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Despesas</p>
                    <p className="text-[10px] text-muted-foreground">{labelCardAnterior}</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(comparativoAnteriorCards.despesa)}</p>
                    <VariationBadge value={comparativoAnteriorCards.varDespesa} invertColors />
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-sm whitespace-pre-line">
                <p>{getTooltipText("despesas", comparativoAnteriorCards, "anterior")}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>

          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-help">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Lucro</p>
                    <p className="text-[10px] text-muted-foreground">{labelCardAnterior}</p>
                    <p className={`text-lg font-bold ${comparativoAnteriorCards.lucro >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(comparativoAnteriorCards.lucro)}</p>
                    <VariationBadge value={comparativoAnteriorCards.varLucro} />
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-sm whitespace-pre-line">
                <p>{getTooltipText("lucro", comparativoAnteriorCards, "anterior")}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>

          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-help">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Margem</p>
                    <p className="text-[10px] text-muted-foreground">{labelCardAnterior}</p>
                    <p className={`text-lg font-bold ${comparativoAnteriorCards.margem >= 0 ? "text-green-600" : "text-red-600"}`}>{comparativoAnteriorCards.margem.toFixed(1)}%</p>
                    <VariationBadge value={comparativoAnteriorCards.diffMargem} suffix="pp" />
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-sm whitespace-pre-line">
                <p>{getTooltipText("margem", comparativoAnteriorCards, "anterior")}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Cards Mês Atual */}
      {comparativoCards && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-help">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Receita</p>
                    <p className="text-[10px] text-muted-foreground">{labelCardAtual}</p>
                    <p className="text-lg font-bold text-green-600">{formatCurrency(comparativoCards.receita)}</p>
                    <VariationBadge value={comparativoCards.varReceita} />
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-sm whitespace-pre-line">
                <p>{getTooltipText("receita", comparativoCards)}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>

          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-help">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Despesas</p>
                    <p className="text-[10px] text-muted-foreground">{labelCardAtual}</p>
                    <p className="text-lg font-bold text-red-600">{formatCurrency(comparativoCards.despesa)}</p>
                    <VariationBadge value={comparativoCards.varDespesa} invertColors />
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-sm whitespace-pre-line">
                <p>{getTooltipText("despesas", comparativoCards)}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>

          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-help">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Lucro</p>
                    <p className="text-[10px] text-muted-foreground">{labelCardAtual}</p>
                    <p className={`text-lg font-bold ${comparativoCards.lucro >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(comparativoCards.lucro)}</p>
                    <VariationBadge value={comparativoCards.varLucro} />
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-sm whitespace-pre-line">
                <p>{getTooltipText("lucro", comparativoCards)}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>

          <TooltipProvider>
            <UITooltip>
              <TooltipTrigger asChild>
                <Card className="cursor-help">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground">Margem</p>
                    <p className="text-[10px] text-muted-foreground">{labelCardAtual}</p>
                    <p className={`text-lg font-bold ${comparativoCards.margem >= 0 ? "text-green-600" : "text-red-600"}`}>{comparativoCards.margem.toFixed(1)}%</p>
                    <VariationBadge value={comparativoCards.diffMargem} suffix="pp" />
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs text-sm whitespace-pre-line">
                <p>{getTooltipText("margem", comparativoCards)}</p>
              </TooltipContent>
            </UITooltip>
          </TooltipProvider>
        </div>
      )}

      {/* Saldos por Banco */}
      {saldosPorBanco.length > 0 && (
        <Card className="border-purple-200 bg-purple-50 dark:bg-purple-950/30">
          <CardHeader className="py-2">
            <CardTitle className="text-sm text-purple-700 dark:text-purple-400">Saldos por Banco</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="space-y-2">
              {/* Saldo Inicial e Final do Período - só aparece com filtro de data */}
              {saldosPeriodo && periodoFiltrado && (
                <>
                  {/* Saldo Inicial do Período */}
                  <div className="pb-2 border-b border-purple-200 dark:border-purple-700">
                    <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 mb-1">
                      Saldo Inicial do Período ({periodoFiltrado.inicio.split("-").reverse().join("/")}):
                    </p>
                    {saldosPeriodo.porBanco.map((banco) => (
                      <div key={`ini-${banco.nome}`} className="flex items-center justify-between text-xs pl-2">
                        <span className="text-purple-600 dark:text-purple-400">{banco.nome}:</span>
                        <span className={cn("font-bold", banco.saldoInicial >= 0 ? "text-emerald-600" : "text-red-600")}>
                          {formatCurrency(banco.saldoInicial)}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-xs font-bold pl-2 mt-1">
                      <span className="text-purple-700 dark:text-purple-300">Saldo Inicial Total:</span>
                      <span className={cn(saldosPeriodo.saldoInicialTotal >= 0 ? "text-emerald-700" : "text-red-700")}>
                        {formatCurrency(saldosPeriodo.saldoInicialTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Saldo Final do Período */}
                  <div className="pb-2 border-b border-purple-200 dark:border-purple-700">
                    <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400 mb-1">
                      Saldo Final do Período ({periodoFiltrado.fim.split("-").reverse().join("/")}):
                    </p>
                    {saldosPeriodo.porBanco.map((banco) => (
                      <div key={`fim-${banco.nome}`} className="flex items-center justify-between text-xs pl-2">
                        <span className="text-purple-600 dark:text-purple-400">{banco.nome}:</span>
                        <span className={cn("font-bold", banco.saldoFinal >= 0 ? "text-emerald-600" : "text-red-600")}>
                          {formatCurrency(banco.saldoFinal)}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between text-xs font-bold pl-2 mt-1">
                      <span className="text-purple-700 dark:text-purple-300">Saldo Final Total:</span>
                      <span className={cn(saldosPeriodo.saldoFinalTotal >= 0 ? "text-emerald-700" : "text-red-700")}>
                        {formatCurrency(saldosPeriodo.saldoFinalTotal)}
                      </span>
                    </div>
                  </div>
                </>
              )}

              {/* Saldo Atual (sempre visível) */}
              {saldosPeriodo && periodoFiltrado && (
                <p className="text-[10px] font-semibold text-purple-600 dark:text-purple-400">Saldo Atual:</p>
              )}
              {saldosPorBanco.map((banco) => (
                <div key={banco.nome} className="flex items-center justify-between text-xs">
                  <span className="font-medium text-purple-700 dark:text-purple-400">{banco.nome}:</span>
                  <span className="font-bold text-purple-900 dark:text-purple-300">
                    {formatCurrency(banco.saldoAtual)}
                  </span>
                </div>
              ))}
              <div className="flex items-center justify-between text-sm font-bold border-t pt-2 mt-2">
                <span className="text-purple-800 dark:text-purple-300">Saldo Total:</span>
                <span className="text-purple-900 dark:text-purple-200">{formatCurrency(saldoTotalAtual)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros (Colapsável) */}
      {mostrarFiltros && (
        <Card>
          <CardHeader className="py-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="h-3 w-3" />
                Filtros
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setMostrarFiltros(false)} className="h-6 w-6 p-0">
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {/* Filtros de Data */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Filtros de Data</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Período da Data do Pagamento</Label>
                  <div className="grid grid-cols-2 gap-1">
                    <Input
                      type="date"
                      value={filtros.dataInicio}
                      onChange={(e) => {
                        setFiltros({ ...filtros, dataInicio: e.target.value, mes: "", ano: "" });
                        setFiltroDataAtivo("periodo");
                      }}
                      disabled={filtroDataAtivo === "mesano"}
                      className="h-7 text-xs"
                      placeholder="De"
                    />
                    <Input
                      type="date"
                      value={filtros.dataFim}
                      onChange={(e) => {
                        setFiltros({ ...filtros, dataFim: e.target.value, mes: "", ano: "" });
                        setFiltroDataAtivo("periodo");
                      }}
                      disabled={filtroDataAtivo === "mesano"}
                      className="h-7 text-xs"
                      placeholder="Até"
                    />
                  </div>
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px]">Mês da Competência</Label>
                  <Select
                    value={filtros.mes}
                    onValueChange={(value) => {
                      setFiltros({
                        ...filtros,
                        mes: value,
                        dataInicio: "",
                        dataFim: "",
                        ano: filtros.ano || new Date().getFullYear().toString(),
                      });
                      setFiltroDataAtivo("mesano");
                    }}
                    disabled={filtroDataAtivo === "periodo"}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {meses.map((mes) => (
                        <SelectItem key={mes.value} value={mes.value} className="text-xs">
                          {mes.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px]">Ano</Label>
                  <Select
                    value={filtros.ano}
                    onValueChange={(value) => {
                      setFiltros({ ...filtros, ano: value, dataInicio: "", dataFim: "" });
                      setFiltroDataAtivo("mesano");
                    }}
                    disabled={filtroDataAtivo === "periodo"}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 11 }, (_, i) => 2025 + i).map((ano) => (
                        <SelectItem key={ano} value={ano.toString()} className="text-xs">
                          {ano}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Filtros de Categoria */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">Filtros de Categoria</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
                <div className="space-y-0.5">
                  <Label className="text-[10px]">Fornecedor</Label>
                  <ComboboxField
                    value={filtros.nomeFornecedor}
                    onChange={(value) => setFiltros({ ...filtros, nomeFornecedor: value })}
                    options={fornecedores.map((f) => ({
                      value: f.nome_fornecedor,
                      label: `${f.nome_fornecedor}${f.nome_fantasia ? ` (${f.nome_fantasia})` : ""} - ${f.cnpj_cpf}`,
                    }))}
                    placeholder="Selecione"
                    searchPlaceholder="Buscar por nome ou CPF/CNPJ..."
                    id="filtro-fornecedor"
                  />
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px]">Nome do Pet</Label>
                  <ComboboxField
                    value={filtros.nomePet}
                    onChange={(value) => setFiltros({ ...filtros, nomePet: value })}
                    options={petsFiltro}
                    placeholder="Selecione"
                    searchPlaceholder="Buscar pet..."
                    id="filtro-pet"
                  />
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px]">Nome do Cliente</Label>
                  <ComboboxField
                    value={filtros.nomeCliente}
                    onChange={(value) => setFiltros({ ...filtros, nomeCliente: value })}
                    options={clientesFiltro}
                    placeholder="Selecione"
                    searchPlaceholder="Buscar cliente..."
                    id="filtro-cliente"
                  />
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px]">Tipo</Label>
                  <Select value={filtros.tipo} onValueChange={(value: any) => setFiltros({ ...filtros, tipo: value })}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Receita" className="text-xs">
                        Receita
                      </SelectItem>
                      <SelectItem value="Despesa" className="text-xs">
                        Despesa
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px]">Descrição 1</Label>
                  <Select
                    value={filtros.descricao1}
                    onValueChange={(value) => setFiltros({ ...filtros, descricao1: value })}
                    disabled={!filtros.tipo}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder={filtros.tipo ? "Selecione" : "Selecione tipo"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filtros.tipo &&
                        categoriasDescricao1[filtros.tipo].map((desc) => (
                          <SelectItem key={desc} value={desc} className="text-xs">
                            {desc}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px]">Data do Pagamento</Label>
                  <Input
                    type="date"
                    value={filtros.dataPagamento}
                    onChange={(e) => setFiltros({ ...filtros, dataPagamento: e.target.value })}
                    className="h-7 text-xs"
                  />
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px]">Banco</Label>
                  <Select value={filtros.nomeBanco} onValueChange={(value) => setFiltros({ ...filtros, nomeBanco: value })}>
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {contas.map((c) => (
                        <SelectItem key={c.id} value={c.nomeBanco} className="text-xs">
                          {c.nomeBanco}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px]">Foi Pago</Label>
                  <Select
                    value={filtros.pago === null ? "" : filtros.pago ? "sim" : "nao"}
                    onValueChange={(value) =>
                      setFiltros({ ...filtros, pago: value === "sim" ? true : value === "nao" ? false : null })
                    }
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sim" className="text-xs">
                        Sim
                      </SelectItem>
                      <SelectItem value="nao" className="text-xs">
                        Não
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={limparFiltros} className="h-7 text-xs gap-2">
                <X className="h-3 w-3" />
                Limpar Filtros
              </Button>
              <Button onClick={aplicarFiltros} className="h-7 text-xs gap-2">
                <Filter className="h-3 w-3" />
                Aplicar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabela de Lançamentos */}
      <Card>
        <CardHeader className="py-2">
          <CardTitle className="text-sm">Lançamentos Financeiros</CardTitle>
        </CardHeader>
        <CardContent className="py-2">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-1 font-semibold text-xs">Data Pgto</th>
                  <th className="text-left py-2 px-1 font-semibold text-xs">Ano/Mês</th>
                  <th className="text-left py-2 px-1 font-semibold text-xs">Tipo</th>
                  <th className="text-left py-2 px-1 font-semibold text-xs">Fornecedor</th>
                  <th className="text-left py-2 px-1 font-semibold text-xs">Cliente</th>
                  <th className="text-left py-2 px-1 font-semibold text-xs">Pet</th>
                  <th className="text-left py-2 px-1 font-semibold text-xs">Descrição 1</th>
                  <th className="text-left py-2 px-1 font-semibold text-xs">Descrição 2</th>
                  <th className="text-left py-2 px-1 font-semibold text-xs">Itens</th>
                  <th className="text-left py-2 px-1 font-semibold text-xs">Valor Total</th>
                  <th className="text-left py-2 px-1 font-semibold text-xs">Banco</th>
                  <th className="text-left py-2 px-1 font-semibold text-xs">Status</th>
                  <th className="text-right py-2 px-1 font-semibold text-xs">Ações</th>
                </tr>
              </thead>
              <tbody>
                {lancamentosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={13} className="text-center py-8 text-muted-foreground text-xs">
                      Nenhum lançamento cadastrado
                    </td>
                  </tr>
                ) : (
                  lancamentosFiltrados.map((lancamento) => (
                    <tr key={lancamento.id} className="border-b hover:bg-secondary/50 transition-colors">
                      <td className="py-2 px-1 text-xs">
                        {new Date(lancamento.dataPagamento + "T00:00:00").toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-2 px-1 text-xs">
                        {lancamento.ano}/{lancamento.mesCompetencia}
                      </td>
                      <td className="py-2 px-1">
                        <Badge
                          variant={lancamento.tipo === "Receita" ? "default" : "destructive"}
                          className="text-[10px] h-5"
                        >
                          {lancamento.tipo}
                        </Badge>
                      </td>
                      <td className="py-2 px-1 text-xs">
                        <div className="max-w-[100px] truncate" title={lancamento.nomeFornecedor || "-"}>
                          {lancamento.nomeFornecedor || "-"}
                        </div>
                      </td>
                      <td className="py-2 px-1 text-xs">{lancamento.nomeCliente || "-"}</td>
                      <td className="py-2 px-1 text-xs">
                        {lancamento.nomePet || "-"}
                        {lancamento.pets.length > 1 && (
                          <Badge variant="outline" className="ml-1 text-[9px] h-4">
                            +{lancamento.pets.length - 1}
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 px-1 text-xs">{lancamento.descricao1}</td>
                      <td className="py-2 px-1 text-xs">
                        {lancamento.itens.map((i) => i.descricao2).join(", ")}
                      </td>
                      <td className="py-2 px-1 text-xs">
                        <div className="max-w-[150px] truncate">
                          {lancamento.itens
                            .map((i) => `${i.produtoServico || i.descricao2} (${formatCurrency(i.valor)})`)
                            .join("; ")}
                        </div>
                      </td>
                      <td className="py-2 px-1 text-xs font-semibold">{formatCurrency(lancamento.valorTotal)}</td>
                      <td className="py-2 px-1 text-xs">{lancamento.nomeBanco}</td>
                      <td className="py-2 px-1">
                        <Badge variant={lancamento.pago ? "default" : "secondary"} className="text-[10px] h-5">
                          {lancamento.pago ? "Pago" : "Pendente"}
                        </Badge>
                      </td>
                      <td className="py-2 px-1">
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => abrirEdicao(lancamento)}
                            className="h-6 w-6 p-0"
                            title="Editar Lançamento"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setLancamentoSelecionado(lancamento);
                              setIsDeleteDialogOpen(true);
                            }}
                            className="h-6 w-6 p-0"
                            title="Excluir Lançamento"
                          >
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

      {/* Dialog de Edição */}
      <Dialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">Editar Lançamento</DialogTitle>
            <DialogDescription className="text-[10px]">Atualize os dados do lançamento financeiro</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleEditar} className="space-y-2">
            <div className="grid grid-cols-4 gap-2">
              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Ano *</Label>
                <Input
                  type="number"
                  min="2020"
                  max="2050"
                  value={formData.ano}
                  onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                  className="h-7 text-xs"
                />
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Mês Competência *</Label>
                <Select
                  value={formData.mesCompetencia}
                  onValueChange={(value) => setFormData({ ...formData, mesCompetencia: value })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {meses.map((mes) => (
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
                  value={formData.tipo}
                  onValueChange={(value: any) => setFormData({ ...formData, tipo: value, descricao1: "", nomeCliente: "", nomePet: "", petsSelecionados: [], fornecedorId: "" })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Receita" className="text-xs">
                      Receita
                    </SelectItem>
                    <SelectItem value="Despesa" className="text-xs">
                      Despesa
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Descrição 1 *</Label>
                <Select
                  value={formData.descricao1}
                  onValueChange={(value) => setFormData({ ...formData, descricao1: value })}
                  disabled={!formData.tipo}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder={formData.tipo ? "Selecione" : "Selecione tipo"} />
                  </SelectTrigger>
                  <SelectContent>
                    {formData.tipo &&
                      categoriasDescricao1[formData.tipo].map((desc) => (
                        <SelectItem key={desc} value={desc} className="text-xs">
                          {desc}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Nome do Cliente ou Fornecedor (condicional) */}
              <div className="space-y-0.5">
                {formData.tipo === "Despesa" ? (
                  <>
                    <Label className="text-[10px] font-semibold">Fornecedor</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between h-7 text-xs"
                        >
                          {formData.fornecedorId
                            ? (() => {
                                const f = fornecedores.find((f) => f.id === formData.fornecedorId);
                                return f ? f.nome_fornecedor : "Selecione";
                              })()
                            : "Selecione o fornecedor"}
                          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Buscar por nome, CNPJ/CPF ou fantasia..."
                            className="text-xs"
                            value={fornecedorSearch}
                            onValueChange={setFornecedorSearch}
                          />
                          <CommandEmpty className="text-xs">Nenhum fornecedor encontrado.</CommandEmpty>
                          <CommandGroup className="max-h-60 overflow-y-auto">
                            {fornecedoresFiltrados.map((f) => (
                              <CommandItem
                                key={f.id}
                                value={f.id}
                                onSelect={() => {
                                  setFormData({
                                    ...formData,
                                    fornecedorId: formData.fornecedorId === f.id ? "" : f.id,
                                  });
                                  setFornecedorSearch("");
                                }}
                                className="text-xs"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-3 w-3",
                                    formData.fornecedorId === f.id ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{f.nome_fornecedor}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {f.cnpj_cpf}
                                    {f.nome_fantasia ? ` • ${f.nome_fantasia}` : ""}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </>
                ) : (
                  <>
                    <Label className="text-[10px] font-semibold">Nome do Cliente</Label>
                    <ComboboxField
                      value={formData.nomeCliente}
                      onChange={(value) => {
                        const novoCliente = clientes.find((c) => c.nomeCliente === value);
                        if (novoCliente && formData.nomePet) {
                          const petAtual = pets.find((p) => p.nomePet === formData.nomePet);
                          if (petAtual && petAtual.clienteId !== novoCliente.id) {
                            setFormData({ ...formData, nomeCliente: value, nomePet: "", petsSelecionados: [] });
                          } else {
                            setFormData({ ...formData, nomeCliente: value });
                          }
                        } else {
                          setFormData({ ...formData, nomeCliente: value });
                        }
                      }}
                      options={clientesFormulario}
                      placeholder="Selecione o cliente"
                      searchPlaceholder="Buscar cliente..."
                      id="edit-form-cliente"
                    />
                  </>
                )}
              </div>

              {/* Pets */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Label className="text-[10px] font-semibold">Pets</Label>
                  {formData.tipo !== "Despesa" && formData.nomeCliente && formData.nomePet && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="sm" className="h-5 text-[10px] px-2 gap-1">
                          <Plus className="h-3 w-3" />
                          Pet
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-64 p-2">
                        <div className="space-y-2">
                          <Label className="text-xs font-semibold">Adicionar Pet</Label>
                          <div className="max-h-48 overflow-y-auto space-y-1">
                            {(() => {
                              const clienteSelecionado = clientes.find((c) => c.nomeCliente === formData.nomeCliente);
                              const primeiroPet = pets.find(
                                (p) => p.nomePet === formData.nomePet && p.clienteId === clienteSelecionado?.id,
                              );

                              if (!clienteSelecionado || !primeiroPet)
                                return <div className="text-xs text-muted-foreground">Nenhum pet disponível</div>;

                              const petsDisponiveis = pets.filter(
                                (p) =>
                                  p.clienteId === clienteSelecionado.id &&
                                  p.nomePet !== formData.nomePet &&
                                  !formData.petsSelecionados.some((ps) => ps.id === p.id),
                              );

                              if (petsDisponiveis.length === 0) {
                                return (
                                  <div className="text-xs text-muted-foreground p-2">
                                    Nenhum pet adicional disponível
                                  </div>
                                );
                              }

                              return petsDisponiveis.map((pet) => (
                                <Button
                                  key={pet.id}
                                  variant="ghost"
                                  size="sm"
                                  className="w-full justify-start text-xs h-8"
                                  onClick={() => {
                                    if (!formData.petsSelecionados.some((p) => p.id === pet.id)) {
                                      setFormData({
                                        ...formData,
                                        petsSelecionados: [...formData.petsSelecionados, pet],
                                      });
                                      toast.success(`${pet.nomePet} adicionado!`);
                                    }
                                  }}
                                >
                                  <div className="flex flex-col items-start">
                                    <span className="font-medium">{pet.nomePet}</span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {pet.raca} - {pet.porte}
                                    </span>
                                  </div>
                                </Button>
                              ));
                            })()}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>

                {formData.tipo === "Despesa" ? (
                  <div className="h-7 flex items-center px-3 text-xs border rounded-md bg-muted text-muted-foreground">
                    Não aplicável
                  </div>
                ) : (
                  <>
                    <ComboboxField
                      value={formData.nomePet}
                      onChange={(value) => {
                        if (!formData.nomeCliente) {
                          const petSelecionado = pets.find((p) => p.nomePet === value);
                          if (petSelecionado) {
                            const clienteDoPet = clientes.find((c) => c.id === petSelecionado.clienteId);
                            if (clienteDoPet) {
                              setFormData({
                                ...formData,
                                nomePet: value,
                                nomeCliente: clienteDoPet.nomeCliente,
                                petsSelecionados: [],
                              });
                            } else {
                              setFormData({ ...formData, nomePet: value, petsSelecionados: [] });
                            }
                          } else {
                            setFormData({ ...formData, nomePet: value, petsSelecionados: [] });
                          }
                        } else {
                          const clienteSelecionado = clientes.find((c) => c.nomeCliente === formData.nomeCliente);
                          const petSelecionado = pets.find((p) => p.nomePet === value && p.clienteId === clienteSelecionado?.id);

                          if (petSelecionado) {
                            setFormData({ ...formData, nomePet: value, petsSelecionados: [] });
                          } else {
                            setFormData({ ...formData, nomePet: value, nomeCliente: "", petsSelecionados: [] });
                          }
                        }
                      }}
                      options={petsFormulario}
                      placeholder="Selecione o pet principal"
                      searchPlaceholder="Buscar pet..."
                      id="edit-form-pet"
                    />

                    {formData.petsSelecionados.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {formData.petsSelecionados.map((pet) => (
                          <Badge key={pet.id} variant="secondary" className="text-[10px] px-2 py-0.5 gap-1">
                            {pet.nomePet}
                            <button
                              type="button"
                              onClick={() => {
                                setFormData({
                                  ...formData,
                                  petsSelecionados: formData.petsSelecionados.filter((p) => p.id !== pet.id),
                                });
                                toast.success(`${pet.nomePet} removido`);
                              }}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="border rounded-md p-2 space-y-2 bg-secondary/20">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Itens do Lançamento</Label>
                {itensLancamento.length < 5 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setItensLancamento([
                        ...itensLancamento,
                        { id: Date.now().toString(), descricao2: "", produtoServico: "", valor: 0 },
                      ]);
                    }}
                    className="h-6 text-[10px] gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Adicionar Item
                  </Button>
                )}
              </div>

              {itensLancamento.map((item, index) => (
                <ItemLancamentoForm
                  key={item.id}
                  item={item}
                  index={index}
                  formData={formData}
                  servicos={servicos}
                  pacotes={pacotes}
                  produtos={produtos}
                  onChange={(novoItem) => {
                    setItensLancamento(itensLancamento.map((i) => (i.id === item.id ? novoItem : i)));
                  }}
                  onRemove={() => {
                    if (itensLancamento.length > 1) {
                      setItensLancamento(itensLancamento.filter((i) => i.id !== item.id));
                    } else {
                      toast.error("É necessário ter pelo menos 1 item");
                    }
                  }}
                  canRemove={itensLancamento.length > 1}
                  onAdd={() => {
                    if (itensLancamento.length < 10) {
                      setItensLancamento([
                        ...itensLancamento,
                        { id: Date.now().toString(), descricao2: "", produtoServico: "", valor: 0 },
                      ]);
                    } else {
                      toast.error("Limite máximo de 10 itens atingido");
                    }
                  }}
                  isLast={index === itensLancamento.length - 1}
                  canAdd={itensLancamento.length < 10}
                />
              ))}

              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex rounded-md border border-input overflow-hidden">
                    <button type="button" className={cn("px-3 py-1 text-[10px] font-medium transition-colors", formData.modoAjuste === "deducao" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")} onClick={() => setFormData({ ...formData, modoAjuste: "deducao", valorJuros: 0, tipoJuros: "" })}>Dedução</button>
                    <button type="button" className={cn("px-3 py-1 text-[10px] font-medium transition-colors", formData.modoAjuste === "juros" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")} onClick={() => setFormData({ ...formData, modoAjuste: "juros", valorDeducao: 0, tipoDeducao: "" })}>Juros</button>
                  </div>
                  {formData.modoAjuste === "deducao" ? (
                    <>
                      <div className="space-y-0.5">
                        <Label className="text-[10px]">Valor da Dedução</Label>
                        <Input type="number" step="0.01" min="0" placeholder="R$ 0,00" value={formData.valorDeducao || ""} onChange={(e) => setFormData({ ...formData, valorDeducao: parseFloat(e.target.value) || 0 })} className="h-7 text-xs w-24" />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px]">Tipo de Dedução</Label>
                        <Select value={formData.tipoDeducao} onValueChange={(value) => setFormData({ ...formData, tipoDeducao: value })}>
                          <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Selecione" /></SelectTrigger>
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
                        <Label className="text-[10px]">Valor do Juros</Label>
                        <Input type="number" step="0.01" min="0" placeholder="R$ 0,00" value={formData.valorJuros || ""} onChange={(e) => setFormData({ ...formData, valorJuros: parseFloat(e.target.value) || 0 })} className="h-7 text-xs w-24" />
                      </div>
                      <div className="space-y-0.5">
                        <Label className="text-[10px]">Motivo do Juros</Label>
                        <Select value={formData.tipoJuros} onValueChange={(value) => setFormData({ ...formData, tipoJuros: value })}>
                          <SelectTrigger className="h-7 text-xs w-36"><SelectValue placeholder="Selecione" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Juros de Mora" className="text-xs">Juros de Mora</SelectItem>
                            <SelectItem value="Multa" className="text-xs">Multa</SelectItem>
                            <SelectItem value="Correção Monetária" className="text-xs">Correção Monetária</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                  <div className="flex items-end gap-2 h-7 ml-auto">
                    <Label className="text-xs font-semibold whitespace-nowrap">Valor Total:</Label>
                    <span className="text-base font-bold text-primary">
                      {formatCurrency(
                        formData.modoAjuste === "juros"
                          ? itensLancamento.reduce((acc, item) => acc + item.valor, 0) + (formData.valorJuros || 0)
                          : itensLancamento.reduce((acc, item) => acc + item.valor, 0) - (formData.valorDeducao || 0),
                      )}
                    </span>
                  </div>
                </div>
                {formData.modoAjuste === "deducao" && formData.valorDeducao > 0 && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Subtotal: {formatCurrency(itensLancamento.reduce((acc, item) => acc + item.valor, 0))} - Dedução ({formData.tipoDeducao}): {formatCurrency(formData.valorDeducao)}
                  </div>
                )}
                {formData.modoAjuste === "juros" && formData.valorJuros > 0 && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Subtotal: {formatCurrency(itensLancamento.reduce((acc, item) => acc + item.valor, 0))} + Juros ({formData.tipoJuros}): {formatCurrency(formData.valorJuros)}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Data do Pagamento</Label>
                <Input
                  type="date"
                  value={formData.dataPagamento}
                  onChange={(e) => setFormData({ ...formData, dataPagamento: e.target.value })}
                  className="h-7 text-xs"
                />
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Conta Bancária *</Label>
                <Select
                  value={formData.nomeBanco}
                  onValueChange={(value) => setFormData({ ...formData, nomeBanco: value })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {contas.map((c) => (
                      <SelectItem key={c.id} value={c.nomeBanco} className="text-xs">
                        {c.nomeBanco}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Pago *</Label>
                <Select
                  value={formData.pago ? "sim" : "nao"}
                  onValueChange={(value) => setFormData({ ...formData, pago: value === "sim" })}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim" className="text-xs">
                      Sim
                    </SelectItem>
                    <SelectItem value="nao" className="text-xs">
                      Não
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={resetForm} className="h-7 text-xs">
                Cancelar
              </Button>
              <Button type="submit" className="h-7 text-xs">
                Atualizar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog de Exclusão */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Tem certeza que deseja excluir este lançamento?</p>
              {lancamentoSelecionado && (
                <div className="text-xs bg-secondary/50 p-2 rounded space-y-1">
                  <p>
                    <strong>Tipo:</strong> {lancamentoSelecionado.tipo}
                  </p>
                  <p>
                    <strong>Cliente:</strong> {lancamentoSelecionado.nomeCliente || "-"}
                  </p>
                  <p>
                    <strong>Pet:</strong> {lancamentoSelecionado.nomePet || "-"}
                  </p>
                  <p>
                    <strong>Valor Total:</strong> {formatCurrency(lancamentoSelecionado.valorTotal)}
                  </p>
                  <p>
                    <strong>Competência:</strong> {lancamentoSelecionado.ano}/{lancamentoSelecionado.mesCompetencia}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-destructive hover:bg-destructive/90">
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação */}
      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Atualização de Saldo</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a atualizar o saldo da conta <strong>{contaSelecionada}</strong> para{" "}
              <strong>{formatCurrency(parseFloat(novoSaldo) || 0)}</strong> na data{" "}
              <strong>{format(dataAjusteSaldo, "dd/MM/yyyy")}</strong>.<br />
              <br />
              Um lançamento de ajuste será criado automaticamente. Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmarAtualizacao}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FluxoDeCaixa;
