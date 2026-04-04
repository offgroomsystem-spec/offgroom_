import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Plus, Pencil, Trash2, Dog, Hotel, Clock, CalendarDays, Package } from "lucide-react";
import { toast } from "sonner";
import NovoPacoteCrecheModal from "@/components/creche/NovoPacoteCrecheModal";

interface ServicoCreche {
  id: string;
  nome: string;
  descricao: string | null;
  tipo: string;
  modelo_preco: string;
  modelo_cobranca: string;
  valor_unico: number;
  valor_pequeno: number;
  valor_medio: number;
  valor_grande: number;
  is_padrao: boolean;
  is_opcional: boolean;
  observacoes_internas: string | null;
}

const emptyForm: Omit<ServicoCreche, "id"> = {
  nome: "",
  descricao: "",
  tipo: "creche",
  modelo_preco: "unico",
  modelo_cobranca: "hora",
  valor_unico: 0,
  valor_pequeno: 0,
  valor_medio: 0,
  valor_grande: 0,
  is_padrao: false,
  is_opcional: true,
  observacoes_internas: "",
};

const generateNome = (tipo: string, modelo_cobranca: string, modelo_preco: string, porte?: string) => {
  const tipoLabel = tipo === "creche" ? "Serviço de Creche" : "Serviço de Hotel";
  const precoLabel = modelo_preco === "unico" ? "Único" : "Por Porte";
  const cobrancaLabel = tipo === "creche"
    ? modelo_cobranca === "hora" ? "Por Hora" : "Por Dia"
    : "";
  const porteLabel = porte ? `Porte ${porte}` : "";
  return [tipoLabel, precoLabel, cobrancaLabel, porteLabel].filter(Boolean).join(", ");
};

interface GroupedServico {
  key: string;
  tipo: string;
  modelo_preco: string;
  modelo_cobranca: string;
  valor_unico: number;
  valor_pequeno: number;
  valor_medio: number;
  valor_grande: number;
  ids: string[];
  records: ServicoCreche[];
}

const groupServicos = (servicos: ServicoCreche[]): GroupedServico[] => {
  const singles: GroupedServico[] = [];
  const porteMap = new Map<string, ServicoCreche[]>();

  for (const s of servicos) {
    if (s.modelo_preco === "porte") {
      const key = `${s.tipo}|${s.modelo_cobranca}`;
      if (!porteMap.has(key)) porteMap.set(key, []);
      porteMap.get(key)!.push(s);
    } else {
      singles.push({
        key: s.id,
        tipo: s.tipo,
        modelo_preco: s.modelo_preco,
        modelo_cobranca: s.modelo_cobranca,
        valor_unico: s.valor_unico,
        valor_pequeno: 0,
        valor_medio: 0,
        valor_grande: 0,
        ids: [s.id],
        records: [s],
      });
    }
  }

  for (const [key, recs] of porteMap) {
    const first = recs[0];
    let vp = 0, vm = 0, vg = 0;
    for (const r of recs) {
      if (r.valor_pequeno > 0) vp = r.valor_pequeno;
      if (r.valor_medio > 0) vm = r.valor_medio;
      if (r.valor_grande > 0) vg = r.valor_grande;
    }
    singles.push({
      key,
      tipo: first.tipo,
      modelo_preco: "porte",
      modelo_cobranca: first.modelo_cobranca,
      valor_unico: 0,
      valor_pequeno: vp,
      valor_medio: vm,
      valor_grande: vg,
      ids: recs.map((r) => r.id),
      records: recs,
    });
  }

  return singles;
};

