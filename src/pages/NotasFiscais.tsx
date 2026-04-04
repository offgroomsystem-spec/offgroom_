import { useState } from "react";
import { FileText, Plus, Search, RefreshCw, Download, XCircle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useNotasFiscais, NotaFiscal } from "@/hooks/useNotasFiscais";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  processando: "bg-yellow-500/10 text-yellow-700 border-yellow-300",
  autorizada: "bg-green-500/10 text-green-700 border-green-300",
  rejeitada: "bg-red-500/10 text-red-700 border-red-300",
  cancelada: "bg-muted text-muted-foreground border-border",
};

const NotasFiscais = () => {
  const { ownerId } = useAuth();
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [busca, setBusca] = useState("");
  const [modalNFSe, setModalNFSe] = useState(false);
  const [modalNFe, setModalNFe] = useState(false);

  // NFSe form
  const [nfseClienteId, setNfseClienteId] = useState("");
  const [nfseServicoId, setNfseServicoId] = useState("");
  const [nfseValor, setNfseValor] = useState("");
  const [nfseDescricao, setNfseDescricao] = useState("");

  // NFe form
  const [nfeClienteId, setNfeClienteId] = useState("");
  const [nfeProdutos, setNfeProdutos] = useState<{ produto_id: string; quantidade: number; valor: number }[]>([]);

  const { notas, isLoading, emitirNFe, emitirNFSe, consultarNota, baixarPdf, cancelarNota } = useNotasFiscais({
    tipo: filtroTipo,
    status: filtroStatus,
    busca,
  });

  // Fetch clientes
  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes_nf", ownerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("clientes")
        .select("id, nome_cliente, cpf_cnpj, email, logradouro, numero_endereco, bairro, cidade, uf, cep, codigo_ibge_cidade, complemento")
        .eq("user_id", ownerId!)
        .order("nome_cliente");
      return data || [];
    },
    enabled: !!ownerId,
  });

  // Fetch servicos
  const { data: servicos = [] } = useQuery({
    queryKey: ["servicos_nf", ownerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("servicos")
        .select("id, nome, valor, codigo_servico_municipal, aliquota_iss")
        .eq("user_id", ownerId!);
      return data || [];
    },
    enabled: !!ownerId,
  });

  // Fetch produtos
  const { data: produtos = [] } = useQuery({
    queryKey: ["produtos_nf", ownerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("produtos")
        .select("id, nome, valor, ncm, cfop, unidade_medida, origem")
        .eq("user_id", ownerId!);
      return data || [];
    },
    enabled: !!ownerId,
  });

  // Fetch empresa_config
  const { data: empresa } = useQuery({
    queryKey: ["empresa_config_nf", ownerId],
    queryFn: async () => {
      const { data } = await supabase
        .from("empresa_config")
        .select("*")
        .eq("user_id", ownerId!)
        .maybeSingle();
      return data;
    },
    enabled: !!ownerId,
  });

  const handleEmitirNFSe = () => {
    const cliente = clientes.find((c) => c.id === nfseClienteId);
    const servico = servicos.find((s) => s.id === nfseServicoId);
    if (!cliente || !servico || !empresa) return;

    const payload = {
      provedor: "padrao",
      ambiente: "homologacao",
      infDPS: {
        tpAmb: 2,
        dhEmi: new Date().toISOString(),
        emit: {
          CNPJ: empresa.cnpj?.replace(/\D/g, ""),
          xNome: empresa.razao_social,
          IM: empresa.inscricao_municipal,
          enderEmit: {
            xLgr: empresa.logradouro_fiscal,
            nro: empresa.numero_endereco_fiscal,
            xBairro: empresa.bairro_fiscal,
            cMun: empresa.codigo_ibge_cidade,
            xMun: empresa.cidade_fiscal,
            UF: empresa.uf_fiscal,
            CEP: empresa.cep_fiscal?.replace(/\D/g, ""),
          },
        },
        toma: {
          CPF: cliente.cpf_cnpj && cliente.cpf_cnpj.replace(/\D/g, "").length === 11
            ? cliente.cpf_cnpj.replace(/\D/g, "")
            : undefined,
          CNPJ: cliente.cpf_cnpj && cliente.cpf_cnpj.replace(/\D/g, "").length === 14
            ? cliente.cpf_cnpj.replace(/\D/g, "")
            : undefined,
          xNome: cliente.nome_cliente,
          enderToma: {
            xLgr: cliente.logradouro,
            nro: cliente.numero_endereco,
            xBairro: cliente.bairro,
            cMun: cliente.codigo_ibge_cidade,
            xMun: cliente.cidade,
            UF: cliente.uf,
            CEP: cliente.cep?.replace(/\D/g, ""),
          },
        },
        serv: {
          cServ: {
            cTribNac: servico.codigo_servico_municipal,
          },
          xDescServ: nfseDescricao || servico.nome,
          vServ: parseFloat(nfseValor) || servico.valor,
          aliqISS: servico.aliquota_iss,
        },
      },
    };

    emitirNFSe.mutate({
      payload,
      valor_total: parseFloat(nfseValor) || servico.valor,
      cliente_id: cliente.id,
      cliente_nome: cliente.nome_cliente,
      cliente_documento: cliente.cpf_cnpj,
    });

    setModalNFSe(false);
    resetNFSeForm();
  };

  const handleEmitirNFe = () => {
    const cliente = clientes.find((c) => c.id === nfeClienteId);
    if (!cliente || !empresa || nfeProdutos.length === 0) return;

    const itens = nfeProdutos.map((item, idx) => {
      const prod = produtos.find((p) => p.id === item.produto_id);
      if (!prod) return null;
      return {
        nItem: idx + 1,
        prod: {
          cProd: prod.id.substring(0, 8),
          xProd: prod.nome,
          NCM: prod.ncm || "00000000",
          CFOP: prod.cfop || "5102",
          uCom: prod.unidade_medida || "UN",
          qCom: item.quantidade,
          vUnCom: item.valor,
          vProd: item.quantidade * item.valor,
          uTrib: prod.unidade_medida || "UN",
          qTrib: item.quantidade,
          vUnTrib: item.valor,
        },
        imposto: {
          ICMS: {
            ICMSSN102: {
              orig: Number(prod.origem) || 0,
              CSOSN: "102",
            },
          },
          PIS: { PISOutr: { CST: "99", vBC: 0, pPIS: 0, vPIS: 0 } },
          COFINS: { COFINSOutr: { CST: "99", vBC: 0, pCOFINS: 0, vCOFINS: 0 } },
        },
      };
    }).filter(Boolean);

    const valorTotal = nfeProdutos.reduce((sum, i) => sum + i.quantidade * i.valor, 0);

    const payload = {
      ambiente: "homologacao",
      infNFe: {
        versao: "4.00",
        ide: {
          cUF: parseInt(empresa.codigo_ibge_cidade?.substring(0, 2) || "35"),
          natOp: "Venda",
          mod: 55,
          serie: 1,
          tpNF: 1,
          idDest: 1,
          cMunFG: empresa.codigo_ibge_cidade,
          tpImp: 1,
          tpEmis: 1,
          finNFe: 1,
          indFinal: 1,
          indPres: 1,
          procEmi: 0,
        },
        emit: {
          CNPJ: empresa.cnpj?.replace(/\D/g, ""),
          xNome: empresa.razao_social,
          IE: empresa.inscricao_estadual,
          CRT: parseInt(empresa.regime_tributario || "1"),
          enderEmit: {
            xLgr: empresa.logradouro_fiscal,
            nro: empresa.numero_endereco_fiscal,
            xBairro: empresa.bairro_fiscal,
            cMun: empresa.codigo_ibge_cidade,
            xMun: empresa.cidade_fiscal,
            UF: empresa.uf_fiscal,
            CEP: empresa.cep_fiscal?.replace(/\D/g, ""),
          },
        },
        dest: {
          CPF: cliente.cpf_cnpj && cliente.cpf_cnpj.replace(/\D/g, "").length === 11
            ? cliente.cpf_cnpj.replace(/\D/g, "")
            : undefined,
          CNPJ: cliente.cpf_cnpj && cliente.cpf_cnpj.replace(/\D/g, "").length === 14
            ? cliente.cpf_cnpj.replace(/\D/g, "")
            : undefined,
          xNome: cliente.nome_cliente,
          indIEDest: 9,
          enderDest: {
            xLgr: cliente.logradouro,
            nro: cliente.numero_endereco,
            xBairro: cliente.bairro,
            cMun: cliente.codigo_ibge_cidade,
            xMun: cliente.cidade,
            UF: cliente.uf,
            CEP: cliente.cep?.replace(/\D/g, ""),
          },
        },
        det: itens,
        total: {
          ICMSTot: {
            vBC: 0, vICMS: 0, vICMSDeson: 0, vFCP: 0, vBCST: 0, vST: 0, vFCPST: 0,
            vFCPSTRet: 0, vProd: valorTotal, vFrete: 0, vSeg: 0, vDesc: 0, vII: 0,
            vIPI: 0, vIPIDevol: 0, vPIS: 0, vCOFINS: 0, vOutro: 0, vNF: valorTotal,
          },
        },
        transp: { modFrete: 9 },
        pag: { detPag: [{ tPag: "01", vPag: valorTotal }] },
      },
    };

    emitirNFe.mutate({
      payload,
      valor_total: valorTotal,
      cliente_id: cliente.id,
      cliente_nome: cliente.nome_cliente,
      cliente_documento: cliente.cpf_cnpj,
    });

    setModalNFe(false);
    resetNFeForm();
  };

  const resetNFSeForm = () => {
    setNfseClienteId("");
    setNfseServicoId("");
    setNfseValor("");
    setNfseDescricao("");
  };

  const resetNFeForm = () => {
    setNfeClienteId("");
    setNfeProdutos([]);
  };

  const addProdutoNFe = () => {
    setNfeProdutos([...nfeProdutos, { produto_id: "", quantidade: 1, valor: 0 }]);
  };

  const updateProdutoNFe = (index: number, field: string, value: string | number) => {
    const updated = [...nfeProdutos];
    (updated[index] as Record<string, unknown>)[field] = value;

    // Auto-fill valor when produto is selected
    if (field === "produto_id") {
      const prod = produtos.find((p) => p.id === value);
      if (prod) updated[index].valor = prod.valor;
    }

    setNfeProdutos(updated);
  };

  const removeProdutoNFe = (index: number) => {
    setNfeProdutos(nfeProdutos.filter((_, i) => i !== index));
  };

  const handleServicoChange = (servicoId: string) => {
    setNfseServicoId(servicoId);
    const servico = servicos.find((s) => s.id === servicoId);
    if (servico) {
      setNfseValor(servico.valor.toString());
      setNfseDescricao(servico.nome);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h1 className="text-xl font-bold">Notas Fiscais</h1>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setModalNFSe(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Emitir NFSe
          </Button>
          <Button onClick={() => setModalNFe(true)} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-1" /> Emitir NFe
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente, documento ou número..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filtroTipo} onValueChange={setFiltroTipo}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="NFe">NFe</SelectItem>
            <SelectItem value="NFSe">NFSe</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="processando">Processando</SelectItem>
            <SelectItem value="autorizada">Autorizada</SelectItem>
            <SelectItem value="rejeitada">Rejeitada</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : notas.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Nenhuma nota fiscal encontrada
                </TableCell>
              </TableRow>
            ) : (
              notas.map((nota) => (
                <TableRow key={nota.id}>
                  <TableCell className="font-medium">{nota.numero || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{nota.tipo}</Badge>
                  </TableCell>
                  <TableCell>
                    <div>{nota.cliente_nome}</div>
                    <div className="text-xs text-muted-foreground">{nota.cliente_documento}</div>
                  </TableCell>
                  <TableCell className="text-right">
                    {nota.valor_total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </TableCell>
                  <TableCell>
                    <Badge className={statusColors[nota.status] || ""} variant="outline">
                      {nota.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(nota.created_at), "dd/MM/yyyy HH:mm")}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      {nota.nuvem_fiscal_id && (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            title="Consultar status"
                            onClick={() =>
                              consultarNota.mutate({ id: nota.nuvem_fiscal_id!, tipo: nota.tipo })
                            }
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          {nota.status === "autorizada" && (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Baixar PDF"
                                onClick={() =>
                                  baixarPdf.mutate({ id: nota.nuvem_fiscal_id!, tipo: nota.tipo })
                                }
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                title="Cancelar nota"
                                onClick={() =>
                                  cancelarNota.mutate({
                                    id: nota.nuvem_fiscal_id!,
                                    tipo: nota.tipo,
                                    payload: { justificativa: "Cancelamento solicitado pelo emitente" },
                                  })
                                }
                              >
                                <XCircle className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </>
                      )}
                      {nota.mensagem_erro && (
                        <Button
                          size="icon"
                          variant="ghost"
                          title={nota.mensagem_erro}
                        >
                          <Eye className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modal Emitir NFSe */}
      <Dialog open={modalNFSe} onOpenChange={setModalNFSe}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Emitir NFSe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cliente</Label>
              <Select value={nfseClienteId} onValueChange={setNfseClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_cliente} {c.cpf_cnpj ? `- ${c.cpf_cnpj}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Serviço</Label>
              <Select value={nfseServicoId} onValueChange={handleServicoChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o serviço" />
                </SelectTrigger>
                <SelectContent>
                  {servicos.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.nome} - R$ {s.valor.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={nfseValor}
                onChange={(e) => setNfseValor(e.target.value)}
              />
            </div>
            <div>
              <Label>Descrição / Discriminação</Label>
              <Textarea
                value={nfseDescricao}
                onChange={(e) => setNfseDescricao(e.target.value)}
                rows={3}
              />
            </div>
            <Button
              onClick={handleEmitirNFSe}
              disabled={!nfseClienteId || !nfseServicoId || !nfseValor || emitirNFSe.isPending}
              className="w-full"
            >
              {emitirNFSe.isPending ? "Emitindo..." : "Emitir NFSe"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Emitir NFe */}
      <Dialog open={modalNFe} onOpenChange={setModalNFe}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Emitir NFe</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cliente</Label>
              <Select value={nfeClienteId} onValueChange={setNfeClienteId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_cliente} {c.cpf_cnpj ? `- ${c.cpf_cnpj}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Produtos</Label>
                <Button size="sm" variant="outline" onClick={addProdutoNFe}>
                  <Plus className="h-3 w-3 mr-1" /> Adicionar
                </Button>
              </div>
              {nfeProdutos.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-end mb-2">
                  <div className="flex-1">
                    <Select
                      value={item.produto_id}
                      onValueChange={(v) => updateProdutoNFe(idx, "produto_id", v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Produto" />
                      </SelectTrigger>
                      <SelectContent>
                        {produtos.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.nome}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-20">
                    <Input
                      type="number"
                      min={1}
                      value={item.quantidade}
                      onChange={(e) => updateProdutoNFe(idx, "quantidade", parseInt(e.target.value) || 1)}
                      placeholder="Qtd"
                    />
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      step="0.01"
                      value={item.valor}
                      onChange={(e) => updateProdutoNFe(idx, "valor", parseFloat(e.target.value) || 0)}
                      placeholder="Valor"
                    />
                  </div>
                  <Button size="icon" variant="ghost" onClick={() => removeProdutoNFe(idx)}>
                    <XCircle className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {nfeProdutos.length > 0 && (
                <div className="text-right text-sm font-medium">
                  Total: {nfeProdutos
                    .reduce((sum, i) => sum + i.quantidade * i.valor, 0)
                    .toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </div>
              )}
            </div>

            <Button
              onClick={handleEmitirNFe}
              disabled={!nfeClienteId || nfeProdutos.length === 0 || emitirNFe.isPending}
              className="w-full"
            >
              {emitirNFe.isPending ? "Emitindo..." : "Emitir NFe"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotasFiscais;
