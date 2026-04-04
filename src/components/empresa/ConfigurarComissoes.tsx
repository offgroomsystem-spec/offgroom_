import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface Groomer {
  id: string;
  nome: string;
}

type ModeloComissao = "groomer" | "faturamento" | "atendimento" | "hibrida";
type TipoComissao = "servicos" | "produtos" | "servicos_e_vendas";

interface ComissaoConfig {
  id?: string;
  ativo: boolean;
  modelo: ModeloComissao;
  tipo_comissao: TipoComissao;
  comissao_faturamento: number;
  comissao_atendimento: number;
  bonus_meta: number;
  comissoes_groomers: Record<string, number>;
  tipos_comissao_groomers: Record<string, TipoComissao>;
}

interface Props {
  groomers: Groomer[];
}

const MODELOS: { value: ModeloComissao; label: string; desc: string }[] = [
  { value: "groomer", label: "Comissão por Groomer", desc: "Percentual individual por groomer sobre o faturamento bruto. A comissão é aplicada sobre o faturamento total da empresa, mesmo em serviços e vendas não realizados pelo groomer." },
  { value: "faturamento", label: "Comissão por Faturamento", desc: "Percentual único sobre o faturamento bruto. A comissão é aplicada sobre o faturamento total da empresa, mesmo em serviços e vendas não realizados pelo groomer." },
  { value: "atendimento", label: "Comissão por Atendimento", desc: "Percentual por atendimento sobre o faturamento bruto. A comissão é aplicada apenas sobre os serviços e vendas realizados pelo próprio groomer" },
  { value: "hibrida", label: "Comissão Híbrida", desc: "Faturamento + Atendimento + Bônus por Meta batida" },
];

const TIPOS_COMISSAO: { value: TipoComissao; label: string }[] = [
  { value: "servicos", label: "Comissão apenas para Serviços Realizados" },
  { value: "produtos", label: "Comissão apenas para Produtos Vendidos" },
  { value: "servicos_e_vendas", label: "Comissão sobre os Serviços e Vendas" },
];

