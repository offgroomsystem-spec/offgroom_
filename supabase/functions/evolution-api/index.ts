import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function normalizeBrazilPhone(rawPhone: string | null | undefined) {
  const digits = String(rawPhone ?? "").replace(/\D/g, "");
  if (!digits) return null;

  let normalized = digits;
  if (normalized.startsWith("55")) normalized = normalized.slice(2);
  if (normalized.length === 10) normalized = `${normalized.slice(0, 2)}9${normalized.slice(2)}`;
  if (normalized.length !== 11) return null;

  return `55${normalized}`;
}

async function checkWhatsAppNumber(instanceName: string, number: string) {
  return evolutionFetch(`/chat/whatsappNumbers/${instanceName}`, "POST", {
    numbers: [number],
  });
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function evolutionFetch(path: string, method = "GET", body?: unknown) {
  const baseUrl = Deno.env.get("EVOLUTION_API_URL")!;
  const apiKey = Deno.env.get("EVOLUTION_API_KEY")!;
  const url = `${baseUrl}${path}`;
  const opts: RequestInit = {
    method,
    headers: { "Content-Type": "application/json", apikey: apiKey },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }
  return { ok: res.ok, status: res.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      console.error("JWT validation failed:", claimsError?.message);
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const userId = claimsData.claims.sub;
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData?.user) {
      console.error("JWT validation failed:", userError?.message);
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const body = await req.json();
    const action = body.action as string;
    const instanceName = body.instanceName as string;

    if (action === "create-instance") {
      const number = body.number as string;
      if (!instanceName || !number) {
        return jsonResponse({ error: "instanceName e number são obrigatórios" }, 400);
      }
      const result = await evolutionFetch("/instance/create", "POST", {
        instanceName,
        integration: "WHATSAPP-BAILEYS",
        number,
        qrcode: true,
        rejectCall: false,
      });
      if (!result.ok) {
        const msg = result.data?.response?.message?.[0] || result.data?.message || "Erro ao criar instância";
        return jsonResponse({ error: msg }, result.status);
      }
      return jsonResponse(result.data);
    }

    if (action === "get-qrcode") {
      if (!instanceName) return jsonResponse({ error: "instanceName é obrigatório" }, 400);
      const result = await evolutionFetch(`/instance/connect/${instanceName}`, "GET");
      if (!result.ok) return jsonResponse({ error: "Erro ao buscar QR Code" }, result.status);
      return jsonResponse(result.data);
    }

    if (action === "check-status") {
      if (!instanceName) return jsonResponse({ error: "instanceName é obrigatório" }, 400);
      const result = await evolutionFetch(`/instance/connectionState/${instanceName}`, "GET");
      if (!result.ok) return jsonResponse({ error: "Erro ao verificar status", details: result.data }, result.status);
      return jsonResponse(result.data);
    }

    if (action === "disconnect") {
      if (!instanceName) return jsonResponse({ error: "instanceName é obrigatório" }, 400);
      await evolutionFetch(`/instance/logout/${instanceName}`, "DELETE");
      await evolutionFetch(`/instance/delete/${instanceName}`, "DELETE");
      return jsonResponse({ success: true });
    }

    if (action === "send-message") {
      const toNumber = body.number as string;
      const text = body.text as string;
      if (!instanceName || !toNumber || !text) {
        return jsonResponse({ error: "instanceName, number e text são obrigatórios" }, 400);
      }

      const normalizedNumber = normalizeBrazilPhone(toNumber);
      if (!normalizedNumber) {
        return jsonResponse({ error: "Número inválido. Use DDD + número com 9 dígitos." }, 400);
      }

      const validationResult = await checkWhatsAppNumber(instanceName, normalizedNumber);
      const validationEntry = Array.isArray(validationResult.data) ? validationResult.data[0] : null;
      if (!validationResult.ok) {
        console.error("[SEND-MESSAGE] Falha na validação do número:", validationResult.data);
        return jsonResponse({
          error: "Não foi possível validar o número antes do envio.",
          details: validationResult.data,
        }, validationResult.status || 400);
      }

      if (!validationEntry?.exists) {
        return jsonResponse({
          error: "Número inválido ou não encontrado no WhatsApp.",
          details: validationResult.data,
        }, 400);
      }

      console.log("[SEND-MESSAGE] Enviando:", { userId, instanceName, toNumber, normalizedNumber, textLength: text.length });

      // Retry up to 2 times
      let lastResult: { ok: boolean; status: number; data: any } | null = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        const result = await evolutionFetch(`/message/sendText/${instanceName}`, "POST", {
          number: normalizedNumber,
          text,
        });
        lastResult = result;

        if (result.ok) {
          console.log("[SEND-MESSAGE] ✅ Sucesso na tentativa", attempt);
          return jsonResponse(result.data);
        }

        console.error(`[SEND-MESSAGE] ❌ Tentativa ${attempt} falhou:`, {
          status: result.status,
          data: result.data,
        });

        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      const errorMsg =
        lastResult?.data?.response?.message?.[0] ||
        lastResult?.data?.message ||
        "Erro ao enviar mensagem após 2 tentativas";
      return jsonResponse({ error: errorMsg, details: lastResult?.data }, lastResult?.status || 500);
    }

    return jsonResponse({ error: `Ação desconhecida: ${action}` }, 400);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("Evolution API error:", err);
    return jsonResponse({ error: message }, 500);
  }
});
