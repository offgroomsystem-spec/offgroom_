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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
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
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Filter,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  ChevronsUpDown,
  FileText,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "react-router-dom";
import { callNuvemFiscal } from "@/hooks/useNotasFiscais";

// Interfaces
interface ItemLancamento {
  id: string;
  descricao2: string;
  produtoServico: string;
  valor: number;
  quantidade?: number;
}

interface LancamentoFinanceiro {
  id: string;
  ano: string;
  mesCompetencia: string;
  tipo: "Receita" | "Despesa";
  descricao1: string;
  nomeCliente: string;
  nomePet: string;
  pets: Pet[]; // Array de pets selecionados
  itens: ItemLancamento[];
  valorTotal: number;
  dataPagamento: string;
  nomeBanco: string;
  pago: boolean;
  dataCadastro: string;
  valorDeducao: number;
  tipoDeducao: string;
  nomeFornecedor: string;
  valorJuros: number;
  tipoJuros: string;
  modoAjuste: "deducao" | "juros";
}

interface Cliente {
  id: string;
  nomeCliente: string;
}

interface Pet {
  id: string;
  clienteId: string;
  nomePet: string;
  raca: string;
  porte: string;
}

interface ContaBancaria {
  id: string;
  nomeBanco: string;
}

interface Fornecedor {
  id: string;
  nome_fornecedor: string;
  cnpj_cpf: string;
  nome_fantasia: string | null;
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

import { categoriasDescricao1, categoriasDescricao2 } from "@/constants/categorias";

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

// Componente ComboboxField (corrigido para suportar "disabled")
interface ComboboxFieldProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
  searchPlaceholder: string;
  id: string;
  disabled?: boolean; // <-- adicionada
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