export function ConfigurarComissoes({ groomers }: Props) {
  const { user, ownerId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<ComissaoConfig>({
    ativo: false,
    modelo: "groomer",
    tipo_comissao: "servicos_e_vendas",
    comissao_faturamento: 0,
    comissao_atendimento: 0,
    bonus_meta: 0,
    comissoes_groomers: {},
    tipos_comissao_groomers: {},
  });

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data, error } = await supabase
        .from("comissoes_config" as any)
        .select("*")
        .eq("user_id", ownerId)
        .single();

      if (!error && data) {
        const d = data as any;
        setConfig({
          id: d.id,
          ativo: d.ativo ?? false,
          modelo: d.modelo ?? "groomer",
          tipo_comissao: d.tipo_comissao ?? "servicos_e_vendas",
          comissao_faturamento: d.comissao_faturamento ?? 0,
          comissao_atendimento: d.comissao_atendimento ?? 0,
          bonus_meta: d.bonus_meta ?? 0,
          comissoes_groomers: (d.comissoes_groomers as Record<string, number>) ?? {},
          tipos_comissao_groomers: (d.tipos_comissao_groomers as Record<string, TipoComissao>) ?? {},
        });
      }
      setLoading(false);
    };
    fetch();
  }, [user, ownerId]);

  const clampValue = (val: string): number => {
    const n = parseFloat(val);
    if (isNaN(n)) return 0;
    return Math.min(100, Math.max(0, n));
  };

  const validate = (): boolean => {
    if (config.modelo === "groomer") {
      for (const g of groomers) {
        const v = config.comissoes_groomers[g.id];
        if (v === undefined || v === null || isNaN(v)) {
          toast.error(`Preencha a comissão do groomer ${g.nome}`);
          return false;
        }
        const tipo = config.tipos_comissao_groomers[g.id];
        if (!tipo) {
          toast.error(`Selecione o tipo de comissão do groomer ${g.nome}`);
          return false;
        }
      }
    }
    if (config.modelo === "faturamento") {
      if (!config.comissao_faturamento && config.comissao_faturamento !== 0) {
        toast.error("Preencha a comissão por faturamento");
        return false;
      }
    }
    if (config.modelo === "atendimento") {
      if (!config.comissao_atendimento && config.comissao_atendimento !== 0) {
        toast.error("Preencha a comissão por atendimento");
        return false;
      }
    }
    if (config.modelo === "hibrida") {
      if (config.comissao_faturamento === null || config.comissao_atendimento === null || config.bonus_meta === null) {
        toast.error("Preencha todos os campos da comissão híbrida");
        return false;
      }
    }
    if (!config.tipo_comissao) {
      toast.error("Selecione o tipo de comissão");
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!user) return;
    if (config.ativo && !validate()) return;

    setSaving(true);
    const payload: any = {
      user_id: ownerId,
      ativo: config.ativo,
      modelo: config.modelo,
      tipo_comissao: config.tipo_comissao,
      comissao_faturamento: config.comissao_faturamento,
      comissao_atendimento: config.comissao_atendimento,
      bonus_meta: config.bonus_meta,
      comissoes_groomers: config.comissoes_groomers,
      tipos_comissao_groomers: config.tipos_comissao_groomers,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (config.id) {
      ({ error } = await supabase
        .from("comissoes_config" as any)
        .update(payload)
        .eq("id", config.id));
    } else {
      const { data, error: e } = await supabase
        .from("comissoes_config" as any)
        .insert(payload)
        .select()
        .single();
      error = e;
      if (data) setConfig((c) => ({ ...c, id: (data as any).id }));
    }

    setSaving(false);
    if (error) {
      console.error(error);
      toast.error("Erro ao salvar configuração de comissões");
    } else {
      toast.success("Configuração de comissões salva!");
    }
  };

  const handleToggle = (checked: boolean) => {
    setConfig((c) => ({ ...c, ativo: checked }));
  };

  const handleModeloChange = (modelo: ModeloComissao) => {
    setConfig((c) => ({
      ...c,
      modelo,
      comissao_faturamento: 0,
      comissao_atendimento: 0,
      bonus_meta: 0,
      comissoes_groomers: {},
      tipos_comissao_groomers: {},
      tipo_comissao: modelo === "faturamento" ? "servicos_e_vendas" : c.tipo_comissao,
    }));
  };

  const GroomerTipoComissaoSelector = ({ groomerId }: { groomerId: string }) => {
    const value = config.tipos_comissao_groomers[groomerId] || "";
    return (
      <RadioGroup
        value={value}
        onValueChange={(v) =>
          setConfig((c) => ({
            ...c,
            tipos_comissao_groomers: {
              ...c.tipos_comissao_groomers,
              [groomerId]: v as TipoComissao,
            },
          }))
        }
        className="flex flex-wrap gap-x-3 gap-y-0.5"
      >
        {TIPOS_COMISSAO.map((t) => (
          <div key={t.value} className="flex items-center gap-1.5">
            <RadioGroupItem value={t.value} id={`tipo-${groomerId}-${t.value}`} className="h-3 w-3" />
            <Label htmlFor={`tipo-${groomerId}-${t.value}`} className="text-[10px] text-muted-foreground cursor-pointer leading-tight font-normal">
              {t.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    );
  };

  const TipoComissaoSelector = ({ inline = false }: { inline?: boolean }) => {
    if (config.modelo === "faturamento") {
      return (
        <div className={inline ? "flex items-center" : "pt-1"}>
          <div className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-full border border-primary bg-primary flex items-center justify-center">
              <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
            </div>
            <span className="text-[10px] text-muted-foreground leading-tight">Comissão sobre os Serviços e Vendas</span>
          </div>
        </div>
      );
    }

    return (
      <RadioGroup
        value={config.tipo_comissao}
        onValueChange={(v) => setConfig((c) => ({ ...c, tipo_comissao: v as TipoComissao }))}
        className={inline ? "flex flex-wrap gap-x-3 gap-y-0.5" : "space-y-0.5 pt-1"}
      >
        {TIPOS_COMISSAO.map((t) => (
          <div key={t.value} className="flex items-center gap-1.5">
            <RadioGroupItem value={t.value} id={`tipo-${t.value}`} className="h-3 w-3" />
            <Label htmlFor={`tipo-${t.value}`} className="text-[10px] text-muted-foreground cursor-pointer leading-tight font-normal">
              {t.label}
            </Label>
          </div>
        ))}
      </RadioGroup>
    );
  };

  if (loading) return null;

  return (
    <Card>
      <CardHeader className="px-5 py-4">
        <CardTitle className="text-base">Configurar Comissões</CardTitle>
        <CardDescription className="text-[11px]">Defina as regras de comissão dos colaboradores</CardDescription>
      </CardHeader>
      <CardContent className="px-5 space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="comissao-toggle" className="text-[11px] font-semibold">
            Ativar controle de comissões
          </Label>
          <Switch
            id="comissao-toggle"
            checked={config.ativo}
            onCheckedChange={handleToggle}
          />
        </div>

        {config.ativo && (
          <div className="space-y-1.5 pt-1">
            <RadioGroup
              value={config.modelo}
              onValueChange={(v) => handleModeloChange(v as ModeloComissao)}
              className="space-y-1"
            >
              {MODELOS.map((m) => (
                <div key={m.value} className="flex items-start space-x-2 rounded-md border p-2">
                  <RadioGroupItem value={m.value} id={`modelo-${m.value}`} className="mt-0.5" />
                  <div>
                    <Label htmlFor={`modelo-${m.value}`} className="text-[11px] font-semibold cursor-pointer">
                      {m.label}
                    </Label>
                    <p className="text-[10px] text-muted-foreground leading-tight">{m.desc}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>

            {/* Campos por modelo */}
            <div className="space-y-1.5 pt-1">
              {config.modelo === "groomer" && (
                <>
                  {groomers.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground">Nenhum groomer cadastrado. Cadastre groomers acima para configurar comissões individuais.</p>
                  ) : (
                    groomers.map((g) => (
                      <div key={g.id} className="space-y-1 rounded-md border p-2">
                        <div className="flex items-center gap-2">
                          <Label className="min-w-[90px] text-[11px] font-semibold">{g.nome}</Label>
                          <div className="relative max-w-[100px]">
                            <Input
                              type="number"
                              min={0}
                              max={100}
                              step="0.01"
                              placeholder="0"
                              className="h-7 text-[12px] pr-6"
                              value={config.comissoes_groomers[g.id] ?? ""}
                              onChange={(e) =>
                                setConfig((c) => ({
                                  ...c,
                                  comissoes_groomers: {
                                    ...c.comissoes_groomers,
                                    [g.id]: clampValue(e.target.value),
                                  },
                                }))
                              }
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[11px]">%</span>
                          </div>
                        </div>
                        <GroomerTipoComissaoSelector groomerId={g.id} />
                      </div>
                    ))
                  )}
                </>
              )}

              {config.modelo === "faturamento" && (
                <div className="space-y-[2px]">
                  <Label className="text-[11px] font-semibold">Comissão sobre Faturamento</Label>
                  <div className="flex items-center gap-2">
                    <div className="relative max-w-[120px]">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.01"
                        placeholder="0"
                        className="h-7 text-[12px] pr-6"
                        value={config.comissao_faturamento || ""}
                        onChange={(e) => setConfig((c) => ({ ...c, comissao_faturamento: clampValue(e.target.value) }))}
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[11px]">%</span>
                    </div>
                    <TipoComissaoSelector inline />
                  </div>
                </div>
              )}

              {config.modelo === "atendimento" && (
                <div className="space-y-[2px]">
                  <Label className="text-[11px] font-semibold">Comissão por Atendimento Realizado</Label>
                  <div className="relative max-w-[120px]">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step="0.01"
                      placeholder="0"
                      className="h-7 text-[12px] pr-6"
                      value={config.comissao_atendimento || ""}
                      onChange={(e) => setConfig((c) => ({ ...c, comissao_atendimento: clampValue(e.target.value) }))}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[11px]">%</span>
                  </div>
                  <TipoComissaoSelector />
                </div>
              )}

              {config.modelo === "hibrida" && (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div className="space-y-[2px]">
                      <Label className="text-[11px] font-semibold">Faturamento</Label>
                      <p className="text-[9px] text-muted-foreground leading-tight">A comissão é aplicada sobre o faturamento total da empresa, mesmo em serviços e vendas não realizados pelo groomer.</p>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          placeholder="0"
                          className="h-7 text-[12px] pr-6"
                          value={config.comissao_faturamento || ""}
                          onChange={(e) => setConfig((c) => ({ ...c, comissao_faturamento: clampValue(e.target.value) }))}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[11px]">%</span>
                      </div>
                    </div>
                    <div className="space-y-[2px]">
                      <Label className="text-[11px] font-semibold">Atendimento</Label>
                      <p className="text-[9px] text-muted-foreground leading-tight">A comissão é aplicada apenas sobre os serviços e vendas realizados pelo próprio groomer</p>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          placeholder="0"
                          className="h-7 text-[12px] pr-6"
                          value={config.comissao_atendimento || ""}
                          onChange={(e) => setConfig((c) => ({ ...c, comissao_atendimento: clampValue(e.target.value) }))}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[11px]">%</span>
                      </div>
                    </div>
                    <div className="space-y-[2px]">
                      <Label className="text-[11px] font-semibold">Bônus por Meta batida</Label>
                      <p className="text-[9px] text-muted-foreground leading-tight">Se a meta for atingida, a comissão será calculada apenas sobre o valor que passar dessa meta, independentemente de qual groomer fez o atendimento.</p>
                      <div className="relative">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          placeholder="0"
                          className="h-7 text-[12px] pr-6"
                          value={config.bonus_meta || ""}
                          onChange={(e) => setConfig((c) => ({ ...c, bonus_meta: clampValue(e.target.value) }))}
                        />
                        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-[11px]">%</span>
                      </div>
                    </div>
                  </div>
                  <TipoComissaoSelector />
                </div>
              )}
            </div>

            <Button onClick={handleSave} disabled={saving} className="h-7 text-[12px] font-semibold w-full">
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />}
              Salvar Comissões
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
