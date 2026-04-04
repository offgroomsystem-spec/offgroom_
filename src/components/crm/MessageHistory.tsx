import { useState } from "react";
import { Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  useCRMMensagens, 
  useCRMLeads, 
  CRMLead, 
  calcularProximoPasso, 
  calcularStatus,
  getFaseLead,
  useMensagensPorFase 
} from "@/hooks/useCRMLeads";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface MessageHistoryProps {
  lead: CRMLead;
  onMessageRegistered?: (novaTentativa: number) => void;
}

const faseBadgeColors: Record<string, string> = {
  prospecao: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  acesso_gratis: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  acesso_pago: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

const faseLabels: Record<string, string> = {
  prospecao: "Prospecção",
  acesso_gratis: "Acesso Grátis",
  acesso_pago: "Acesso Pago",
};

const MessageHistory = ({ lead, onMessageRegistered }: MessageHistoryProps) => {
  const [observacao, setObservacao] = useState("");
  const { mensagens, isLoading, createMensagem } = useCRMMensagens(lead.id);
  const { updateLead } = useCRMLeads();
  
  const faseAtual = getFaseLead(lead);
  const mensagensNaFaseAtual = useMensagensPorFase(lead.id, faseAtual);

  const handleRegistrarMensagem = async () => {
    const fase = getFaseLead(lead);
    const novaTentativa = fase === "prospecao" ? (lead.tentativa || 0) + 1 : lead.tentativa;
    
    // Contar mensagens na fase atual (incluindo a nova)
    const mensagensNaFase = mensagensNaFaseAtual + 1;
    
    // Registrar a mensagem com a fase atual
    await createMensagem.mutateAsync({
      lead_id: lead.id,
      tentativa: novaTentativa,
      observacao: observacao || undefined,
      fase,
    });

    // Atualizar o lead com os novos cálculos
    const dadosAtualizados = {
      ...lead,
      tentativa: novaTentativa,
    };

    const proximoPasso = calcularProximoPasso(dadosAtualizados, mensagensNaFase, new Date());
    const status = calcularStatus(dadosAtualizados, mensagensNaFase);

    await updateLead.mutateAsync({
      id: lead.id,
      tentativa: novaTentativa,
      proximo_passo: proximoPasso,
      status,
      mensagensNaFase,
      ultimoEnvio: new Date(),
    });

    // Notificar o componente pai sobre a nova tentativa
    onMessageRegistered?.(novaTentativa);

    setObservacao("");
  };

  // Calcular informações sobre o próximo contato
  const getProximoContatoInfo = () => {
    const fase = getFaseLead(lead);
    
    if (fase === "acesso_pago" && mensagensNaFaseAtual >= 1) {
      return { texto: "Lead em Standby - sem próximo passo programado", cor: "text-yellow-600" };
    }
    
    if (fase === "acesso_gratis") {
      const contatosRestantes = 6 - mensagensNaFaseAtual;
      if (contatosRestantes <= 0) {
        return { texto: "Todos os 6 contatos de acesso grátis realizados", cor: "text-green-600" };
      }
      return { texto: `${contatosRestantes} contato(s) restante(s) nesta fase`, cor: "text-blue-600" };
    }
    
    if (fase === "prospecao") {
      if (lead.tentativa >= 5) {
        return { texto: "Lead em Standby - 5 tentativas sem resposta", cor: "text-yellow-600" };
      }
      return { texto: `Tentativa ${(lead.tentativa || 0) + 1} será registrada`, cor: "text-muted-foreground" };
    }
    
    return { texto: "", cor: "text-muted-foreground" };
  };

  const proximoContatoInfo = getProximoContatoInfo();

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm flex items-center gap-2">
        <MessageCircle className="h-4 w-4" />
        Histórico de Mensagens
        <Badge variant="outline" className={`ml-auto ${faseBadgeColors[faseAtual]}`}>
          {faseLabels[faseAtual]}
        </Badge>
      </h4>

      {/* Info sobre próximo contato */}
      {proximoContatoInfo.texto && (
        <p className={`text-xs ${proximoContatoInfo.cor}`}>
          {proximoContatoInfo.texto}
        </p>
      )}

      {/* Formulário para registrar nova mensagem */}
      <div className="space-y-2">
        <Textarea
          placeholder="Observação sobre a mensagem enviada (opcional)..."
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          rows={2}
          className="text-sm"
        />
        <Button 
          size="sm" 
          onClick={handleRegistrarMensagem}
          disabled={createMensagem.isPending || updateLead.isPending}
          className="w-full"
        >
          <Send className="h-4 w-4 mr-2" />
          {createMensagem.isPending || updateLead.isPending 
            ? "Registrando..." 
            : "Registrar Envio de Mensagem"}
        </Button>
      </div>

      {/* Lista de mensagens */}
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {isLoading ? (
          <Skeleton className="h-16" />
        ) : mensagens.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhuma mensagem registrada ainda.
          </p>
        ) : (
          mensagens.map((msg) => (
            <div key={msg.id} className="bg-muted/50 p-2 rounded text-xs">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Tentativa {msg.tentativa}</span>
                  {msg.fase && (
                    <Badge variant="outline" className={`text-[10px] py-0 ${faseBadgeColors[msg.fase] || ""}`}>
                      {faseLabels[msg.fase] || msg.fase}
                    </Badge>
                  )}
                </div>
                <span className="text-muted-foreground whitespace-nowrap">
                  {format(parseISO(msg.data_envio), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
              </div>
              {msg.observacao && (
                <p className="mt-1 text-muted-foreground">{msg.observacao}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default MessageHistory;