const ServicosCrecheHotel = () => {
  const { user } = useAuth();
  const [servicos, setServicos] = useState<ServicoCreche[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIds, setEditingIds] = useState<string[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [pacoteModalOpen, setPacoteModalOpen] = useState(false);
  const [pacotes, setPacotes] = useState<any[]>([]);
  const [editingPacote, setEditingPacote] = useState<any>(null);

  const loadServicos = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("servicos_creche")
      .select("*")
      .order("nome");
    if (error) {
      toast.error("Erro ao carregar serviços");
      return;
    }
    setServicos((data as any[]) || []);
    setLoading(false);
  };

  const loadPacotes = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pacotes_creche" as any)
      .select("*")
      .order("nome");
    setPacotes((data as any[]) || []);
  };

  useEffect(() => {
    loadServicos();
    loadPacotes();
  }, [user]);

  const grouped = groupServicos(servicos);

  const openNew = () => {
    setEditingIds([]);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (g: GroupedServico) => {
    setEditingIds(g.ids);
    setForm({
      nome: "",
      descricao: "",
      tipo: g.tipo,
      modelo_preco: g.modelo_preco,
      modelo_cobranca: g.modelo_cobranca || "hora",
      valor_unico: g.valor_unico,
      valor_pequeno: g.valor_pequeno,
      valor_medio: g.valor_medio,
      valor_grande: g.valor_grande,
      is_padrao: false,
      is_opcional: true,
      observacoes_internas: g.records[0]?.observacoes_internas || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (form.modelo_preco === "porte" && (form.valor_pequeno <= 0 || form.valor_medio <= 0 || form.valor_grande <= 0)) {
      toast.error("Defina o valor para todos os portes");
      return;
    }
    if (form.modelo_preco === "unico" && form.valor_unico <= 0) {
      toast.error("Defina o valor do serviço");
      return;
    }

    const basePayload = {
      descricao: null as string | null,
      tipo: form.tipo,
      modelo_preco: form.modelo_preco,
      modelo_cobranca: form.tipo === "creche" ? form.modelo_cobranca : "dia",
      is_padrao: false,
      is_opcional: true,
      observacoes_internas: form.observacoes_internas?.trim() || null,
    };

    if (editingIds.length > 0) {
      if (form.modelo_preco === "porte") {
        const portes = [
          { label: "Pequeno", valor: form.valor_pequeno, field: "valor_pequeno" as const },
          { label: "Médio", valor: form.valor_medio, field: "valor_medio" as const },
          { label: "Grande", valor: form.valor_grande, field: "valor_grande" as const },
        ];
        for (let i = 0; i < editingIds.length && i < portes.length; i++) {
          const p = portes[i];
          await supabase
            .from("servicos_creche")
            .update({
              ...basePayload,
              nome: generateNome(form.tipo, form.modelo_cobranca, form.modelo_preco, p.label),
              valor_unico: 0,
              valor_pequeno: p.field === "valor_pequeno" ? p.valor : 0,
              valor_medio: p.field === "valor_medio" ? p.valor : 0,
              valor_grande: p.field === "valor_grande" ? p.valor : 0,
            } as any)
            .eq("id", editingIds[i]);
        }
      } else {
        const autoNome = generateNome(form.tipo, form.modelo_cobranca, form.modelo_preco);
        await supabase
          .from("servicos_creche")
          .update({
            ...basePayload,
            nome: autoNome,
            valor_unico: form.valor_unico,
            valor_pequeno: 0,
            valor_medio: 0,
            valor_grande: 0,
          } as any)
          .eq("id", editingIds[0]);
      }
      toast.success("Serviço atualizado com sucesso");
    } else if (form.modelo_preco === "porte") {
      const portes = [
        { label: "Pequeno", valor: form.valor_pequeno },
        { label: "Médio", valor: form.valor_medio },
        { label: "Grande", valor: form.valor_grande },
      ];
      const inserts = portes.map((p) => ({
        ...basePayload,
        nome: generateNome(form.tipo, form.modelo_cobranca, form.modelo_preco, p.label),
        valor_unico: 0,
        valor_pequeno: p.label === "Pequeno" ? p.valor : 0,
        valor_medio: p.label === "Médio" ? p.valor : 0,
        valor_grande: p.label === "Grande" ? p.valor : 0,
        user_id: user!.id,
      }));
      const { error } = await supabase.from("servicos_creche").insert(inserts as any);
      if (error) {
        toast.error("Erro ao criar serviços");
        return;
      }
      toast.success("3 serviços criados com sucesso (por porte)");
    } else {
      const payload = {
        ...basePayload,
        nome: generateNome(form.tipo, form.modelo_cobranca, form.modelo_preco),
        valor_unico: form.valor_unico,
        valor_pequeno: 0,
        valor_medio: 0,
        valor_grande: 0,
        user_id: user!.id,
      };
      const { error } = await supabase.from("servicos_creche").insert(payload as any);
      if (error) {
        toast.error("Erro ao criar serviço");
        return;
      }
      toast.success("Serviço criado com sucesso");
    }
    setDialogOpen(false);
    loadServicos();
  };

  const handleDelete = async (g: GroupedServico) => {
    const count = g.ids.length;
    const msg = count > 1
      ? `Isso removerá ${count} registros vinculados (Pequeno, Médio e Grande). Confirmar?`
      : "Tem certeza que deseja excluir este serviço?";
    if (!confirm(msg)) return;
    const { error } = await supabase.from("servicos_creche").delete().in("id", g.ids);
    if (error) {
      toast.error("Erro ao excluir serviço");
      return;
    }
    toast.success(count > 1 ? `${count} registros excluídos` : "Serviço excluído");
    loadServicos();
  };

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getDisplayPrice = (g: GroupedServico) => {
    const suffix = g.tipo === "creche" ? (g.modelo_cobranca === "hora" ? "/h" : "/dia") : "";
    if (g.modelo_preco === "unico") return formatCurrency(g.valor_unico) + suffix;
    return `P: ${formatCurrency(g.valor_pequeno)} | M: ${formatCurrency(g.valor_medio)} | G: ${formatCurrency(g.valor_grande)}${suffix ? ` ${suffix}` : ""}`;
  };

  const getModeloCobrancaLabel = (mc: string) => {
    if (mc === "hora") return "Por Hora";
    return "Por Dia";
  };

  const getValorLabel = () => {
    if (form.tipo === "creche") {
      if (form.modelo_cobranca === "hora") return "Valor/Hora (R$) *";
      return "Valor/Dia (R$) *";
    }
    return "Valor (R$) *";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Serviços Creche & Hotel</h1>
          <p className="text-sm text-muted-foreground">Gerencie os serviços e pacotes disponíveis para Creche e Hotel Pet</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => { setEditingPacote(null); setPacoteModalOpen(true); }} variant="outline" className="gap-2">
            <Package className="h-4 w-4" /> Novo Pacote
          </Button>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Serviço
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-6 text-center text-muted-foreground">Carregando...</p>
          ) : grouped.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">Nenhum serviço cadastrado ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cobrança</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grouped.map((g) => (
                  <TableRow key={g.key}>
                    <TableCell>
                      <Badge variant={g.tipo === "creche" ? "default" : "secondary"} className="gap-1">
                        {g.tipo === "creche" ? <Dog className="h-3 w-3" /> : <Hotel className="h-3 w-3" />}
                        {g.tipo === "creche" ? "Creche" : "Hotel"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {g.tipo === "creche" ? getModeloCobrancaLabel(g.modelo_cobranca) : "—"}
                    </TableCell>
                    <TableCell>{g.modelo_preco === "unico" ? "Valor Único" : "Por Porte"}</TableCell>
                    <TableCell className="text-sm">{getDisplayPrice(g)}</TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(g)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(g)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-4">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-base">{editingIds.length > 0 ? "Editar Serviço" : "Novo Serviço"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Tipo do Serviço *</Label>
                <ToggleGroup
                  type="single"
                  value={form.tipo}
                  onValueChange={(v) => v && setForm({ ...form, tipo: v })}
                  className="justify-start"
                  size="sm"
                >
                  <ToggleGroupItem value="creche" className="gap-1 h-7 px-2.5 text-xs">
                    <Dog className="h-3 w-3" /> Creche
                  </ToggleGroupItem>
                  <ToggleGroupItem value="hotel" className="gap-1 h-7 px-2.5 text-xs">
                    <Hotel className="h-3 w-3" /> Hotel
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Precificação *</Label>
                <ToggleGroup
                  type="single"
                  value={form.modelo_preco}
                  onValueChange={(v) => v && setForm({ ...form, modelo_preco: v })}
                  className="justify-start"
                  size="sm"
                >
                  <ToggleGroupItem value="unico" className="h-7 px-2.5 text-xs">Único</ToggleGroupItem>
                  <ToggleGroupItem value="porte" className="h-7 px-2.5 text-xs">Por Porte</ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

            {form.tipo === "creche" && (
              <div className="space-y-1">
                <Label className="text-xs">Modelo de Cobrança *</Label>
                <ToggleGroup
                  type="single"
                  value={form.modelo_cobranca}
                  onValueChange={(v) => v && setForm({ ...form, modelo_cobranca: v })}
                  className="justify-start"
                  size="sm"
                >
                  <ToggleGroupItem value="hora" className="gap-1 h-7 px-2.5 text-xs">
                    <Clock className="h-3 w-3" /> Por Hora
                  </ToggleGroupItem>
                  <ToggleGroupItem value="dia" className="gap-1 h-7 px-2.5 text-xs">
                    <CalendarDays className="h-3 w-3" /> Por Dia
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            )}

            {form.modelo_preco === "unico" ? (
              <div className="space-y-1">
                <Label className="text-xs">{getValorLabel()}</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.valor_unico || ""}
                  onChange={(e) => setForm({ ...form, valor_unico: parseFloat(e.target.value) || 0 })}
                  className="h-8 text-sm"
                />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Pequeno (R$) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.valor_pequeno || ""}
                    onChange={(e) => setForm({ ...form, valor_pequeno: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Médio (R$) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.valor_medio || ""}
                    onChange={(e) => setForm({ ...form, valor_medio: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Grande (R$) *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.valor_grande || ""}
                    onChange={(e) => setForm({ ...form, valor_grande: parseFloat(e.target.value) || 0 })}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>Cancelar</Button>
              <Button size="sm" onClick={handleSave}>{editingIds.length > 0 ? "Atualizar" : "Criar Serviço"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pacotes Section */}
      {pacotes.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="h-4 w-4" /> Pacotes Cadastrados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Serviços</TableHead>
                  <TableHead>Desconto</TableHead>
                  <TableHead>Valor Final</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pacotes.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium text-sm">{p.nome}</TableCell>
                    <TableCell>
                      <Badge variant={p.tipo === "creche" ? "default" : "secondary"} className="gap-1">
                        {p.tipo === "creche" ? <Dog className="h-3 w-3" /> : <Hotel className="h-3 w-3" />}
                        {p.tipo === "creche" ? "Creche" : "Hotel"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {(p.servicos_ids as string[])?.length || 0} serviço(s)
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.desconto_percentual > 0 ? `${p.desconto_percentual}%` : "—"}
                    </TableCell>
                    <TableCell className="text-sm font-medium">
                      {formatCurrency(p.valor_final)}
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => {
                        setEditingPacote({
                          ...p,
                          servicos_ids: p.servicos_ids || [],
                        });
                        setPacoteModalOpen(true);
                      }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={async () => {
                        if (!confirm("Tem certeza que deseja excluir este pacote?")) return;
                        const { error } = await supabase.from("pacotes_creche" as any).delete().eq("id", p.id);
                        if (error) { toast.error("Erro ao excluir"); return; }
                        toast.success("Pacote excluído");
                        loadPacotes();
                      }}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <NovoPacoteCrecheModal
        open={pacoteModalOpen}
        onOpenChange={setPacoteModalOpen}
        editingPacote={editingPacote}
        onSaved={loadPacotes}
      />
    </div>
  );
};

export default ServicosCrecheHotel;
