import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const CUPONS_30_DIAS = [
  'OFFGROOM_MES_VIP', '30DIAS_AGENDA_CHEIA', 'GESTAO_PET_30FREE',
  'BANHO_DE_GESTAO30', 'LUCRO_PET_30DIAS', 'OFFGROOM_START_30',
  '30DIAS_NOVO_PETSHOP', 'CRESCER_PET_30',
];

const CUPONS_15_DIAS = [
  'OFFGROOM_15_EXPRESS', '15DIAS_PET_PRO', 'START_PET_15',
  'IMPULSO_PET_15', '15DIAS_OFFGROOM_VIP', 'DEGUSTA_OFFGROOM_15',
  '15DIAS_SEM_ESTRESSE', 'GESTAO_RAPIDA_15',
];

function validateCoupon(cupom: string): { valid: boolean; days: number } {
  const normalized = cupom.trim().toUpperCase();
  if (CUPONS_30_DIAS.includes(normalized)) return { valid: true, days: 30 };
  if (CUPONS_15_DIAS.includes(normalized)) return { valid: true, days: 15 };
  return { valid: false, days: 0 };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Authenticate user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = userData.user.id;

    // Parse and validate input
    const body = await req.json();
    const cupom = body?.cupom;

    if (!cupom || typeof cupom !== 'string' || cupom.trim().length === 0 || cupom.length > 50) {
      return new Response(JSON.stringify({ error: 'Cupom inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const result = validateCoupon(cupom);

    if (!result.valid) {
      console.log(`[VALIDATE-COUPON] Invalid coupon "${cupom}" for user ${userId}`);
      return new Response(JSON.stringify({ error: 'Cupom inválido' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if user already has an active trial/coupon period
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('data_fim_periodo_gratis, periodo_gratis_dias')
      .eq('id', userId)
      .single();

    if (profile?.data_fim_periodo_gratis) {
      const endDate = new Date(profile.data_fim_periodo_gratis);
      if (endDate > new Date() && profile.periodo_gratis_dias > 0) {
        return new Response(JSON.stringify({ 
          error: 'Você já possui um período de acesso ativo via cupom.' 
        }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Apply coupon: update profile with new trial period
    const now = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        periodo_gratis_dias: result.days,
        data_inicio_periodo_gratis: now,
        plano_ativo: 'Periodo Gratis',
        pagamento_em_dia: 'Periodo Gratis Ativo',
        updated_at: now,
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[VALIDATE-COUPON] Update error:', updateError.message);
      return new Response(JSON.stringify({ error: 'Erro ao aplicar cupom. Tente novamente.' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`[VALIDATE-COUPON] Coupon "${cupom}" applied for user ${userId}: ${result.days} days`);

    return new Response(JSON.stringify({
      success: true,
      days: result.days,
      message: `Cupom aplicado com sucesso! ${result.days} dias de acesso liberado.`
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('[VALIDATE-COUPON] Error:', error);
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
