import { Phone, Star, MessageSquare, Calendar, AlertCircle, Pause, Send } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CRMLead, useCRMLeads, useCRMMensagens, getFaseLead, calcularProximoPasso, calcularStatus, useMensagensPorFase } from "@/hooks/useCRMLeads";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

interface LeadCardProps {
  lead: CRMLead;
  onClick: () => void;
}

const statusColors: Record<string, string> = {
  "Novo": "bg-blue-500",
  "Em contato": "bg-yellow-500",
  "Reunião agendada": "bg-orange-500",
  "Acesso grátis": "bg-green-400",
  "Acesso pago": "bg-green-600",
  "Standby": "bg-yellow-600",
  "Sem interesse": "bg-red-500",
};

const LeadCard = ({ lead, onClick }: LeadCardProps) => {
  const { updateLead } = useCRMLeads();
  const { createMensagem } = useCRMMensagens(lead.id);
  const fase = getFaseLead(lead);
  const mensagensNaFase = useMensagensPorFase(lead.id, fase);

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const handlePhoneClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cleaned = lead.telefone_empresa.replace(/\D/g, "");
    window.open(`https://wa.me/55${cleaned}`, "_blank");
  };

  const handleSendMessage = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      const novaTentativa = fase === "prospecao" ? (lead.tentativa || 0) + 1 : (lead.tentativa || 0);
      const novasMensagensNaFase = mensagensNaFase + 1;
      
      // Registrar mensagem
      await createMensagem.mutateAsync({
        lead_id: lead.id,
        tentativa: novaTentativa,
        fase,
        observacao: null,
      });

      // Calcular novo próximo passo e status
      const proximoPasso = calcularProximoPasso(
        { ...lead, tentativa: novaTentativa },
        novasMensagensNaFase,
        new Date()
      );
      const novoStatus = calcularStatus(
        { ...lead, tentativa: novaTentativa },
        novasMensagensNaFase
      );

      // Atualizar lead
      await updateLead.mutateAsync({
        id: lead.id,
        tentativa: novaTentativa,
        proximo_passo: proximoPasso,
        status: novoStatus,
      });

      toast({
        title: "Mensagem registrada!",
        description: `Tentativa ${novaTentativa} - Próximo passo atualizado`,
      });
    } catch (error) {
      toast({
        title: "Erro ao registrar mensagem",
        variant: "destructive",
      });
    }
  };

  // Verificar se o próximo passo está atrasado
  const isOverdue = () => {
    // Tentativa 0 nunca é considerada atrasada (sempre recalcula para "hoje")
    if (lead.tentativa === 0) {
      return false;
    }
    if (!lead.proximo_passo || lead.status === "Standby" || lead.status === "Sem interesse") {
      return false;
    }
    const hoje = startOfDay(new Date());
    const proximoPasso = startOfDay(parseISO(lead.proximo_passo));
    return isBefore(proximoPasso, hoje);
  };

  const overdue = isOverdue();
  const isStandby = lead.status === "Standby";

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${overdue ? "ring-2 ring-red-500/50" : ""}`}
      style={{ borderLeftColor: statusColors[lead.status]?.replace("bg-", "") || "#6b7280" }}
      onClick={onClick}
    >
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm truncate">{lead.nome_empresa}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {lead.nota_google && (
                <span className="flex items-center gap-1">
                  <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                  {lead.nota_google}
                </span>
              )}
              {lead.qtd_avaliacoes && (
                <span className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  {lead.qtd_avaliacoes}
                </span>
              )}
            </div>
          </div>
          <Badge 
            variant="secondary" 
            className={`text-xs text-white ${statusColors[lead.status] || "bg-gray-500"}`}
          >
            {lead.status}
          </Badge>
        </div>

        <div className="flex items-center justify-between mt-2 pt-2 border-t">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePhoneClick}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <Phone className="h-3 w-3" />
              {formatPhone(lead.telefone_empresa)}
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={handleSendMessage}
              title="Registrar envio de mensagem"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            {!isStandby && <span>Tentativa: {lead.tentativa}/5</span>}
            {isStandby ? (
              <span className="flex items-center gap-1 text-yellow-600">
                <Pause className="h-3 w-3" />
                Standby
              </span>
            ) : lead.proximo_passo ? (
              <span className={`flex items-center gap-1 ${overdue ? "text-red-500 font-medium" : ""}`}>
                {overdue ? <AlertCircle className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                {format(parseISO(lead.proximo_passo), "dd/MM", { locale: ptBR })}
                {overdue && " (atrasado)"}
              </span>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default LeadCard;
