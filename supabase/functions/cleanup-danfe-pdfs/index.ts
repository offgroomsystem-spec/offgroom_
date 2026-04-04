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

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data, error } = await supabase
      .from("notas_fiscais")
      .update({
        danfe_pdf_base64: null,
        danfe_pdf_cached_at: null,
      })
      .not("danfe_pdf_base64", "is", null)
      .lt("danfe_pdf_cached_at", new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString())
      .select("id");

    const count = data?.length || 0;
    console.log(`Cleanup concluído: ${count} PDFs removidos`);

    return new Response(
      JSON.stringify({ success: true, cleaned: count }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro no cleanup:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
