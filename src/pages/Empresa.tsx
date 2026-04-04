import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SubscriptionInfoCard } from "@/components/SubscriptionInfoCard";
import { WhatsAppIntegration } from "@/components/empresa/WhatsAppIntegration";
import { Search, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { ConfigurarComissoes } from "@/components/empresa/ConfigurarComissoes";
import { 
  formatCNPJ, 
  formatCEP, 
  validarCNPJ, 
  buscarCEP, 
  UF_BRASIL, 
  REGIMES_TRIBUTARIOS,
  unformatDocument
} from "@/utils/fiscalUtils";

interface DiasSemana {
  segunda: boolean;
  terca: boolean;
  quarta: boolean;
  quinta: boolean;
  sexta: boolean;
  sabado: boolean;
  domingo: boolean;
}

interface EmpresaConfig {
  id?: string;
  bordao: string;
  horarioInicio: string;
  horarioFim: string;
  metaFaturamentoMensal: number;
  diasFuncionamento: DiasSemana;
  // Dados Fiscais
  cnpj: string;
  razaoSocial: string;
  inscricaoEstadual: string;
  inscricaoMunicipal: string;
  regimeTributario: string;
  cepFiscal: string;
  logradouroFiscal: string;
  numeroEnderecoFiscal: string;
  complementoFiscal: string;
  bairroFiscal: string;
  cidadeFiscal: string;
  codigoIbgeCidade: string;
  ufFiscal: string;
  emailFiscal: string;
  codigoCnae: string;
  ambienteFiscal: string;
}

interface Groomer {
  id: string;
  nome: string;
}

const Empresa = () => {
  const { user, ownerId, isAdministrador } = useAuth();
  const [formData, setFormData] = useState<EmpresaConfig>({
    bordao: "",
    horarioInicio: "",
    horarioFim: "",
    metaFaturamentoMensal: 10000,
    diasFuncionamento: {
      segunda: true,
      terca: true,
      quarta: true,
      quinta: true,
      sexta: true,
      sabado: false,
      domingo: false,
    },
    // Dados Fiscais
    cnpj: "",
    razaoSocial: "",
    inscricaoEstadual: "",
    inscricaoMunicipal: "",
    regimeTributario: "",
    cepFiscal: "",
    logradouroFiscal: "",
    numeroEnderecoFiscal: "",
    complementoFiscal: "",
    bairroFiscal: "",
    cidadeFiscal: "",
    codigoIbgeCidade: "",
    ufFiscal: "",
    emailFiscal: "",
    codigoCnae: "",
    ambienteFiscal: "homologacao",
  });
  const [groomers, setGroomers] = useState<Groomer[]>([]);
  const [novoGroomer, setNovoGroomer] = useState("");
  const [editandoGroomer, setEditandoGroomer] = useState<Groomer | null>(null);
  const [loading, setLoading] = useState(true);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [crecheAtiva, setCrecheAtiva] = useState(false);
  const [salvandoCreche, setSalvandoCreche] = useState(false);
  const [horarioCheckinCreche, setHorarioCheckinCreche] = useState("");
  const [horarioCheckoutCreche, setHorarioCheckoutCreche] = useState("");

  // Fetch empresa config from Supabase
  useEffect(() => {
    if (!user) return;
    
    const fetchEmpresa = async () => {
      const { data, error } = await supabase
        .from('empresa_config')
        .select('*')
        .eq('user_id', ownerId)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching empresa:', error);
      } else if (data) {
        const empresaData = data as any;
        setFormData({
          id: empresaData.id,
          bordao: empresaData.bordao || '',
          horarioInicio: empresaData.horario_inicio || '',
          horarioFim: empresaData.horario_fim || '',
          metaFaturamentoMensal: empresaData.meta_faturamento_mensal || 10000,
          diasFuncionamento: empresaData.dias_funcionamento || {
            segunda: true,
            terca: true,
            quarta: true,
            quinta: true,
            sexta: true,
            sabado: false,
            domingo: false,
          },
          // Dados Fiscais
          cnpj: empresaData.cnpj || '',
          razaoSocial: empresaData.razao_social || '',
          inscricaoEstadual: empresaData.inscricao_estadual || '',
          inscricaoMunicipal: empresaData.inscricao_municipal || '',
          regimeTributario: empresaData.regime_tributario || '',
          cepFiscal: empresaData.cep_fiscal || '',
          logradouroFiscal: empresaData.logradouro_fiscal || '',
          numeroEnderecoFiscal: empresaData.numero_endereco_fiscal || '',
          complementoFiscal: empresaData.complemento_fiscal || '',
          bairroFiscal: empresaData.bairro_fiscal || '',
          cidadeFiscal: empresaData.cidade_fiscal || '',
          codigoIbgeCidade: empresaData.codigo_ibge_cidade || '',
          ufFiscal: empresaData.uf_fiscal || '',
          emailFiscal: empresaData.email_fiscal || '',
          codigoCnae: empresaData.codigo_cnae || '',
          ambienteFiscal: empresaData.ambiente_fiscal || 'homologacao',
        });
        setCrecheAtiva(empresaData.creche_ativa ?? false);
        setHorarioCheckinCreche(empresaData.horario_checkin_creche || "");
        setHorarioCheckoutCreche(empresaData.horario_checkout_creche || "");
      }
      setLoading(false);
    };
    
    fetchEmpresa();
  }, [user]);

  // Fetch groomers from Supabase
  useEffect(() => {
    if (!user) return;
    
    const fetchGroomers = async () => {
      const { data, error } = await (supabase as any)
        .from('groomers')
        .select('id, nome')
        .eq('user_id', ownerId);
        
      if (error) {
        console.error('Error fetching groomers:', error);
      } else if (data) {
        const groomersData: Groomer[] = data.map((g: any) => ({
          id: g.id,
          nome: g.nome
        }));
        setGroomers(groomersData);
      }
    };
    
    fetchGroomers();
  }, [user]);

  const handleBuscarCep = async () => {
    if (!formData.cepFiscal || formData.cepFiscal.replace(/\D/g, '').length !== 8) {
      toast.error("CEP inválido. Informe 8 dígitos.");
      return;
    }

    setBuscandoCep(true);
    const resultado = await buscarCEP(formData.cepFiscal);
    setBuscandoCep(false);

    if (resultado) {
      setFormData({
        ...formData,
        logradouroFiscal: resultado.logradouro,
        bairroFiscal: resultado.bairro,
        cidadeFiscal: resultado.localidade,
        ufFiscal: resultado.uf,
        codigoIbgeCidade: resultado.ibge,
        complementoFiscal: resultado.complemento || formData.complementoFiscal,
      });
      toast.success("Endereço preenchido automaticamente!");
    } else {
      toast.error("CEP não encontrado.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }
    
    // Validar bordão (máximo 50 caracteres)
    if (formData.bordao.length > 50) {
      toast.error("Bordão da empresa deve ter no máximo 50 caracteres");
      return;
    }

    const updateData: any = {
      bordao: formData.bordao,
      horario_inicio: formData.horarioInicio,
      horario_fim: formData.horarioFim,
      meta_faturamento_mensal: formData.metaFaturamentoMensal,
      dias_funcionamento: formData.diasFuncionamento as any,
      // Dados Fiscais
      cnpj: unformatDocument(formData.cnpj),
      razao_social: formData.razaoSocial,
      inscricao_estadual: formData.inscricaoEstadual,
      inscricao_municipal: formData.inscricaoMunicipal,
      regime_tributario: formData.regimeTributario,
      cep_fiscal: unformatDocument(formData.cepFiscal),
      logradouro_fiscal: formData.logradouroFiscal,
      numero_endereco_fiscal: formData.numeroEnderecoFiscal,
      complemento_fiscal: formData.complementoFiscal,
      bairro_fiscal: formData.bairroFiscal,
      cidade_fiscal: formData.cidadeFiscal,
      codigo_ibge_cidade: formData.codigoIbgeCidade,
      uf_fiscal: formData.ufFiscal,
      email_fiscal: formData.emailFiscal,
      codigo_cnae: formData.codigoCnae,
      ambiente_fiscal: formData.ambienteFiscal,
    };

    if (formData.id) {
      // Update existing
      const { error } = await supabase
        .from('empresa_config')
        .update(updateData)
        .eq('id', formData.id)
        .eq('user_id', ownerId);
        
      if (error) {
        console.error('Error updating empresa:', error);
        toast.error('Erro ao atualizar dados da empresa');
      } else {
        toast.success("Dados da empresa salvos com sucesso!");
      }
    } else {
      // Insert new
      const { data, error } = await supabase
        .from('empresa_config')
        .insert({
          user_id: ownerId,
          ...updateData,
        } as any)
        .select()
        .single();
        
      if (error) {
        console.error('Error inserting empresa:', error);
        toast.error('Erro ao salvar dados da empresa');
      } else {
        setFormData({ ...formData, id: data.id });
        toast.success("Dados da empresa salvos com sucesso!");
      }
    }
  };

  const handleAdicionarGroomer = async () => {
    if (!user) {
      toast.error("Usuário não autenticado");
      return;
    }
    
    if (!novoGroomer.trim()) {
      toast.error("Nome do groomer não pode estar vazio");
      return;
    }

    if (groomers.some(g => g.nome.toLowerCase() === novoGroomer.trim().toLowerCase())) {
      toast.error("Groomer já cadastrado");
      return;
    }

    const { data, error } = await (supabase as any)
      .from('groomers')
      .insert({
        user_id: ownerId,
        nome: novoGroomer.trim()
      })
      .select('id, nome')
      .single();
      
    if (error) {
      console.error('Error adding groomer:', error);
      toast.error('Erro ao adicionar groomer');
    } else if (data) {
      const newGroomer: Groomer = {
        id: (data as any).id,
        nome: (data as any).nome
      };
      setGroomers([...groomers, newGroomer]);
      setNovoGroomer("");
      toast.success("Groomer adicionado com sucesso!");
    }
  };

  const handleEditarGroomer = (groomer: Groomer) => {
    setEditandoGroomer(groomer);
    setNovoGroomer(groomer.nome);
  };

  const handleSalvarEdicaoGroomer = async () => {
    if (!editandoGroomer || !user) return;
    
    if (!novoGroomer.trim()) {
      toast.error("Nome do groomer não pode estar vazio");
      return;
    }

    const { error } = await (supabase as any)
      .from('groomers')
      .update({ nome: novoGroomer.trim() })
      .eq('id', editandoGroomer.id)
      .eq('user_id', ownerId);
      
    if (error) {
      console.error('Error updating groomer:', error);
      toast.error('Erro ao atualizar groomer');
    } else {
      const updatedGroomers = groomers.map(g => 
        g.id === editandoGroomer.id ? { id: g.id, nome: novoGroomer.trim() } : g
      );
      setGroomers(updatedGroomers);
      setEditandoGroomer(null);
      setNovoGroomer("");
      toast.success("Groomer atualizado com sucesso!");
    }
  };

  const handleExcluirGroomer = async (id: string) => {
    if (!user) return;
    
    const { error } = await (supabase as any)
      .from('groomers')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);
      
    if (error) {
      console.error('Error deleting groomer:', error);
      toast.error('Erro ao excluir groomer');
    } else {
      const updatedGroomers = groomers.filter(g => g.id !== id);
      setGroomers(updatedGroomers);
      toast.success("Groomer excluído com sucesso!");
    }
  };

  if (loading) {
    return <div className="p-4">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Cadastro da Empresa</h1>
        <p className="text-muted-foreground text-[12px]">
          Configure as informações da sua empresa
        </p>
      </div>

      <SubscriptionInfoCard />

      {isAdministrador && <WhatsAppIntegration />}

      {/* Card Dados Fiscais */}
      <Card>
        <CardHeader className="px-5 py-4">
          <CardTitle className="text-base">Dados Fiscais da Empresa</CardTitle>
          <CardDescription className="text-[11px]">
            Informações necessárias para emissão de NFe/NFSe
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Identificação da Empresa */}
            <div className="space-y-1.5">
              <h4 className="font-semibold text-[11px] text-muted-foreground">Identificação</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div className="space-y-[2px]">
                  <Label htmlFor="cnpj" className="text-[11px] font-semibold">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    className="h-7 text-[12px]"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                    maxLength={18}
                  />
                  {formData.cnpj && formData.cnpj.replace(/\D/g, '').length === 14 && !validarCNPJ(formData.cnpj) && (
                    <p className="text-[11px] text-destructive">CNPJ inválido</p>
                  )}
                </div>
                <div className="space-y-[2px]">
                  <Label htmlFor="razaoSocial" className="text-[11px] font-semibold">Razão Social *</Label>
                  <Input
                    id="razaoSocial"
                    placeholder="Razão Social da empresa"
                    className="h-7 text-[12px]"
                    value={formData.razaoSocial}
                    onChange={(e) => setFormData({ ...formData, razaoSocial: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="space-y-[2px]">
                  <Label htmlFor="regimeTributario" className="text-[11px] font-semibold">Regime Tributário *</Label>
                  <Select
                    value={formData.regimeTributario}
                    onValueChange={(value) => setFormData({ ...formData, regimeTributario: value })}
                  >
                    <SelectTrigger className="h-7 text-[12px]">
                      <SelectValue placeholder="Selecione o regime" />
                    </SelectTrigger>
                    <SelectContent>
                      {REGIMES_TRIBUTARIOS.map((regime) => (
                        <SelectItem key={regime.value} value={regime.value}>
                          {regime.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-[2px]">
                  <Label htmlFor="inscricaoEstadual" className="text-[11px] font-semibold">Inscrição Estadual (IE)</Label>
                  <Input
                    id="inscricaoEstadual"
                    placeholder="Somente números"
                    className="h-7 text-[12px]"
                    value={formData.inscricaoEstadual}
                    onChange={(e) => setFormData({ ...formData, inscricaoEstadual: e.target.value.replace(/\D/g, '') })}
                  />
                  <p className="text-[11px] text-muted-foreground">Obrigatório para NFe de produto</p>
                </div>
                <div className="space-y-[2px]">
                  <Label htmlFor="inscricaoMunicipal" className="text-[11px] font-semibold">Inscrição Municipal (IM)</Label>
                  <Input
                    id="inscricaoMunicipal"
                    placeholder="Somente números"
                    className="h-7 text-[12px]"
                    value={formData.inscricaoMunicipal}
                    onChange={(e) => setFormData({ ...formData, inscricaoMunicipal: e.target.value.replace(/\D/g, '') })}
                  />
                  <p className="text-[11px] text-muted-foreground">Obrigatório para NFSe de serviço</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* Endereço Fiscal */}
            <div className="space-y-1.5">
              <h4 className="font-semibold text-[11px] text-muted-foreground">Endereço Fiscal</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div className="space-y-[2px]">
                  <Label htmlFor="cepFiscal" className="text-[11px] font-semibold">CEP *</Label>
                  <div className="flex gap-1">
                    <Input
                      id="cepFiscal"
                      placeholder="00000-000"
                      className="h-7 text-[12px] flex-1"
                      value={formData.cepFiscal}
                      onChange={(e) => setFormData({ ...formData, cepFiscal: formatCEP(e.target.value) })}
                      maxLength={9}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleBuscarCep}
                      disabled={buscandoCep}
                    >
                      {buscandoCep ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-[2px] md:col-span-3">
                  <Label htmlFor="logradouroFiscal" className="text-[11px] font-semibold">Logradouro *</Label>
                  <Input
                    id="logradouroFiscal"
                    placeholder="Rua, Avenida, etc."
                    className="h-7 text-[12px]"
                    value={formData.logradouroFiscal}
                    onChange={(e) => setFormData({ ...formData, logradouroFiscal: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div className="space-y-[2px]">
                  <Label htmlFor="numeroEnderecoFiscal" className="text-[11px] font-semibold">Número *</Label>
                  <Input
                    id="numeroEnderecoFiscal"
                    placeholder="Nº"
                    className="h-7 text-[12px]"
                    value={formData.numeroEnderecoFiscal}
                    onChange={(e) => setFormData({ ...formData, numeroEnderecoFiscal: e.target.value })}
                  />
                </div>
                <div className="space-y-[2px]">
                  <Label htmlFor="complementoFiscal" className="text-[11px] font-semibold">Complemento</Label>
                  <Input
                    id="complementoFiscal"
                    placeholder="Sala, Bloco, etc."
                    className="h-7 text-[12px]"
                    value={formData.complementoFiscal}
                    onChange={(e) => setFormData({ ...formData, complementoFiscal: e.target.value })}
                  />
                </div>
                <div className="space-y-[2px] md:col-span-2">
                  <Label htmlFor="bairroFiscal" className="text-[11px] font-semibold">Bairro *</Label>
                  <Input
                    id="bairroFiscal"
                    placeholder="Bairro"
                    className="h-7 text-[12px]"
                    value={formData.bairroFiscal}
                    onChange={(e) => setFormData({ ...formData, bairroFiscal: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div className="space-y-[2px] md:col-span-2">
                  <Label htmlFor="cidadeFiscal" className="text-[11px] font-semibold">Cidade *</Label>
                  <Input
                    id="cidadeFiscal"
                    placeholder="Cidade"
                    className="h-7 text-[12px]"
                    value={formData.cidadeFiscal}
                    onChange={(e) => setFormData({ ...formData, cidadeFiscal: e.target.value })}
                  />
                </div>
                <div className="space-y-[2px]">
                  <Label htmlFor="codigoIbgeCidade" className="text-[11px] font-semibold">Código IBGE *</Label>
                  <Input
                    id="codigoIbgeCidade"
                    placeholder="7 dígitos"
                    className="h-7 text-[12px]"
                    value={formData.codigoIbgeCidade}
                    onChange={(e) => setFormData({ ...formData, codigoIbgeCidade: e.target.value.replace(/\D/g, '').slice(0, 7) })}
                    maxLength={7}
                  />
                </div>
                <div className="space-y-[2px]">
                  <Label htmlFor="ufFiscal" className="text-[11px] font-semibold">UF *</Label>
                  <Select
                    value={formData.ufFiscal}
                    onValueChange={(value) => setFormData({ ...formData, ufFiscal: value })}
                  >
                    <SelectTrigger className="h-7 text-[12px]">
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {UF_BRASIL.map((uf) => (
                        <SelectItem key={uf.sigla} value={uf.sigla}>
                          {uf.sigla}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* Informações Adicionais */}
            <div className="space-y-1.5">
              <h4 className="font-semibold text-[11px] text-muted-foreground">Informações Adicionais</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="space-y-[2px]">
                  <Label htmlFor="ambienteFiscal" className="text-[11px] font-semibold">Ambiente Fiscal *</Label>
                  <Select
                    value={formData.ambienteFiscal}
                    onValueChange={(value) => setFormData({ ...formData, ambienteFiscal: value })}
                  >
                    <SelectTrigger className="h-7 text-[12px]">
                      <SelectValue placeholder="Selecione o ambiente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homologacao">Homologação (Testes)</SelectItem>
                      <SelectItem value="producao">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">
                    {formData.ambienteFiscal === "producao" 
                      ? "⚠️ Notas serão emitidas com validade fiscal" 
                      : "Notas emitidas apenas para testes"}
                  </p>
                </div>
                <div className="space-y-[2px]">
                  <Label htmlFor="emailFiscal" className="text-[11px] font-semibold">Email Fiscal</Label>
                  <Input
                    id="emailFiscal"
                    type="email"
                    placeholder="fiscal@empresa.com.br"
                    className="h-7 text-[12px]"
                    value={formData.emailFiscal}
                    onChange={(e) => setFormData({ ...formData, emailFiscal: e.target.value })}
                  />
                  <p className="text-[11px] text-muted-foreground">Email para recebimento de notas fiscais</p>
                </div>
                <div className="space-y-[2px]">
                  <Label htmlFor="codigoCnae" className="text-[11px] font-semibold">CNAE Principal</Label>
                  <Input
                    id="codigoCnae"
                    placeholder="Ex: 9609-2/08"
                    className="h-7 text-[12px]"
                    value={formData.codigoCnae}
                    onChange={(e) => setFormData({ ...formData, codigoCnae: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <Button type="submit" className="h-7 text-[12px] font-semibold w-full">
              Salvar Dados Fiscais
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Card Dados Gerais */}
      <Card>
        <CardHeader className="px-5 py-4">
          <CardTitle className="text-base">Dados da Empresa</CardTitle>
          <CardDescription className="text-[11px]">
            Preencha as informações gerais da empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          <form onSubmit={handleSubmit} className="space-y-1.5">
            <div className="space-y-[2px]">
              <Label htmlFor="bordao" className="text-[11px] font-semibold">Bordão da Empresa</Label>
              <Input
                id="bordao"
                placeholder="Digite o bordão da empresa (máx. 50 caracteres)"
                className="h-7 text-[12px]"
                value={formData.bordao}
                onChange={(e) => setFormData({ ...formData, bordao: e.target.value })}
                maxLength={50}
              />
              <p className="text-[11px] text-muted-foreground">
                {formData.bordao.length}/50 caracteres
              </p>
            </div>

            <div className="space-y-[2px]">
              <Label className="text-[11px] font-semibold">Horário de Funcionamento da Empresa</Label>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-[2px]">
                  <Label htmlFor="horarioInicio" className="text-[11px] font-semibold">Horário Início</Label>
                  <Input
                    id="horarioInicio"
                    type="time"
                    className="h-7 text-[12px]"
                    value={formData.horarioInicio}
                    onChange={(e) => setFormData({ ...formData, horarioInicio: e.target.value })}
                  />
                </div>
                <div className="space-y-[2px]">
                  <Label htmlFor="horarioFim" className="text-[11px] font-semibold">Horário Fim</Label>
                  <Input
                    id="horarioFim"
                    type="time"
                    className="h-7 text-[12px]"
                    value={formData.horarioFim}
                    onChange={(e) => setFormData({ ...formData, horarioFim: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-semibold">Dias de Funcionamento da Empresa</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: 'segunda', label: 'Segunda-feira' },
                  { key: 'terca', label: 'Terça-feira' },
                  { key: 'quarta', label: 'Quarta-feira' },
                  { key: 'quinta', label: 'Quinta-feira' },
                  { key: 'sexta', label: 'Sexta-feira' },
                  { key: 'sabado', label: 'Sábado' },
                  { key: 'domingo', label: 'Domingo' },
                ].map((dia) => (
                  <div key={dia.key} className="flex items-center space-x-2">
                    <Checkbox
                      id={dia.key}
                      checked={formData.diasFuncionamento[dia.key as keyof DiasSemana]}
                      onCheckedChange={(checked) => {
                        setFormData({
                          ...formData,
                          diasFuncionamento: {
                            ...formData.diasFuncionamento,
                            [dia.key]: checked === true,
                          },
                        });
                      }}
                    />
                    <Label
                      htmlFor={dia.key}
                      className="text-[11px] font-normal cursor-pointer"
                    >
                      {dia.label}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Button type="submit" className="h-7 text-[12px] font-semibold w-full">
              Salvar Configurações
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-5 py-4">
          <CardTitle className="text-base">Meta de Faturamento Mensal</CardTitle>
          <CardDescription className="text-[11px]">
            Defina a meta de faturamento mensal da empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          <form onSubmit={handleSubmit} className="space-y-1.5">
            <div className="space-y-[2px]">
              <Label htmlFor="metaFaturamento" className="text-[11px] font-semibold">Meta Mensal (R$)</Label>
              <Input
                id="metaFaturamento"
                type="number"
                step="0.01"
                min="0"
                placeholder="10.000,00"
                className="h-7 text-[12px]"
                value={formData.metaFaturamentoMensal}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  metaFaturamentoMensal: parseFloat(e.target.value) || 0 
                })}
              />
              <p className="text-[11px] text-muted-foreground">
                Valor atual: {new Intl.NumberFormat('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                }).format(formData.metaFaturamentoMensal)}
              </p>
            </div>

            <Button type="submit" className="h-7 text-[12px] font-semibold w-full">
              Salvar Meta
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="px-5 py-4">
          <CardTitle className="text-base">Cadastro de Groomers</CardTitle>
          <CardDescription className="text-[11px]">
            Gerencie os groomers da empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          <div className="space-y-1.5">
            <div className="flex gap-1">
              <Input
                placeholder="Digite o nome do groomer"
                className="h-7 text-[12px]"
                value={novoGroomer}
                onChange={(e) => setNovoGroomer(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (editandoGroomer) {
                      handleSalvarEdicaoGroomer();
                    } else {
                      handleAdicionarGroomer();
                    }
                  }
                }}
              />
              {editandoGroomer ? (
                <>
                  <Button onClick={handleSalvarEdicaoGroomer} className="h-7 text-[12px] font-semibold">
                    Salvar
                  </Button>
                  <Button 
                    variant="outline"
                    className="h-7 text-[12px] font-semibold"
                    onClick={() => {
                      setEditandoGroomer(null);
                      setNovoGroomer("");
                    }}
                  >
                    Cancelar
                  </Button>
                </>
              ) : (
                <Button onClick={handleAdicionarGroomer} className="h-7 text-[12px] font-semibold">
                  Adicionar Groomer
                </Button>
              )}
            </div>

            {groomers.length > 0 && (
              <div className="border rounded-lg">
                <table className="w-full">
                  <thead className="bg-secondary">
                    <tr>
                      <th className="p-2 text-left text-[11px] font-semibold">Nome do Groomer</th>
                      <th className="p-2 text-right text-[11px] font-semibold">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groomers.map((groomer) => (
                      <tr key={groomer.id} className="border-t hover:bg-accent/50">
                        <td className="p-2 text-[12px]">{groomer.nome}</td>
                        <td className="p-2 text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-[11px] px-2"
                              onClick={() => handleEditarGroomer(groomer)}
                            >
                              Editar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="h-6 text-[11px] px-2"
                              onClick={() => {
                                if (window.confirm(`Tem certeza que deseja excluir o groomer ${groomer.nome}?`)) {
                                  handleExcluirGroomer(groomer.id);
                                }
                              }}
                            >
                              Excluir
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {groomers.length === 0 && (
              <p className="text-center text-muted-foreground text-[11px] py-4">
                Nenhum groomer cadastrado ainda.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfigurarComissoes groomers={groomers} />

      {/* Card Creche Pet */}
      <Card>
        <CardHeader className="px-5 py-4">
          <CardTitle className="text-base">Creche</CardTitle>
          <CardDescription className="text-[11px]">
            Adicionar a seção de gerenciamento de creche pet à plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold">
              {crecheAtiva ? 'Liberado' : 'Desativado'}
            </span>
            <Switch
              checked={crecheAtiva}
              disabled={salvandoCreche}
              onCheckedChange={async (checked) => {
                if (!user) return;
                setSalvandoCreche(true);
                
                if (formData.id) {
                  const { error } = await supabase
                    .from('empresa_config')
                    .update({ creche_ativa: checked } as any)
                    .eq('id', formData.id)
                    .eq('user_id', ownerId);
                  
                  if (error) {
                    console.error('Error updating creche:', error);
                    toast.error('Erro ao atualizar configuração da creche');
                  } else {
                    setCrecheAtiva(checked);
                    toast.success(checked ? 'Módulo Creche ativado!' : 'Módulo Creche desativado!');
                  }
                } else {
                  const { data, error } = await supabase
                    .from('empresa_config')
                    .insert({
                      user_id: ownerId,
                      creche_ativa: checked,
                    } as any)
                    .select()
                    .single();
                  
                  if (error) {
                    console.error('Error inserting empresa config:', error);
                    toast.error('Erro ao salvar configuração da creche');
                  } else {
                    setFormData({ ...formData, id: data.id });
                    setCrecheAtiva(checked);
                    toast.success(checked ? 'Módulo Creche ativado!' : 'Módulo Creche desativado!');
                  }
                }
                
                setSalvandoCreche(false);
              }}
            />
          </div>

          {crecheAtiva && (
            <div className="mt-3 space-y-1.5">
              <Separator />
              <h4 className="font-semibold text-[11px]">Definir horário de Check-in e Check-out</h4>
              <p className="text-[11px] text-muted-foreground">
                O horário definido para o check-out é essencial para o cálculo correto do valor da diária. Caso o cliente ultrapasse esse horário, será cobrado um valor adicional referente ao tempo excedente, calculado com base nos minutos ou horas adicionais.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-[2px]">
                  <Label htmlFor="horarioCheckinCreche" className="text-[11px] font-semibold">Check-in *</Label>
                  <Input
                    id="horarioCheckinCreche"
                    type="time"
                    className="h-7 text-[12px]"
                    value={horarioCheckinCreche}
                    onChange={(e) => setHorarioCheckinCreche(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-[2px]">
                  <Label htmlFor="horarioCheckoutCreche" className="text-[11px] font-semibold">Check-out *</Label>
                  <Input
                    id="horarioCheckoutCreche"
                    type="time"
                    className="h-7 text-[12px]"
                    value={horarioCheckoutCreche}
                    onChange={(e) => setHorarioCheckoutCreche(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button
                type="button"
                className="h-7 text-[12px] font-semibold w-full"
                disabled={salvandoCreche || !horarioCheckinCreche || !horarioCheckoutCreche}
                onClick={async () => {
                  if (!user || !formData.id) return;
                  setSalvandoCreche(true);
                  const { error } = await supabase
                    .from('empresa_config')
                    .update({
                      horario_checkin_creche: horarioCheckinCreche,
                      horario_checkout_creche: horarioCheckoutCreche,
                    } as any)
                    .eq('id', formData.id)
                    .eq('user_id', ownerId);
                  if (error) {
                    toast.error('Erro ao salvar horários da creche');
                  } else {
                    toast.success('Horários da creche salvos com sucesso!');
                  }
                  setSalvandoCreche(false);
                }}
              >
                Salvar Horários
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Empresa;
