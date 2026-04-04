import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = new Date();
  console.log(`[CLEANUP] Iniciando limpeza em ${startTime.toISOString()}`);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Tolerância de segurança: apenas registros com mais de 48 horas
    const cutoffDate = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    // Limpar mensagens agendadas (confirmação/lembrete) com status enviado ou cancelado
    const { data: agendadasRemovidas, error: errAgendadas } = await supabase
      .from("whatsapp_mensagens_agendadas")
      .delete()
      .in("status", ["enviado", "cancelado", "expirado"])
      .lt("agendado_para", cutoffDate)
      .select("id");

    if (errAgendadas) {
      console.error("[CLEANUP] Erro ao limpar whatsapp_mensagens_agendadas:", errAgendadas);
    }

    const countAgendadas = agendadasRemovidas?.length || 0;
    console.log(`[CLEANUP] whatsapp_mensagens_agendadas: ${countAgendadas} registros removidos`);

    // Limpar mensagens de risco com status enviado ou cancelado
    const { data: riscoRemovidas, error: errRisco } = await supabase
      .from("whatsapp_mensagens_risco")
      .delete()
      .in("status", ["enviado", "cancelado", "erro"])
      .lt("agendado_para", cutoffDate)
      .select("id");

    if (errRisco) {
      console.error("[CLEANUP] Erro ao limpar whatsapp_mensagens_risco:", errRisco);
    }

    const countRisco = riscoRemovidas?.length || 0;
    console.log(`[CLEANUP] whatsapp_mensagens_risco: ${countRisco} registros removidos`);

    const endTime = new Date();
    const durationMs = endTime.getTime() - startTime.getTime();

    const result = {
      success: true,
      timestamp: endTime.toISOString(),
      duration_ms: durationMs,
      cleaned: {
        whatsapp_mensagens_agendadas: countAgendadas,
        whatsapp_mensagens_risco: countRisco,
        total: countAgendadas + countRisco,
      },
      cutoff_date: cutoffDate,
      errors: {
        agendadas: errAgendadas?.message || null,
        risco: errRisco?.message || null,
      },
    };

    console.log(`[CLEANUP] Concluído em ${durationMs}ms. Total removido: ${result.cleaned.total}`);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[CLEANUP] Erro crítico:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
