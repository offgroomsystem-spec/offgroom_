import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, MessageSquare, Wifi, WifiOff, QrCode, Unplug } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type InstanceStatus = "disconnected" | "connected" | "connecting" | "qrcode" | "error";

interface WhatsAppInstance {
  id: string;
  instance_name: string;
  phone_number: string;
  status: string;
}

export function WhatsAppIntegration() {
  const { user, ownerId } = useAuth();
  const [instance, setInstance] = useState<WhatsAppInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<InstanceStatus>("disconnected");

  // Config modal
  const [configOpen, setConfigOpen] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [creating, setCreating] = useState(false);

  // QR modal
  const [qrOpen, setQrOpen] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [qrAttempts, setQrAttempts] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Disconnecting
  const [disconnecting, setDisconnecting] = useState(false);

  // Risco auto send toggle
  const [riscoAutoSend, setRiscoAutoSend] = useState(true);
  const [riscoLoading, setRiscoLoading] = useState(false);

  // Confirmação período config
  const [confirmacaoPeriodoAtivo, setConfirmacaoPeriodoAtivo] = useState(false);
  const [confirmacao24h, setConfirmacao24h] = useState(false);
  const [confirmacao15h, setConfirmacao15h] = useState(false);
  const [confirmacao3h, setConfirmacao3h] = useState(true);
  const [confirmacaoLoading, setConfirmacaoLoading] = useState(false);

  const effectiveUserId = ownerId || user?.id;

  const callEvolution = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke("evolution-api", { body });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  // Load instance from DB
  useEffect(() => {
    if (!effectiveUserId) return;
    loadInstance();
    loadRiscoConfig();
  }, [effectiveUserId]);

  async function loadRiscoConfig() {
    try {
      const { data } = await supabase
        .from("empresa_config")
        .select("risco_auto_send, confirmacao_periodo_ativo, confirmacao_24h, confirmacao_15h, confirmacao_3h")
        .eq("user_id", effectiveUserId!)
        .maybeSingle();
      if (data) {
        setRiscoAutoSend((data as any).risco_auto_send ?? true);
        setConfirmacaoPeriodoAtivo((data as any).confirmacao_periodo_ativo ?? false);
        setConfirmacao24h((data as any).confirmacao_24h ?? false);
        setConfirmacao15h((data as any).confirmacao_15h ?? false);
        setConfirmacao3h((data as any).confirmacao_3h ?? true);
      }
    } catch (err) {
      console.error("Erro ao carregar config risco:", err);
    }
  }

  async function handleRiscoToggle(checked: boolean) {
    setRiscoLoading(true);
    try {
      const { error } = await supabase
        .from("empresa_config")
        .update({ risco_auto_send: checked } as any)
        .eq("user_id", effectiveUserId!);
      if (error) throw error;
      setRiscoAutoSend(checked);
      toast.success(checked ? "Mensagens para Clientes em Risco ativadas" : "Mensagens para Clientes em Risco desativadas");
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar configuração");
    } finally {
      setRiscoLoading(false);
    }
  }

  async function handleConfirmacaoPeriodoToggle(checked: boolean) {
    setConfirmacaoLoading(true);
    try {
      const updateData: any = { confirmacao_periodo_ativo: checked };
      // If turning on without any option selected, default to 3h
      if (checked && !confirmacao24h && !confirmacao15h && !confirmacao3h) {
        updateData.confirmacao_3h = true;
        setConfirmacao3h(true);
      }
      const { error } = await supabase
        .from("empresa_config")
        .update(updateData)
        .eq("user_id", effectiveUserId!);
      if (error) throw error;
      setConfirmacaoPeriodoAtivo(checked);
      toast.success(checked ? "Período personalizado de confirmação ativado" : "Período personalizado desativado (padrão 3h será usado)");
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar configuração");
    } finally {
      setConfirmacaoLoading(false);
    }
  }

  async function handleConfirmacaoOptionChange(field: string, checked: boolean) {
    setConfirmacaoLoading(true);
    try {
      const { error } = await supabase
        .from("empresa_config")
        .update({ [field]: checked } as any)
        .eq("user_id", effectiveUserId!);
      if (error) throw error;
      if (field === "confirmacao_24h") setConfirmacao24h(checked);
      if (field === "confirmacao_15h") setConfirmacao15h(checked);
      if (field === "confirmacao_3h") setConfirmacao3h(checked);
    } catch (err: any) {
      toast.error(err.message || "Erro ao atualizar configuração");
    } finally {
      setConfirmacaoLoading(false);
    }
  }

  async function loadInstance() {
    try {
      const { data, error } = await supabase
        .from("whatsapp_instances" as any)
        .select("*")
        .eq("user_id", effectiveUserId!)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setInstance(data as any);
        setStatus((data as any).status as InstanceStatus);
        // Check live status if instance exists
        if ((data as any).status !== "disconnected") {
          checkLiveStatus((data as any).instance_name);
        }
      }
    } catch (err) {
      console.error("Erro ao carregar instância:", err);
    } finally {
      setLoading(false);
    }
  }

  async function checkLiveStatus(name: string) {
    try {
      const data = await callEvolution({ action: "check-status", instanceName: name });
      const state = data?.instance?.state || data?.state || "disconnected";
      const mappedStatus = mapStatus(state);
      setStatus(mappedStatus);
      await updateInstanceStatus(mappedStatus);
    } catch (err) {
      console.error("Erro ao verificar status live:", err);
      // Instance might not exist on Evolution side
      setStatus("disconnected");
      await updateInstanceStatus("disconnected");
    }
  }

  function mapStatus(state: string): InstanceStatus {
    switch (state?.toLowerCase()) {
      case "open":
      case "connected":
        return "connected";
      case "connecting":
        return "connecting";
      case "qrcode":
        return "qrcode";
      case "close":
      case "disconnected":
        return "disconnected";
      default:
        return "disconnected";
    }
  }

  async function updateInstanceStatus(newStatus: InstanceStatus) {
    if (!instance) return;
    await supabase
      .from("whatsapp_instances" as any)
      .update({ status: newStatus, updated_at: new Date().toISOString() } as any)
      .eq("id", instance.id);
    setInstance((prev) => prev ? { ...prev, status: newStatus } : prev);

    // Sync evolution_auto_send flag
    if (effectiveUserId) {
      const autoSend = newStatus === "connected";
      await supabase
        .from("empresa_config")
        .update({ evolution_auto_send: autoSend })
        .eq("user_id", effectiveUserId);
    }
  }

  // Phone validation
  function validatePhone(value: string) {
    const digits = value.replace(/\D/g, "");
    if (!digits) {
      setPhoneError("");
      return;
    }
    if (!digits.startsWith("55")) {
      setPhoneError("O número deve começar com 55 (código do Brasil)");
    } else if (digits.length < 12 || digits.length > 13) {
      setPhoneError("O número deve ter 12 ou 13 dígitos (ex: 5561988736460)");
    } else {
      setPhoneError("");
    }
  }

  function handlePhoneChange(value: string) {
    const digits = value.replace(/\D/g, "");
    setPhoneNumber(digits);
    validatePhone(digits);
  }

  // Create instance
  async function handleCreate() {
    if (!instanceName.trim()) {
      toast.error("Informe o nome da instância");
      return;
    }
    const digits = phoneNumber.replace(/\D/g, "");
    if (!digits.startsWith("55") || digits.length < 12 || digits.length > 13) {
      toast.error("Número de WhatsApp inválido");
      return;
    }

    setCreating(true);
    try {
      const data = await callEvolution({
        action: "create-instance",
        instanceName: instanceName.trim(),
        number: digits,
      });

      // Save to DB
      const { data: inserted, error: insertErr } = await supabase
        .from("whatsapp_instances" as any)
        .insert({
          user_id: effectiveUserId,
          instance_name: instanceName.trim(),
          phone_number: digits,
          status: "connecting",
        } as any)
        .select()
        .single();

      if (insertErr) throw insertErr;

      setInstance(inserted as any);
      setStatus("connecting");
      setConfigOpen(false);

      // If QR code returned in creation response
      if (data?.qrcode?.base64) {
        setQrCode(data.qrcode.base64);
      }

      setQrOpen(true);
      startPolling(instanceName.trim());

      toast.success("Instância criada! Escaneie o QR Code para conectar.");
    } catch (err: any) {
      const msg = err.message || "Erro ao criar instância";
      if (msg.includes("already") || msg.includes("existe")) {
        toast.error("Já existe uma instância com esse nome. Escolha outro nome.");
      } else {
        toast.error(msg);
      }
    } finally {
      setCreating(false);
    }
  }

  // Polling for QR + status
  function startPolling(name: string) {
    stopPolling();
    setQrAttempts(0);

    // Fetch QR immediately
    fetchQr(name);

    pollingRef.current = setInterval(async () => {
      try {
        const statusData = await callEvolution({ action: "check-status", instanceName: name });
        const state = statusData?.instance?.state || statusData?.state || "disconnected";
        const mapped = mapStatus(state);

        if (mapped === "connected") {
          setStatus("connected");
          await updateInstanceStatus("connected");
          setQrOpen(false);
          stopPolling();
          toast.success("WhatsApp conectado com sucesso!");
          return;
        }

        // Refresh QR if needed
        setQrAttempts((prev) => {
          if (prev >= 3) {
            stopPolling();
            toast.error("Tempo esgotado. Tente novamente.");
            setQrOpen(false);
            return prev;
          }
          return prev;
        });

        fetchQr(name);
      } catch {
        // Ignore polling errors
      }
    }, 5000);

    // Timeout after 2 minutes
    timeoutRef.current = setTimeout(() => {
      stopPolling();
      setQrOpen(false);
      toast.error("Tempo limite atingido. Tente novamente.");
    }, 120000);
  }

  async function fetchQr(name: string) {
    setQrLoading(true);
    try {
      const data = await callEvolution({ action: "get-qrcode", instanceName: name });
      if (data?.base64) {
        setQrCode(data.base64);
        setQrAttempts((prev) => prev + 1);
      } else if (data?.qrcode?.base64) {
        setQrCode(data.qrcode.base64);
        setQrAttempts((prev) => prev + 1);
      }
    } catch {
      // QR might not be ready yet
    } finally {
      setQrLoading(false);
    }
  }

  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }

  useEffect(() => {
    return () => stopPolling();
  }, []);

  // Reconnect (show QR again)
  async function handleReconnect() {
    if (!instance) return;
    setQrOpen(true);
    startPolling(instance.instance_name);
  }

  // Disconnect
  async function handleDisconnect() {
    if (!instance) return;
    setDisconnecting(true);
    try {
      await callEvolution({ action: "disconnect", instanceName: instance.instance_name });
      await supabase
        .from("whatsapp_instances" as any)
        .delete()
        .eq("id", instance.id);

      setInstance(null);
      setStatus("disconnected");
      setQrCode(null);
      toast.success("WhatsApp desconectado com sucesso");
    } catch (err: any) {
      toast.error(err.message || "Erro ao desconectar");
    } finally {
      setDisconnecting(false);
    }
  }

  const statusConfig: Record<InstanceStatus, { label: string; color: string; icon: React.ReactNode }> = {
    connected: { label: "Conectado", color: "text-green-600", icon: <Wifi className="h-5 w-5 text-green-600" /> },
    disconnected: { label: "Desconectado", color: "text-destructive", icon: <WifiOff className="h-5 w-5 text-destructive" /> },
    connecting: { label: "Conectando...", color: "text-yellow-600", icon: <Loader2 className="h-5 w-5 text-yellow-600 animate-spin" /> },
    qrcode: { label: "Aguardando leitura do QR Code", color: "text-yellow-600", icon: <QrCode className="h-5 w-5 text-yellow-600" /> },
    error: { label: "Erro na conexão", color: "text-destructive", icon: <WifiOff className="h-5 w-5 text-destructive" /> },
  };

  const currentStatus = statusConfig[status];

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-green-600" />
            WhatsApp para envios de mensagens automáticas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Toggle Clientes em Risco */}
          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Enviar mensagens automáticas para Clientes em Risco</Label>
              <p className="text-xs text-muted-foreground">
                {riscoAutoSend ? "Mensagens serão geradas, agendadas e enviadas automaticamente" : "Nenhuma mensagem será gerada ou enviada para clientes em risco"}
              </p>
            </div>
            <Switch
              checked={riscoAutoSend}
              onCheckedChange={handleRiscoToggle}
              disabled={riscoLoading}
            />
          </div>

          {/* Toggle Período de confirmação */}
          <div className="rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">Período de envio das mensagens de confirmação de agendamentos de serviço</Label>
                <p className="text-xs text-muted-foreground">
                  {confirmacaoPeriodoAtivo
                    ? "Configure quando as mensagens de confirmação serão enviadas"
                    : "Usando período padrão (3 horas antes, a partir das 07h)"}
                </p>
              </div>
              <Switch
                checked={confirmacaoPeriodoAtivo}
                onCheckedChange={handleConfirmacaoPeriodoToggle}
                disabled={confirmacaoLoading}
              />
            </div>

            {confirmacaoPeriodoAtivo && (
              <div className="space-y-2 pl-1 pt-1">
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="conf-24h"
                    checked={confirmacao24h}
                    onCheckedChange={(checked) => handleConfirmacaoOptionChange("confirmacao_24h", !!checked)}
                    disabled={confirmacaoLoading}
                  />
                  <div className="grid gap-0.5 leading-none">
                    <Label htmlFor="conf-24h" className="text-sm font-medium cursor-pointer">24 horas antes</Label>
                    <p className="text-xs text-muted-foreground">Sem restrição de horário</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="conf-15h"
                    checked={confirmacao15h}
                    onCheckedChange={(checked) => handleConfirmacaoOptionChange("confirmacao_15h", !!checked)}
                    disabled={confirmacaoLoading}
                  />
                  <div className="grid gap-0.5 leading-none">
                    <Label htmlFor="conf-15h" className="text-sm font-medium cursor-pointer">15 horas antes</Label>
                    <p className="text-xs text-muted-foreground">Envio no máximo até às 18h00</p>
                  </div>
                </div>

                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="conf-3h"
                    checked={confirmacao3h}
                    onCheckedChange={(checked) => handleConfirmacaoOptionChange("confirmacao_3h", !!checked)}
                    disabled={confirmacaoLoading}
                  />
                  <div className="grid gap-0.5 leading-none">
                    <Label htmlFor="conf-3h" className="text-sm font-medium cursor-pointer">3 horas antes</Label>
                    <p className="text-xs text-muted-foreground">Envio a partir das 07h00</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStatus.icon}
            <span className={`font-medium ${currentStatus.color}`}>{currentStatus.label}</span>
          </div>

          {instance && status === "connected" && (
            <div className="text-sm text-muted-foreground">
              Instância: <strong>{instance.instance_name}</strong> · Número: <strong>{instance.phone_number}</strong>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            {!instance && (
              <Button onClick={() => setConfigOpen(true)}>
                <QrCode className="h-4 w-4 mr-2" />
                Configurar WhatsApp
              </Button>
            )}

            {instance && status === "disconnected" && (
              <>
                <Button onClick={handleReconnect}>
                  <QrCode className="h-4 w-4 mr-2" />
                  Reconectar
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={disconnecting}>
                      <Unplug className="h-4 w-4 mr-2" />
                      Remover Instância
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover instância?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso vai remover a instância "{instance.instance_name}" e você precisará configurar novamente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDisconnect}>Remover</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}

            {instance && status === "connected" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={disconnecting}>
                    {disconnecting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Unplug className="h-4 w-4 mr-2" />}
                    Desconectar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Desconectar WhatsApp?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A sessão do WhatsApp será encerrada e a instância removida. Você precisará configurar novamente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDisconnect}>Desconectar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Config Modal */}
      <Dialog open={configOpen} onOpenChange={setConfigOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configurar WhatsApp</DialogTitle>
            <DialogDescription>
              Informe os dados para criar a conexão com o WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instanceName">Nome da instância</Label>
              <Input
                id="instanceName"
                placeholder="ex: minha-petshop"
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value.replace(/\s/g, "-").toLowerCase())}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">Nome único para identificar sua conexão</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber">Número do WhatsApp</Label>
              <Input
                id="phoneNumber"
                placeholder="5561988736460"
                value={phoneNumber}
                onChange={(e) => handlePhoneChange(e.target.value)}
                maxLength={13}
              />
              {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
              <p className="text-xs text-muted-foreground">
                Formato E.164: código do país + DDD + número (ex: 5561988736460)
              </p>
            </div>

            <Button
              className="w-full"
              onClick={handleCreate}
              disabled={creating || !!phoneError || !instanceName.trim() || !phoneNumber}
            >
              {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <QrCode className="h-4 w-4 mr-2" />}
              Criar e Conectar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* QR Code Modal */}
      <Dialog open={qrOpen} onOpenChange={(open) => { if (!open) stopPolling(); setQrOpen(open); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" />
              Conectar WhatsApp
            </DialogTitle>
            <DialogDescription>
              Mantenha o WhatsApp aberto enquanto carregamos as mensagens
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            {qrLoading && !qrCode ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Gerando QR Code...</p>
              </div>
            ) : qrCode ? (
              <div className="border rounded-lg p-2 bg-white">
                <img
                  src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="QR Code WhatsApp"
                  className="w-64 h-64 object-contain"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 py-8">
                <QrCode className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Aguardando QR Code...</p>
              </div>
            )}

            <p className="text-xs text-muted-foreground text-center">
              Abra o WhatsApp no seu celular → Configurações → Aparelhos conectados → Conectar um aparelho
            </p>

            {status === "connecting" && (
              <div className="flex items-center gap-2 text-sm text-yellow-600">
                <Loader2 className="h-4 w-4 animate-spin" />
                Aguardando leitura do QR Code...
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
