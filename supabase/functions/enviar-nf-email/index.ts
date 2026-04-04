import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const NUVEM_FISCAL_API = "https://api.sandbox.nuvemfiscal.com.br";
const NUVEM_FISCAL_AUTH = "https://auth.nuvemfiscal.com.br/oauth/token";

let cachedToken: { access_token: string; expires_at: number } | null = null;

async function getOAuthToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expires_at - 60000) {
    return cachedToken.access_token;
  }

  const clientId = Deno.env.get("NUVEM_FISCAL_CLIENT_ID");
  const clientSecret = Deno.env.get("NUVEM_FISCAL_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    throw new Error("Credenciais da Nuvem Fiscal não configuradas");
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    scope: "empresa nfe nfse cep",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(NUVEM_FISCAL_AUTH, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Erro ao obter token OAuth: ${res.status} - ${errorText}`);
  }

  const data = await res.json();
  cachedToken = {
    access_token: data.access_token,
    expires_at: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

async function baixarPdfNuvemFiscal(tipo: string, nuvemFiscalId: string): Promise<string | null> {
  const token = await getOAuthToken();
  const path = tipo === "NFe" ? `/nfe/${nuvemFiscalId}/pdf` : `/nfse/${nuvemFiscalId}/pdf`;

  const res = await fetch(`${NUVEM_FISCAL_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/pdf",
    },
  });

  if (!res.ok) {
    console.log(`PDF não disponível (status ${res.status}), tentando novamente...`);
    return null;
  }

  const arrayBuffer = await res.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  return base64;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { nota_id, user_id } = await req.json();

    if (!nota_id) {
      return new Response(
        JSON.stringify({ error: "nota_id é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      console.error("RESEND_API_KEY não configurada");
      return new Response(
        JSON.stringify({ error: "Serviço de email não configurado" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the nota fiscal
    const { data: nota, error: notaError } = await supabase
      .from("notas_fiscais")
      .select("*")
      .eq("id", nota_id)
      .single();

    if (notaError || !nota) {
      return new Response(
        JSON.stringify({ error: "Nota fiscal não encontrada" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the effective owner user_id (admin) using the nota's user_id
    const { data: effectiveUserId } = await supabase.rpc("get_effective_user_id", {
      _auth_user_id: nota.user_id,
    });
    const ownerId = effectiveUserId || nota.user_id;

    // Get email_fiscal from empresa_config of the owner
    const { data: empresaConfig } = await supabase
      .from("empresa_config")
      .select("email_fiscal, nome_empresa")
      .eq("user_id", ownerId)
      .single();

    if (!empresaConfig?.email_fiscal) {
      console.log("Email fiscal não configurado para o owner:", ownerId);
      return new Response(
        JSON.stringify({ error: "Email fiscal não configurado na página Empresa" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get or download the PDF
    let pdfBase64 = nota.danfe_pdf_base64;
    if (!pdfBase64 && nota.nuvem_fiscal_id) {
      // Try downloading from Nuvem Fiscal with retries
      for (let attempt = 0; attempt < 3; attempt++) {
        pdfBase64 = await baixarPdfNuvemFiscal(nota.tipo, nota.nuvem_fiscal_id);
        if (pdfBase64) break;
        await new Promise((r) => setTimeout(r, 5000));
      }

      if (pdfBase64) {
        // Cache the PDF
        await supabase
          .from("notas_fiscais")
          .update({
            danfe_pdf_base64: pdfBase64,
            danfe_pdf_cached_at: new Date().toISOString(),
          })
          .eq("id", nota_id);
      }
    }

    if (!pdfBase64) {
      console.log("PDF não disponível para nota:", nota_id);
      return new Response(
        JSON.stringify({ error: "PDF da DANFE ainda não está disponível" }),
        { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build email
    const tipoNF = nota.tipo === "NFe" ? "NF-e" : "NFS-e";
    const numero = nota.numero || "s/n";
    const nomeEmpresa = empresaConfig.nome_empresa || "Sua Empresa";
    const clienteNome = nota.cliente_nome || "Cliente";
    const valorFormatado = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(nota.valor_total);

    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333;">${tipoNF} Emitida - ${nomeEmpresa}</h2>
        <p>Olá,</p>
        <p>Segue em anexo a ${tipoNF} nº <strong>${numero}</strong> emitida com sucesso.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Tipo:</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${nota.tipo}</strong></td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Número:</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${numero}</strong></td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Cliente:</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${clienteNome}</strong></td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Valor:</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${valorFormatado}</strong></td></tr>
          <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Status:</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong style="color: #16a34a;">Autorizada</strong></td></tr>
        </table>
        <p style="color: #666; font-size: 12px;">Este é um email automático. A DANFE está anexada em formato PDF.</p>
      </div>
    `;

    // Send email via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Notas Fiscais <nf@resend.dev>",
        to: [empresaConfig.email_fiscal],
        subject: `${tipoNF} nº ${numero} - ${clienteNome} - ${valorFormatado}`,
        html: emailHtml,
        attachments: [
          {
            filename: `${nota.tipo}_${numero}.pdf`,
            content: pdfBase64,
          },
        ],
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Erro ao enviar email via Resend:", resendData);
      return new Response(
        JSON.stringify({ error: "Erro ao enviar email", details: resendData }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark as sent
    await supabase
      .from("notas_fiscais")
      .update({ email_enviado: true })
      .eq("id", nota_id);

    console.log(`Email enviado com sucesso para ${empresaConfig.email_fiscal} - Nota ${nota_id}`);

    return new Response(
      JSON.stringify({ success: true, email: empresaConfig.email_fiscal }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro no envio de email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
