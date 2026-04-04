import { useEffect, useState } from "react";
import { Phone, Star, MessageSquare, ExternalLink, Trash2, Pencil, Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CRMLead, useCRMLeads } from "@/hooks/useCRMLeads";
import MessageHistory from "./MessageHistory";
import { Separator } from "@/components/ui/separator";

interface LeadModalProps {
  lead: CRMLead | null;
  onClose: () => void;
}

const LeadModal = ({ lead, onClose }: LeadModalProps) => {
  const { updateLead, deleteLead } = useCRMLeads();
  const [formData, setFormData] = useState<Partial<CRMLead>>({});
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [tempPhone, setTempPhone] = useState("");

  useEffect(() => {
    if (lead) {
      setFormData(lead);
    }
  }, [lead]);

  if (!lead) return null;

  const handleSave = async () => {
    await updateLead.mutateAsync({
      id: lead.id,
      ...formData,
    });
    onClose();
  };

  const handleDelete = async () => {
    await deleteLead.mutateAsync(lead.id);
    onClose();
  };

  const openWhatsApp = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    window.open(`https://wa.me/55${cleaned}`, "_blank");
  };

  const updateField = <K extends keyof CRMLead>(field: K, value: CRMLead[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Função para atualizar campos de progressão e zerar tentativa ao avançar de fase
  const updateProgressField = (
    field: 'teve_resposta' | 'agendou_reuniao' | 'usando_acesso_gratis' | 'iniciou_acesso_pago',
    value: boolean
  ) => {
    const currentValue = formData[field];
    
    // Se está mudando de "Não" para "Sim", zera a tentativa
    if (value === true && currentValue !== true) {
      // Lógica adicional: Se está marcando "Agendou Reunião: Sim" 
      // e "Teve Resposta" está como "Não", força para "Sim"
      if (field === 'agendou_reuniao' && formData.teve_resposta !== true) {
        setFormData(prev => ({ 
          ...prev, 
          [field]: value,
          teve_resposta: true, // Força "Teve Resposta" para Sim
          tentativa: 0 
        }));
      } else {
        setFormData(prev => ({ 
          ...prev, 
          [field]: value,
          tentativa: 0 
        }));
      }
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
  };

  // Callback para quando uma mensagem é registrada no MessageHistory
  const handleMessageRegistered = (novaTentativa: number) => {
    setFormData(prev => ({ ...prev, tentativa: novaTentativa }));
  };

  return (
    <Dialog open={!!lead} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span>{lead.nome_empresa}</span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. O lead e todo seu histórico serão permanentemente excluídos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dados da Empresa */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Dados da Empresa</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span>Nota: {lead.nota_google ?? "-"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MessageSquare className="h-4 w-4" />
                <span>Avaliações: {lead.qtd_avaliacoes ?? "-"}</span>
              </div>
            </div>
            {isEditingPhone ? (
              <div className="flex gap-1 w-full">
                <Input
                  value={tempPhone}
                  onChange={(e) => setTempPhone(e.target.value)}
                  placeholder="Telefone da empresa"
                  className="h-9 text-sm flex-1"
                  autoFocus
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 text-green-600 hover:text-green-700"
                  onClick={() => {
                    updateField("telefone_empresa", tempPhone);
                    setIsEditingPhone(false);
                  }}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 text-destructive hover:text-destructive"
                  onClick={() => {
                    setTempPhone(formData.telefone_empresa || "");
                    setIsEditingPhone(false);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-1 w-full">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openWhatsApp(formData.telefone_empresa || lead.telefone_empresa)}
                  className="flex-1"
                >
                  <Phone className="h-4 w-4 mr-2" />
                  {formData.telefone_empresa || lead.telefone_empresa}
                  <ExternalLink className="h-3 w-3 ml-2" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => {
                    setTempPhone(formData.telefone_empresa || lead.telefone_empresa);
                    setIsEditingPhone(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          <Separator />

          {/* Dados do Dono */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Dados do Dono</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Nome do Dono</Label>
                <Input
                  value={formData.nome_dono || ""}
                  onChange={(e) => updateField("nome_dono", e.target.value)}
                  placeholder="Nome do dono"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Telefone do Dono</Label>
                <div className="flex gap-1">
                  <Input
                    value={formData.telefone_dono || ""}
                    onChange={(e) => updateField("telefone_dono", e.target.value)}
                    placeholder="Telefone"
                    className="h-9 text-sm"
                  />
                  {formData.telefone_dono && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9"
                      onClick={() => openWhatsApp(formData.telefone_dono!)}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Controle Comercial */}
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">Controle Comercial</h4>
            
            <div className="grid grid-cols-2 gap-3">
              {/* Tentativa */}
              <div>
                <Label className="text-xs">Tentativa</Label>
                <Select
                  value={String(formData.tentativa ?? 1)}
                  onValueChange={(v) => updateField("tentativa", parseInt(v))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[0, 1, 2, 3, 4, 5].map(n => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Teve Resposta */}
              <div>
                <Label className="text-xs">Teve Resposta?</Label>
                <Select
                  value={formData.teve_resposta ? "sim" : "nao"}
                  onValueChange={(v) => updateProgressField("teve_resposta", v === "sim")}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Agendou Reunião */}
              <div>
                <Label className="text-xs">Agendou Reunião?</Label>
                <Select
                  value={formData.agendou_reuniao ? "sim" : "nao"}
                  onValueChange={(v) => updateProgressField("agendou_reuniao", v === "sim")}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Data da Reunião */}
              {formData.agendou_reuniao && (
                <div>
                  <Label className="text-xs">Data da Reunião</Label>
                  <Input
                    type="date"
                    value={formData.data_reuniao || ""}
                    onChange={(e) => updateField("data_reuniao", e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Usando Acesso Grátis */}
              <div>
                <Label className="text-xs">Usando Acesso Grátis?</Label>
                <Select
                  value={formData.usando_acesso_gratis ? "sim" : "nao"}
                  onValueChange={(v) => updateProgressField("usando_acesso_gratis", v === "sim")}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.usando_acesso_gratis && (
                <>
                  <div>
                    <Label className="text-xs">Dias de Acesso Grátis</Label>
                    <Input
                      type="number"
                      value={formData.dias_acesso_gratis || 30}
                      onChange={(e) => updateField("dias_acesso_gratis", parseInt(e.target.value) || 30)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Data Início Acesso Grátis</Label>
                    <Input
                      type="date"
                      value={formData.data_inicio_acesso_gratis || ""}
                      onChange={(e) => updateField("data_inicio_acesso_gratis", e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Iniciou Acesso Pago */}
              <div>
                <Label className="text-xs">Iniciou Acesso Pago?</Label>
                <Select
                  value={formData.iniciou_acesso_pago ? "sim" : "nao"}
                  onValueChange={(v) => updateProgressField("iniciou_acesso_pago", v === "sim")}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">Sim</SelectItem>
                    <SelectItem value="nao">Não</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.iniciou_acesso_pago && (
                <>
                  <div>
                    <Label className="text-xs">Data Início Acesso Pago</Label>
                    <Input
                      type="date"
                      value={formData.data_inicio_acesso_pago || ""}
                      onChange={(e) => updateField("data_inicio_acesso_pago", e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Plano Contratado</Label>
                    <Select
                      value={formData.plano_contratado || ""}
                      onValueChange={(v) => updateField("plano_contratado", v)}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue placeholder="Selecione o plano" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Offgroom Flex">Offgroom Flex</SelectItem>
                        <SelectItem value="Offgroom Power 12">Offgroom Power 12</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>
          </div>

          <Separator />

          {/* Histórico de Mensagens */}
          <MessageHistory lead={lead} onMessageRegistered={handleMessageRegistered} />

          <Separator />

          {/* Próximo Passo */}
          <div className="space-y-2">
            <Label className="text-xs">Próximo Passo (calculado automaticamente)</Label>
            <Input
              type="date"
              value={formData.proximo_passo || ""}
              onChange={(e) => updateField("proximo_passo", e.target.value)}
              className="h-9 text-sm"
            />
          </div>

          {/* Botão Salvar */}
          <Button 
            onClick={handleSave} 
            className="w-full"
            disabled={updateLead.isPending}
          >
            {updateLead.isPending ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default LeadModal;
