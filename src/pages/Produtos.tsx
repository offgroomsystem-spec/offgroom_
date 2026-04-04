import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Pencil, Trash2, Plus, Filter, X, TrendingUp, TrendingDown, History } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { UNIDADES_MEDIDA, ORIGENS_PRODUTO } from "@/utils/fiscalUtils";

interface Produto {
  id: string;
  descricao: string;
  precoCusto: number;
  margemLucro: number;
  imposto: number;
  taxaCartao: number;
  codigo: string;
  valorVenda: number;
  lucroUnitario: number;
  dataCadastro: string;
  estoqueMinimo: number;
  estoqueAtual?: number;
  // Campos fiscais
  ncm?: string;
  cfop?: string;
  unidadeMedida?: string;
  origem?: string;
}

interface CompraHistorico {
  data_compra: string;
  valor_compra: number;
  fornecedor_nome: string;
  chave_nf: string;
}

interface VariacaoPreco {
  tipo: 'aumento' | 'reducao' | 'igual';
  valorAnterior: number;
  valorAtual: number;
  percentual: number;
}

interface LoteProduto {
  id: string;
  dataValidade: Date | null;
  quantidade: number;
  nfId: string;
}

const Produtos = () => {
  const { user, ownerId } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isHistoricoDialogOpen, setIsHistoricoDialogOpen] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null);
  const [historicoCompras, setHistoricoCompras] = useState<CompraHistorico[]>([]);
  const [variacaoPreco, setVariacaoPreco] = useState<VariacaoPreco | null>(null);
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [lotesProduto, setLotesProduto] = useState<LoteProduto[]>([]);
  const [lotesEditados, setLotesEditados] = useState<Map<string, { quantidade?: number; dataValidade?: Date | null }>>(new Map());
  const [loadingLotes, setLoadingLotes] = useState(false);
  const [vendasProduto, setVendasProduto] = useState<number>(0);
  
  const [filtros, setFiltros] = useState({
    nome: "",
    codigo: ""
  });
  
  const [formData, setFormData] = useState({
    descricao: "",
    precoCusto: "",
    margemLucro: "",
    imposto: "",
    taxaCartao: "2.33",
    codigo: "",
    valorVenda: "",
    estoqueMinimo: "0",
    // Campos fiscais
    ncm: "",
    cfop: "",
    unidadeMedida: "UN",
    origem: "0",
  });

  useEffect(() => {
    if (user) {
      loadProdutos();
    }
  }, [user]);

  const calcularEstoque = async (produtoNome: string, produtoId: string): Promise<number> => {
    try {
      // Calcular automaticamente: Compras - Vendas
      const { data: compras } = await supabase
        .from('compras_nf_itens')
        .select('quantidade')
        .eq('produto_id', produtoId);
      
      const totalCompras = (compras || []).reduce((total, item) => 
        total + Number(item.quantidade || 0), 0
      );

      const { data: vendas } = await supabase
        .from('lancamentos_financeiros_itens')
        .select('quantidade')
        .eq('descricao2', 'Venda')
        .eq('produto_servico', produtoNome);

      const totalVendas = (vendas || []).reduce((total, venda) => 
        total + Number(venda.quantidade || 0), 0
      );

      return Math.max(0, totalCompras - totalVendas);
    } catch (error) {
      console.error('Erro ao calcular estoque:', error);
      return 0;
    }
  };

  const loadProdutos = async () => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      if (data) {
        const produtosComEstoque = await Promise.all(
          data.map(async (p: any) => {
            const estoqueAtual = await calcularEstoque(p.nome || p.descricao, p.id);
            return {
              id: p.id,
              descricao: p.nome || p.descricao,
              precoCusto: Number(p.preco_custo || 0),
              margemLucro: Number(p.margem_lucro || 0),
              imposto: Number(p.imposto || 0),
              taxaCartao: Number(p.taxa_cartao || 0),
              codigo: p.codigo || '',
              valorVenda: Number(p.valor || 0),
              lucroUnitario: Number(p.lucro_unitario || 0),
              dataCadastro: p.created_at || new Date().toISOString(),
              estoqueMinimo: Number(p.estoque_minimo || 0),
              estoqueAtual,
              // Campos fiscais
              ncm: p.ncm || '',
              cfop: p.cfop || '',
              unidadeMedida: p.unidade_medida || 'UN',
              origem: p.origem || '0',
            };
          })
        );
        setProdutos(produtosComEstoque);
      }
    } catch (error: any) {
      console.error('Erro ao carregar produtos:', error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  const buscarHistoricoCompras = async (produtoId: string) => {
    try {
      const { data: itens, error } = await supabase
        .from('compras_nf_itens')
        .select('nf_id, valor_compra, quantidade')
        .eq('produto_id', produtoId);

      if (error) throw error;
      if (!itens || itens.length === 0) return [];

      const nfIds = itens.map(item => item.nf_id);
      const { data: nfs, error: nfError } = await supabase
        .from('compras_nf')
        .select('id, data_compra, chave_nf, fornecedor_id, fornecedores(nome_fornecedor)')
        .in('id', nfIds);

      if (nfError) throw nfError;

      const historico = itens
        .map(item => {
          const nf = nfs?.find((n: any) => n.id === item.nf_id);
          return {
            data_compra: nf?.data_compra || '',
            valor_compra: Number(item.valor_compra),
            fornecedor_nome: (nf?.fornecedores as any)?.nome_fornecedor || 'N/A',
            chave_nf: nf?.chave_nf || ''
          };
        })
        .sort((a, b) => new Date(b.data_compra).getTime() - new Date(a.data_compra).getTime());

      return historico;
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
      return [];
    }
  };

  const calcularVariacaoPreco = (historico: CompraHistorico[]): VariacaoPreco | null => {
    if (historico.length < 2) return null;

    const valorAtual = historico[0].valor_compra;
    const valorAnterior = historico[1].valor_compra;

    if (valorAtual === valorAnterior) {
      return { tipo: 'igual', valorAnterior, valorAtual, percentual: 0 };
    }

    const percentual = ((valorAtual - valorAnterior) / valorAnterior) * 100;

    return {
      tipo: valorAtual > valorAnterior ? 'aumento' : 'reducao',
      valorAnterior,
      valorAtual,
      percentual: Math.abs(percentual)
    };
  };

  const buscarLotesProduto = async (produtoId: string): Promise<LoteProduto[]> => {
    try {
      setLoadingLotes(true);
      
      const { data, error } = await supabase
        .from('compras_nf_itens')
        .select(`
          id,
          quantidade,
          data_validade,
          nf_id,
          compras_nf!inner (
            user_id
          )
        `)
        .eq('produto_id', produtoId);
      
      if (error) throw error;
      
      // Filtrar apenas do usuário atual
      const itensDoUsuario = (data || []).filter(
        (item: any) => item.compras_nf?.user_id === user?.id
      );
      
      // Mapear para interface LoteProduto
      const lotes = itensDoUsuario.map((item: any) => ({
        id: item.id,
        dataValidade: item.data_validade ? new Date(item.data_validade) : null,
        quantidade: Number(item.quantidade),
        nfId: item.nf_id,
      }));
      
      // Ordenar por data de validade (mais próximas primeiro)
      return lotes.sort((a, b) => {
        if (!a.dataValidade) return 1;
        if (!b.dataValidade) return -1;
        return a.dataValidade.getTime() - b.dataValidade.getTime();
      });
      
    } catch (error) {
      console.error('Erro ao buscar lotes:', error);
      return [];
    } finally {
      setLoadingLotes(false);
    }
  };

  const buscarVendasProduto = async (produtoNome: string): Promise<number> => {
    try {
      const { data: vendas } = await supabase
        .from('lancamentos_financeiros_itens')
        .select('quantidade')
        .eq('descricao2', 'Venda')
        .eq('produto_servico', produtoNome);

      return (vendas || []).reduce((total, venda) => 
        total + Number(venda.quantidade || 0), 0
      );
    } catch (error) {
      console.error('Erro ao buscar vendas:', error);
      return 0;
    }
  };

  const handleLoteChange = (loteId: string, campo: 'quantidade' | 'dataValidade', valor: number | Date | null) => {
    setLotesEditados(prev => {
      const novoMap = new Map(prev);
      const edAtual = novoMap.get(loteId) || {};
      novoMap.set(loteId, { ...edAtual, [campo]: valor });
      return novoMap;
    });
  };

  const calcularEstoqueTotalLotes = useMemo(() => {
    const totalLotes = lotesProduto.reduce((total, lote) => {
      const edicao = lotesEditados.get(lote.id);
      const quantidade = edicao?.quantidade !== undefined ? edicao.quantidade : lote.quantidade;
      return total + quantidade;
    }, 0);
    
    // Subtrair vendas do total de lotes
    return Math.max(0, totalLotes - vendasProduto);
  }, [lotesProduto, lotesEditados, vendasProduto]);

  const salvarAlteracoesLotes = async (): Promise<boolean> => {
    try {
      for (const [loteId, edicao] of lotesEditados.entries()) {
        const loteOriginal = lotesProduto.find(l => l.id === loteId);
        if (!loteOriginal) continue;
        
        if (edicao.quantidade !== undefined && edicao.quantidade === 0) {
          // Se quantidade = 0, excluir o lote
          const { error } = await supabase
            .from('compras_nf_itens')
            .delete()
            .eq('id', loteId);
          
          if (error) throw error;
          continue;
        }
        
        const updates: any = {};
        
        if (edicao.quantidade !== undefined) {
          updates.quantidade = edicao.quantidade;
        }
        
        if (edicao.dataValidade !== undefined) {
          updates.data_validade = edicao.dataValidade 
            ? format(edicao.dataValidade, 'yyyy-MM-dd')
            : null;
        }
        
        if (Object.keys(updates).length > 0) {
          const { error } = await supabase
            .from('compras_nf_itens')
            .update(updates)
            .eq('id', loteId);
          
          if (error) throw error;
        }
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao salvar lotes:', error);
      toast.error('Erro ao salvar alterações nos lotes');
      return false;
    }
  };

  const gerarProximoCodigo = (): string => {
    if (produtos.length === 0) {
      return "0000000000001";
    }
    
    const codigosNumericos = produtos
      .map(p => parseInt(p.codigo))
      .filter(n => !isNaN(n))
      .sort((a, b) => b - a);
    
    const maiorCodigo = codigosNumericos.length > 0 ? codigosNumericos[0] : 0;
    const proximoCodigo = maiorCodigo + 1;
    
    return proximoCodigo.toString().padStart(13, '0');
  };

  useEffect(() => {
    if (isDialogOpen && !produtoSelecionado) {
      setFormData(prev => ({
        ...prev,
        codigo: gerarProximoCodigo()
      }));
    }
  }, [isDialogOpen, produtoSelecionado]);

  const calcularValores = useMemo(() => {
    const precoCusto = parseFloat(formData.precoCusto) || 0;
    const margemLucro = parseFloat(formData.margemLucro) || 0;
    const imposto = parseFloat(formData.imposto) || 0;
    const taxaCartao = parseFloat(formData.taxaCartao) || 0;
    
    if (precoCusto <= 0) {
      return { valorVenda: 0, lucroUnitario: 0, margemCalculada: 0 };
    }
    
    // Calcular valor base considerando a margem de lucro
    // Fórmula: ValorBase = PrecoCusto / (1 - Margem%)
    let valorBase = precoCusto;
    if (margemLucro > 0 && margemLucro < 100) {
      valorBase = precoCusto / (1 - margemLucro / 100);
    }
    
    // Aplicar taxa de cartão e imposto sobre o valor base
    // Fórmula: ValorVenda = ValorBase × (1 + TaxaCartao%) × (1 + Imposto%)
    const fatorTaxaCartao = 1 + (taxaCartao / 100);
    const fatorImposto = 1 + (imposto / 100);
    const valorVenda = valorBase * fatorTaxaCartao * fatorImposto;
    
    // Calcular lucro unitário
    // Fórmula: LucroUnitario = ValorVenda - PrecoCusto - (ValorVenda × TaxaCartao%) - (ValorVenda × Imposto%)
    const custoTaxaCartao = valorVenda * (taxaCartao / 100);
    const custoImposto = valorVenda * (imposto / 100);
    const lucroUnitario = valorVenda - precoCusto - custoTaxaCartao - custoImposto;
    
    // Calcular margem efetiva
    const margemCalculada = margemLucro > 0 
      ? margemLucro 
      : (precoCusto > 0 ? ((valorVenda - precoCusto) / valorVenda) * 100 : 0);
    
    return { 
      valorVenda: parseFloat(valorVenda.toFixed(2)), 
      lucroUnitario: parseFloat(Math.max(0, lucroUnitario).toFixed(2)),
      margemCalculada: parseFloat(margemCalculada.toFixed(2))
    };
  }, [formData.precoCusto, formData.margemLucro, formData.imposto, formData.taxaCartao]);

  useEffect(() => {
    // Atualizar valor de venda automaticamente quando houver preço de custo
    // e qualquer taxa/margem for preenchida (ou apenas o preço de custo)
    if (formData.precoCusto && parseFloat(formData.precoCusto) > 0) {
      setFormData(prev => ({
        ...prev,
        valorVenda: calcularValores.valorVenda.toString()
      }));
    }
  }, [calcularValores.valorVenda, formData.precoCusto, formData.margemLucro, formData.imposto, formData.taxaCartao]);

  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.descricao.trim() || !formData.precoCusto || !formData.codigo || !formData.valorVenda) {
      toast.error("Favor preencher todos os campos obrigatórios!");
      return;
    }

    if (formData.codigo.length !== 13) {
      toast.error("O código deve ter exatamente 13 dígitos!");
      return;
    }

    if (!formData.estoqueMinimo || parseInt(formData.estoqueMinimo) < 0) {
      toast.error("Favor preencher o estoque mínimo (valor deve ser maior ou igual a 0)!");
      return;
    }

    // Salvar alterações nos lotes primeiro (se houver)
    if (produtoSelecionado && lotesEditados.size > 0) {
      const lotesOk = await salvarAlteracoesLotes();
      if (!lotesOk) return;
    }

    try {
      const produtoData: any = {
        nome: formData.descricao.trim(),
        preco_custo: parseFloat(formData.precoCusto),
        margem_lucro: parseFloat(formData.margemLucro) || 0,
        imposto: parseFloat(formData.imposto) || 0,
        taxa_cartao: parseFloat(formData.taxaCartao) || 0,
        codigo: formData.codigo,
        valor: parseFloat(formData.valorVenda),
        lucro_unitario: calcularValores.lucroUnitario,
        estoque_minimo: parseInt(formData.estoqueMinimo) || 0,
        user_id: user.id,
        // Campos fiscais
        ncm: formData.ncm || null,
        cfop: formData.cfop || null,
        unidade_medida: formData.unidadeMedida || 'UN',
        origem: formData.origem || '0',
      };

      if (produtoSelecionado) {
        const { error } = await supabase
          .from('produtos')
          .update(produtoData)
          .eq('id', produtoSelecionado.id);

        if (error) throw error;
        toast.success("Produto atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from('produtos')
          .insert([produtoData]);

        if (error) throw error;
        toast.success("Produto cadastrado com sucesso!");
      }

      handleDialogOpenChange(false);
      loadProdutos();
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      toast.error(error.message || "Erro ao salvar produto");
    }
  };

  const handleExcluir = async () => {
    if (!produtoSelecionado) return;

    try {
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', produtoSelecionado.id);

      if (error) throw error;

      toast.success("Produto excluído com sucesso!");
      setIsDeleteDialogOpen(false);
      setProdutoSelecionado(null);
      loadProdutos();
    } catch (error: any) {
      console.error('Erro ao excluir produto:', error);
      toast.error("Erro ao excluir produto");
    }
  };

  const abrirEdicao = async (produto: Produto) => {
    setProdutoSelecionado(produto);
    
    const historico = await buscarHistoricoCompras(produto.id);
    const variacao = calcularVariacaoPreco(historico);
    setVariacaoPreco(variacao);
    
    // Carregar lotes do produto e vendas em paralelo
    const [lotes, vendas] = await Promise.all([
      buscarLotesProduto(produto.id),
      buscarVendasProduto(produto.descricao)
    ]);
    
    setLotesProduto(lotes);
    setVendasProduto(vendas);
    setLotesEditados(new Map());
    
    const ultimoPrecoCusto = historico.length > 0 ? historico[0].valor_compra : produto.precoCusto;
    
    setFormData({
      descricao: produto.descricao,
      precoCusto: ultimoPrecoCusto.toString(),
      margemLucro: produto.margemLucro.toString(),
      imposto: produto.imposto.toString(),
      taxaCartao: produto.taxaCartao.toString(),
      codigo: produto.codigo,
      valorVenda: produto.valorVenda.toString(),
      estoqueMinimo: produto.estoqueMinimo.toString(),
      // Campos fiscais
      ncm: produto.ncm || "",
      cfop: produto.cfop || "",
      unidadeMedida: produto.unidadeMedida || "UN",
      origem: produto.origem || "0",
    });
    
    setIsDialogOpen(true);
  };

  const abrirHistorico = async (produto: Produto) => {
    setProdutoSelecionado(produto);
    const historico = await buscarHistoricoCompras(produto.id);
    setHistoricoCompras(historico);
    setIsHistoricoDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      descricao: "",
      precoCusto: "",
      margemLucro: "",
      imposto: "",
      taxaCartao: "2.33",
      codigo: "",
      valorVenda: "",
      estoqueMinimo: "0",
      ncm: "",
      cfop: "",
      unidadeMedida: "UN",
      origem: "0",
    });
    setProdutoSelecionado(null);
    setVariacaoPreco(null);
    setLotesProduto([]);
    setLotesEditados(new Map());
  };

  const atualizarPrecoVenda = () => {
    const precoCusto = parseFloat(formData.precoCusto) || 0;
    const margemLucro = parseFloat(formData.margemLucro) || 0;
    const imposto = parseFloat(formData.imposto) || 0;
    const taxaCartao = parseFloat(formData.taxaCartao) || 0;

    if (precoCusto <= 0 || margemLucro <= 0) {
      toast.error("Preço de custo e margem devem ser maiores que zero!");
      return;
    }

    const percentualTotal = (margemLucro + imposto + taxaCartao) / 100;
    const novoValorVenda = precoCusto / (1 - percentualTotal);

    setFormData(prev => ({
      ...prev,
      valorVenda: novoValorVenda.toFixed(2)
    }));

    toast.success("Preço de venda atualizado!");
  };

  const precoVendaEstaAtualizado = (
    precoCustoAtual: number,
    valorVendaAtual: number,
    margemLucro: number,
    imposto: number,
    taxaCartao: number
  ): boolean => {
    if (precoCustoAtual <= 0) return true;
    
    // Calcular qual deveria ser o preço de venda ideal
    const percentualTotal = (margemLucro + imposto + taxaCartao) / 100;
    const precoVendaIdeal = precoCustoAtual / (1 - percentualTotal);
    
    // Calcular diferença percentual
    const diferencaPercentual = Math.abs((valorVendaAtual - precoVendaIdeal) / precoVendaIdeal) * 100;
    
    // Considerar atualizado se diferença < 1%
    return diferencaPercentual < 1;
  };

  const VariacaoPrecoIndicador = ({ 
    produtoId, 
    produto 
  }: { 
    produtoId: string;
    produto: Produto;
  }) => {
    const [variacao, setVariacao] = useState<VariacaoPreco | null>(null);
    const [deveExibir, setDeveExibir] = useState(false);

    useEffect(() => {
      const buscarVariacao = async () => {
        const historico = await buscarHistoricoCompras(produtoId);
        const variacaoCalculada = calcularVariacaoPreco(historico);
        setVariacao(variacaoCalculada);
        
        if (variacaoCalculada && variacaoCalculada.tipo !== 'igual') {
          const atualizado = precoVendaEstaAtualizado(
            variacaoCalculada.valorAtual,
            produto.valorVenda,
            produto.margemLucro,
            produto.imposto,
            produto.taxaCartao
          );
          setDeveExibir(!atualizado);
        } else {
          setDeveExibir(false);
        }
      };
      buscarVariacao();
    }, [produtoId, produto]);

    if (!variacao || !deveExibir) return null;

    return (
      <div className="inline-flex items-center">
        {variacao.tipo === 'aumento' ? (
          <TrendingUp className="h-3 w-3 text-destructive" />
        ) : (
          <TrendingDown className="h-3 w-3 text-green-600" />
        )}
      </div>
    );
  };

  const produtosFiltrados = produtos.filter(produto => {
    const nomeMatch = produto.descricao.toLowerCase().includes(filtros.nome.toLowerCase());
    const codigoMatch = produto.codigo.includes(filtros.codigo);
    return nomeMatch && codigoMatch;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p>Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cadastro de Produtos</h1>
          <p className="text-sm text-muted-foreground">Gerencie seus produtos</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
            className="gap-2"
          >
            <Filter className="h-4 w-4" />
            {mostrarFiltros ? 'Ocultar Filtros' : 'Mostrar Filtros'}
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-base">
                  {produtoSelecionado ? "Editar Produto" : "Novo Produto"}
                </DialogTitle>
                <DialogDescription className="text-xs">
                  {produtoSelecionado 
                    ? "Atualize os dados do produto" 
                    : "Preencha os dados do novo produto"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="space-y-0.5">
                  <Label className="text-[10px] font-semibold">Descrição do Produto *</Label>
                  <Input
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Ex: Shampoo Premium 500ml"
                    className="h-8 text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-semibold">Preço de Custo *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.precoCusto}
                      onChange={(e) => setFormData({ ...formData, precoCusto: e.target.value })}
                      placeholder="0.00"
                      className="h-8 text-xs"
                    />
                    {variacaoPreco && 
                     variacaoPreco.tipo !== 'igual' && 
                     !precoVendaEstaAtualizado(
                       parseFloat(formData.precoCusto) || 0,
                       parseFloat(formData.valorVenda) || 0,
                       parseFloat(formData.margemLucro) || 0,
                       parseFloat(formData.imposto) || 0,
                       parseFloat(formData.taxaCartao) || 0
                     ) && (
                      <p className={`text-[11px] ${variacaoPreco.tipo === 'aumento' ? 'text-destructive' : 'text-green-600'}`}>
                        {variacaoPreco.tipo === 'aumento' ? (
                          <>O preço de compra desse produto subiu de {formatCurrency(variacaoPreco.valorAnterior)} para {formatCurrency(variacaoPreco.valorAtual)}, o que representa uma alta de {variacaoPreco.percentual.toFixed(2)}%.</>
                        ) : (
                          <>O preço de compra desse produto diminuiu de {formatCurrency(variacaoPreco.valorAnterior)} para {formatCurrency(variacaoPreco.valorAtual)}, o que representa uma redução de {variacaoPreco.percentual.toFixed(2)}%.</>
                        )}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-semibold">Código (13 dígitos) *</Label>
                    <Input
                      type="text"
                      maxLength={13}
                      value={formData.codigo}
                      onChange={(e) => {
                        const valor = e.target.value.replace(/\D/g, '');
                        setFormData({ ...formData, codigo: valor });
                      }}
                      placeholder="0000000000001"
                      className="h-8 text-xs"
                    />
                    {formData.codigo.length > 0 && formData.codigo.length !== 13 && (
                      <p className="text-[9px] text-destructive">O código deve ter exatamente 13 dígitos</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-semibold">Margem de Lucro (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.margemLucro}
                      onChange={(e) => setFormData({ ...formData, margemLucro: e.target.value })}
                      placeholder="0.00"
                      className="h-8 text-xs"
                    />
                    {calcularValores.margemCalculada > 0 && !formData.margemLucro && (
                      <p className="text-[9px] text-muted-foreground">
                        Calculado: {calcularValores.margemCalculada.toFixed(2)}%
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-semibold">Imposto (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.imposto}
                      onChange={(e) => setFormData({ ...formData, imposto: e.target.value })}
                      placeholder="0.00"
                      className="h-8 text-xs"
                    />
                  </div>
                  
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-semibold">Taxa de Cartão (%)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.taxaCartao}
                      onChange={(e) => setFormData({ ...formData, taxaCartao: e.target.value })}
                      placeholder="2.33"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-semibold">Valor de Venda *</Label>
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={formData.valorVenda}
                          onChange={(e) => setFormData({ ...formData, valorVenda: e.target.value })}
                          placeholder="0.00"
                          className="h-8 text-xs"
                        />
                        {variacaoPreco && 
                         variacaoPreco.tipo !== 'igual' && 
                         produtoSelecionado &&
                         !precoVendaEstaAtualizado(
                           parseFloat(formData.precoCusto) || 0,
                           parseFloat(formData.valorVenda) || 0,
                           parseFloat(formData.margemLucro) || 0,
                           parseFloat(formData.imposto) || 0,
                           parseFloat(formData.taxaCartao) || 0
                         ) && (
                          <div className="absolute right-2 top-1/2 -translate-y-1/2">
                            {variacaoPreco.tipo === 'aumento' ? (
                              <TrendingUp className="h-4 w-4 text-destructive" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        )}
                      </div>
                      {produtoSelecionado && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={atualizarPrecoVenda}
                          className="h-8 text-xs whitespace-nowrap"
                        >
                          Atualizar preço de venda
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    <Label className="text-[10px] font-semibold">Estoque Mínimo *</Label>
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={formData.estoqueMinimo}
                      onChange={(e) => {
                        const valor = e.target.value.replace(/\D/g, '');
                        setFormData({ ...formData, estoqueMinimo: valor });
                      }}
                      placeholder="0"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                {/* Campos Fiscais */}
                <div className="border-t pt-3 mt-3">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-2">Informações Fiscais (Opcional)</p>
                  <div className="grid grid-cols-4 gap-2">
                    <div className="space-y-0.5">
                      <Label className="text-[10px] font-semibold">NCM</Label>
                      <Input
                        value={formData.ncm}
                        onChange={(e) => setFormData({ ...formData, ncm: e.target.value.replace(/\D/g, '').slice(0, 8) })}
                        placeholder="8 dígitos"
                        maxLength={8}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px] font-semibold">CFOP</Label>
                      <Input
                        value={formData.cfop}
                        onChange={(e) => setFormData({ ...formData, cfop: e.target.value.replace(/\D/g, '').slice(0, 4) })}
                        placeholder="Ex: 5102"
                        maxLength={4}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px] font-semibold">Unidade</Label>
                      <Select
                        value={formData.unidadeMedida}
                        onValueChange={(value) => setFormData({ ...formData, unidadeMedida: value })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {UNIDADES_MEDIDA.map((un) => (
                            <SelectItem key={un.value} value={un.value}>{un.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-0.5">
                      <Label className="text-[10px] font-semibold">Origem</Label>
                      <Select
                        value={formData.origem}
                        onValueChange={(value) => setFormData({ ...formData, origem: value })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ORIGENS_PRODUTO.map((or) => (
                            <SelectItem key={or.value} value={or.value}>{or.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {produtoSelecionado && (
                  <div className="col-span-2 space-y-2">
                    <Label className="text-[10px] font-semibold">Controle de Estoque por Lote</Label>
                    
                    {loadingLotes ? (
                      <div className="flex items-center justify-center py-4">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                      </div>
                    ) : lotesProduto.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground text-xs border rounded-md bg-muted/30">
                        Nenhum lote registrado para este produto
                      </div>
                    ) : (
                      <div className="border rounded-md overflow-hidden">
                        <table className="w-full">
                          <thead className="bg-muted/50">
                            <tr>
                              <th className="text-left py-1.5 px-2 text-[10px] font-semibold">Data de Validade</th>
                              <th className="text-center py-1.5 px-2 text-[10px] font-semibold">Quantidade</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lotesProduto.map((lote) => {
                              const edicao = lotesEditados.get(lote.id);
                              const quantidadeAtual = edicao?.quantidade !== undefined ? edicao.quantidade : lote.quantidade;
                              const dataAtual = edicao?.dataValidade !== undefined ? edicao.dataValidade : lote.dataValidade;
                              
                              return (
                                <tr key={lote.id} className="border-t">
                                  <td className="py-1 px-2">
                                    <Input
                                      type="date"
                                      value={dataAtual ? format(dataAtual, 'yyyy-MM-dd') : ''}
                                      onChange={(e) => {
                                        const novaData = e.target.value ? new Date(e.target.value) : null;
                                        handleLoteChange(lote.id, 'dataValidade', novaData);
                                      }}
                                      className="h-7 text-xs"
                                    />
                                  </td>
                                  <td className="py-1 px-2">
                                    <Input
                                      type="number"
                                      min="0"
                                      value={quantidadeAtual}
                                      onChange={(e) => {
                                        handleLoteChange(lote.id, 'quantidade', Number(e.target.value));
                                      }}
                                      className="h-7 text-xs text-center"
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    
                    <p className="text-[10px] text-muted-foreground">
                      Edite diretamente a data ou quantidade de cada lote. Quantidade 0 remove o lote.
                    </p>
                  </div>
                )}

                <div className="bg-secondary/30 p-2 rounded-md border">
                  <p className="text-xs font-semibold text-center">
                    O valor do Lucro Unitário será de{" "}
                    <span className="text-primary">
                      {formatCurrency(calcularValores.lucroUnitario)}
                    </span>
                  </p>
                </div>

                <div className="flex justify-between items-center gap-2 pt-2 border-t mt-2">
                  {produtoSelecionado && (
                    <p className="text-xs font-semibold">
                      Estoque total de{" "}
                      <span className="text-primary">{calcularEstoqueTotalLotes}</span>
                      {" "}unidades
                    </p>
                  )}
                  <div className="flex gap-2 ml-auto">
                    <Button type="button" variant="outline" onClick={resetForm} className="h-7 text-xs">
                      Cancelar
                    </Button>
                    <Button type="submit" className="h-7 text-xs">
                      {produtoSelecionado ? "Atualizar" : "Salvar Produto"}
                    </Button>
                  </div>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {mostrarFiltros && (
        <Card>
          <CardHeader className="py-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="h-3 w-3" />
                Filtros
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setMostrarFiltros(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Pesquisar pelo Nome do Produto</Label>
                <Input
                  value={filtros.nome}
                  onChange={(e) => setFiltros({ ...filtros, nome: e.target.value })}
                  placeholder="Digite o nome..."
                  className="h-7 text-xs"
                />
              </div>
              
              <div className="space-y-0.5">
                <Label className="text-[10px] font-semibold">Pesquisar pelo Código do Produto</Label>
                <Input
                  value={filtros.codigo}
                  onChange={(e) => setFiltros({ ...filtros, codigo: e.target.value })}
                  placeholder="Digite o código..."
                  className="h-7 text-xs"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => setFiltros({ nome: "", codigo: "" })}
                className="h-7 text-xs gap-2"
              >
                <X className="h-3 w-3" />
                Limpar Filtros
              </Button>
              <Button 
                onClick={() => setMostrarFiltros(false)} 
                className="h-7 text-xs gap-2"
              >
                <Filter className="h-3 w-3" />
                Aplicar Filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-base">Lista de Produtos</CardTitle>
          <CardDescription className="text-xs">
            Total: {produtosFiltrados.length} produtos cadastrados
          </CardDescription>
        </CardHeader>
        <CardContent className="py-3">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-semibold text-xs">Descrição</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Preço de Custo</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Margem (%)</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Imposto (%)</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Taxa Cartão (%)</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Código</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Valor de Venda</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Estoque</th>
                  <th className="text-right py-2 px-2 font-semibold text-xs">Ações</th>
                </tr>
              </thead>
              <tbody>
                {produtosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                      Nenhum produto cadastrado
                    </td>
                  </tr>
                ) : (
                  produtosFiltrados.map((produto) => (
                    <tr 
                      key={produto.id} 
                      className="border-b hover:bg-secondary/50 transition-colors cursor-pointer"
                      onClick={() => abrirEdicao(produto)}
                    >
                      <td className="py-2 px-2 text-xs font-medium">{produto.descricao}</td>
                      <td className="py-2 px-2 text-xs">{formatCurrency(produto.precoCusto)}</td>
                      <td className="py-2 px-2 text-xs">{produto.margemLucro.toFixed(2)}%</td>
                      <td className="py-2 px-2 text-xs">{produto.imposto.toFixed(2)}%</td>
                      <td className="py-2 px-2 text-xs">{produto.taxaCartao.toFixed(2)}%</td>
                      <td className="py-2 px-2 text-xs font-mono">{produto.codigo}</td>
                      <td className="py-2 px-2 text-xs font-semibold">
                        <div className="flex items-center gap-1">
                          {formatCurrency(produto.valorVenda)}
                          <VariacaoPrecoIndicador produtoId={produto.id} produto={produto} />
                        </div>
                      </td>
                      <td className="py-2 px-2 text-xs">
                        <span className={produto.estoqueAtual && produto.estoqueAtual < produto.estoqueMinimo ? 'text-destructive font-bold' : ''}>
                          {produto.estoqueAtual || 0}
                        </span>
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => abrirHistorico(produto)} 
                            className="h-6 w-6 p-0"
                            title="Histórico de Compras"
                          >
                            <History className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => abrirEdicao(produto)} 
                            className="h-6 w-6 p-0"
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button 
                            size="sm" 
                            variant="ghost" 
                            onClick={() => {
                              setProdutoSelecionado(produto);
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

      <Dialog open={isHistoricoDialogOpen} onOpenChange={setIsHistoricoDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-base">Histórico de Compras</DialogTitle>
            <DialogDescription className="text-xs">
              {produtoSelecionado?.descricao}
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-2 font-semibold text-xs">Data da Compra</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Preço de Compra</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">Fornecedor</th>
                  <th className="text-left py-2 px-2 font-semibold text-xs">N° NF</th>
                </tr>
              </thead>
              <tbody>
                {historicoCompras.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-muted-foreground text-xs">
                      Nenhuma compra registrada para este produto
                    </td>
                  </tr>
                ) : (
                  historicoCompras.map((compra, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="py-2 px-2 text-xs">
                        {new Date(compra.data_compra).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-2 px-2 text-xs font-semibold">
                        {formatCurrency(compra.valor_compra)}
                      </td>
                      <td className="py-2 px-2 text-xs">{compra.fornecedor_nome}</td>
                      <td className="py-2 px-2 text-xs font-mono text-[10px]">
                        {compra.chave_nf}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>Tem certeza que deseja excluir o produto <strong>{produtoSelecionado?.descricao}</strong>?</p>
              {produtoSelecionado && (
                <div className="text-xs space-y-1 bg-secondary/30 p-2 rounded">
                  <p><strong>Código:</strong> {produtoSelecionado.codigo}</p>
                  <p><strong>Valor:</strong> {formatCurrency(produtoSelecionado.valorVenda)}</p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleExcluir} className="bg-destructive hover:bg-destructive/90">
              Sim, Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Produtos;
