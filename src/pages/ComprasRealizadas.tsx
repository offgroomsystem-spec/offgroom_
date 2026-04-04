import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, FileText, Trash2, Eye, Filter, X, Calendar, Search, Check, ChevronsUpDown, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { format, addDays } from "date-fns";
import { cn } from "@/lib/utils";
import { categoriasDescricao1, categoriasDescricao2 } from "@/constants/categorias";

interface CompraItem {
  id?: string;
  produto_id: string;
  quantidade: string;
  valor_compra: string;
  data_validade: string;
  observacoes: string;
  produto?: any;
}

interface CompraNF {
  id: string;
  chave_nf: string;
  fornecedor_id: string;
  data_compra: string;
  valor_total: number;
  created_at: string;
  fornecedor?: any;
  compras_nf_itens?: CompraItem[];
}

interface Fornecedor {
  id: string;
  nome_fornecedor: string;
  cnpj_cpf: string;
  nome_fantasia: string | null;
}

interface Produto {
  id: string;
  nome: string;
  codigo: string;
}

export default function ComprasRealizadas() {
  const { user, ownerId } = useAuth();
  const [compras, setCompras] = useState<CompraNF[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState<CompraNF | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [formasPagamentoOpen, setFormasPagamentoOpen] = useState(false);
  const [prazosPagamento, setPrazosPagamento] = useState<string[]>([]);
  const [novosPrazos, setNovosPrazos] = useState<string[][]>([[""]]);
  const [prazoExcluir, setPrazoExcluir] = useState<string | null>(null);

  // Filtros
  const [filtroFornecedor, setFiltroFornecedor] = useState("");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");
  const [filtroProduto, setFiltroProduto] = useState("");

  // Form fields
  const [formData, setFormData] = useState({
    chave_nf: "",
    fornecedor_id: "",
    data_compra: "",
    dias_pagamento: "",
    descricao1: "",
    descricao2: "",
  });

  const [itens, setItens] = useState<CompraItem[]>([
    {
      produto_id: "",
      quantidade: "",
      valor_compra: "",
      data_validade: "",
      observacoes: "",
    },
  ]);

  const [openProdutoIndex, setOpenProdutoIndex] = useState<number | null>(null);
  const [openFornecedor, setOpenFornecedor] = useState(false);
  const [openDiasPagamento, setOpenDiasPagamento] = useState(false);
  const [openDescricao1, setOpenDescricao1] = useState(false);
  const [openDescricao2, setOpenDescricao2] = useState(false);

  useEffect(() => {
    loadCompras();
    loadFornecedores();
    loadProdutos();
    loadFormasPagamento();
  }, []);

  const loadFormasPagamento = async () => {
    try {
      const { data, error } = await supabase
        .from("formas_pagamento")
        .select("dias")
        .eq("user_id", ownerId)
        .order("dias", { ascending: true });

      if (error) throw error;
      if (data && data.length > 0) {
        setPrazosPagamento(data.map((d: any) => String(d.dias)));
      }
    } catch (error: any) {
      console.error("Erro ao carregar condições de pagamento:", error);
    }
  };

  const salvarFormasPagamento = async () => {
    try {
      // Converter cada array de parcelas em string "30/60"
      const novosValidos = novosPrazos
        .map((parcelas) => parcelas.map((p) => p.trim()).filter((p) => p !== "").join("/"))
        .filter((p) => p !== "");
      
      // Checar duplicidade entre novos
      const novosSet = new Set(novosValidos);
      if (novosSet.size !== novosValidos.length) {
        toast.error("Essa condição de pagamento já existe!");
        return;
      }
      
      // Checar duplicidade contra os já salvos
      for (const novo of novosValidos) {
        if (prazosPagamento.includes(novo)) {
          toast.error("Essa condição de pagamento já existe!");
          return;
        }
      }

      // Insert only new ones
      const registros = novosValidos.map((dias) => ({
        user_id: ownerId,
        dias,
      }));

      if (registros.length > 0) {
        const { error } = await supabase.from("formas_pagamento").insert(registros);
        if (error) throw error;
      }

      toast.success("Condição de pagamento salva com sucesso!");
      setNovosPrazos([[""]]);
      setFormasPagamentoOpen(false);
      await loadFormasPagamento();
    } catch (error: any) {
      console.error("Erro ao salvar condição de pagamento:", error);
      toast.error("Erro ao salvar condição de pagamento");
    }
  };

  const excluirFormaPagamento = async (dias: string) => {
    try {
      const { error } = await supabase
        .from("formas_pagamento")
        .delete()
        .eq("user_id", ownerId)
        .eq("dias", dias);
      if (error) throw error;
      toast.success("Condição de pagamento excluída!");
      setPrazoExcluir(null);
      setFormasPagamentoOpen(false);
      await loadFormasPagamento();
    } catch (error: any) {
      console.error("Erro ao excluir forma de pagamento:", error);
      toast.error("Erro ao excluir forma de pagamento");
    }
  };

  const loadCompras = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("compras_nf")
        .select(`
          *,
          compras_nf_itens (*)
        `)
        .eq("user_id", ownerId)
        .order("data_compra", { ascending: false });

      if (error) throw error;

      const [fornecedoresData, produtosData] = await Promise.all([
        supabase.from("fornecedores").select("id, nome_fornecedor").eq("user_id", ownerId),
        supabase.from("produtos").select("id, nome, codigo").eq("user_id", ownerId),
      ]);

      const comprasComRelacoes = data?.map((compra) => {
        const fornecedor = fornecedoresData.data?.find((f) => f.id === compra.fornecedor_id);
        const itensComProdutos = compra.compras_nf_itens?.map((item: any) => {
          const produto = produtosData.data?.find((p) => p.id === item.produto_id);
          return { ...item, produto };
        });
        return { ...compra, fornecedor, compras_nf_itens: itensComProdutos };
      });

      setCompras(comprasComRelacoes || []);
    } catch (error: any) {
      console.error("Erro ao carregar compras:", error);
      toast.error("Erro ao carregar compras");
    }
  };

  const loadFornecedores = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("fornecedores")
        .select("id, nome_fornecedor, cnpj_cpf, nome_fantasia")
        .eq("user_id", ownerId)
        .order("nome_fornecedor");

      if (error) throw error;
      setFornecedores(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar fornecedores:", error);
    }
  };

  const loadProdutos = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, codigo")
        .eq("user_id", ownerId)
        .order("nome");

      if (error) throw error;
      setProdutos(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar produtos:", error);
    }
  };

  const adicionarItem = () => {
    setItens([
      ...itens,
      {
        produto_id: "",
        quantidade: "",
        valor_compra: "",
        data_validade: "",
        observacoes: "",
      },
    ]);
  };

  const removerItem = (index: number) => {
    if (itens.length > 1) {
      setItens(itens.filter((_, i) => i !== index));
    }
  };

  const atualizarItem = (index: number, field: keyof CompraItem, value: string) => {
    const novosItens = [...itens];
    novosItens[index] = { ...novosItens[index], [field]: value };
    setItens(novosItens);
  };

  const calcularValorTotal = () => {
    return itens.reduce((total, item) => {
      const valor = parseFloat(item.valor_compra) || 0;
      const quantidade = parseFloat(item.quantidade) || 0;
      return total + (quantidade * valor);
    }, 0);
  };

  const formatarChaveNF = (value: string) => {
    const numeros = value.replace(/\D/g, '');
    const limitado = numeros.slice(0, 44);
    const formatado = limitado.match(/.{1,4}/g)?.join(' ') || limitado;
    return formatado;
  };

  const handleChaveNFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatado = formatarChaveNF(e.target.value);
    setFormData({ ...formData, chave_nf: formatado });
  };

  // Build payment term options from prazosPagamento
  const opcoesDiasPagamento = () => {
    const opcoes: { label: string; value: string }[] = [
      { label: "À Vista", value: "avista" },
    ];

    // Add saved payment terms as options
    const prazosFiltrados = prazosPagamento
      .filter((p) => p.trim() !== "")
      .sort((a, b) => {
        const numA = parseInt(a.split("/")[0]) || 0;
        const numB = parseInt(b.split("/")[0]) || 0;
        return numA - numB;
      });

    for (const prazo of prazosFiltrados) {
      opcoes.push({ label: `${prazo} dias`, value: prazo });
    }

    return opcoes;
  };

  const opcoesDescricao1Despesa = categoriasDescricao1["Despesa"] || [];
  const opcoesDescricao2Atual = formData.descricao1 ? categoriasDescricao2[formData.descricao1] || [] : [];

  const criarLancamentosFinanceiros = async (nfId: string, valorTotal: number) => {
    try {
      const dataCompra = new Date(formData.data_compra + "T12:00:00");
      const ano = dataCompra.getFullYear().toString();
      const mes = String(dataCompra.getMonth() + 1).padStart(2, "0");

      let parcelas: { dataPagamento: string; valor: number }[] = [];

      if (formData.dias_pagamento === "avista" || !formData.dias_pagamento) {
        parcelas = [{ dataPagamento: formData.data_compra, valor: valorTotal }];
      } else {
        const dias = formData.dias_pagamento.split("/").map((d) => parseInt(d));
        const valorParcela = valorTotal / dias.length;
        parcelas = dias.map((d) => ({
          dataPagamento: format(addDays(dataCompra, d), "yyyy-MM-dd"),
          valor: valorParcela,
        }));
      }

      for (const parcela of parcelas) {
        const { data: lancData, error: lancError } = await supabase
          .from("lancamentos_financeiros")
          .insert({
            user_id: ownerId,
            ano,
            mes_competencia: mes,
            tipo: "Despesa",
            descricao1: formData.descricao1,
            fornecedor_id: formData.fornecedor_id,
            valor_total: parcela.valor,
            data_pagamento: parcela.dataPagamento,
            conta_id: null,
            pago: false,
          })
          .select()
          .single();

        if (lancError) throw lancError;

        const { error: itemError } = await supabase
          .from("lancamentos_financeiros_itens")
          .insert({
            lancamento_id: lancData.id,
            descricao2: formData.descricao2,
            produto_servico: null,
            valor: parcela.valor,
            quantidade: 1,
          });

        if (itemError) throw itemError;
      }
    } catch (error: any) {
      console.error("Erro ao criar lançamento financeiro:", error);
      toast.error("Compra salva, mas houve erro ao criar lançamento financeiro");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.chave_nf || !formData.fornecedor_id || !formData.data_compra) {
      toast.error("Preencha todos os campos obrigatórios da NF");
      return;
    }

    if (!formData.descricao1) {
      toast.error("Selecione a Descrição 1");
      return;
    }

    if (!formData.descricao2) {
      toast.error("Selecione a Descrição 2");
      return;
    }

    const itensValidos = itens.filter(
      (item) => item.produto_id && item.quantidade && item.valor_compra
    );

    if (itensValidos.length === 0) {
      toast.error("Adicione pelo menos um produto válido");
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const valorTotal = calcularValorTotal();
      
      const chaveNFLimpa = formData.chave_nf.replace(/\s/g, '');
      
      if (chaveNFLimpa.length !== 44) {
        toast.error("A chave da NF deve ter exatamente 44 dígitos");
        return;
      }

      const { data: nfData, error: nfError } = await supabase
        .from("compras_nf")
        .insert({
          user_id: user.id,
          chave_nf: chaveNFLimpa,
          fornecedor_id: formData.fornecedor_id,
          data_compra: formData.data_compra,
          valor_total: valorTotal,
        })
        .select()
        .single();

      if (nfError) throw nfError;

      const itensParaInserir = itensValidos.map((item) => ({
        nf_id: nfData.id,
        produto_id: item.produto_id,
        quantidade: parseFloat(item.quantidade),
        valor_compra: parseFloat(item.valor_compra),
        data_validade: item.data_validade || null,
        observacoes: item.observacoes || null,
      }));

      const { error: itensError } = await supabase
        .from("compras_nf_itens")
        .insert(itensParaInserir);

      if (itensError) throw itensError;

      // Criar lançamento(s) financeiro(s) automaticamente
      await criarLancamentosFinanceiros(nfData.id, valorTotal);

      toast.success("Compra registrada com sucesso!");
      await loadCompras();
      resetForm();
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Erro ao salvar compra:", error);
      if (error.code === "23505") {
        toast.error("Esta chave de NF já foi cadastrada");
      } else {
        toast.error("Erro ao salvar compra");
      }
    }
  };

  const resetForm = () => {
    setFormData({
      chave_nf: "",
      fornecedor_id: "",
      data_compra: "",
      dias_pagamento: "",
      descricao1: "",
      descricao2: "",
    });
    setItens([
      {
        produto_id: "",
        quantidade: "",
        valor_compra: "",
        data_validade: "",
        observacoes: "",
      },
    ]);
  };

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const { error } = await supabase.from("compras_nf").delete().eq("id", deleteId);

      if (error) throw error;

      toast.success("Compra excluída com sucesso!");
      await loadCompras();
    } catch (error: any) {
      console.error("Erro ao excluir compra:", error);
      toast.error("Erro ao excluir compra");
    } finally {
      setDeleteId(null);
    }
  };

  const visualizarDetalhes = (compra: CompraNF) => {
    setSelectedCompra(compra);
    setIsDetailsOpen(true);
  };

  const comprasFiltradas = compras.filter((compra) => {
    if (filtroFornecedor && compra.fornecedor_id !== filtroFornecedor) return false;
    if (filtroDataInicio && compra.data_compra < filtroDataInicio) return false;
    if (filtroDataFim && compra.data_compra > filtroDataFim) return false;
    if (filtroProduto) {
      const temProduto = compra.compras_nf_itens?.some(
        (item) => item.produto_id === filtroProduto
      );
      if (!temProduto) return false;
    }
    return true;
  });

  const limparFiltros = () => {
    setFiltroFornecedor("");
    setFiltroDataInicio("");
    setFiltroDataFim("");
    setFiltroProduto("");
  };

  const fornecedorSelecionado = fornecedores.find((f) => f.id === formData.fornecedor_id);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Compras Realizadas</h1>
          <p className="text-muted-foreground">Gerenciamento de Notas Fiscais de Compra</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {mostrarFiltros ? "Ocultar Filtros" : "Filtros"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNovosPrazos([[""]]);
              setFormasPagamentoOpen(true);
            }}
            className="gap-2"
          >
            <CreditCard className="h-4 w-4" />
            Condição de Pagamento
          </Button>

          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar Compra (NF)
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova Compra (Nota Fiscal)</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Dados da NF */}
                <div className="space-y-4">
                  <h3 className="font-semibold text-lg">Dados da Nota Fiscal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="chave_nf">Chave de Acesso da NF *</Label>
                      <Input
                        id="chave_nf"
                        value={formData.chave_nf}
                        onChange={handleChaveNFChange}
                        placeholder="0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000"
                        maxLength={54}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        44 dígitos numéricos
                      </p>
                    </div>

                    {/* Fornecedor com busca */}
                    <div className="space-y-2">
                      <Label>Fornecedor *</Label>
                      <Popover open={openFornecedor} onOpenChange={setOpenFornecedor}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openFornecedor}
                            className="w-full justify-between"
                          >
                            {fornecedorSelecionado
                              ? fornecedorSelecionado.nome_fornecedor
                              : "Selecione o fornecedor"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar por nome, fantasia ou CPF/CNPJ..." className="h-9" />
                            <CommandList>
                              <CommandEmpty>Nenhum fornecedor encontrado.</CommandEmpty>
                              <CommandGroup>
                                {fornecedores.map((f) => (
                                  <CommandItem
                                    key={f.id}
                                    value={`${f.nome_fornecedor} ${f.nome_fantasia || ""} ${f.cnpj_cpf}`}
                                    onSelect={() => {
                                      setFormData({ ...formData, fornecedor_id: f.id });
                                      setOpenFornecedor(false);
                                    }}
                                  >
                                    <div className="flex flex-col">
                                      <span>{f.nome_fornecedor}</span>
                                      {f.nome_fantasia && (
                                        <span className="text-xs text-muted-foreground">{f.nome_fantasia}</span>
                                      )}
                                      <span className="text-xs text-muted-foreground">{f.cnpj_cpf}</span>
                                    </div>
                                    <Check
                                      className={cn("ml-auto h-4 w-4", formData.fornecedor_id === f.id ? "opacity-100" : "opacity-0")}
                                    />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Linha: Data Emissão + Dias Pagamento + Valor Total */}
                    <div className="space-y-2">
                      <Label htmlFor="data_compra">Data da Emissão da NFe *</Label>
                      <Input
                        id="data_compra"
                        type="date"
                        value={formData.data_compra}
                        onChange={(e) =>
                          setFormData({ ...formData, data_compra: e.target.value })
                        }
                        required
                      />
                    </div>

                    {/* Dias de Pagamento */}
                    <div className="space-y-2">
                      <Label>Dias de Pagamento</Label>
                      <Popover open={openDiasPagamento} onOpenChange={setOpenDiasPagamento}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openDiasPagamento}
                            className="w-full justify-between"
                          >
                            {formData.dias_pagamento
                              ? formData.dias_pagamento === "avista"
                                ? "À Vista"
                                : formData.dias_pagamento
                              : "Selecione"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[250px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar..." className="h-9" />
                            <CommandList>
                              <CommandEmpty>Nenhuma opção encontrada.</CommandEmpty>
                              <CommandGroup>
                                {opcoesDiasPagamento().map((op) => (
                                  <CommandItem
                                    key={op.value}
                                    value={op.label}
                                    onSelect={() => {
                                      setFormData({ ...formData, dias_pagamento: op.value });
                                      setOpenDiasPagamento(false);
                                    }}
                                  >
                                    {op.label}
                                    <Check
                                      className={cn("ml-auto h-4 w-4", formData.dias_pagamento === op.value ? "opacity-100" : "opacity-0")}
                                    />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Valor Total</Label>
                      <Input
                        value={`R$ ${calcularValorTotal().toFixed(2)}`}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                  </div>

                  {/* Descrição 1 e Descrição 2 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Descrição 1 *</Label>
                      <Popover open={openDescricao1} onOpenChange={setOpenDescricao1}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openDescricao1}
                            className="w-full justify-between"
                          >
                            {formData.descricao1 || "Selecione"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar..." className="h-9" />
                            <CommandList>
                              <CommandEmpty>Nenhuma opção encontrada.</CommandEmpty>
                              <CommandGroup>
                                {opcoesDescricao1Despesa.map((desc) => (
                                  <CommandItem
                                    key={desc}
                                    value={desc}
                                    onSelect={() => {
                                      setFormData({ ...formData, descricao1: desc, descricao2: "" });
                                      setOpenDescricao1(false);
                                    }}
                                  >
                                    {desc}
                                    <Check
                                      className={cn("ml-auto h-4 w-4", formData.descricao1 === desc ? "opacity-100" : "opacity-0")}
                                    />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="space-y-2">
                      <Label>Descrição 2 *</Label>
                      <Popover open={openDescricao2} onOpenChange={setOpenDescricao2}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={openDescricao2}
                            className="w-full justify-between"
                            disabled={!formData.descricao1}
                          >
                            {formData.descricao2 || (formData.descricao1 ? "Selecione" : "Selecione Descrição 1 primeiro")}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[300px] p-0" align="start">
                          <Command>
                            <CommandInput placeholder="Buscar..." className="h-9" />
                            <CommandList>
                              <CommandEmpty>Nenhuma opção encontrada.</CommandEmpty>
                              <CommandGroup>
                                {opcoesDescricao2Atual.map((desc) => (
                                  <CommandItem
                                    key={desc}
                                    value={desc}
                                    onSelect={() => {
                                      setFormData({ ...formData, descricao2: desc });
                                      setOpenDescricao2(false);
                                    }}
                                  >
                                    {desc}
                                    <Check
                                      className={cn("ml-auto h-4 w-4", formData.descricao2 === desc ? "opacity-100" : "opacity-0")}
                                    />
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                {/* Itens da NF */}
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-lg">Produtos da NF</h3>
                    <Button type="button" size="sm" onClick={adicionarItem} className="gap-2">
                      <Plus className="h-3 w-3" />
                      Adicionar Item
                    </Button>
                  </div>

                  {itens.map((item, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">Item {index + 1}</span>
                        {itens.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removerItem(index)}
                            className="text-destructive hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Produto *</Label>
                          <Popover 
                            open={openProdutoIndex === index} 
                            onOpenChange={(open) => setOpenProdutoIndex(open ? index : null)}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={openProdutoIndex === index}
                                className="w-full justify-between"
                              >
                                {item.produto_id
                                  ? produtos.find((p) => p.id === item.produto_id)
                                      ? `${produtos.find((p) => p.id === item.produto_id)?.codigo} - ${produtos.find((p) => p.id === item.produto_id)?.nome}`
                                      : "Selecione o produto"
                                  : "Selecione o produto"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0" align="start">
                              <Command>
                                <CommandInput 
                                  placeholder="Buscar produto..." 
                                  className="h-9"
                                />
                                <CommandList>
                                  <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                                  <CommandGroup>
                                    {produtos.map((produto) => (
                                      <CommandItem
                                        key={produto.id}
                                        value={`${produto.codigo} ${produto.nome}`}
                                        onSelect={() => {
                                          atualizarItem(index, "produto_id", produto.id);
                                          setOpenProdutoIndex(null);
                                        }}
                                      >
                                        {produto.codigo} - {produto.nome}
                                        <Check
                                          className={`ml-auto h-4 w-4 ${
                                            item.produto_id === produto.id
                                              ? "opacity-100"
                                              : "opacity-0"
                                          }`}
                                        />
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="space-y-2">
                          <Label>Quantidade *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.quantidade}
                            onChange={(e) =>
                              atualizarItem(index, "quantidade", e.target.value)
                            }
                            placeholder="0"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Valor de Compra unitário *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={item.valor_compra}
                            onChange={(e) =>
                              atualizarItem(index, "valor_compra", e.target.value)
                            }
                            placeholder="0.00"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Data de Validade do produto</Label>
                          <Input
                            type="date"
                            value={item.data_validade}
                            onChange={(e) =>
                              atualizarItem(index, "data_validade", e.target.value)
                            }
                          />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label>Observações</Label>
                          <Input
                            value={item.observacoes}
                            onChange={(e) =>
                              atualizarItem(index, "observacoes", e.target.value)
                            }
                            placeholder="Observações sobre este item"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit">Salvar Compra</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filtros */}
      {mostrarFiltros && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold">Filtros</h3>
            <Button variant="ghost" size="sm" onClick={limparFiltros}>
              Limpar
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Fornecedor</Label>
              <Select value={filtroFornecedor} onValueChange={setFiltroFornecedor}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {fornecedores.map((fornecedor) => (
                    <SelectItem key={fornecedor.id} value={fornecedor.id}>
                      {fornecedor.nome_fornecedor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input
                type="date"
                value={filtroDataInicio}
                onChange={(e) => setFiltroDataInicio(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={filtroDataFim}
                onChange={(e) => setFiltroDataFim(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Produto</Label>
              <Select value={filtroProduto} onValueChange={setFiltroProduto}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  {produtos.map((produto) => (
                    <SelectItem key={produto.id} value={produto.id}>
                      {produto.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Chave da NF</TableHead>
              <TableHead>Fornecedor</TableHead>
              <TableHead>Data da Compra</TableHead>
              <TableHead>Qtd. Itens</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {comprasFiltradas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Nenhuma compra cadastrada
                </TableCell>
              </TableRow>
            ) : (
              comprasFiltradas.map((compra) => (
                <TableRow key={compra.id}>
                  <TableCell className="font-mono text-xs">
                    {compra.chave_nf.substring(0, 20)}...
                  </TableCell>
                  <TableCell>{compra.fornecedor?.nome_fornecedor || "N/A"}</TableCell>
                  <TableCell>
                    {format(new Date(compra.data_compra), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>{compra.compras_nf_itens?.length || 0}</TableCell>
                  <TableCell>R$ {compra.valor_total.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => visualizarDetalhes(compra)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(compra.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Detalhes */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Compra</DialogTitle>
          </DialogHeader>
          {selectedCompra && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Chave da NF</Label>
                  <p className="font-mono text-sm break-all">{selectedCompra.chave_nf}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Fornecedor</Label>
                  <p>{selectedCompra.fornecedor?.nome_fornecedor || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data da Compra</Label>
                  <p>{format(new Date(selectedCompra.data_compra), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Valor Total</Label>
                  <p className="font-semibold">R$ {selectedCompra.valor_total.toFixed(2)}</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Itens da Compra</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Quantidade</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Obs.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedCompra.compras_nf_itens?.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {item.produto?.codigo} - {item.produto?.nome}
                        </TableCell>
                        <TableCell>{item.quantidade}</TableCell>
                        <TableCell>R$ {parseFloat(item.valor_compra).toFixed(2)}</TableCell>
                        <TableCell>
                          {item.data_validade
                            ? format(new Date(item.data_validade), "dd/MM/yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>{item.observacoes || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta compra? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Condição de Pagamento */}
      <Dialog open={formasPagamentoOpen} onOpenChange={setFormasPagamentoOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Condição de Pagamento</DialogTitle>
          </DialogHeader>

          {/* Lista de formas já cadastradas */}
          {prazosPagamento.length > 0 && (
            <div className="border rounded-md p-3 space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Condições cadastradas:</p>
              {prazosPagamento.map((dias) => (
                <div key={dias} className="flex items-center justify-between bg-muted/50 rounded px-3 py-1.5">
                  <span className="text-sm">{dias} dias</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setPrazoExcluir(dias)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Adicione em cada campo a quantidade de dias após a emissão da NF em que cada parcela deverá ser paga.
          </p>
          <div className="space-y-3 mt-2">
            {novosPrazos.map((parcelas, condIndex) => (
              <div key={condIndex} className="space-y-2">
                <div className="flex items-center gap-1 flex-wrap">
                  {parcelas.map((parcela, parcIndex) => (
                    <div key={parcIndex} className="flex items-center gap-1">
                      {parcIndex > 0 && (
                        <span className="text-sm font-semibold text-muted-foreground">/</span>
                      )}
                      <Input
                        type="text"
                        placeholder="Ex: 30"
                        value={parcela}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, "");
                          const novos = novosPrazos.map((c, ci) =>
                            ci === condIndex
                              ? c.map((p, pi) => (pi === parcIndex ? val : p))
                              : c
                          );
                          setNovosPrazos(novos);
                        }}
                        className="w-20"
                      />
                      {parcIndex > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 text-destructive hover:text-destructive"
                          onClick={() => {
                            const novos = novosPrazos.map((c, ci) =>
                              ci === condIndex ? c.filter((_, pi) => pi !== parcIndex) : c
                            );
                            setNovosPrazos(novos);
                          }}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {parcelas[parcelas.length - 1]?.trim() !== "" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const novos = novosPrazos.map((c, ci) =>
                          ci === condIndex ? [...c, ""] : c
                        );
                        setNovosPrazos(novos);
                      }}
                      className="text-xs h-7 px-2"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Parcela
                    </Button>
                  )}
                  {condIndex > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => {
                        setNovosPrazos(novosPrazos.filter((_, i) => i !== condIndex));
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setFormasPagamentoOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                const temCondicaoIncompleta = novosPrazos.some((parcelas) => {
                  const preenchidas = parcelas.filter((p) => p.trim() !== "");
                  const vazias = parcelas.filter((p) => p.trim() === "");
                  return preenchidas.length > 0 && vazias.length > 0;
                });
                if (temCondicaoIncompleta) {
                  toast.error("Existem campos de parcela vazios. Preencha todos os campos ou remova os que não serão utilizados.");
                  return;
                }
                const temPreenchido = novosPrazos.some((parcelas) => parcelas.some((p) => p.trim() !== ""));
                if (!temPreenchido) {
                  setFormasPagamentoOpen(false);
                  return;
                }
                salvarFormasPagamento();
              }}
            >
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de confirmação de exclusão de forma de pagamento */}
      <AlertDialog open={!!prazoExcluir} onOpenChange={(open) => { if (!open) setPrazoExcluir(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Condição de Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que gostaria de excluir essa condição de pagamento?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => prazoExcluir && excluirFormaPagamento(prazoExcluir)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
