import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package } from "lucide-react";
import { toast } from "sonner";
import { FiltrosPacotesVencimento } from "./FiltrosPacotesVencimento";
import { ExportButton } from "../shared/ExportButton";

interface PacoteVencimento {
  id: string;
  nomeCliente: string;
  nomePet: string;
  raca: string;
  nomePacote: string;
  diasRestantes: number;
  whatsapp: string;
  dataVencimento: Date;
}

interface Filtros {
  nomePacote: string;
  diasRestantes: string;
}

export const PacotesProximosVencimento = () => {
  const { user } = useAuth();
  const [pacotes, setPacotes] = useState<PacoteVencimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState<Filtros>({
    nomePacote: "",
    diasRestantes: "",
  });

  const calcularDiasRestantes = (dataVenda: string, validade: number): number => {
    const dataVencimento = new Date(dataVenda + "T00:00:00");
    dataVencimento.setDate(dataVencimento.getDate() + validade);
    
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    dataVencimento.setHours(0, 0, 0, 0);
    
    const diffTime = dataVencimento.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const loadPacotesVencimento = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // Buscar agendamentos de pacotes
      const { data: agendamentos, error: errorAgendamentos } = await supabase
        .from('agendamentos_pacotes')
        .select('*')
        .eq('user_id', user.id);
      
      if (errorAgendamentos) throw errorAgendamentos;
      
      // Buscar pacotes (para pegar validade)
      const { data: pacotesData, error: errorPacotes } = await supabase
        .from('pacotes')
        .select('nome, validade')
        .eq('user_id', user.id);
      
      if (errorPacotes) throw errorPacotes;
      
      // Criar mapa de validades
      const validadeMap = new Map<string, number>();
      (pacotesData || []).forEach(p => {
        const validadeDias = parseInt(p.validade.replace(/\D/g, '')) || 0;
        validadeMap.set(p.nome, validadeDias);
      });
      
      // Processar e filtrar
      const pacotesComVencimento: PacoteVencimento[] = (agendamentos || [])
        .map(ag => {
          const validade = validadeMap.get(ag.nome_pacote) || 0;
          const diasRestantes = calcularDiasRestantes(ag.data_venda, validade);
          
          return {
            id: ag.id,
            nomeCliente: ag.nome_cliente,
            nomePet: ag.nome_pet,
            raca: ag.raca,
            nomePacote: ag.nome_pacote,
            diasRestantes,
            whatsapp: ag.whatsapp,
            dataVencimento: new Date(ag.data_venda + "T00:00:00")
          };
        })
        .filter(p => p.diasRestantes >= 0 && p.diasRestantes <= 7)
        .sort((a, b) => a.diasRestantes - b.diasRestantes);
      
      setPacotes(pacotesComVencimento);
    } catch (error) {
      console.error('Erro ao carregar pacotes:', error);
      toast.error('Erro ao carregar dados dos pacotes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPacotesVencimento();
  }, [user]);

  const abrirWhatsApp = (whatsapp: string) => {
    const numeroLimpo = whatsapp.replace(/\D/g, '');
    const numeroCompleto = numeroLimpo.startsWith('55') ? numeroLimpo : `55${numeroLimpo}`;
    const link = `https://wa.me/${numeroCompleto}`;
    window.open(link, '_blank');
  };

  const pacotesFiltrados = pacotes.filter(pacote => {
    if (filtros.nomePacote && pacote.nomePacote !== filtros.nomePacote) {
      return false;
    }
    if (filtros.diasRestantes !== "" && pacote.diasRestantes !== parseInt(filtros.diasRestantes)) {
      return false;
    }
    return true;
  });

  const pacotesUnicos = Array.from(new Set(pacotes.map(p => p.nomePacote)));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>Pacotes Próximos do Vencimento</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Pacotes que vencem nos próximos 7 dias
            </p>
          </div>
          <div className="flex gap-2">
            <FiltrosPacotesVencimento
              filtros={filtros}
              setFiltros={setFiltros}
              pacotesDisponiveis={pacotesUnicos}
            />
            <ExportButton
              data={pacotesFiltrados.map(p => ({
                ...p,
                diasRestantes: p.diasRestantes === 0 ? "Vence Hoje" : 
                               p.diasRestantes === 1 ? "1 dia" : 
                               `${p.diasRestantes} dias`
              }))}
              filename="pacotes-vencimento"
              columns={[
                { key: 'nomeCliente', label: 'Cliente' },
                { key: 'nomePet', label: 'Pet' },
                { key: 'raca', label: 'Raça' },
                { key: 'nomePacote', label: 'Pacote' },
                { key: 'diasRestantes', label: 'Dias Restantes' },
                { key: 'whatsapp', label: 'WhatsApp' }
              ]}
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : pacotesFiltrados.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum pacote próximo do vencimento nos próximos 7 dias</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Pet</TableHead>
                  <TableHead>Raça</TableHead>
                  <TableHead>Pacote</TableHead>
                  <TableHead>Dias Restantes</TableHead>
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
                      <Badge 
                        variant={
                          pacote.diasRestantes === 0 ? "destructive" : 
                          pacote.diasRestantes <= 3 ? "secondary" : 
                          "default"
                        }
                      >
                        {pacote.diasRestantes === 0 ? "Vence Hoje" : 
                         pacote.diasRestantes === 1 ? "1 dia" : 
                         `${pacote.diasRestantes} dias`}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => abrirWhatsApp(pacote.whatsapp)}
                        title="Abrir WhatsApp"
                      >
                        <i className="fi fi-brands-whatsapp text-green-600" style={{ fontSize: '16px' }}></i>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