  // Evita abrir o popover quando estiver desabilitado
  const handleOpenChange = (nextOpen: boolean) => {
    if (disabled) {
      setOpen(false);
      return;
    }
    setOpen(nextOpen);
  };

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
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      {/* Conteúdo do popover — só poderá abrir se !disabled */}
      <PopoverContent className="w-full p-0">
        <Command>
          <CommandInput placeholder={searchPlaceholder} className="text-xs" />
          <CommandEmpty className="text-xs">Nenhum resultado encontrado.</CommandEmpty>
          <CommandGroup className="max-h-60 overflow-y-auto">
            {options.map((option) => (
              <CommandItem
                key={option}
                value={option}
                onSelect={() => {
                  if (disabled) return; // segurança extra
                  onChange(option);
                  setOpen(false);
                }}
                className="text-xs"
              >
                <Check className={cn("mr-2 h-3 w-3", value === option ? "opacity-100" : "opacity-0")} />
                {option}
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

      <div className="col-span-3 space-y-0.5">
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

      <div className="col-span-3 space-y-0.5">
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

      <div className="col-span-1 space-y-0.5">
        <Label className="text-[10px] font-semibold">Quantidade</Label>
        <Input
          type="number"
          step="1"
          min="1"
          value={item.quantidade || ""}
          onChange={(e) => {
            const val = parseInt(e.target.value);
            onChange({ ...item, quantidade: isNaN(val) ? 0 : Math.max(1, val) });
          }}
          className="h-7 text-xs"
        />
      </div>

      <div className="col-span-2 space-y-0.5">
        <Label className="text-[10px] font-semibold">Valor *</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          value={item.valor || ""}
          onChange={(e) => onChange({ ...item, valor: parseFloat(e.target.value) || 0 })}
          placeholder="R$ 0,00"
          className="h-7 text-xs"
        />
      </div>

      <div className="col-span-3 space-y-0.5">
        <div className="flex items-end gap-1">
          <div className="flex-1">
            <Label className="text-[10px] font-semibold">Total</Label>
            <Input
              type="text"
              readOnly
              value={((item.valor || 0) * (item.quantidade || 1)).toFixed(2)}
              className="h-7 text-xs bg-muted cursor-not-allowed"
            />
          </div>
          {isLast && canAdd && onAdd && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onAdd}
              className="h-7 px-2 text-[10px] text-primary hover:text-primary hover:bg-primary/10 mt-3"
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

interface ControleFinanceiroProps {
  filtrosIniciais?: {
    ano?: string;
    dataInicio?: string;
    dataFim?: string;
    foiPago?: string;
  };
}

const ControleFinanceiro = ({ filtrosIniciais }: ControleFinanceiroProps = {}) => {
  const { user, ownerId } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [lancamentos, setLancamentos] = useState<LancamentoFinanceiro[]>([]);

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [pets, setPets] = useState<Pet[]>([]);
  const [contas, setContas] = useState<ContaBancaria[]>([]);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [pacotes, setPacotes] = useState<Pacote[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);

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
        .eq("user_id", ownerId)
        .order("data_cadastro", { ascending: false });

      if (error) throw error;

      const lancamentosFormatados = (data || []).map((l: any) => ({
        id: l.id,
        ano: l.ano,
        mesCompetencia: l.mes_competencia,
        tipo: l.tipo as "Receita" | "Despesa",
        descricao1: l.descricao1,
        nomeCliente: l.cliente_id ? "" : "", // Will be handled via lookup
        nomePet: "", // Will be handled via lookup
        pets: [], // Will be populated from pet_ids
        itens: (l.lancamentos_financeiros_itens || []).map((i: any) => ({
          id: i.id,
          descricao2: i.descricao2,
          produtoServico: i.produto_servico || "",
          valor: Number(i.valor),
        })),
        valorTotal: Number(l.valor_total),
        dataPagamento: l.data_pagamento,
        nomeBanco: "", // Will be handled via lookup
        pago: l.pago,
        dataCadastro: l.data_cadastro || l.created_at,
        valorDeducao: Number(l.valor_deducao) || 0,
        tipoDeducao: l.tipo_deducao || "",
        fornecedorId: l.fornecedor_id || "",
        nomeFornecedor: "",
        valorJuros: Number((l as any).valor_juros) || 0,
        tipoJuros: (l as any).tipo_juros || "",
        modoAjuste: ((l as any).modo_ajuste || "deducao") as "deducao" | "juros",
      }));

      // Map cliente_id and conta_id to names
      const clientesData = await supabase.from("clientes").select("*").eq("user_id", ownerId);

      const petsData = await supabase.from("pets").select("*").eq("user_id", ownerId);

      const contasData = await supabase.from("contas_bancarias").select("*").eq("user_id", ownerId);

      const fornecedoresData = await supabase.from("fornecedores").select("id, nome_fornecedor").eq("user_id", ownerId);
      const fornecedoresMap = new Map((fornecedoresData.data || []).map((f: any) => [f.id, f.nome_fornecedor]));

      if (clientesData.data && petsData.data && contasData.data) {
        const clientesMap = new Map(clientesData.data.map((c: any) => [c.id, c.nome_cliente]));
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
            l.nomeCliente = clientesMap.get(lancOriginal.cliente_id) || "";
            l.nomePet = petsMap.get(lancOriginal.cliente_id) || "";
            l.nomeBanco = contasMap.get(lancOriginal.conta_id) || "";
            l.nomeFornecedor = fornecedoresMap.get(lancOriginal.fornecedor_id) || "";

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

  // Load related data from Supabase
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

  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [lancamentoSelecionado, setLancamentoSelecionado] = useState<LancamentoFinanceiro | null>(null);

  // Estados para emissão de notas fiscais
  const [emitindoNota, setEmitindoNota] = useState(false);
  const [confirmEmissaoTipo, setConfirmEmissaoTipo] = useState<'NFe' | 'NFSe' | null>(null);
  const [notasEmitidas, setNotasEmitidas] = useState<{ tipo: string; status: string }[]>([]);
  const [showCpfCnpjModal, setShowCpfCnpjModal] = useState(false);
  const [cpfCnpjManual, setCpfCnpjManual] = useState("");
  const [pendingNfeTipo, setPendingNfeTipo] = useState<'NFe' | 'NFSe' | null>(null);

  const [formData, setFormData] = useState({
    ano: new Date().getFullYear().toString(),
    mesCompetencia: String(new Date().getMonth() + 1).padStart(2, "0"),
    tipo: "" as "Receita" | "Despesa" | "",
    descricao1: "",
    nomeCliente: "",
    nomePet: "",
    petsSelecionados: [] as Pet[], // Array de pets selecionados
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
    { id: Date.now().toString(), descricao2: "", produtoServico: "", valor: 0, quantidade: 1 },
  ]);

  const [fornecedorSearch, setFornecedorSearch] = useState("");
  const [fornecedorPopoverOpen, setFornecedorPopoverOpen] = useState(false);

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

  const [filtros, setFiltros] = useState({
    dataInicio: "",
    dataFim: "",
    mes: "",
    ano: "",
    nomePet: "",
    nomeCliente: "",
    tipo: "" as "Receita" | "Despesa" | "",
    descricao1: "",
    descricao2: "",
    dataPagamento: "",
    nomeBanco: "",
    pago: null as boolean | null,
    fornecedorId: "",
  });

  const [filtroFornecedorSearch, setFiltroFornecedorSearch] = useState("");
  const [filtroFornecedorPopoverOpen, setFiltroFornecedorPopoverOpen] = useState(false);

  const filtroFornecedoresFiltrados = useMemo(() => {
    if (!filtroFornecedorSearch) return fornecedores;
    const search = filtroFornecedorSearch.toLowerCase();
    return fornecedores.filter(
      (f) =>
        f.nome_fornecedor.toLowerCase().includes(search) ||
        f.cnpj_cpf.toLowerCase().includes(search) ||
        (f.nome_fantasia || "").toLowerCase().includes(search),
    );
  }, [filtroFornecedorSearch, fornecedores]);

  const [filtroDataAtivo, setFiltroDataAtivo] = useState<"periodo" | "mesano" | null>(null);
  const [filtrosAplicados, setFiltrosAplicados] = useState(false);

  // Aplicar filtros iniciais quando fornecidos
  useEffect(() => {
    if (filtrosIniciais) {
      const novosFiltros: any = { ...filtros };

      if (filtrosIniciais.ano) {
        novosFiltros.ano = filtrosIniciais.ano;
      }
      if (filtrosIniciais.dataInicio) {
        novosFiltros.dataInicio = filtrosIniciais.dataInicio;
        setFiltroDataAtivo("periodo");
      }
      if (filtrosIniciais.dataFim) {
        novosFiltros.dataFim = filtrosIniciais.dataFim;
        setFiltroDataAtivo("periodo");
      }
      if (filtrosIniciais.foiPago === "sim") {
        novosFiltros.pago = true;
      } else if (filtrosIniciais.foiPago === "nao") {
        novosFiltros.pago = false;
      }

      setFiltros(novosFiltros);
      setFiltrosAplicados(true);
      setMostrarFiltros(false);
    }
  }, [filtrosIniciais]);

  // Pre-fill from Creche checkout navigation
  useEffect(() => {
    const state = location.state as any;
    if (!state?.crecheCheckout || clientes.length === 0) return;

    const checkout = state.crecheCheckout;
    const now = new Date();

    // Find matching pets for petsSelecionados
    const cliente = clientes.find((c) => c.nomeCliente === checkout.clienteNome);
    const petNomes = (checkout.petNomes || []) as string[];
    const matchedPets = pets.filter(
      (p) => petNomes.includes(p.nomePet) && (cliente ? p.clienteId === cliente.id : true)
    );

    setFormData((prev) => ({
      ...prev,
      ano: now.getFullYear().toString(),
      mesCompetencia: String(now.getMonth() + 1).padStart(2, "0"),
      tipo: "Receita" as "Receita",
      descricao1: "Receita Operacional",
      nomeCliente: checkout.clienteNome || "",
      nomePet: petNomes[0] || "",
      petsSelecionados: matchedPets.length > 1 ? matchedPets.slice(1) : [],
      dataPagamento: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
      pago: false,
    }));

    const itens = (checkout.itens || []).map((item: any, i: number) => ({
      id: (Date.now() + i).toString(),
      descricao2: "Serviços",
      produtoServico: item.produtoServico || "",
      valor: item.valor || 0,
      quantidade: item.quantidade || 1,
    }));

    if (itens.length > 0) {
      setItensLancamento(itens);
    }

    setIsDialogOpen(true);

    // Clear navigation state to prevent re-triggering
    window.history.replaceState({}, document.title);
  }, [location.state, clientes, pets]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  // Filtrar pets baseado no cliente selecionado (suporta múltiplos clientes com mesmo nome)
  const petsFormulario = useMemo(() => {
    if (!formData.nomeCliente) {
      // Se não há cliente selecionado, retorna todos os pets
      return [...new Set(pets.map((p) => p.nomePet))];
    }
    // Encontrar TODOS os clientes com o mesmo nome
    const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === formData.nomeCliente);
    if (clientesComMesmoNome.length === 0) return [];

    // Retornar os pets de TODOS os clientes com esse nome
    const petsDoCliente = pets.filter((p) => clientesComMesmoNome.some((c) => c.id === p.clienteId));
    return [...new Set(petsDoCliente.map((p) => p.nomePet))];
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

  // Filtrar clientes baseado no pet selecionado
  const clientesFormulario = useMemo(() => {
    if (!formData.nomePet) {
      // Se não há pet selecionado, retorna todos os clientes
      return [...new Set(clientes.map((c) => c.nomeCliente))];
    }
    // Encontrar TODOS os pets com o nome selecionado
    const petsSelecionados = pets.filter((p) => p.nomePet === formData.nomePet);
    if (petsSelecionados.length === 0) return [];

    // Retornar TODOS os clientes que têm pets com este nome
    const clientesDoPet = clientes
      .filter((c) => petsSelecionados.some((p) => p.clienteId === c.id))
      .map((c) => c.nomeCliente);
    return clientesDoPet;
  }, [formData.nomePet, clientes, pets]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.ano) {
      toast.error("Favor selecionar o Ano de competência!");
      return;
    }

    if (!formData.mesCompetencia) {
      toast.error("Favor selecionar o Mês de competência!");
      return;
    }

    if (!formData.tipo) {
      toast.error("Favor selecionar o Tipo financeiro!");
      return;
    }

    if (!formData.descricao1) {
      toast.error("Favor preencher a Descrição 1!");
      return;
    }

    // 🔹 Validação condicional: Cliente e Pet obrigatórios apenas para Receita Operacional
    const clientePetObrigatorios = formData.tipo === "Receita" && formData.descricao1 === "Receita Operacional";

    if (clientePetObrigatorios) {
      if (!formData.nomeCliente || formData.nomeCliente === "Não aplicável") {
        toast.error("Favor selecionar o nome do Cliente!");
        return;
      }

      if (!formData.nomePet || formData.nomePet === "Não aplicável") {
        toast.error("Favor selecionar o nome do Pet!");
        return;
      }
    }

    for (let i = 0; i < itensLancamento.length; i++) {
      const item = itensLancamento[i];

      if (!item.descricao2) {
        toast.error(`Item ${i + 1}: Favor preencher a Descrição 2!`);
        return;
      }

      if ((item.descricao2 === "Serviços" || item.descricao2 === "Venda") && !item.produtoServico) {
        toast.error(`Item ${i + 1}: Favor selecionar ${item.descricao2 === "Serviços" ? "o serviço" : "o produto"}!`);
        return;
      }

      if (item.valor <= 0) {
        toast.error(`Item ${i + 1}: Favor preencher o valor!`);
        return;
      }
    }

    if (!formData.nomeBanco) {
      toast.error("Favor selecionar o Banco!");
      return;
    }

    // Validação obrigatória de tipo/motivo quando valor >= 0.01
    if (formData.modoAjuste === "deducao" && (formData.valorDeducao || 0) >= 0.01 && !formData.tipoDeducao) {
      toast.error("Favor selecionar o Tipo de Dedução!"); return;
    }
    if (formData.modoAjuste === "juros" && (formData.valorJuros || 0) >= 0.01 && !formData.tipoJuros) {
      toast.error("Favor selecionar o Motivo do Juros!"); return;
    }

    const subtotal = itensLancamento.reduce((acc, item) => acc + item.valor * (item.quantidade || 1), 0);
    const valorTotal = formData.modoAjuste === "juros"
      ? subtotal + (formData.valorJuros || 0)
      : subtotal - (formData.valorDeducao || 0);

    try {
      let clienteId = null;

      // 🔹 Só validar Cliente/Pet para Receita Operacional
      const clientePetObrigatorios = formData.tipo === "Receita" && formData.descricao1 === "Receita Operacional";

      if (clientePetObrigatorios) {
        // Encontrar TODOS os clientes com o mesmo nome
        const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === formData.nomeCliente);

        // Procurar o pet em qualquer um desses clientes
        let clienteEncontrado: Cliente | null = null;
        let petEncontrado: Pet | null = null;

        for (const cliente of clientesComMesmoNome) {
          const pet = pets.find((p) => p.nomePet === formData.nomePet && p.clienteId === cliente.id);
          if (pet) {
            clienteEncontrado = cliente;
            petEncontrado = pet;
            break;
          }
        }

        if (!petEncontrado || !clienteEncontrado) {
          toast.error("Cliente/Pet não encontrado ou não correspondem!");
          return;
        }

        clienteId = clienteEncontrado.id;
      } else if (formData.nomeCliente && formData.nomePet) {
        // Para Receita Não Operacional, se preencheu, deve validar
        const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === formData.nomeCliente);

        for (const cliente of clientesComMesmoNome) {
          const pet = pets.find((p) => p.nomePet === formData.nomePet && p.clienteId === cliente.id);
          if (pet) {
            clienteId = cliente.id;
            break;
          }
        }
      }

      const conta = contas.find((c) => c.nomeBanco === formData.nomeBanco);
      if (!conta) {
        toast.error("Conta bancária não encontrada!");
        return;
      }

      // Preparar array de pet IDs (pet principal + pets adicionais)
      // Encontrar o cliente correto baseado no pet selecionado
      const clientesComMesmoNomeParaPet = clientes.filter((c) => c.nomeCliente === formData.nomeCliente);
      let petPrincipal: Pet | null = null;

      for (const cliente of clientesComMesmoNomeParaPet) {
        const pet = pets.find((p) => p.nomePet === formData.nomePet && p.clienteId === cliente.id);
        if (pet) {
          petPrincipal = pet;
          break;
        }
      }
      const petIds = petPrincipal ? [petPrincipal.id, ...formData.petsSelecionados.map((p) => p.id)] : [];

      // Insert main record
      const { data: lancamentoData, error: lancamentoError } = await supabase
        .from("lancamentos_financeiros")
        .insert([
          {
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
          },
        ])
        .select()
        .single();

      if (lancamentoError) throw lancamentoError;

      // Insert items
      const { error: itensError } = await supabase.from("lancamentos_financeiros_itens").insert(
        itensLancamento.map((item) => ({
          lancamento_id: lancamentoData.id,
          descricao2: item.descricao2,
          produto_servico: item.produtoServico,
          valor: item.valor,
          quantidade: item.quantidade || 1,
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
    setItensLancamento([{ id: Date.now().toString(), descricao2: "", produtoServico: "", valor: 0, quantidade: 1 }]);
    setIsDialogOpen(false);
    setIsEditDialogOpen(false);
  };

  const abrirEdicao = async (lancamento: LancamentoFinanceiro) => {
    setLancamentoSelecionado(lancamento);

    // Verificar notas já emitidas para este lançamento
    try {
      const { data: notasExistentes } = await supabase
        .from("notas_fiscais")
        .select("tipo, status")
        .eq("lancamento_id", lancamento.id)
        .in("status", ["autorizada", "processando"]);
      setNotasEmitidas(notasExistentes || []);
    } catch {
      setNotasEmitidas([]);
    }

    // Separar o primeiro pet como principal e os demais como selecionados
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
      fornecedorId: (lancamento as any).fornecedorId || "",
      valorJuros: lancamento.valorJuros || 0,
      tipoJuros: lancamento.tipoJuros || "",
      modoAjuste: lancamento.modoAjuste || "deducao",
    });
    setItensLancamento(lancamento.itens);
    setIsEditDialogOpen(true);
  };

  const handleEmitirNota = async (tipo: 'NFe' | 'NFSe') => {
    if (!lancamentoSelecionado || !user) return;

    // Para NFe, verificar se cliente tem CPF/CNPJ antes de prosseguir
    if (tipo === 'NFe') {
      const lancOriginalCheck = await supabase
        .from("lancamentos_financeiros")
        .select("cliente_id")
        .eq("id", lancamentoSelecionado.id)
        .single();

      if (lancOriginalCheck.data?.cliente_id) {
        const { data: cliCheck } = await supabase
          .from("clientes")
          .select("cpf_cnpj")
          .eq("id", lancOriginalCheck.data.cliente_id)
          .single();

        const cpfCnpjClean = cliCheck?.cpf_cnpj?.replace(/\D/g, "") || "";
        if (cpfCnpjClean.length !== 11 && cpfCnpjClean.length !== 14) {
          // Cliente sem CPF/CNPJ válido - mostrar modal
          setPendingNfeTipo(tipo);
          setCpfCnpjManual("");
          setShowCpfCnpjModal(true);
          setConfirmEmissaoTipo(null);
          return;
        }
      }
    }

    // Prosseguir com emissão normalmente
    await executarEmissaoNota(tipo);
  };

  const handleCpfCnpjModalConfirm = async (comDocumento: boolean) => {
    if (comDocumento) {
      const len = cpfCnpjManual.length;
      if (len !== 11 && len !== 14) {
        toast.error("Informe exatamente 11 dígitos (CPF) ou 14 dígitos (CNPJ).");
        return;
      }
    }
    setShowCpfCnpjModal(false);
    if (!comDocumento) {
      toast.info("Alguns estados exigem NFC-e (modelo 65) para vendas presenciais ao consumidor final não identificado. Este sistema emite NF-e (modelo 55). Verifique a legislação do seu estado.");
    }
    if (pendingNfeTipo) {
      await executarEmissaoNota(pendingNfeTipo, comDocumento ? cpfCnpjManual : undefined);
    }
    setPendingNfeTipo(null);
    setCpfCnpjManual("");
  };

  const executarEmissaoNota = async (tipo: 'NFe' | 'NFSe', cpfCnpjOverride?: string) => {
    if (!lancamentoSelecionado || !user) return;
    setEmitindoNota(true);
    setConfirmEmissaoTipo(null);

    try {
      // 1. Buscar dados da empresa
      const { data: empresaData, error: empresaError } = await supabase
        .from("empresa_config")
        .select("*")
        .eq("user_id", ownerId)
        .single();
      if (empresaError || !empresaData) throw new Error("Dados da empresa não encontrados. Configure na página Empresa.");

      // 2. Buscar dados do cliente
      let clienteData: any = null;
      const lancOriginal = await supabase
        .from("lancamentos_financeiros")
        .select("cliente_id")
        .eq("id", lancamentoSelecionado.id)
        .single();

      if (lancOriginal.data?.cliente_id) {
        const { data: cli } = await supabase
          .from("clientes")
          .select("*")
          .eq("id", lancOriginal.data.cliente_id)
          .single();
        clienteData = cli;
      }

      // 3. Filtrar itens conforme o tipo
      const itensFiltrados = itensLancamento.filter((item) =>
        tipo === 'NFSe' ? item.descricao2 === "Serviços" : item.descricao2 === "Venda"
      );

      if (itensFiltrados.length === 0) {
        toast.error(`Nenhum item de ${tipo === 'NFSe' ? 'serviço' : 'produto'} encontrado no lançamento.`);
        setEmitindoNota(false);
        return;
      }

      const valorTotal = itensFiltrados.reduce((acc, item) => acc + item.valor * (item.quantidade || 1), 0);
      const action = tipo === 'NFe' ? 'emitir_nfe' : 'emitir_nfse';

      let payload: any;
      const ambienteFiscal = (empresaData as any).ambiente_fiscal || "homologacao";
      const tpAmb = ambienteFiscal === "producao" ? 1 : 2;

      if (tipo === 'NFSe') {
        // Buscar dados fiscais dos serviços
        const servicosNomes = itensFiltrados.map((i) => i.produtoServico);
        const { data: servicosFiscais } = await supabase
          .from("servicos")
          .select("nome, codigo_servico_municipal, aliquota_iss, valor")
          .eq("user_id", ownerId)
          .in("nome", servicosNomes);

        const servicosMap = new Map((servicosFiscais || []).map((s: any) => [s.nome, s]));



        payload = {
          ambiente: ambienteFiscal,
          infDPS: {
            tpAmb: tpAmb,
            dhEmi: new Date().toISOString(),
            emit: {
              CNPJ: empresaData.cnpj?.replace(/\D/g, ""),
              xNome: empresaData.razao_social,
              IM: empresaData.inscricao_municipal,
              enderEmit: {
                xLgr: empresaData.logradouro_fiscal,
                nro: empresaData.numero_endereco_fiscal,
                xBairro: empresaData.bairro_fiscal,
                cMun: empresaData.codigo_ibge_cidade,
                xMun: empresaData.cidade_fiscal,
                UF: empresaData.uf_fiscal,
                CEP: empresaData.cep_fiscal?.replace(/\D/g, ""),
              },
            },
            toma: clienteData ? {
              ...(clienteData.cpf_cnpj?.replace(/\D/g, "").length === 11
                ? { CPF: clienteData.cpf_cnpj?.replace(/\D/g, "") }
                : { CNPJ: clienteData.cpf_cnpj?.replace(/\D/g, "") }),
              xNome: clienteData.nome_cliente,
              enderToma: clienteData.logradouro ? {
                xLgr: clienteData.logradouro,
                nro: clienteData.numero_endereco || "S/N",
                xBairro: clienteData.bairro,
                cMun: clienteData.codigo_ibge_cidade,
                xMun: clienteData.cidade,
                UF: clienteData.uf,
                CEP: clienteData.cep?.replace(/\D/g, ""),
              } : undefined,
            } : undefined,
            serv: itensFiltrados.map((item) => {
              const fiscal = servicosMap.get(item.produtoServico);
              return {
                cServ: { cTribNac: fiscal?.codigo_servico_municipal || "01.01" },
                xDescServ: item.produtoServico,
                vServ: item.valor,
                vLiq: item.valor,
              };
            }),
            valores: {
              vServPrest: { vServ: valorTotal },
            },
          },
        };
      } else {
        // NFe - Buscar dados fiscais dos produtos
        const produtosNomes = itensFiltrados.map((i) => i.produtoServico);
        const { data: produtosFiscais } = await supabase
          .from("produtos")
          .select("nome, ncm, cfop, unidade_medida, origem, valor")
          .eq("user_id", ownerId)
          .in("nome", produtosNomes);

        const produtosMap = new Map((produtosFiscais || []).map((p: any) => [p.nome, p]));

        const regimeTributario = empresaData.regime_tributario === "Simples Nacional" ? 1
          : empresaData.regime_tributario === "Simples Nacional - excesso" ? 2
          : empresaData.regime_tributario === "Lucro Presumido" ? 3 : 3;

        payload = {
          ambiente: ambienteFiscal,
          infNFe: {
            versao: "4.00",
            ide: {
              cUF: Number(empresaData.codigo_ibge_cidade?.substring(0, 2)) || 35,
              natOp: "Venda",
              mod: 55,
              serie: 1,
              nNF: Math.floor(Math.random() * 999999) + 1,
              dhEmi: new Date().toISOString(),
              tpNF: 1,
              idDest: 1,
              cMunFG: Number(empresaData.codigo_ibge_cidade) || 0,
              tpImp: 1,
              tpEmis: 1,
              tpAmb: tpAmb,
              finNFe: 1,
              indFinal: 1,
              indPres: 1,
              procEmi: 0,
              verProc: "1.0.0",
            },
            emit: {
              CNPJ: empresaData.cnpj?.replace(/\D/g, ""),
              xNome: empresaData.razao_social,
              IE: empresaData.inscricao_estadual?.replace(/\D/g, ""),
              CRT: regimeTributario,
              enderEmit: {
                xLgr: empresaData.logradouro_fiscal,
                nro: empresaData.numero_endereco_fiscal || "S/N",
                xBairro: empresaData.bairro_fiscal,
                cMun: Number(empresaData.codigo_ibge_cidade) || 0,
                xMun: empresaData.cidade_fiscal,
                UF: empresaData.uf_fiscal,
                CEP: empresaData.cep_fiscal?.replace(/\D/g, ""),
              },
            },
            dest: (() => {
              const cpfCnpjClean = cpfCnpjOverride || (clienteData?.cpf_cnpj?.replace(/\D/g, "") || "");

              // Consumidor final não identificado (venda presencial sem documento)
              if (cpfCnpjClean.length !== 11 && cpfCnpjClean.length !== 14) {
                return {
                  idEstrangeiro: "",
                  xNome: "CONSUMIDOR FINAL",
                  indIEDest: 9,
                  enderDest: {
                    xLgr: empresaData.logradouro_fiscal || "NAO INFORMADO",
                    nro: empresaData.numero_endereco_fiscal || "S/N",
                    xBairro: empresaData.bairro_fiscal || "NAO INFORMADO",
                    cMun: Number(empresaData.codigo_ibge_cidade) || 0,
                    xMun: empresaData.cidade_fiscal || "NAO INFORMADO",
                    UF: empresaData.uf_fiscal || "SP",
                    CEP: empresaData.cep_fiscal?.replace(/\D/g, "") || "00000000",
                  },
                };
              }

              // Consumidor identificado (com CPF ou CNPJ)
              const destObj: Record<string, unknown> = {};
              if (cpfCnpjClean.length === 14) destObj.CNPJ = cpfCnpjClean;
              else destObj.CPF = cpfCnpjClean;
              destObj.xNome = clienteData?.nome_cliente || "CONSUMIDOR FINAL";
              destObj.indIEDest = 9;
              if (clienteData?.logradouro) {
                destObj.enderDest = {
                  xLgr: clienteData.logradouro,
                  nro: clienteData.numero_endereco || "S/N",
                  xBairro: clienteData.bairro,
                  cMun: Number(clienteData.codigo_ibge_cidade) || 0,
                  xMun: clienteData.cidade,
                  UF: clienteData.uf,
                  CEP: clienteData.cep?.replace(/\D/g, ""),
                };
              }
              return destObj;
            })(),
            det: itensFiltrados.map((item, index) => {
              const fiscal = produtosMap.get(item.produtoServico);
              return {
                nItem: index + 1,
                prod: {
                  cProd: fiscal?.nome || item.produtoServico,
                  cEAN: "SEM GTIN",
                  xProd: item.produtoServico,
                  NCM: (fiscal?.ncm || "00000000").replace(/\D/g, "").padEnd(8, "0").substring(0, 8),
                  CFOP: fiscal?.cfop || "5102",
                  uCom: fiscal?.unidade_medida || "UN",
                  qCom: item.quantidade || 1,
                  vUnCom: item.valor,
                  vProd: item.valor * (item.quantidade || 1),
                  cEANTrib: "SEM GTIN",
                  uTrib: fiscal?.unidade_medida || "UN",
                  qTrib: item.quantidade || 1,
                  vUnTrib: item.valor,
                  indTot: 1,
                },
                imposto: {
                  ICMS: { ICMSSN102: { orig: Number(fiscal?.origem) || 0, CSOSN: "102" } },
                  PIS: { PISOutr: { CST: "99", vBC: 0, pPIS: 0, vPIS: 0 } },
                  COFINS: { COFINSOutr: { CST: "99", vBC: 0, pCOFINS: 0, vCOFINS: 0 } },
                },
              };
            }),
            total: {
              ICMSTot: {
                vBC: 0, vICMS: 0, vICMSDeson: 0, vFCP: 0,
                vBCST: 0, vST: 0, vFCPST: 0, vFCPSTRet: 0,
                vProd: valorTotal, vFrete: 0, vSeg: 0, vDesc: 0, vII: 0,
                vIPI: 0, vIPIDevol: 0, vPIS: 0, vCOFINS: 0, vOutro: 0,
                vNF: valorTotal,
              },
            },
            transp: { modFrete: 9 },
            pag: { detPag: [{ tPag: "01", vPag: valorTotal }] },
          },
        };
      }

      // 4. Chamar edge function
      const result = await callNuvemFiscal(action, {
        payload,
        valor_total: valorTotal,
        cliente_id: lancOriginal.data?.cliente_id,
        cliente_nome: clienteData?.nome_cliente,
        cliente_documento: clienteData?.cpf_cnpj,
        lancamento_id: lancamentoSelecionado.id,
      });

      toast.success(`${tipo} enviada para processamento!`);

      // 5. Tentar baixar PDF com retry (a SEFAZ pode demorar para processar)
      const nuvemFiscalId = (result as any)?.id;
      if (nuvemFiscalId) {
        const tentarBaixarPdf = async (tentativas: number, delayMs: number) => {
          for (let i = 0; i < tentativas; i++) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            try {
              const pdfAction = tipo === 'NFe' ? 'baixar_pdf_nfe' : 'baixar_pdf_nfse';
              const pdfResult = await callNuvemFiscal(pdfAction, { id: nuvemFiscalId });
              const pdfData = pdfResult as { base64?: string; contentType?: string; available?: boolean };
              if (pdfData?.available === false) {
                console.warn(`Tentativa ${i + 1}/${tentativas} - PDF ainda não disponível.`);
                continue;
              }
              if (pdfData?.base64) {
                const byteCharacters = atob(pdfData.base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let j = 0; j < byteCharacters.length; j++) {
                  byteNumbers[j] = byteCharacters.charCodeAt(j);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: "application/pdf" });
                const url = URL.createObjectURL(blob);
                window.open(url, "_blank");
                return;
              }
            } catch (pdfErr) {
              console.warn(`Tentativa ${i + 1}/${tentativas} - Erro ao buscar PDF:`, pdfErr);
            }
          }
          toast.info("PDF ainda não disponível. Consulte na página de Notas Fiscais em alguns instantes.");
        };
        // 6 tentativas com 8s de intervalo (total ~48s)
        tentarBaixarPdf(6, 8000);
      }

      // Atualizar lista de notas emitidas
      setNotasEmitidas((prev) => [...prev, { tipo, status: "processando" }]);
    } catch (error: any) {
      console.error("Erro ao emitir nota:", error);
      toast.error(`Erro ao emitir ${tipo}: ${error.message}`);
    } finally {
      setEmitindoNota(false);
    }
  };

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lancamentoSelecionado || !user) return;

    // Validations...
    if (!formData.ano || !formData.mesCompetencia || !formData.tipo || !formData.descricao1) {
      toast.error("Favor preencher todos os campos obrigatórios!");
      return;
    }

    // 🔹 Validação condicional: Cliente e Pet obrigatórios apenas para Receita Operacional
    const clientePetObrigatorios = formData.tipo === "Receita" && formData.descricao1 === "Receita Operacional";

    if (clientePetObrigatorios && (!formData.nomePet || !formData.nomeCliente)) {
      toast.error("Favor preencher Cliente e Pet para Receita Operacional!");
      return;
    }

    for (let i = 0; i < itensLancamento.length; i++) {
      const item = itensLancamento[i];
      if (!item.descricao2 || item.valor <= 0) {
        toast.error(`Item ${i + 1}: Favor preencher todos os campos!`);
        return;
      }
    }

    // Validação obrigatória de tipo/motivo quando valor >= 0.01
    if (formData.modoAjuste === "deducao" && (formData.valorDeducao || 0) >= 0.01 && !formData.tipoDeducao) {
      toast.error("Favor selecionar o Tipo de Dedução!"); return;
    }
    if (formData.modoAjuste === "juros" && (formData.valorJuros || 0) >= 0.01 && !formData.tipoJuros) {
      toast.error("Favor selecionar o Motivo do Juros!"); return;
    }

    const subtotalEdit = itensLancamento.reduce((acc, item) => acc + item.valor * (item.quantidade || 1), 0);
    const valorTotal = formData.modoAjuste === "juros"
      ? subtotalEdit + (formData.valorJuros || 0)
      : subtotalEdit - (formData.valorDeducao || 0);

    try {
      let clienteId = null;

      // 🔹 Só validar Cliente/Pet para Receita Operacional
      const clientePetObrigatorios = formData.tipo === "Receita" && formData.descricao1 === "Receita Operacional";

      if (clientePetObrigatorios) {
        // Encontrar TODOS os clientes com o mesmo nome
        const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === formData.nomeCliente);

        // Procurar o pet em qualquer um desses clientes
        let clienteEncontrado: Cliente | null = null;
        let petEncontrado: Pet | null = null;

        for (const cliente of clientesComMesmoNome) {
          const pet = pets.find((p) => p.nomePet === formData.nomePet && p.clienteId === cliente.id);
          if (pet) {
            clienteEncontrado = cliente;
            petEncontrado = pet;
            break;
          }
        }

        if (!petEncontrado || !clienteEncontrado) {
          toast.error("Cliente/Pet não encontrado ou não correspondem!");
          return;
        }

        clienteId = clienteEncontrado.id;
      } else if (formData.nomeCliente && formData.nomePet) {
        // Para Receita Não Operacional ou Despesa, se preencheu, deve validar
        const clientesComMesmoNome = clientes.filter((c) => c.nomeCliente === formData.nomeCliente);

        for (const cliente of clientesComMesmoNome) {
          const pet = pets.find((p) => p.nomePet === formData.nomePet && p.clienteId === cliente.id);
          if (pet) {
            clienteId = cliente.id;
            break;
          }
        }
      }

      const conta = contas.find((c) => c.nomeBanco === formData.nomeBanco);
      if (!conta) {
        toast.error("Conta bancária não encontrada!");
        return;
      }

      // Preparar array de pet IDs (pet principal + pets adicionais)
      // Encontrar o cliente correto baseado no pet selecionado
      const clientesComMesmoNomeParaPet = clientes.filter((c) => c.nomeCliente === formData.nomeCliente);
      let petPrincipal: Pet | null = null;

      for (const cliente of clientesComMesmoNomeParaPet) {
        const pet = pets.find((p) => p.nomePet === formData.nomePet && p.clienteId === cliente.id);
        if (pet) {
          petPrincipal = pet;
          break;
        }
      }
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
          quantidade: item.quantidade || 1,
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
      tipo: "",
      descricao1: "",
      descricao2: "",
      dataPagamento: "",
      nomeBanco: "",
      pago: null,
      fornecedorId: "",
    });
    setFiltroFornecedorSearch("");
    setFiltroDataAtivo(null);
    setFiltrosAplicados(false);
    toast.success("Filtros limpos!");
  };

  const lancamentosFiltrados = useMemo(() => {
    let resultado = filtrosAplicados ? [...lancamentos] : [...lancamentos];

    if (filtrosAplicados) {
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
      if (filtros.descricao2) {
        resultado = resultado.filter((l) => l.itens.some((item) => item.descricao2 === filtros.descricao2));
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
      if (filtros.fornecedorId) {
        resultado = resultado.filter((l) => (l as any).fornecedorId === filtros.fornecedorId);
      }
    }

    // Ordenar sempre por data de pagamento decrescente (mais recente primeiro)
    resultado.sort((a, b) => {
      if (!a.dataPagamento) return 1;
      if (!b.dataPagamento) return -1;
      return b.dataPagamento.localeCompare(a.dataPagamento);
    });

    return resultado;
  }, [lancamentos, filtros, filtroDataAtivo, filtrosAplicados]);

  const metricas = useMemo(() => {
    const dados = filtrosAplicados ? lancamentosFiltrados : lancamentos;

    const recebido = dados.filter((l) => l.tipo === "Receita" && l.pago);
    const aReceber = dados.filter((l) => l.tipo === "Receita" && !l.pago);
    const pago = dados.filter((l) => l.tipo === "Despesa" && l.pago);
    const aPagar = dados.filter((l) => l.tipo === "Despesa" && !l.pago);

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

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Controle Financeiro</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setMostrarFiltros(!mostrarFiltros)} className="h-8 text-xs gap-2">
            <Filter className="h-3 w-3" />
            {mostrarFiltros ? "Ocultar Filtros" : "Aplicar Filtros"}
          </Button>
          <Dialog
            open={isDialogOpen}
            onOpenChange={(open) => {
              setIsDialogOpen(open);
              // Limpar formulário ao fechar o dialog
              if (!open) {
                resetForm();
              }
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

              <form onSubmit={handleSubmit} className="space-y-2">
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
                        <Popover open={fornecedorPopoverOpen} onOpenChange={setFornecedorPopoverOpen}>
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
                                        setFornecedorPopoverOpen(false);
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
                              const petPertenceAoCliente =
                                petAtual && clientesComMesmoNome.some((c) => c.id === petAtual.clienteId);

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
                          id="form-cliente"
                        />
                      </>
                    )}
                  </div>

                  {/* Nome do Pet - com suporte para múltiplos pets */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Label className="text-[10px] font-semibold">
                        Pets {formData.tipo === "Receita" && formData.descricao1 === "Receita Operacional" ? "*" : ""}
                      </Label>
                      {formData.tipo === "Receita" && formData.nomeCliente && formData.nomePet && temPetsAdicionais && (
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
                                  // Filtrar pets: mesmo cliente e mesmo porte do primeiro pet
                                  // Buscar TODOS os clientes com o mesmo nome
                                  const clientesComMesmoNome = clientes.filter(
                                    (c) => c.nomeCliente === formData.nomeCliente,
                                  );

                                  // Encontrar qual cliente específico possui o pet selecionado
                                  let clienteSelecionado: Cliente | undefined;
                                  let primeiroPet: Pet | undefined;

                                  for (const cliente of clientesComMesmoNome) {
                                    const petEncontrado = pets.find(
                                      (p) => p.nomePet === formData.nomePet && p.clienteId === cliente.id,
                                    );
                                    if (petEncontrado) {
                                      clienteSelecionado = cliente;
                                      primeiroPet = petEncontrado;
                                      break;
                                    }
                                  }

                                  if (!clienteSelecionado || !primeiroPet)
                                    return <div className="text-xs text-muted-foreground">Nenhum pet disponível</div>;

                                  const petsDisponiveis = pets.filter(
                                    (p) =>
                                      p.clienteId === clienteSelecionado!.id &&
                                      p.nomePet !== formData.nomePet && // Não mostrar o pet já selecionado
                                      !formData.petsSelecionados.some((ps) => ps.id === p.id), // Não mostrar pets já adicionados
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
                      <div className="space-y-2">
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
                                    petsSelecionados: [], // Reset pets adicionais
                                  });
                                } else {
                                  setFormData({ ...formData, nomePet: value, petsSelecionados: [] });
                                }
                              } else {
                                setFormData({ ...formData, nomePet: value, petsSelecionados: [] });
                              }
                            } else {
                              // Buscar TODOS os clientes com o mesmo nome
                              const clientesComMesmoNome = clientes.filter(
                                (c) => c.nomeCliente === formData.nomeCliente,
                              );

                              // Verificar se o pet pertence a ALGUM cliente com esse nome
                              const petPertenceAAlgum = pets.find(
                                (p) => p.nomePet === value && clientesComMesmoNome.some((c) => c.id === p.clienteId),
                              );

                              if (petPertenceAAlgum) {
                                // Pet pertence a um dos clientes com esse nome, manter cliente
                                setFormData({ ...formData, nomePet: value, petsSelecionados: [] });
                              } else {
                                // Pet não pertence a nenhum cliente com esse nome
                                // Buscar o dono real do pet e atualizar o cliente
                                const petReal = pets.find((p) => p.nomePet === value);
                                if (petReal) {
                                  const donoReal = clientes.find((c) => c.id === petReal.clienteId);
                                  if (donoReal) {
                                    setFormData({
                                      ...formData,
                                      nomePet: value,
                                      nomeCliente: donoReal.nomeCliente,
                                      petsSelecionados: [],
                                    });
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
                          id="form-pet"
                          disabled={false}
                        />

                        {/* Badges dos pets adicionais */}
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
                      </div>
                    )}
                  </div>
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
                          { id: Date.now().toString(), descricao2: "", produtoServico: "", valor: 0, quantidade: 1 },
                        ]);
                      } else {
                        toast.error("Limite máximo de 10 itens atingido");
                      }
                    }}
                    isLast={index === itensLancamento.length - 1}
                    canAdd={itensLancamento.length < 10}
                  />
                ))}

                {/* Toggle Dedução/Juros + Valor Total */}
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="inline-flex rounded-md border border-input overflow-hidden">
                      <button
                        type="button"
                        className={cn("px-3 py-1 text-[10px] font-medium transition-colors", formData.modoAjuste === "deducao" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")}
                        onClick={() => setFormData({ ...formData, modoAjuste: "deducao", valorJuros: 0, tipoJuros: "" })}
                      >
                        Dedução
                      </button>
                      <button
                        type="button"
                        className={cn("px-3 py-1 text-[10px] font-medium transition-colors", formData.modoAjuste === "juros" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")}
                        onClick={() => setFormData({ ...formData, modoAjuste: "juros", valorDeducao: 0, tipoDeducao: "" })}
                      >
                        Juros
                      </button>
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
                            ? itensLancamento.reduce((acc, item) => acc + item.valor * (item.quantidade || 1), 0) + (formData.valorJuros || 0)
                            : itensLancamento.reduce((acc, item) => acc + item.valor * (item.quantidade || 1), 0) - (formData.valorDeducao || 0),
                        )}
                      </span>
                    </div>
                  </div>

                  {formData.modoAjuste === "deducao" && formData.valorDeducao > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Subtotal: {formatCurrency(itensLancamento.reduce((acc, item) => acc + item.valor * (item.quantidade || 1), 0))} - Dedução ({formData.tipoDeducao}): {formatCurrency(formData.valorDeducao)}
                    </div>
                  )}
                  {formData.modoAjuste === "juros" && formData.valorJuros > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-1">
                      Subtotal: {formatCurrency(itensLancamento.reduce((acc, item) => acc + item.valor * (item.quantidade || 1), 0))} + Juros ({formData.tipoJuros}): {formatCurrency(formData.valorJuros)}
                    </div>
                  )}
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

                <div className="flex justify-between gap-2 pt-2">
                  {/* Botões reativos de emissão de NF no novo lançamento */}
                  <div className="flex gap-2">
                    {formData.tipo === "Receita" && formData.pago && (() => {
                      const temServicos = itensLancamento.some((i) => i.descricao2 === "Serviços");
                      const temVenda = itensLancamento.some((i) => i.descricao2 === "Venda");
                      return (
                        <>
                          {temServicos && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={async () => {
                                // Salvar primeiro, depois emitir
                                const form = document.querySelector<HTMLFormElement>('#form-novo-lancamento');
                                if (form) {
                                  form.requestSubmit();
                                  // Aguardar salvamento e usar o último lançamento criado
                                  toast.info("Salve o lançamento primeiro. Depois, edite-o para emitir a NFS-e.");
                                }
                              }}
                              className="h-7 text-xs gap-1 border-green-500 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
                            >
                              <FileText className="h-3 w-3" />
                              Emitir NFS-e
                            </Button>
                          )}
                          {temVenda && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                toast.info("Salve o lançamento primeiro. Depois, edite-o para emitir a NF-e.");
                              }}
                              className="h-7 text-xs gap-1 border-blue-500 text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                            >
                              <FileText className="h-3 w-3" />
                              Emitir NF-e
                            </Button>
                          )}
                        </>
                      );
                    })()}
                  </div>

                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={resetForm} className="h-7 text-xs">
                      Cancelar
                    </Button>
                    <Button type="submit" className="h-7 text-xs">
                      Salvar Lançamento
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Dashboard Compacto */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/30">
          <CardHeader className="py-1 pb-0">
            <CardTitle className="text-xs font-medium text-green-700 dark:text-green-400 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Recebido
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <div className="text-lg font-bold text-green-700 dark:text-green-400">
              {formatCurrency(metricas.recebido.valor)}
            </div>
            <p className="text-[10px] text-green-600 dark:text-green-500">Qtd: {metricas.recebido.qtd}</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30">
          <CardHeader className="py-1 pb-0">
            <CardTitle className="text-xs font-medium text-yellow-700 dark:text-yellow-400 flex items-center gap-1">
              <DollarSign className="h-3 w-3" />A Receber
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <div className="text-lg font-bold text-yellow-700 dark:text-yellow-400">
              {formatCurrency(metricas.aReceber.valor)}
            </div>
            <p className="text-[10px] text-yellow-600 dark:text-yellow-500">Qtd: {metricas.aReceber.qtd}</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
          <CardHeader className="py-1 pb-0">
            <CardTitle className="text-xs font-medium text-blue-700 dark:text-blue-400 flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <div className="text-lg font-bold text-blue-700 dark:text-blue-400">
              {formatCurrency(metricas.pago.valor)}
            </div>
            <p className="text-[10px] text-blue-600 dark:text-blue-500">Qtd: {metricas.pago.qtd}</p>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50 dark:bg-red-950/30">
          <CardHeader className="py-1 pb-0">
            <CardTitle className="text-xs font-medium text-red-700 dark:text-red-400 flex items-center gap-1">
              <DollarSign className="h-3 w-3" />A Pagar
            </CardTitle>
          </CardHeader>
          <CardContent className="py-1">
            <div className="text-lg font-bold text-red-700 dark:text-red-400">
              {formatCurrency(metricas.aPagar.valor)}
            </div>
            <p className="text-[10px] text-red-600 dark:text-red-500">Qtd: {metricas.aPagar.qtd}</p>
          </CardContent>
        </Card>
      </div>

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
                      setFiltros({ ...filtros, mes: value, dataInicio: "", dataFim: "" });
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
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
                  <Select value={filtros.tipo} onValueChange={(value: any) => setFiltros({ ...filtros, tipo: value, descricao1: "", descricao2: "" })}>
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
                    onValueChange={(value) => setFiltros({ ...filtros, descricao1: value, descricao2: "" })}
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
                  <Label className="text-[10px]">Descrição 2</Label>
                  <Select
                    value={filtros.descricao2}
                    onValueChange={(value) => setFiltros({ ...filtros, descricao2: value })}
                    disabled={!filtros.descricao1}
                  >
                    <SelectTrigger className="h-7 text-xs">
                      <SelectValue placeholder={filtros.descricao1 ? "Selecione" : "Selecione desc. 1"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filtros.descricao1 &&
                        (categoriasDescricao2[filtros.descricao1] || []).map((desc) => (
                          <SelectItem key={desc} value={desc} className="text-xs">
                            {desc}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-0.5">
                  <Label className="text-[10px]">Fornecedor</Label>
                  <Popover open={filtroFornecedorPopoverOpen} onOpenChange={setFiltroFornecedorPopoverOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-7 text-xs"
                      >
                        {filtros.fornecedorId
                          ? (() => {
                              const f = fornecedores.find((f) => f.id === filtros.fornecedorId);
                              return f ? f.nome_fornecedor : "Selecione";
                            })()
                          : "Selecione"}
                        <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                          placeholder="Buscar por nome, CNPJ/CPF ou fantasia..."
                          value={filtroFornecedorSearch}
                          onValueChange={setFiltroFornecedorSearch}
                          className="h-8 text-xs"
                        />
                        <CommandList>
                          <CommandEmpty className="py-2 text-center text-xs">Nenhum fornecedor encontrado.</CommandEmpty>
                          <CommandGroup>
                            {filtroFornecedoresFiltrados.map((f) => (
                              <CommandItem
                                key={f.id}
                                value={f.id}
                                onSelect={() => {
                                  setFiltros({
                                    ...filtros,
                                    fornecedorId: filtros.fornecedorId === f.id ? "" : f.id,
                                  });
                                  setFiltroFornecedorSearch("");
                                  setFiltroFornecedorPopoverOpen(false);
                                }}
                                className="text-xs"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-3 w-3",
                                    filtros.fornecedorId === f.id ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{f.nome_fornecedor}</span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {f.cnpj_cpf}{f.nome_fantasia ? ` - ${f.nome_fantasia}` : ""}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
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
                  <Select
                    value={filtros.nomeBanco}
                    onValueChange={(value) => setFiltros({ ...filtros, nomeBanco: value })}
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
                    <tr
                      key={lancamento.id}
                      className="border-b hover:bg-secondary/50 transition-colors cursor-pointer"
                      onClick={() => abrirEdicao(lancamento)}
                    >
                      <td className="py-2 px-1 text-xs">
                        {new Date(lancamento.dataPagamento + "T00:00:00").toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-2 px-1 text-xs">
                        {lancamento.ano}/{lancamento.mesCompetencia}
                      </td>
                      <td className="py-2 px-1">
                        <Badge
                          variant={lancamento.tipo === "Receita" ? "default" : "destructive"}
                          className="text-[10px]"
                        >
                          {lancamento.tipo}
                        </Badge>
                      </td>
                      <td className="py-2 px-1 text-xs max-w-[100px] truncate" title={lancamento.nomeFornecedor}>{lancamento.nomeFornecedor || "-"}</td>
                      <td className="py-2 px-1 text-xs">{lancamento.nomeCliente || "-"}</td>
                      <td className="py-2 px-1 text-xs">{lancamento.nomePet || "-"}</td>
                      <td className="py-2 px-1 text-xs">{lancamento.descricao1}</td>
                      <td className="py-2 px-1 text-xs">
                        {lancamento.itens.map((item: any) => item.descricao2).join(", ")}
                      </td>
                      <td className="py-2 px-1 text-xs max-w-[150px] truncate">
                        {lancamento.itens.length} item{lancamento.itens.length > 1 ? "s" : ""}
                      </td>
                      <td className="py-2 px-1 text-xs font-semibold">{formatCurrency(lancamento.valorTotal)}</td>
                      <td className="py-2 px-1 text-xs">{lancamento.nomeBanco}</td>
                      <td className="py-2 px-1">
                        <Badge variant={lancamento.pago ? "default" : "outline"} className="text-[10px]">
                          {lancamento.tipo === "Receita"
                            ? lancamento.pago
                              ? "Recebido"
                              : "A Receber"
                            : lancamento.pago
                              ? "Pago"
                              : "A Pagar"}
                        </Badge>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => abrirEdicao(lancamento)}
                            className="h-6 w-6 p-0"
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
          // Limpar formulário ao fechar o dialog
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
              <div className="space-y-0.5">
                {formData.tipo === "Despesa" ? (
                  <>
                    <Label className="text-[10px] font-semibold">Fornecedor</Label>
                    <Popover open={fornecedorPopoverOpen} onOpenChange={setFornecedorPopoverOpen}>
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
                                  setFornecedorPopoverOpen(false);
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
                    <Label className="text-[10px] font-semibold">
                      Nome do Cliente{" "}
                      {formData.tipo === "Receita" && formData.descricao1 === "Receita Operacional" ? "*" : ""}
                    </Label>
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

              {/* Nome do Pet - com suporte para múltiplos pets */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <Label className="text-[10px] font-semibold">
                    Pets {formData.tipo === "Receita" && formData.descricao1 === "Receita Operacional" ? "*" : ""}
                  </Label>
                  {formData.tipo === "Receita" && formData.nomeCliente && formData.nomePet && temPetsAdicionais && (
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
                              const clientesComMesmoNome = clientes.filter(
                                (c) => c.nomeCliente === formData.nomeCliente,
                              );
                              let clienteSelecionado: typeof clientes[0] | undefined;
                              let primeiroPet: typeof pets[0] | undefined;
                              for (const cliente of clientesComMesmoNome) {
                                const petEncontrado = pets.find(
                                  (p) => p.nomePet === formData.nomePet && p.clienteId === cliente.id,
                                );
                                if (petEncontrado) {
                                  clienteSelecionado = cliente;
                                  primeiroPet = petEncontrado;
                                  break;
                                }
                              }

                              if (!clienteSelecionado || !primeiroPet)
                                return <div className="text-xs text-muted-foreground">Nenhum pet disponível</div>;

                              const petsDisponiveis = pets.filter(
                                (p) =>
                                  p.clienteId === clienteSelecionado!.id &&
                                  p.nomePet !== formData.nomePet &&
                                  !formData.petsSelecionados.some((ps) => ps.id === p.id),
                              );

                              if (petsDisponiveis.length === 0) {
                                return (
                                  <div className="text-xs text-muted-foreground p-2">
                                    Nenhum pet adicional disponível com o mesmo porte
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
                        const petSelecionado = pets.find(
                          (p) => p.nomePet === value && p.clienteId === clienteSelecionado?.id,
                        );

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
                    disabled={false}
                  />
                )}

                {/* Badges dos pets adicionais */}
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
                        { id: Date.now().toString(), descricao2: "", produtoServico: "", valor: 0, quantidade: 1 },
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
                        { id: Date.now().toString(), descricao2: "", produtoServico: "", valor: 0, quantidade: 1 },
                      ]);
                    } else {
                      toast.error("Limite máximo de 10 itens atingido");
                    }
                  }}
                  isLast={index === itensLancamento.length - 1}
                  canAdd={itensLancamento.length < 10}
                />
              ))}

              {/* Toggle Dedução/Juros + Valor Total */}
              <div className="pt-2 border-t">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="inline-flex rounded-md border border-input overflow-hidden">
                    <button
                      type="button"
                      className={cn("px-3 py-1 text-[10px] font-medium transition-colors", formData.modoAjuste === "deducao" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")}
                      onClick={() => setFormData({ ...formData, modoAjuste: "deducao", valorJuros: 0, tipoJuros: "" })}
                    >
                      Dedução
                    </button>
                    <button
                      type="button"
                      className={cn("px-3 py-1 text-[10px] font-medium transition-colors", formData.modoAjuste === "juros" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-muted")}
                      onClick={() => setFormData({ ...formData, modoAjuste: "juros", valorDeducao: 0, tipoDeducao: "" })}
                    >
                      Juros
                    </button>
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
                          ? itensLancamento.reduce((acc, item) => acc + item.valor * (item.quantidade || 1), 0) + (formData.valorJuros || 0)
                          : itensLancamento.reduce((acc, item) => acc + item.valor * (item.quantidade || 1), 0) - (formData.valorDeducao || 0),
                      )}
                    </span>
                  </div>
                </div>

                {formData.modoAjuste === "deducao" && formData.valorDeducao > 0 && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Subtotal: {formatCurrency(itensLancamento.reduce((acc, item) => acc + item.valor * (item.quantidade || 1), 0))} - Dedução ({formData.tipoDeducao}): {formatCurrency(formData.valorDeducao)}
                  </div>
                )}
                {formData.modoAjuste === "juros" && formData.valorJuros > 0 && (
                  <div className="text-[10px] text-muted-foreground mt-1">
                    Subtotal: {formatCurrency(itensLancamento.reduce((acc, item) => acc + item.valor * (item.quantidade || 1), 0))} + Juros ({formData.tipoJuros}): {formatCurrency(formData.valorJuros)}
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

            <div className="flex justify-between gap-2 pt-2">
              {/* Botões de emissão de nota fiscal */}
              <div className="flex gap-2">
                {formData.tipo === "Receita" && formData.pago && (() => {
                  const temServicos = itensLancamento.some((i) => i.descricao2 === "Serviços");
                  const temVenda = itensLancamento.some((i) => i.descricao2 === "Venda");
                  const nfseEmitida = notasEmitidas.some((n) => n.tipo === "NFSe");
                  const nfeEmitida = notasEmitidas.some((n) => n.tipo === "NFe");

                  return (
                    <>
                      {temServicos && (
                        nfseEmitida ? (
                          <Badge variant="secondary" className="h-7 text-[10px] gap-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <FileText className="h-3 w-3" /> NFS-e Emitida
                          </Badge>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConfirmEmissaoTipo('NFSe')}
                            disabled={emitindoNota}
                            className="h-7 text-xs gap-1 border-green-500 text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-950"
                          >
                            {emitindoNota && confirmEmissaoTipo === 'NFSe' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                            Emitir NFS-e
                          </Button>
                        )
                      )}
                      {temVenda && (
                        nfeEmitida ? (
                          <Badge variant="secondary" className="h-7 text-[10px] gap-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            <FileText className="h-3 w-3" /> NF-e Emitida
                          </Badge>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setConfirmEmissaoTipo('NFe')}
                            disabled={emitindoNota}
                            className="h-7 text-xs gap-1 border-blue-500 text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950"
                          >
                            {emitindoNota && confirmEmissaoTipo === 'NFe' ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
                            Emitir NF-e
                          </Button>
                        )
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={resetForm} className="h-7 text-xs">
                  Cancelar
                </Button>
                <Button type="submit" className="h-7 text-xs">
                  Atualizar
                </Button>
              </div>
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
                    <strong>Cliente:</strong> {lancamentoSelecionado.nomeCliente}
                  </p>
                  <p>
                    <strong>Pet:</strong> {lancamentoSelecionado.nomePet}
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
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-destructive hover:bg-destructive/90">
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog de Confirmação de Emissão de Nota Fiscal */}
      <AlertDialog open={!!confirmEmissaoTipo} onOpenChange={(open) => !open && setConfirmEmissaoTipo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Confirmar Emissão de {confirmEmissaoTipo === 'NFSe' ? 'NFS-e' : 'NF-e'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja gerar a {confirmEmissaoTipo === 'NFSe' ? 'NFS-e' : 'NF-e'}?
              {confirmEmissaoTipo === 'NFSe'
                ? ' Apenas os itens de serviços serão incluídos na nota.'
                : ' Apenas os itens de venda de produtos serão incluídos na nota.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmEmissaoTipo(null)}>Não</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmEmissaoTipo && handleEmitirNota(confirmEmissaoTipo)}
              disabled={emitindoNota}
            >
              {emitindoNota ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sim, Emitir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de CPF/CNPJ opcional para NF-e */}
      <Dialog open={showCpfCnpjModal} onOpenChange={(open) => {
        if (!open) {
          setShowCpfCnpjModal(false);
          setPendingNfeTipo(null);
          setCpfCnpjManual("");
        }
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>CPF/CNPJ na NF-e</DialogTitle>
            <DialogDescription>
              Gostaria de inserir o número de CPF/CNPJ na NF-e?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Para venda presencial ao consumidor final, é possível emitir sem CPF/CNPJ. Clique em "Não" para prosseguir sem documento.
            </p>
            <Input
              type="text"
              inputMode="numeric"
              maxLength={14}
              placeholder="Digite o CPF (11 dígitos) ou CNPJ (14 dígitos)"
              value={cpfCnpjManual}
              onChange={(e) => {
                const onlyNumbers = e.target.value.replace(/\D/g, "").slice(0, 14);
                setCpfCnpjManual(onlyNumbers);
              }}
              className="text-sm"
            />
            {cpfCnpjManual.length > 0 && cpfCnpjManual.length !== 11 && cpfCnpjManual.length !== 14 && (
              <p className="text-xs text-destructive">
                Informe exatamente 11 dígitos (CPF) ou 14 dígitos (CNPJ). Atual: {cpfCnpjManual.length} dígitos.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => handleCpfCnpjModalConfirm(false)}
              disabled={emitindoNota}
            >
              Não
            </Button>
            <Button
              onClick={() => handleCpfCnpjModalConfirm(true)}
              disabled={emitindoNota || (cpfCnpjManual.length !== 11 && cpfCnpjManual.length !== 14)}
            >
              {emitindoNota ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sim
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ControleFinanceiro;
