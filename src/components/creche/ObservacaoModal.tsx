import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface ObservacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estadiaId: string | null;
  petNome: string;
  onSuccess: () => void;
}

const sugestoesRapidas = [
  "Pet muito ativo",
  "Pet ansioso",
  "Pet calmo e tranquilo",
  "Alimentação normal",
  "Recusou alimentação",
  "Bebeu bastante água",
  "Interagiu bem com outros pets",
  "Prefere ficar isolado",
  "Chorou/latiu bastante",
  "Dormiu bem",
];

const normalizeText = (text: string) => text.toLowerCase().replace(/\s+/g, " ").trim();

const ObservacaoModal = ({ open, onOpenChange, estadiaId, petNome, onSuccess }: ObservacaoModalProps) => {
  const { user } = useAuth();
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);

  // Determine which badges are "active" based on current text
  const activeBadges = useMemo(() => {
    const normalized = normalizeText(obs);
    return new Set(
      sugestoesRapidas.filter((s) => normalized.includes(normalizeText(s)))
    );
  }, [obs]);

  // Load existing observation for today when modal opens
  useEffect(() => {
    if (!open || !estadiaId || !user) {
      return;
    }
    const hoje = format(new Date(), "yyyy-MM-dd");
    setLoading(true);
    supabase
      .from("creche_registros_diarios")
      .select("id, observacoes")
      .eq("estadia_id", estadiaId)
      .eq("data_registro", hoje)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0 && data[0].observacoes) {
          setObs(data[0].observacoes);
          setExistingId(data[0].id);
        } else {
          setObs("");
          setExistingId(null);
        }
        setLoading(false);
      });
  }, [open, estadiaId, user]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setObs("");
      setExistingId(null);
    }
  }, [open]);

  const toggleBadge = (suggestion: string) => {
    if (activeBadges.has(suggestion)) {
      // Remove from text
      let updated = obs;
      // Try removing with separator patterns
      const patterns = [
        suggestion + ". ",
        ". " + suggestion,
        suggestion,
      ];
      for (const pattern of patterns) {
        if (updated.includes(pattern)) {
          updated = updated.replace(pattern, "");
          break;
        }
      }
      // Clean up leftover separators
      updated = updated.replace(/\.\s*\./g, ".").replace(/^\.\s*/, "").replace(/\.\s*$/, "").replace(/\s{2,}/g, " ").trim();
      setObs(updated);
    } else {
      // Add to text
      setObs((prev) => (prev.trim() ? prev.trim() + ". " + suggestion : suggestion));
    }
  };

  const handleSave = async () => {
    if (!estadiaId || !user || !obs.trim()) {
      toast.error("Digite uma observação.");
      return;
    }
    setSaving(true);
    try {
      if (existingId) {
        const { error } = await supabase
          .from("creche_registros_diarios")
          .update({ observacoes: obs.trim() })
          .eq("id", existingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("creche_registros_diarios").insert({
          estadia_id: estadiaId,
          user_id: user.id,
          observacoes: obs.trim(),
        });
        if (error) throw error;
      }
      toast.success("Observação salva!");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Observação - {petNome}</DialogTitle>
          <DialogDescription>Adicione uma observação rápida.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <p className="text-sm text-muted-foreground text-center py-4">Carregando...</p>
        ) : (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {sugestoesRapidas.map((s) => {
                const isActive = activeBadges.has(s);
                return (
                  <Badge
                    key={s}
                    variant={isActive ? "default" : "outline"}
                    className={`cursor-pointer text-[11px] transition-colors ${
                      isActive
                        ? "bg-primary text-primary-foreground hover:bg-primary/80"
                        : "hover:bg-accent"
                    }`}
                    onClick={() => toggleBadge(s)}
                  >
                    {s}
                  </Badge>
                );
              })}
            </div>

            <Textarea
              placeholder="Digite a observação..."
              value={obs}
              onChange={(e) => setObs(e.target.value)}
              className="min-h-[80px] text-sm"
            />

            <Button onClick={handleSave} disabled={saving || !obs.trim()} className="w-full">
              {saving ? "Salvando..." : "Salvar Observação"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ObservacaoModal;
