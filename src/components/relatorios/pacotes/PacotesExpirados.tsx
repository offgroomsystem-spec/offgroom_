import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import { ExportButton } from "../shared/ExportButton";

interface PacoteExpirado {
  id: string;
  nomeCliente: string;
  nomePet: string;
  raca: string;
  nomePacote: string;
  dataUltimoAgendamento: Date | null;
  diasDesdeUltimo: number;
  whatsapp: string;
}

interface Filtros {
  nomePacote: string;
  diasMinimo: string;
  diasMaximo: string;
}

export const PacotesExpirados = () => {
  const { user, ownerId } = useAuth();
  const [pacotes, setPacotes] = useState<PacoteExpirado[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<Filtros>({
    nomePacote: "",
    diasMinimo: "",
    diasMaximo: "",
  });

  const formatarNome = (nome: string): string => {
    if (!nome) return "";
    return nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase();
  };

  const getPrimeiroNome = (nomeCompleto: string): string => {
    if (!nomeCompleto) return "";
    return nomeCompleto.split(" ")[0];
  };

  const calcularDiasDesde = (data: Date | null): number => {
    if (!data) return 0;
    const hoje = new Date();
    const diff = hoje.getTime() - new Date(data).getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const gerarLinkWhatsApp = (cliente: string, pet: string, dias: number, whatsapp: string): string => {
    const primeiroNome = formatarNome(getPrimeiroNome(cliente));
    const nomePet = formatarNome(pet);
    const telefone = whatsapp.replace(/\D/g, "");

    const mensagem = `Olá, ${primeiroNome}, como vc está?
Estamos passando para saber como vocês estão. Notamos que já faz ${dias} dias que ${nomePet} não vem para o banho e estamos com saudades por aqui.

Já gostaria de agendar o próximo horário?
Aguardamos seu retorno.`;

    return `https://wa.me/55${telefone}?text=${encodeURIComponent(mensagem)}`;
  };

  const abrirWhatsApp = (link: string) => {
    window.open(link, '_blank');
  };

  const loadPacotesExpirados = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const hoje = new Date();
      hoje.setHours(0, 0, 0, 0);

      // 1. Buscar todos os pacotes vendidos do usuário
      const { data: agendamentosPacotes, error: errorPacotes } = await supabase
        .from("agendamentos_pacotes")
        .select("*")
        .eq("user_id", ownerId);

      if (errorPacotes) throw errorPacotes;

      // 2. Buscar definições de pacotes para obter validade
      const { data: pacotesDefinicao, error: errorDefinicao } = await supabase
        .from("pacotes")
        .select("*")
        .eq("user_id", ownerId);

      if (errorDefinicao) throw errorDefinicao;

      // 3. Buscar todos os agendamentos do usuário
      const { data: todosAgendamentos, error: errorAgendamentos } = await supabase
        .from("agendamentos")
        .select("*")
        .eq("user_id", ownerId);

      if (errorAgendamentos) throw errorAgendamentos;

      const pacotesExpiradosLista: PacoteExpirado[] = [];

      // 4. Processar cada pacote vendido
      for (const pacoteVendido of agendamentosPacotes || []) {
        // Encontrar definição do pacote para obter validade
        const definicao = pacotesDefinicao?.find((p) => p.nome === pacoteVendido.nome_pacote);
        if (!definicao) continue;

        // Calcular data de vencimento
        const dataVenda = new Date(pacoteVendido.data_venda);
        const validadeDias = parseInt(definicao.validade) || 0;
        const dataVencimento = new Date(dataVenda);
        dataVencimento.setDate(dataVencimento.getDate() + validadeDias);

        // Verificar se está vencido
        if (dataVencimento >= hoje) continue;

        // Buscar agendamentos do mesmo cliente e pet
        const agendamentosClientePet =
          todosAgendamentos?.filter((ag) => {
            const clienteNormalizado = ag.cliente?.trim().toLowerCase() || "";
            const clientePacoteNormalizado = pacoteVendido.nome_cliente?.trim().toLowerCase() || "";
            const petNormalizado = ag.pet?.trim().toLowerCase() || "";
            const petPacoteNormalizado = pacoteVendido.nome_pet?.trim().toLowerCase() || "";

            return clienteNormalizado === clientePacoteNormalizado && petNormalizado === petPacoteNormalizado;
          }) || [];

        // Verificar se tem agendamento futuro na tabela agendamentos
        const temAgendamentoNaTabela = agendamentosClientePet.some((ag) => {
          const dataAgendamento = new Date(ag.data + "T00:00:00");
          dataAgendamento.setHours(0, 0, 0, 0);
          return dataAgendamento >= hoje;
        });

        // Verificar se tem serviço futuro no próprio pacote (JSON servicos)
        const servicosFuturosNoPacote =
          (pacoteVendido.servicos as any[])?.filter((servico) => {
            const dataServico = new Date(servico.data + "T00:00:00");
            dataServico.setHours(0, 0, 0, 0);
            return dataServico >= hoje;
          }) || [];
        const temServicoFuturoNoPacote = servicosFuturosNoPacote.length > 0;

        // Buscar outros pacotes do mesmo cliente/pet
        const outrosPacotesClientePet =
          agendamentosPacotes?.filter((p) => {
            if (p.id === pacoteVendido.id) return false; // Ignorar o próprio pacote

            const clienteNormalizado = p.nome_cliente?.trim().toLowerCase() || "";
            const clientePacoteNormalizado = pacoteVendido.nome_cliente?.trim().toLowerCase() || "";
            const petNormalizado = p.nome_pet?.trim().toLowerCase() || "";
            const petPacoteNormalizado = pacoteVendido.nome_pet?.trim().toLowerCase() || "";

            return clienteNormalizado === clientePacoteNormalizado && petNormalizado === petPacoteNormalizado;
          }) || [];

        // Verificar se algum outro pacote tem serviços futuros
        const temServicoFuturoEmOutrosPacotes = outrosPacotesClientePet.some((outroPacote) => {
          return (outroPacote.servicos as any[])?.some((servico) => {
            const dataServico = new Date(servico.data + "T00:00:00");
            dataServico.setHours(0, 0, 0, 0);
            return dataServico >= hoje;
          });
        });

        // Consolidar todas as verificações
        const temAgendamentoFuturo =
          temAgendamentoNaTabela || temServicoFuturoNoPacote || temServicoFuturoEmOutrosPacotes;

        // Se não tem agendamento futuro em NENHUM lugar, adicionar à lista
        if (!temAgendamentoFuturo) {
          // 1. Buscar último agendamento da tabela agendamentos
          const ultimoAgendamentoTabela = agendamentosClientePet.length > 0
            ? agendamentosClientePet
                .map(ag => new Date(ag.data + "T00:00:00"))
                .sort((a, b) => b.getTime() - a.getTime())[0]
            : null;

          // 2. Buscar último serviço de TODOS os pacotes do cliente/pet
          const todosPacotesClientePet = agendamentosPacotes?.filter((p) => {
            const clienteNormalizado = p.nome_cliente?.trim().toLowerCase() || "";
            const clientePacoteNormalizado = pacoteVendido.nome_cliente?.trim().toLowerCase() || "";
            const petNormalizado = p.nome_pet?.trim().toLowerCase() || "";
            const petPacoteNormalizado = pacoteVendido.nome_pet?.trim().toLowerCase() || "";

            return clienteNormalizado === clientePacoteNormalizado && 
                   petNormalizado === petPacoteNormalizado;
          }) || [];

          const todasDatasServicos: Date[] = [];
          todosPacotesClientePet.forEach(pacote => {
            (pacote.servicos as any[])?.forEach(servico => {
              if (servico.data) {
                todasDatasServicos.push(new Date(servico.data + "T00:00:00"));
              }
            });
          });

          const ultimoServicoData = todasDatasServicos.length > 0
            ? todasDatasServicos.sort((a, b) => b.getTime() - a.getTime())[0]
            : null;

          // 3. Comparar e pegar a mais recente
          let dataUltimo: Date | null = null;

          if (ultimoAgendamentoTabela && ultimoServicoData) {
            dataUltimo = ultimoAgendamentoTabela > ultimoServicoData 
              ? ultimoAgendamentoTabela 
              : ultimoServicoData;
          } else if (ultimoAgendamentoTabela) {
            dataUltimo = ultimoAgendamentoTabela;
          } else if (ultimoServicoData) {
            dataUltimo = ultimoServicoData;
          }

          // Normalizar para evitar problemas de timezone
          if (dataUltimo) {
            dataUltimo.setHours(0, 0, 0, 0);
          }

          const diasDesde = calcularDiasDesde(dataUltimo);

          pacotesExpiradosLista.push({
            id: pacoteVendido.id,
            nomeCliente: pacoteVendido.nome_cliente,
            nomePet: pacoteVendido.nome_pet,
            raca: pacoteVendido.raca,
            nomePacote: pacoteVendido.nome_pacote,
            dataUltimoAgendamento: dataUltimo,
            diasDesdeUltimo: diasDesde,
            whatsapp: pacoteVendido.whatsapp,
          });
        }
      }

      // Deduplicar por cliente+pet, mantendo o mais recente
      const deduplicado = new Map<string, PacoteExpirado>();
      for (const pacote of pacotesExpiradosLista) {
        const chave = `${pacote.nomeCliente.trim().toLowerCase()}_${pacote.nomePet.trim().toLowerCase()}`;
        const existente = deduplicado.get(chave);
        if (!existente || 
            (pacote.dataUltimoAgendamento && existente.dataUltimoAgendamento && 
             pacote.dataUltimoAgendamento > existente.dataUltimoAgendamento) ||
            (pacote.dataUltimoAgendamento && !existente.dataUltimoAgendamento)) {
          deduplicado.set(chave, pacote);
        }
      }
      setPacotes(Array.from(deduplicado.values()));
    } catch (error) {
      console.error("Erro ao carregar pacotes expirados:", error);
      toast.error("Erro ao carregar pacotes expirados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadPacotesExpirados();
    }
  }, [user]);

  const pacotesFiltrados = pacotes.filter((pacote) => {
    if (filtros.nomePacote && !pacote.nomePacote.toLowerCase().includes(filtros.nomePacote.toLowerCase())) {
      return false;
    }
    if (filtros.diasMinimo && pacote.diasDesdeUltimo < parseInt(filtros.diasMinimo)) {
      return false;
    }
    if (filtros.diasMaximo && pacote.diasDesdeUltimo > parseInt(filtros.diasMaximo)) {
      return false;
    }
    return true;
  });

  const colunasCsv = [
    { key: "nomeCliente", label: "Cliente" },
    { key: "nomePet", label: "Pet" },
    { key: "raca", label: "Raça" },
    { key: "nomePacote", label: "Pacote" },
    { key: "dataUltimoAgendamento", label: "Data do último agendamento" },
    { key: "diasDesdeUltimo", label: "Dias desde último agendamento" },
    { key: "whatsapp", label: "WhatsApp" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pacotes Expirados</CardTitle>
        <CardDescription>Pacotes vencidos sem agendamentos futuros</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="nomePacote">Nome do Pacote</Label>
            <Input
              id="nomePacote"
              placeholder="Filtrar por pacote..."
              value={filtros.nomePacote}
              onChange={(e) => setFiltros({ ...filtros, nomePacote: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="diasMinimo">Dias Mínimo</Label>
            <Input
              id="diasMinimo"
              type="number"
              placeholder="Ex: 15"
              value={filtros.diasMinimo}
              onChange={(e) => setFiltros({ ...filtros, diasMinimo: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="diasMaximo">Dias Máximo</Label>
            <Input
              id="diasMaximo"
              type="number"
              placeholder="Ex: 30"
              value={filtros.diasMaximo}
              onChange={(e) => setFiltros({ ...filtros, diasMaximo: e.target.value })}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <ExportButton
            data={pacotesFiltrados.map((p) => ({
              ...p,
              dataUltimoAgendamento: p.dataUltimoAgendamento ? format(p.dataUltimoAgendamento, "dd/MM/yyyy") : "N/A",
            }))}
            filename="pacotes-expirados"
            columns={colunasCsv}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : pacotesFiltrados.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {pacotes.length === 0
              ? "Não há pacotes expirados no momento"
              : "Nenhum pacote encontrado com os filtros aplicados"}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pet</TableHead>
                  <TableHead>Raça</TableHead>
                  <TableHead>Pacote</TableHead>
                  <TableHead>Último Agendamento</TableHead>
                  <TableHead className="text-center">WhatsApp</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pacotesFiltrados.map((pacote) => (
                  <TableRow key={pacote.id}>
                    <TableCell className="font-medium">{pacote.nomeCliente}</TableCell>
                    <TableCell>{pacote.nomePet}</TableCell>
                    <TableCell>{pacote.raca}</TableCell>
                    <TableCell>{pacote.nomePacote}</TableCell>
                    <TableCell>
                      {pacote.dataUltimoAgendamento ? (
                        <div className="space-y-1">
                          <div>{format(pacote.dataUltimoAgendamento, "dd/MM/yyyy")}</div>
                          <Badge
                            variant={
                              pacote.diasDesdeUltimo > 30
                                ? "destructive"
                                : pacote.diasDesdeUltimo > 20
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {pacote.diasDesdeUltimo} dias atrás
                          </Badge>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Sem agendamentos</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          abrirWhatsApp(
                            gerarLinkWhatsApp(
                              pacote.nomeCliente,
                              pacote.nomePet,
                              pacote.diasDesdeUltimo,
                              pacote.whatsapp,
                            ),
                          )
                        }
                        title="Abrir WhatsApp"
                      >
                        <i className="fi fi-brands-whatsapp text-green-600" style={{ fontSize: '16px' }}></i>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
