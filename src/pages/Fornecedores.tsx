import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Pencil, Trash2, Eye, Search, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

interface Fornecedor {
  id: string;
  nome_fornecedor: string;
  cnpj_cpf: string;
  nome_fantasia?: string;
  tipo_fornecedor: string;
  whatsapp?: string;
  telefone?: string;
  email?: string;
  site?: string;
  cep?: string;
  rua?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  forma_pagamento?: string;
  condicao_pagamento?: string;
  banco?: string;
  chave_pix?: string;
  nome_titular?: string;
}

interface Produto {
  id: string;
  nome: string;
  codigo: string;
  preco_custo: number;
  data_ultima_compra?: string;
}

const TIPOS_FORNECEDOR = ["Produtos", "Serviços", "Produtos e Serviços", "Outros"];
const FORMAS_PAGAMENTO = ["Pix", "Boleto", "Transferência", "Cartão", "Dinheiro"];
const CONDICOES_PAGAMENTO = [
  "7 dias",
  "14 dias",
  "15 dias",
  "15/30",
  "28 dias",
  "30 dias",
  "28/56",
  "30/60",
  "30/60/90",
];
const ESTADOS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

const Fornecedores = () => {
  const { user, ownerId } = useAuth();
  const { toast } = useToast();
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [filterCidade, setFilterCidade] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingFornecedor, setViewingFornecedor] = useState<Fornecedor | null>(null);
  const [produtosFornecedor, setProdutosFornecedor] = useState<Produto[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    nome_fornecedor: "",
    cnpj_cpf: "",
    nome_fantasia: "",
    tipo_fornecedor: "",
    whatsapp: "",
    telefone: "",
    email: "",
    site: "",
    cep: "",
    rua: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    estado: "",
    forma_pagamento: "",
    condicao_pagamento: "",
    banco: "",
    chave_pix: "",
    nome_titular: "",
  });

  useEffect(() => {
    if (user) {
      fetchFornecedores();
    }
  }, [user]);

  const fetchFornecedores = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("fornecedores")
        .select("*")
        .eq("user_id", ownerId)
        .order("nome_fornecedor");

      if (error) throw error;
      setFornecedores(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar fornecedores",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProdutosFornecedor = async (fornecedorId: string) => {
    try {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, codigo, preco_custo, data_ultima_compra")
        .eq("fornecedor_id", fornecedorId)
        .order("data_ultima_compra", { ascending: false, nullsFirst: false });

      if (error) throw error;
      setProdutosFornecedor(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar produtos",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.nome_fornecedor || !formData.cnpj_cpf || !formData.tipo_fornecedor) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, CNPJ/CPF e tipo do fornecedor.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from("fornecedores")
          .update({ ...formData, updated_at: new Date().toISOString() })
          .eq("id", editingId)
          .eq("user_id", ownerId);

        if (error) throw error;
        toast({
          title: "Fornecedor atualizado",
          description: "As alterações foram salvas com sucesso.",
        });
      } else {
        const { error } = await supabase.from("fornecedores").insert([{ ...formData, user_id: ownerId }]);

        if (error) {
          if (error.code === "23505") {
            toast({
              title: "CNPJ/CPF duplicado",
              description: "Já existe um fornecedor com este CNPJ/CPF.",
              variant: "destructive",
            });
            return;
          }
          throw error;
        }
        toast({
          title: "Fornecedor cadastrado",
          description: "Fornecedor adicionado com sucesso.",
        });
      }

      resetForm();
      fetchFornecedores();
      setFormDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar fornecedor",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      nome_fornecedor: "",
      cnpj_cpf: "",
      nome_fantasia: "",
      tipo_fornecedor: "",
      whatsapp: "",
      telefone: "",
      email: "",
      site: "",
      cep: "",
      rua: "",
      numero: "",
      complemento: "",
      bairro: "",
      cidade: "",
      estado: "",
      forma_pagamento: "",
      condicao_pagamento: "",
      banco: "",
      chave_pix: "",
      nome_titular: "",
    });
    setEditingId(null);
    setFormDialogOpen(false);
  };

  const handleEdit = (fornecedor: Fornecedor) => {
    setFormData({
      nome_fornecedor: fornecedor.nome_fornecedor,
      cnpj_cpf: fornecedor.cnpj_cpf,
      nome_fantasia: fornecedor.nome_fantasia || "",
      tipo_fornecedor: fornecedor.tipo_fornecedor,
      whatsapp: fornecedor.whatsapp || "",
      telefone: fornecedor.telefone || "",
      email: fornecedor.email || "",
      site: fornecedor.site || "",
      cep: fornecedor.cep || "",
      rua: fornecedor.rua || "",
      numero: fornecedor.numero || "",
      complemento: fornecedor.complemento || "",
      bairro: fornecedor.bairro || "",
      cidade: fornecedor.cidade || "",
      estado: fornecedor.estado || "",
      forma_pagamento: fornecedor.forma_pagamento || "",
      condicao_pagamento: fornecedor.condicao_pagamento || "",
      banco: fornecedor.banco || "",
      chave_pix: fornecedor.chave_pix || "",
      nome_titular: fornecedor.nome_titular || "",
    });
    setEditingId(fornecedor.id);
    setFormDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este fornecedor?")) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("fornecedores").delete().eq("id", id).eq("user_id", user!.id);

      if (error) throw error;

      toast({
        title: "Fornecedor excluído",
        description: "Fornecedor removido com sucesso.",
      });
      fetchFornecedores();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir fornecedor",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleView = async (fornecedor: Fornecedor) => {
    setViewingFornecedor(fornecedor);
    await fetchProdutosFornecedor(fornecedor.id);
    setDialogOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date?: string) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const maskCNPJCPF = (value: string) => {
    value = value.replace(/\D/g, "");
    if (value.length <= 11) {
      return value.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    } else {
      return value.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
    }
  };

  const maskPhone = (value: string) => {
    value = value.replace(/\D/g, "");
    return value.replace(/(\d{2})(\d{4,5})(\d{4})/, "($1) $2-$3");
  };

  const maskCEP = (value: string) => {
    value = value.replace(/\D/g, "");
    return value.replace(/(\d{5})(\d{3})/, "$1-$2");
  };

  const filteredFornecedores = fornecedores.filter((f) => {
    const matchSearch =
      f.nome_fornecedor.toLowerCase().includes(searchTerm.toLowerCase()) || f.cnpj_cpf.includes(searchTerm);
    const matchTipo = filterTipo === "all" || f.tipo_fornecedor === filterTipo;
    const matchCidade = filterCidade === "all" || f.cidade === filterCidade;
    return matchSearch && matchTipo && matchCidade;
  });

  const cidades = Array.from(new Set(fornecedores.map((f) => f.cidade).filter(Boolean)));

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Cadastro de Fornecedores</h1>
        <Dialog open={formDialogOpen} onOpenChange={setFormDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setFormDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Fornecedor
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Fornecedor" : "Novo Fornecedor"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Informações do Fornecedor</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nome_fornecedor">Nome do Fornecedor *</Label>
                    <Input
                      id="nome_fornecedor"
                      value={formData.nome_fornecedor}
                      onChange={(e) => setFormData({ ...formData, nome_fornecedor: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cnpj_cpf">CNPJ/CPF *</Label>
                    <Input
                      id="cnpj_cpf"
                      value={formData.cnpj_cpf}
                      onChange={(e) => setFormData({ ...formData, cnpj_cpf: maskCNPJCPF(e.target.value) })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="nome_fantasia">Nome Fantasia</Label>
                    <Input
                      id="nome_fantasia"
                      value={formData.nome_fantasia}
                      onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tipo_fornecedor">Tipo do Fornecedor *</Label>
                    <Select
                      value={formData.tipo_fornecedor}
                      onValueChange={(value) => setFormData({ ...formData, tipo_fornecedor: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_FORNECEDOR.map((tipo) => (
                          <SelectItem key={tipo} value={tipo}>
                            {tipo}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input
                      id="whatsapp"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: maskPhone(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: maskPhone(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="site">Site</Label>
                    <Input
                      id="site"
                      value={formData.site}
                      onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cep">CEP</Label>
                    <Input
                      id="cep"
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: maskCEP(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="rua">Logradouro</Label>
                    <Input
                      id="rua"
                      value={formData.rua}
                      onChange={(e) => setFormData({ ...formData, rua: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="numero">Número</Label>
                    <Input
                      id="numero"
                      value={formData.numero}
                      onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="complemento">Complemento</Label>
                    <Input
                      id="complemento"
                      value={formData.complemento}
                      onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="bairro">Bairro</Label>
                    <Input
                      id="bairro"
                      value={formData.bairro}
                      onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cidade">Cidade</Label>
                    <Input
                      id="cidade"
                      value={formData.cidade}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="estado">Estado</Label>
                    <Select value={formData.estado} onValueChange={(value) => setFormData({ ...formData, estado: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {ESTADOS.map((estado) => (
                          <SelectItem key={estado} value={estado}>
                            {estado}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Dados Financeiros</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="forma_pagamento">Forma de Pagamento</Label>
                    <Select
                      value={formData.forma_pagamento}
                      onValueChange={(value) => setFormData({ ...formData, forma_pagamento: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {FORMAS_PAGAMENTO.map((forma) => (
                          <SelectItem key={forma} value={forma}>
                            {forma}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="condicao_pagamento">Condição de Pagamento</Label>
                    <Select
                      value={formData.condicao_pagamento}
                      onValueChange={(value) => setFormData({ ...formData, condicao_pagamento: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {CONDICOES_PAGAMENTO.map((condicao) => (
                          <SelectItem key={condicao} value={condicao}>
                            {condicao}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="banco">Banco</Label>
                    <Input
                      id="banco"
                      value={formData.banco}
                      onChange={(e) => setFormData({ ...formData, banco: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="chave_pix">Chave Pix</Label>
                    <Input
                      id="chave_pix"
                      value={formData.chave_pix}
                      onChange={(e) => setFormData({ ...formData, chave_pix: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="nome_titular">Nome do Titular</Label>
                    <Input
                      id="nome_titular"
                      value={formData.nome_titular}
                      onChange={(e) => setFormData({ ...formData, nome_titular: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setFormDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? "Salvando..." : editingId ? "Salvar Alterações" : "Cadastrar"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fornecedores Cadastrados</CardTitle>
          <div className="flex flex-col md:flex-row gap-4 mt-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou CNPJ/CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrar por tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {TIPOS_FORNECEDOR.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>
                    {tipo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCidade} onValueChange={setFilterCidade}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Filtrar por cidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as cidades</SelectItem>
                {cidades.map((cidade) => (
                  <SelectItem key={cidade} value={cidade!}>
                    {cidade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Carregando...</p>
          ) : filteredFornecedores.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">Nenhum fornecedor encontrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ/CPF</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Cidade/Estado</TableHead>
                    <TableHead>Forma de Pagamento</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFornecedores.map((fornecedor) => (
                    <TableRow key={fornecedor.id}>
                      <TableCell className="font-medium">{fornecedor.nome_fornecedor}</TableCell>
                      <TableCell>{fornecedor.cnpj_cpf}</TableCell>
                      <TableCell>{fornecedor.tipo_fornecedor}</TableCell>
                      <TableCell>{fornecedor.telefone || "-"}</TableCell>
                      <TableCell>
                        {fornecedor.cidade && fornecedor.estado ? `${fornecedor.cidade}/${fornecedor.estado}` : "-"}
                      </TableCell>
                      <TableCell>{fornecedor.forma_pagamento || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleView(fornecedor)} title="Visualizar">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(fornecedor)} title="Editar">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(fornecedor.id)}
                            title="Excluir"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Fornecedor</DialogTitle>
          </DialogHeader>
          {viewingFornecedor && (
            <div className="space-y-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Informações Gerais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Nome do Fornecedor</Label>
                    <p className="font-medium">{viewingFornecedor.nome_fornecedor}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Nome Fantasia</Label>
                    <p className="font-medium">{viewingFornecedor.nome_fantasia || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Tipo</Label>
                    <p className="font-medium">{viewingFornecedor.tipo_fornecedor}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">CNPJ/CPF</Label>
                    <p className="font-medium">{viewingFornecedor.cnpj_cpf}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Telefone</Label>
                    <p className="font-medium">{viewingFornecedor.telefone || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">E-mail</Label>
                    <p className="font-medium">{viewingFornecedor.email || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Site</Label>
                    <p className="font-medium">{viewingFornecedor.site || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Endereço Completo</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">CEP</Label>
                    <p className="font-medium">{viewingFornecedor.cep || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Rua</Label>
                    <p className="font-medium">{viewingFornecedor.rua || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Número</Label>
                    <p className="font-medium">{viewingFornecedor.numero || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Complemento</Label>
                    <p className="font-medium">{viewingFornecedor.complemento || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Bairro</Label>
                    <p className="font-medium">{viewingFornecedor.bairro || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Cidade</Label>
                    <p className="font-medium">{viewingFornecedor.cidade || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Estado</Label>
                    <p className="font-medium">{viewingFornecedor.estado || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Financeiro</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Forma de Pagamento</Label>
                    <p className="font-medium">{viewingFornecedor.forma_pagamento || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Condição de Pagamento</Label>
                    <p className="font-medium">{viewingFornecedor.condicao_pagamento || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Banco</Label>
                    <p className="font-medium">{viewingFornecedor.banco || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Chave Pix</Label>
                    <p className="font-medium">{viewingFornecedor.chave_pix || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Nome do Titular</Label>
                    <p className="font-medium">{viewingFornecedor.nome_titular || "-"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">Produtos Comprados</h3>
                {produtosFornecedor.length === 0 ? (
                  <p className="text-center py-4 text-muted-foreground">
                    Nenhum produto encontrado para este fornecedor.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descrição do Produto</TableHead>
                        <TableHead>Código</TableHead>
                        <TableHead>Preço de Custo</TableHead>
                        <TableHead>Data Última Compra</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {produtosFornecedor.map((produto) => (
                        <TableRow key={produto.id}>
                          <TableCell>{produto.nome}</TableCell>
                          <TableCell>{produto.codigo}</TableCell>
                          <TableCell>{formatCurrency(produto.preco_custo)}</TableCell>
                          <TableCell>{formatDate(produto.data_ultima_compra)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Fornecedores;
