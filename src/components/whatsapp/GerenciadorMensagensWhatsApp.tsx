import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Trash2, Eye, Clock, AlertTriangle, ChevronUp, ChevronDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MensagemAgendada {
  id: string;
  agendamento_id: string | null;
  agendamento_pacote_id: string | null;
  agendado_para: string;
  enviado_em: string | null;
  tipo_mensagem: string;
  status: string;
  mensagem: string | null;
  numero_whatsapp: string;
  servico_numero: string | null;
  erro: string | null;
  // Joined fields
  nomePet?: string;
  nomeTutor?: string;
}

interface Props {
  ownerId: string;
}

export const GerenciadorMensagensWhatsApp = ({ ownerId }: Props) => {
  const [open, setOpen] = useState(false);
  const [mensagens, setMensagens] = useState<MensagemAgendada[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState<MensagemAgendada | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<MensagemAgendada | null>(null);

  // Filters
  const [filtroPet, setFiltroPet] = useState("");
  const [filtroTutor, setFiltroTutor] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [filtroDataInicio, setFiltroDataInicio] = useState("");
  const [filtroDataFim, setFiltroDataFim] = useState("");

  // Sort
  const [sortField, setSortField] = useState<"agendado_para">("agendado_para");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const loadMensagens = async () => {
    if (!ownerId) return;
    setLoading(true);
    try {
      const { data: msgs, error } = await supabase
        .from("whatsapp_mensagens_agendadas")
        .select("*")
        .eq("user_id", ownerId)
        .order("agendado_para", { ascending: true });

      if (error) throw error;

      // Now enrich with pet/tutor names from agendamentos and agendamentos_pacotes
      const agendamentoIds = [...new Set((msgs || []).filter(m => m.agendamento_id).map(m => m.agendamento_id!))];
      const pacoteIds = [...new Set((msgs || []).filter(m => m.agendamento_pacote_id).map(m => m.agendamento_pacote_id!))];

      let agendamentosMap: Record<string, { pet: string; cliente: string }> = {};
      let pacotesMap: Record<string, { pet: string; cliente: string }> = {};

      if (agendamentoIds.length > 0) {
        const { data: agendamentos } = await supabase
          .from("agendamentos")
          .select("id, pet, cliente")
          .in("id", agendamentoIds);
        for (const a of agendamentos || []) {
          agendamentosMap[a.id] = { pet: a.pet, cliente: a.cliente };
        }
      }

      if (pacoteIds.length > 0) {
        const { data: pacotes } = await supabase
          .from("agendamentos_pacotes")
          .select("id, nome_pet, nome_cliente")
          .in("id", pacoteIds);
        for (const p of pacotes || []) {
          pacotesMap[p.id] = { pet: p.nome_pet, cliente: p.nome_cliente };
        }
      }

      const enriched: MensagemAgendada[] = (msgs || []).map(m => {
        let nomePet = "";
        let nomeTutor = "";
        if (m.agendamento_id && agendamentosMap[m.agendamento_id]) {
          nomePet = agendamentosMap[m.agendamento_id].pet;
          nomeTutor = agendamentosMap[m.agendamento_id].cliente;
        } else if (m.agendamento_pacote_id && pacotesMap[m.agendamento_pacote_id]) {
          nomePet = pacotesMap[m.agendamento_pacote_id].pet;
          nomeTutor = pacotesMap[m.agendamento_pacote_id].cliente;
        }
        return { ...m, nomePet, nomeTutor };
      });

      setMensagens(enriched);
    } catch (err) {
      console.error("Erro ao carregar mensagens:", err);
      toast.error("Erro ao carregar mensagens agendadas");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadMensagens();
  }, [open]);

  const handleDelete = async (msg: MensagemAgendada) => {
    try {
      const { error } = await supabase
        .from("whatsapp_mensagens_agendadas")
        .delete()
        .eq("id", msg.id);
      if (error) throw error;
      toast.success("Mensagem removida da fila");
      setMensagens(prev => prev.filter(m => m.id !== msg.id));
      setDeleteConfirm(null);
      if (selectedMsg?.id === msg.id) setSelectedMsg(null);
    } catch {
      toast.error("Erro ao excluir mensagem");
    }
  };

  const getStatusBadge = (msg: MensagemAgendada) => {
    const now = new Date();
    const agendado = new Date(msg.agendado_para);

    if (msg.status === "enviado") {
      return <Badge variant="default" className="bg-green-600 text-white text-[10px] px-1.5 py-0">Enviado</Badge>;
    }
    if (msg.status === "erro") {
      return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Erro</Badge>;
    }
    if (msg.status === "cancelado") {
      return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Cancelado</Badge>;
    }
    // Pendente
    const diffMin = (agendado.getTime() - now.getTime()) / 60000;
    if (diffMin < 0) {
      return <Badge variant="destructive" className="text-[10px] px-1.5 py-0 flex items-center gap-0.5"><AlertTriangle className="h-3 w-3" />Atrasado</Badge>;
    }
    if (diffMin <= 30) {
      return <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0 flex items-center gap-0.5"><Clock className="h-3 w-3" />Em breve</Badge>;
    }
    return <Badge variant="outline" className="text-[10px] px-1.5 py-0">Pendente</Badge>;
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "24h": return "Confirmação 24h";
      case "3h": return "Lembrete 3h";
      case "30min": return "Lembrete 30min";
      case "imediata": return "Imediata";
      case "pet_pronto": return "Pet Pronto";
      default: return tipo;
    }
  };

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
      " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  // Apply filters
  const filtered = mensagens.filter(m => {
    if (filtroPet && !(m.nomePet || "").toLowerCase().includes(filtroPet.toLowerCase())) return false;
    if (filtroTutor && !(m.nomeTutor || "").toLowerCase().includes(filtroTutor.toLowerCase())) return false;
    if (filtroStatus !== "todos" && m.status !== filtroStatus) return false;
    if (filtroDataInicio) {
      const agendado = new Date(m.agendado_para);
      const inicio = new Date(filtroDataInicio + "T00:00:00");
      if (agendado < inicio) return false;
    }
    if (filtroDataFim) {
      const agendado = new Date(m.agendado_para);
      const fim = new Date(filtroDataFim + "T23:59:59");
      if (agendado > fim) return false;
    }
    return true;
  });

  // Apply sort
  const sorted = [...filtered].sort((a, b) => {
    const aVal = new Date(a.agendado_para).getTime();
    const bVal = new Date(b.agendado_para).getTime();
    return sortDir === "asc" ? aVal - bVal : bVal - aVal;
  });

  const toggleSort = () => {
    setSortDir(prev => prev === "asc" ? "desc" : "asc");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2">
            <MessageSquare className="h-3 w-3" />
            <span className="hidden sm:inline">Gerenciador de Mensagens</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[90vw] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm">Gerenciador de Mensagens WhatsApp</DialogTitle>
            <p className="text-[10px] text-muted-foreground">
              {sorted.length} mensagem(ns) encontrada(s) • {sorted.filter(m => m.status === "pendente").length} pendente(s)
            </p>
          </DialogHeader>

          {/* Filters */}
          <div className="grid grid-cols-5 gap-2">
            <Input
              placeholder="Buscar por Pet..."
              value={filtroPet}
              onChange={e => setFiltroPet(e.target.value)}
              className="h-7 text-[10px]"
            />
            <Input
              placeholder="Buscar por Tutor..."
              value={filtroTutor}
              onChange={e => setFiltroTutor(e.target.value)}
              className="h-7 text-[10px]"
            />
            <Input
              type="date"
              value={filtroDataInicio}
              onChange={e => setFiltroDataInicio(e.target.value)}
              className="h-7 text-[10px]"
              title="Data início"
            />
            <Input
              type="date"
              value={filtroDataFim}
              onChange={e => setFiltroDataFim(e.target.value)}
              className="h-7 text-[10px]"
              title="Data fim"
            />
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="h-7 text-[10px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos" className="text-xs">Todos</SelectItem>
                <SelectItem value="pendente" className="text-xs">Pendente</SelectItem>
                <SelectItem value="enviado" className="text-xs">Enviado</SelectItem>
                <SelectItem value="erro" className="text-xs">Erro</SelectItem>
                <SelectItem value="cancelado" className="text-xs">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <ScrollArea className="flex-1 border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[10px] w-[100px]">Pet</TableHead>
                  <TableHead className="text-[10px] w-[100px]">Tutor</TableHead>
                  <TableHead className="text-[10px] w-[100px]">Tipo</TableHead>
                  <TableHead className="text-[10px] w-[130px] cursor-pointer select-none" onClick={toggleSort}>
                    <div className="flex items-center gap-0.5">
                      Data/Hora Envio
                      {sortDir === "asc" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </div>
                  </TableHead>
                  <TableHead className="text-[10px] w-[90px]">Status</TableHead>
                  <TableHead className="text-[10px] w-[70px] text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-xs py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : sorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-xs py-8 text-muted-foreground">
                      Nenhuma mensagem encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  sorted.map(msg => (
                    <TableRow
                      key={msg.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedMsg(msg)}
                    >
                      <TableCell className="text-[10px] py-1.5">{msg.nomePet || "—"}</TableCell>
                      <TableCell className="text-[10px] py-1.5">{msg.nomeTutor || "—"}</TableCell>
                      <TableCell className="text-[10px] py-1.5">{getTipoLabel(msg.tipo_mensagem)}</TableCell>
                      <TableCell className="text-[10px] py-1.5">{formatDateTime(msg.agendado_para)}</TableCell>
                      <TableCell className="py-1.5">{getStatusBadge(msg)}</TableCell>
                      <TableCell className="py-1.5 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-5 w-5 p-0"
                            onClick={(e) => { e.stopPropagation(); setSelectedMsg(msg); }}
                            title="Visualizar mensagem"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                          {msg.status === "pendente" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(msg); }}
                              title="Excluir mensagem"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      <Dialog open={!!selectedMsg} onOpenChange={(v) => !v && setSelectedMsg(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Pré-visualização da Mensagem</DialogTitle>
          </DialogHeader>
          {selectedMsg && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div><Label className="text-[10px] text-muted-foreground">Pet:</Label> <span className="font-medium">{selectedMsg.nomePet || "—"}</span></div>
                <div><Label className="text-[10px] text-muted-foreground">Tutor:</Label> <span className="font-medium">{selectedMsg.nomeTutor || "—"}</span></div>
                <div><Label className="text-[10px] text-muted-foreground">Tipo:</Label> <span className="font-medium">{getTipoLabel(selectedMsg.tipo_mensagem)}</span></div>
                <div><Label className="text-[10px] text-muted-foreground">Status:</Label> {getStatusBadge(selectedMsg)}</div>
                <div><Label className="text-[10px] text-muted-foreground">Agendado para:</Label> <span className="font-medium">{formatDateTime(selectedMsg.agendado_para)}</span></div>
                {selectedMsg.enviado_em && (
                  <div><Label className="text-[10px] text-muted-foreground">Enviado em:</Label> <span className="font-medium">{formatDateTime(selectedMsg.enviado_em)}</span></div>
                )}
                <div><Label className="text-[10px] text-muted-foreground">WhatsApp:</Label> <span className="font-medium">{selectedMsg.numero_whatsapp}</span></div>
                {selectedMsg.servico_numero && (
                  <div><Label className="text-[10px] text-muted-foreground">Serviço:</Label> <span className="font-medium">{selectedMsg.servico_numero}</span></div>
                )}
              </div>

              {selectedMsg.erro && (
                <div className="bg-destructive/10 border border-destructive/20 rounded p-2">
                  <Label className="text-[10px] text-destructive font-medium">Erro:</Label>
                  <p className="text-[10px] text-destructive mt-0.5">{selectedMsg.erro}</p>
                </div>
              )}

              <div className="border rounded-md p-3 bg-muted/30">
                <Label className="text-[10px] text-muted-foreground mb-1 block">Texto da mensagem:</Label>
                <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed">
                  {selectedMsg.mensagem || "Mensagem não disponível"}
                </pre>
              </div>

              {selectedMsg.status === "pendente" && (
                <div className="flex justify-end">
                  <Button
                    variant="destructive"
                    size="sm"
                    className="h-7 text-[10px] gap-1"
                    onClick={() => setDeleteConfirm(selectedMsg)}
                  >
                    <Trash2 className="h-3 w-3" />
                    Excluir da fila
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(v) => !v && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-sm">Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Tem certeza que deseja excluir esta mensagem da fila de envio?
              {deleteConfirm && (
                <span className="block mt-1 font-medium">
                  {deleteConfirm.nomeTutor} — {getTipoLabel(deleteConfirm.tipo_mensagem)} — {formatDateTime(deleteConfirm.agendado_para)}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-8 text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="h-8 text-xs bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
