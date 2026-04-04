import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

interface Estadia {
  id: string;
  tipo: string;
  data_entrada: string;
  hora_entrada: string;
  data_saida_prevista: string | null;
  pet_nome: string;
  cliente_nome: string;
  pet_porte?: string;
  modelo_cobranca?: string | null;
  modelo_preco?: string;
  pet_id?: string;
  cliente_id?: string;
  servicos_extras?: any[];
}

interface BillingItem {
  estadiaId: string;
  petNome: string;
  valorTotal: number;
  descricao: string;
  servicoNome: string;
  quantidade: number;
  valorUnitario: number;
  isExcedente?: boolean;
}

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  estadiasAtivas: Estadia[];
  onSuccess: () => void;
  contextClienteNome?: string | null;
  contextEstadiaId?: string | null;
}

const normalizeText = (value?: string | null) =>
  (value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

const normalizeTipo = (value?: string | null) => {
  const v = normalizeText(value);
  if (v.includes("hotel") || v.includes("hosped")) return "hotel";
  if (v.includes("creche") || v.includes("day")) return "creche";
  return v;
};

const normalizeModeloPreco = (value?: string | null) => {
  const v = normalizeText(value);
  if (v.includes("porte")) return "porte";
  return "unico";
};

const normalizeModeloCobranca = (value?: string | null) => {
  const v = normalizeText(value);
  if (v.includes("hora")) return "hora";
  if (v.includes("dia") || v.includes("diaria")) return "dia";
  if (v.includes("period")) return "periodo";
  return null;
};

function calcularBillingItem(
  horaEntrada: string,
  dataEntrada: string,
  horaSaida: string,
  dataSaida: string,
  valorUnit: number,
  modeloCobranca: string,
  horarioCheckoutConfig?: string | null
): { quantidade: number; valorTotal: number; descricao: string; excessoMinutos?: number } {
  const entrada = new Date(`${dataEntrada}T${horaEntrada}`);
  const saida = new Date(`${dataSaida}T${horaSaida}`);
  const diffMs = saida.getTime() - entrada.getTime();
  const totalMinutos = Math.max(0, Math.floor(diffMs / 60000));

  if (modeloCobranca === "hora") {
    const horas = Math.floor(totalMinutos / 60);
    const minExc = totalMinutos % 60;
    const horasEfetivas = Math.max(1, horas);
    if (minExc <= 29) {
      return {
        quantidade: horasEfetivas,
        valorTotal: Math.round(horasEfetivas * valorUnit * 100) / 100,
        descricao: `${horasEfetivas}h${minExc > 0 ? ` (${minExc}min tolerância)` : ""}`,
      };
    } else {
      const qty = Math.round((horas + minExc / 60) * 100) / 100;
      return {
        quantidade: qty,
        valorTotal: Math.round(qty * valorUnit * 100) / 100,
        descricao: `${horas}h${minExc}min`,
      };
    }
  } else if (modeloCobranca === "periodo") {
    const periodos = Math.max(1, Math.floor(totalMinutos / 240));
    const minExc = Math.max(0, totalMinutos - periodos * 240);
    if (minExc <= 29) {
      return {
        quantidade: periodos,
        valorTotal: Math.round(periodos * valorUnit * 100) / 100,
        descricao: `${periodos} período(s)`,
      };
    } else {
      const qty = Math.round((periodos + minExc / 240) * 100) / 100;
      return {
        quantidade: qty,
        valorTotal: Math.round(qty * valorUnit * 100) / 100,
        descricao: `${periodos} período(s) + ${minExc}min`,
      };
    }
  } else {
    // dia: uses configured checkout time to define the daily boundary
    // If horarioCheckoutConfig is set (e.g. "18:00"), a "diária" spans from entry
    // until that time. Any time past checkout on the last day = excess.
    if (horarioCheckoutConfig) {
      const [hCO, mCO] = horarioCheckoutConfig.split(":").map(Number);

      // Calculate number of calendar days between entry date and exit date
      const entradaDate = new Date(`${dataEntrada}T00:00:00`);
      const saidaDate = new Date(`${dataSaida}T00:00:00`);
      const calendarDays = Math.round((saidaDate.getTime() - entradaDate.getTime()) / 86400000);

      // Build the checkout deadline for the exit day
      const checkoutDeadline = new Date(`${dataSaida}T${String(hCO).padStart(2, "0")}:${String(mCO).padStart(2, "0")}:00`);

      // If same day: 1 diária if within checkout time
      if (calendarDays === 0) {
        const excessMs = saida.getTime() - checkoutDeadline.getTime();
        const excessMin = excessMs > 0 ? Math.floor(excessMs / 60000) : 0;
        if (excessMin <= 29) {
          return {
            quantidade: 1,
            valorTotal: Math.round(valorUnit * 100) / 100,
            descricao: "1 diária",
          };
        } else {
          return {
            quantidade: 1,
            valorTotal: Math.round(valorUnit * 100) / 100,
            descricao: "1 diária",
            excessoMinutos: excessMin,
          };
        }
      }

      // Multi-day: base = calendarDays diárias
      // Check if exit time exceeds checkout deadline on exit day
      const excessMs = saida.getTime() - checkoutDeadline.getTime();
      const excessMin = excessMs > 0 ? Math.floor(excessMs / 60000) : 0;
      const dias = Math.max(1, calendarDays);

      if (excessMin <= 29) {
        return {
          quantidade: dias,
          valorTotal: Math.round(dias * valorUnit * 100) / 100,
          descricao: `${dias} diária(s)`,
        };
      } else if (excessMin >= 1440) {
        // Excess >= 1 full extra day
        const extraDias = Math.floor(excessMin / 1440);
        const remainMin = excessMin % 1440;
        const totalDias = dias + extraDias;
        return {
          quantidade: totalDias,
          valorTotal: Math.round(totalDias * valorUnit * 100) / 100,
          descricao: `${totalDias} diária(s)`,
          excessoMinutos: remainMin > 29 ? remainMin : undefined,
        };
      } else {
        return {
          quantidade: dias,
          valorTotal: Math.round(dias * valorUnit * 100) / 100,
          descricao: `${dias} diária(s)`,
          excessoMinutos: excessMin,
        };
      }
    }

    // Fallback: original 24h-based logic when no checkout config
    const dias = Math.max(1, Math.floor(totalMinutos / 1440));
    const minExc = Math.max(0, totalMinutos - dias * 1440);

    if (minExc <= 29) {
      return {
        quantidade: dias,
        valorTotal: Math.round(dias * valorUnit * 100) / 100,
        descricao: `${dias} diária(s)`,
      };
    } else if (minExc >= 1440) {
      const totalDias = dias + Math.floor(minExc / 1440);
      return {
        quantidade: totalDias,
        valorTotal: Math.round(totalDias * valorUnit * 100) / 100,
        descricao: `${totalDias} diária(s)`,
        excessoMinutos: minExc % 1440 > 29 ? minExc % 1440 : undefined,
      };
    } else {
      return {
        quantidade: dias,
        valorTotal: Math.round(dias * valorUnit * 100) / 100,
        descricao: `${dias} diária(s)`,
        excessoMinutos: minExc,
      };
    }
  }
}

const CheckoutModal = ({ open, onOpenChange, estadiasAtivas, onSuccess, contextClienteNome, contextEstadiaId }: CheckoutModalProps) => {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [observacoes, setObservacoes] = useState("");
  const [saving, setSaving] = useState(false);
  const [billingItems, setBillingItems] = useState<BillingItem[]>([]);
  const [includedAllClientPets, setIncludedAllClientPets] = useState<boolean | null>(null);

  // Find the context estadia to get cliente_id
  const contextEstadia = contextEstadiaId
    ? estadiasAtivas.find((e) => e.id === contextEstadiaId)
    : null;

  const contextClienteId = contextEstadia?.cliente_id || null;

  // Other pets from the same tutor (by cliente_id) that are NOT the context pet
  const otherClientPets = useMemo(() => {
    if (!contextClienteId || !contextEstadiaId) return [];
    return estadiasAtivas.filter(
      (e) => e.cliente_id === contextClienteId && e.id !== contextEstadiaId
    );
  }, [estadiasAtivas, contextClienteId, contextEstadiaId]);

  const showSameTutorAlert = contextEstadiaId && otherClientPets.length > 0 && includedAllClientPets === null;

  // Determine which estadias to show in the list
  const filteredEstadias = useMemo(() => {
    if (contextEstadiaId && contextClienteId) {
      if (includedAllClientPets === true) {
        // Show all pets from the same tutor
        return estadiasAtivas.filter((e) => e.cliente_id === contextClienteId);
      }
      // Show only the triggered pet (before or after declining)
      if (includedAllClientPets === false || includedAllClientPets === null) {
        return estadiasAtivas.filter((e) => e.id === contextEstadiaId);
      }
    }
    if (contextClienteNome) {
      return estadiasAtivas.filter((e) => e.cliente_nome === contextClienteNome);
    }
    return estadiasAtivas;
  }, [estadiasAtivas, contextEstadiaId, contextClienteId, contextClienteNome, includedAllClientPets]);

  const allSelected = filteredEstadias.length > 0 && selectedIds.size === filteredEstadias.length;

  useEffect(() => {
    if (open && contextEstadiaId) {
      setSelectedIds(new Set([contextEstadiaId]));
      setIncludedAllClientPets(null);
    }
    if (!open) {
      setSelectedIds(new Set());
      setObservacoes("");
      setBillingItems([]);
      setIncludedAllClientPets(null);
    }
  }, [open, contextEstadiaId]);

  const handleIncludeAllPets = () => {
    setIncludedAllClientPets(true);
    // Select all pets from the same tutor
    const allIds = new Set<string>();
    if (contextEstadiaId) allIds.add(contextEstadiaId);
    otherClientPets.forEach((e) => allIds.add(e.id));
    setSelectedIds(allIds);
  };

  const handleDeclineInclude = () => {
    setIncludedAllClientPets(false);
  };

  // Calculate billing for all selected pets
  useEffect(() => {
    if (selectedIds.size === 0) {
      setBillingItems([]);
      return;
    }

    const selectedEstadias = filteredEstadias.filter((e) => selectedIds.has(e.id));

    const calcBilling = async () => {
      try {
        const [{ data: servicos }, { data: empresaConfig }] = await Promise.all([
          supabase.from("servicos_creche").select("*"),
          supabase.from("empresa_config").select("horario_checkin_creche, horario_checkout_creche").limit(1).single(),
        ]);

        const horarioCheckoutConfig = (empresaConfig as any)?.horario_checkout_creche || null;

        if (!servicos || servicos.length === 0) {
          console.warn("[Checkout] Nenhum serviço cadastrado em servicos_creche");
          setBillingItems([]);
          return;
        }

        if (!horarioCheckoutConfig) {
          console.warn("[Checkout] Horário de check-out não configurado na empresa. Usando cálculo por 24h.");
        }

        const now = new Date();
        const horaSaida = format(now, "HH:mm");
        const dataSaida = format(now, "yyyy-MM-dd");

        const items: BillingItem[] = [];

        for (const est of selectedEstadias) {
          const tipoEstadia = normalizeTipo(est.tipo);
          const isHotel = tipoEstadia === "hotel";
          const mcOriginal = normalizeModeloCobranca(est.modelo_cobranca);
          const mpOriginal = normalizeModeloPreco(est.modelo_preco || "unico");
          let mpResolvido = mpOriginal;

          const petPorteNorm = normalizeText(est.pet_porte);
          const porteField = petPorteNorm === "pequeno"
            ? "valor_pequeno"
            : petPorteNorm === "medio"
              ? "valor_medio"
              : petPorteNorm === "grande"
                ? "valor_grande"
                : null;

          console.log(
            `[Checkout] Pet: ${est.pet_nome}, tipo: ${tipoEstadia}, modelo_preco: ${mpOriginal}, modelo_cobranca: ${mcOriginal}, porte: ${petPorteNorm}`
          );

          const servicosDoTipo = servicos.filter((s: any) => normalizeTipo(s.tipo) === tipoEstadia);

          const servicosTipoFallback =
            servicosDoTipo.length > 0
              ? servicosDoTipo
              : isHotel
                ? servicos.filter((s: any) => {
                    const nome = normalizeText(s.nome);
                    return nome.includes("hotel") || nome.includes("hosped");
                  })
                : servicosDoTipo;

          const servicosMesmoModeloPreco = servicosTipoFallback.filter(
            (s: any) => normalizeModeloPreco(s.modelo_preco) === mpOriginal
          );

          // Para hotel, ignoramos modelo_cobranca na busca (o cálculo será sempre por diária no checkout)
          const matchingServicos = !isHotel && mcOriginal
            ? servicosMesmoModeloPreco.filter(
                (s: any) => normalizeModeloCobranca(s.modelo_cobranca) === mcOriginal
              )
            : servicosMesmoModeloPreco;

          // Fallback: tipo + modelo_preco
          const fallback1 = matchingServicos.length > 0
            ? matchingServicos
            : servicosMesmoModeloPreco;

          // Fallback: tipo only
          let candidatos = fallback1.length > 0 ? fallback1 : servicosTipoFallback;

          // Autoajuste para inconsistência de modelo_preco no hotel (ex.: estadia salva como "unico" mas serviço cadastrado por porte)
          if (isHotel && candidatos.length > 0) {
            const hasUnicoTipo = servicosTipoFallback.some((s: any) => (s.valor_unico || 0) > 0);
            const hasPorteTipo = !!porteField && servicosTipoFallback.some((s: any) => (s[porteField] || 0) > 0);
            const hasUnicoNosCandidatos = candidatos.some((s: any) => (s.valor_unico || 0) > 0);
            const hasPorteNosCandidatos = !!porteField && candidatos.some((s: any) => (s[porteField] || 0) > 0);

            if (mpOriginal === "unico" && !hasUnicoNosCandidatos && hasPorteTipo && porteField) {
              mpResolvido = "porte";
              candidatos = servicosTipoFallback.filter(
                (s: any) => normalizeModeloPreco(s.modelo_preco) === "porte" || (s[porteField] || 0) > 0
              );
            }

            if (mpOriginal === "porte" && !hasPorteNosCandidatos && hasUnicoTipo) {
              mpResolvido = "unico";
              candidatos = servicosTipoFallback.filter(
                (s: any) => normalizeModeloPreco(s.modelo_preco) === "unico" || (s.valor_unico || 0) > 0
              );
            }
          }

          console.log(
            `[Checkout] Busca serviço: tipo=${tipoEstadia}, candidatos_tipo=${servicosTipoFallback.length}, candidatos_finais=${candidatos.length}, mp_original=${mpOriginal}, mp_resolvido=${mpResolvido}`
          );

          if (candidatos.length === 0) {
            console.warn(
              `[Checkout] Serviço não encontrado para ${est.pet_nome} (tipo=${tipoEstadia}, mc=${mcOriginal}, mp=${mpOriginal})`
            );
            toast.error(`Valor do serviço não encontrado para ${est.pet_nome}. Verifique o cadastro.`);
            continue;
          }

          // Buscar valor unitário de forma resiliente
          let valorUnit = 0;
          let servicoUsado = candidatos[0];

          const shouldUsePorte = mpResolvido === "porte" || (
            !!porteField &&
            !candidatos.some((s: any) => (s.valor_unico || 0) > 0) &&
            candidatos.some((s: any) => (s[porteField] || 0) > 0)
          );

          if (shouldUsePorte && porteField) {
            const match = candidatos.find((s: any) => (s[porteField] || 0) > 0);
            if (match) {
              servicoUsado = match;
              valorUnit = match[porteField] || 0;
            }
          }

          if (valorUnit === 0) {
            const matchUnico = candidatos.find((s: any) => (s.valor_unico || 0) > 0);
            if (matchUnico) {
              servicoUsado = matchUnico;
              valorUnit = matchUnico.valor_unico || 0;
              mpResolvido = "unico";
            }
          }

          if (valorUnit === 0 && porteField) {
            const matchPorte = candidatos.find((s: any) => (s[porteField] || 0) > 0);
            if (matchPorte) {
              servicoUsado = matchPorte;
              valorUnit = matchPorte[porteField] || 0;
              mpResolvido = "porte";
            }
          }

          const servico = servicoUsado;

          console.log(
            `[Checkout] Serviço encontrado: ${servico.nome}, valorUnit=${valorUnit}, mp=${mpResolvido}, porte=${petPorteNorm}`
          );

          if (valorUnit === 0) {
            console.warn(`[Checkout] Valor unitário zerado para ${est.pet_nome} (porte=${est.pet_porte}, modelo=${mpResolvido})`);
            toast.error(`Valor do serviço zerado para ${est.pet_nome}. Verifique o cadastro em Serviços Creche & Hotel.`);
          }

          // Hotel sempre calcula por diária, usando timestamp real do check-out
          const effectiveMc = isHotel ? "dia" : (servico.modelo_cobranca || mcOriginal || "periodo");
          const result = calcularBillingItem(est.hora_entrada, est.data_entrada, horaSaida, dataSaida, valorUnit, effectiveMc, effectiveMc === "dia" ? horarioCheckoutConfig : null);

          console.log(`[Checkout] Cálculo: qty=${result.quantidade}, valorUnit=${valorUnit}, total=${result.valorTotal}, excessoMin=${result.excessoMinutos || 0}`);

          items.push({
            estadiaId: est.id,
            petNome: est.pet_nome,
            valorTotal: result.valorTotal,
            descricao: result.descricao,
            servicoNome: servico.nome,
            quantidade: result.quantidade,
            valorUnitario: valorUnit,
          });

          // Handle excess minutes as a separate billing line (creche por hora)
          if (result.excessoMinutos && result.excessoMinutos > 29) {
            // Look up creche "por hora" service matching the modelo_preco
            const servicosCrecheHora = servicos.filter((s: any) => {
              const sTipo = normalizeTipo(s.tipo);
              const sMc = normalizeModeloCobranca(s.modelo_cobranca);
              const sMp = normalizeModeloPreco(s.modelo_preco);
              return sTipo === "creche" && sMc === "hora" && sMp === mpResolvido;
            });

            // Fallback: any creche por hora service
            const servicosCrecheHoraFallback = servicosCrecheHora.length > 0
              ? servicosCrecheHora
              : servicos.filter((s: any) => normalizeTipo(s.tipo) === "creche" && normalizeModeloCobranca(s.modelo_cobranca) === "hora");

            if (servicosCrecheHoraFallback.length > 0) {
              let excValorUnit = 0;
              let excServico = servicosCrecheHoraFallback[0];

              const shouldUsePorteExc = mpResolvido === "porte" && porteField;
              if (shouldUsePorteExc && porteField) {
                const match = servicosCrecheHoraFallback.find((s: any) => (s[porteField] || 0) > 0);
                if (match) {
                  excServico = match;
                  excValorUnit = match[porteField] || 0;
                }
              }
              if (excValorUnit === 0) {
                const matchUnico = servicosCrecheHoraFallback.find((s: any) => (s.valor_unico || 0) > 0);
                if (matchUnico) {
                  excServico = matchUnico;
                  excValorUnit = matchUnico.valor_unico || 0;
                }
              }

              if (excValorUnit > 0) {
                const excHoras = Math.floor(result.excessoMinutos / 60);
                const excMin = result.excessoMinutos % 60;
                let excQty: number;
                let excDescricao: string;

                if (excMin <= 29) {
                  excQty = Math.max(1, excHoras);
                  excDescricao = `Excedente: ${excQty}h${excMin > 0 ? ` (${excMin}min tolerância)` : ""}`;
                } else {
                  excQty = Math.round((excHoras + excMin / 60) * 100) / 100;
                  excDescricao = `Excedente: ${excHoras}h${excMin}min`;
                }

                const excTotal = Math.round(excQty * excValorUnit * 100) / 100;

                console.log(`[Checkout] Excedente: qty=${excQty}, valorUnit=${excValorUnit}, total=${excTotal}, servico=${excServico.nome}`);

                items.push({
                  estadiaId: est.id,
                  petNome: est.pet_nome,
                  valorTotal: excTotal,
                  descricao: excDescricao,
                  servicoNome: excServico.nome,
                  quantidade: excQty,
                  valorUnitario: excValorUnit,
                  isExcedente: true,
                });
              } else {
                console.warn(`[Checkout] Serviço de creche por hora com valor zerado para excedente de ${est.pet_nome}`);
                toast.error(`Serviço de creche por hora não configurado corretamente para o excedente de ${est.pet_nome}.`);
              }
            } else {
              console.warn(`[Checkout] Serviço de creche por hora não encontrado para excedente de ${est.pet_nome}`);
              toast.error(`Serviço de cobrança por hora não configurado. Cadastre um serviço de Creche por Hora.`);
            }
        }

          // Add extras from check-in
          const extras = Array.isArray(est.servicos_extras) ? est.servicos_extras : [];
          for (const extra of extras) {
            if (extra.valor && extra.valor > 0) {
              items.push({
                estadiaId: est.id,
                petNome: est.pet_nome,
                valorTotal: Math.round(extra.valor * 100) / 100,
                descricao: "Serviço Extra",
                servicoNome: extra.nome || "Serviço Extra",
                quantidade: 1,
                valorUnitario: extra.valor,
              });
            }
          }
        }

        setBillingItems(items);
      } catch (err) {
        console.error("[Checkout] Erro ao calcular billing:", err);
        setBillingItems([]);
      }
    };

    calcBilling();
    const interval = setInterval(calcBilling, 60000);
    return () => clearInterval(interval);
  }, [selectedIds, filteredEstadias]);

  const totalGeral = useMemo(() => billingItems.reduce((sum, b) => sum + b.valorTotal, 0), [billingItems]);

  const togglePet = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEstadias.map((e) => e.id)));
    }
  };

  const handleCheckout = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione pelo menos um pet.");
      return;
    }

    const selectedEstadias = filteredEstadias.filter((e) => selectedIds.has(e.id));
    const selectedBillingItems = billingItems.filter((b) => selectedIds.has(b.estadiaId));
    const missingBilling = selectedEstadias.filter(
      (est) => !selectedBillingItems.some((b) => b.estadiaId === est.id)
    );
    const zeroBilling = selectedBillingItems.filter((b) => b.valorUnitario <= 0 || b.valorTotal <= 0);

    if (missingBilling.length > 0 || zeroBilling.length > 0) {
      toast.error("Não foi possível calcular o valor de todos os pets. Revise os serviços antes de confirmar o check-out.");
      return;
    }

    setSaving(true);
    try {
      const now = new Date();
      const ids = [...selectedIds];

      const { error } = await supabase
        .from("creche_estadias")
        .update({
          status: "finalizado",
          data_saida: format(now, "yyyy-MM-dd"),
          hora_saida: format(now, "HH:mm"),
          observacoes_saida: observacoes || null,
        })
        .in("id", ids);

      if (error) throw error;

      toast.success(
        ids.length === 1
          ? "Check-out realizado com sucesso!"
          : `Check-out de ${ids.length} pets realizado com sucesso!`
      );

      // Build pre-filled financial data
      const clienteNome = selectedEstadias[0]?.cliente_nome || "";
      const clienteId = selectedEstadias[0]?.cliente_id || "";
      const petNomes = selectedEstadias.map((e) => e.pet_nome);
      const petIds = selectedEstadias.map((e) => e.pet_id).filter(Boolean);

      const itensFinanceiro = billingItems.map((b) => ({
        produtoServico: b.servicoNome,
        quantidade: b.quantidade,
        valor: b.valorUnitario,
      }));

      onOpenChange(false);
      onSuccess();

      // Navigate to financial entry with pre-filled data
      navigate("/controle-financeiro", {
        state: {
          crecheCheckout: {
            clienteNome,
            clienteId,
            petNomes,
            petIds,
            itens: itensFinanceiro,
          },
        },
      });
    } catch (err: any) {
      toast.error("Erro ao fazer check-out: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const selectedEstadias = filteredEstadias.filter((e) => selectedIds.has(e.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Check-out</DialogTitle>
          <DialogDescription>Registrar saída de pet.</DialogDescription>
        </DialogHeader>

        {filteredEstadias.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum pet ativo no momento.</p>
        ) : (
          <div className="space-y-3">
            <div>
              <Label className="text-xs">
                Selecione o(s) Pet(s)
                {contextClienteNome && (
                  <span className="text-muted-foreground ml-1">— Tutor: {contextClienteNome}</span>
                )}
              </Label>

              {/* Alert for other pets from same tutor */}
              {showSameTutorAlert && (
                <div className="bg-destructive/10 border border-destructive/40 rounded-md p-3 mt-2 mb-1">
                  <p className="text-sm font-semibold text-destructive mb-2">
                    Acrescentar demais pets do mesmo cliente no Check-out?
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    {otherClientPets.length} outro{otherClientPets.length > 1 ? "s" : ""} pet{otherClientPets.length > 1 ? "s" : ""} encontrado{otherClientPets.length > 1 ? "s" : ""}:{" "}
                    {otherClientPets.map((e) => e.pet_nome).join(", ")}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" variant="destructive" onClick={handleIncludeAllPets}>
                      Sim
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleDeclineInclude}>
                      Não
                    </Button>
                  </div>
                </div>
              )}

              <div className="border rounded-md max-h-52 overflow-y-auto mt-1">
                {filteredEstadias.length > 1 && (
                  <div
                    onClick={toggleAll}
                    className="px-3 py-2 cursor-pointer flex items-center gap-2 text-sm border-b hover:bg-accent"
                  >
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                    <span className="font-medium text-xs">Selecionar todos ({filteredEstadias.length})</span>
                  </div>
                )}
                {filteredEstadias.map((e) => (
                  <div
                    key={e.id}
                    onClick={() => togglePet(e.id)}
                    className={`px-3 py-2 cursor-pointer flex items-center gap-2 text-sm ${
                      selectedIds.has(e.id) ? "bg-primary/10" : "hover:bg-accent"
                    }`}
                  >
                    <Checkbox checked={selectedIds.has(e.id)} onCheckedChange={() => togglePet(e.id)} />
                    <div className="flex-1 flex items-center justify-between">
                      <div>
                        <span className="font-medium">{e.pet_nome}</span>
                        <span className="text-muted-foreground ml-2">({e.cliente_nome})</span>
                      </div>
                      <Badge variant={e.tipo === "hotel" ? "secondary" : "outline"} className="text-[10px]">
                        {e.tipo === "hotel" ? "Hotel" : "Creche"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              {selectedIds.size > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedIds.size} pet{selectedIds.size > 1 ? "s" : ""} selecionado{selectedIds.size > 1 ? "s" : ""}
                </p>
              )}
            </div>

            {selectedEstadias.length > 0 && (
              <div className="bg-muted/50 rounded-md p-2 text-xs space-y-1">
                {selectedEstadias.map((est) => (
                  <div key={est.id} className="flex items-center justify-between">
                    <span className="font-medium">{est.pet_nome}</span>
                    <span>
                      {format(new Date(est.data_entrada + "T00:00:00"), "dd/MM", { locale: ptBR })} {est.hora_entrada?.slice(0, 5)}
                      {est.data_saida_prevista && (
                        <span className="ml-2 text-muted-foreground">
                          → {format(new Date(est.data_saida_prevista + "T00:00:00"), "dd/MM", { locale: ptBR })}
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {billingItems.length > 0 && (
              <div className="bg-primary/5 border border-primary/20 rounded-md p-3 space-y-2">
                <p className="text-xs font-medium text-primary">💰 Cálculo Automático</p>
                {billingItems.map((b, idx) => (
                  <div key={`${b.estadiaId}-${idx}`} className={`flex items-center justify-between text-xs ${b.isExcedente ? "pl-3 text-muted-foreground" : ""}`}>
                    <div>
                      {b.isExcedente ? (
                        <span className="italic">↳ {b.descricao}</span>
                      ) : (
                        <>
                          <span className="font-medium">{b.petNome}</span>
                          <span className="text-muted-foreground ml-1">({b.descricao})</span>
                        </>
                      )}
                    </div>
                    <span className="font-semibold">
                      {b.valorTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                ))}
                {billingItems.length > 1 && (
                  <div className="flex items-center justify-between border-t pt-1.5 mt-1">
                    <span className="text-xs font-medium">Total</span>
                    <span className="text-base font-bold text-foreground">
                      {totalGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                    </span>
                  </div>
                )}
                {billingItems.length === 1 && (
                  <p className="text-lg font-bold text-foreground">
                    {totalGeral.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </p>
                )}
              </div>
            )}

            <div>
              <Label className="text-xs">Observações de Saída</Label>
              <Textarea
                placeholder="Observações finais..."
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                className="min-h-[50px] text-sm"
              />
            </div>

            <Button onClick={handleCheckout} disabled={saving || selectedIds.size === 0} className="w-full">
              {saving
                ? "Salvando..."
                : selectedIds.size > 1
                  ? `Confirmar Check-out (${selectedIds.size} pets)`
                  : "Confirmar Check-out"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CheckoutModal;
