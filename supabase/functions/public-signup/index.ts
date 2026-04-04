import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Coupon definitions (case-insensitive validation)
const CUPONS_30_DIAS = [
  'OFFGROOM_MES_VIP',
  '30DIAS_AGENDA_CHEIA',
  'GESTAO_PET_30FREE',
  'BANHO_DE_GESTAO30',
  'LUCRO_PET_30DIAS',
  'OFFGROOM_START_30',
  '30DIAS_NOVO_PETSHOP',
  'CRESCER_PET_30',
];

const CUPONS_15_DIAS = [
  'OFFGROOM_15_EXPRESS',
  '15DIAS_PET_PRO',
  'START_PET_15',
  'IMPULSO_PET_15',
  '15DIAS_OFFGROOM_VIP',
  'DEGUSTA_OFFGROOM_15',
  '15DIAS_SEM_ESTRESSE',
  'GESTAO_RAPIDA_15',
];

function validateCoupon(cupom: string | undefined | null): { valid: boolean; days: number } {
  if (!cupom || typeof cupom !== 'string') return { valid: false, days: 0 };
  const normalized = cupom.trim().toUpperCase();
  if (CUPONS_30_DIAS.includes(normalized)) return { valid: true, days: 30 };
  if (CUPONS_15_DIAS.includes(normalized)) return { valid: true, days: 15 };
  return { valid: false, days: 0 };
}

// Validation helpers
function isValidEmail(email: string): boolean {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

function isValidWhatsApp(whatsapp: string): boolean {
  return typeof whatsapp === 'string' && /^\d{11}$/.test(whatsapp);
}

function isValidName(name: string): boolean {
  return typeof name === 'string' && name.trim().length >= 3 && name.length <= 100;
}

// In-memory rate limiting (per isolate instance)
const signupAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW_MS = 60 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = signupAttempts.get(ip);
  if (!entry || now > entry.resetAt) {
    signupAttempts.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT;
}

function cleanupRateLimits() {
  const now = Date.now();
  for (const [key, value] of signupAttempts) {
    if (now > value.resetAt) signupAttempts.delete(key);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 'unknown';
    
    if (isRateLimited(clientIp)) {
      console.log('[PUBLIC-SIGNUP] Rate limited IP:', clientIp);
      return new Response(
        JSON.stringify({ error: 'Muitas tentativas de cadastro. Tente novamente mais tarde.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    cleanupRateLimits();

    const { email, password, nome_completo, whatsapp, cupom } = await req.json();

    console.log('[PUBLIC-SIGNUP] Starting signup for:', email, 'with coupon:', cupom || '(none)');

    // Validate required fields
    if (!email || !password || !nome_completo || !whatsapp) {
      return new Response(
        JSON.stringify({ error: 'Todos os campos são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidEmail(email)) {
      return new Response(
        JSON.stringify({ error: 'Formato de e-mail inválido' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (typeof password !== 'string' || password.length < 8 || password.length > 100) {
      return new Response(
        JSON.stringify({ error: 'Senha deve ter entre 8 e 100 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidName(nome_completo)) {
      return new Response(
        JSON.stringify({ error: 'Nome deve ter entre 3 e 100 caracteres' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isValidWhatsApp(whatsapp)) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp inválido. Digite 11 dígitos: DDD + número (ex: 61981468122)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate coupon
    const couponResult = validateCoupon(cupom);
    console.log('[PUBLIC-SIGNUP] Coupon validation:', couponResult);

    const sanitizedEmail = email.trim().toLowerCase();
    const sanitizedName = nome_completo.trim();

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email_hotmart', sanitizedEmail)
      .limit(1);

    if (existingUsers && existingUsers.length > 0) {
      console.log('[PUBLIC-SIGNUP] User already exists:', sanitizedEmail);
      return new Response(
        JSON.stringify({ error: 'Este e-mail já está cadastrado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: sanitizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        nome_completo: sanitizedName,
        email_hotmart: sanitizedEmail,
        whatsapp
      }
    });

    if (authError) {
      console.log('[PUBLIC-SIGNUP] Auth error:', authError.message);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar conta. Tente novamente.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({ error: 'Erro ao criar usuário' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = authData.user.id;
    console.log('[PUBLIC-SIGNUP] User created with ID:', userId);

    // Assign 'administrador' role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: userId, role: 'administrador' });

    if (roleError) {
      console.log('[PUBLIC-SIGNUP] Role assignment error:', roleError.message);
    }

    // Update profile with coupon-based trial period
    // Default periodo_gratis_dias in DB is 30, so we need to override it
    const periodoGratisDias = couponResult.valid ? couponResult.days : 0;
    
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        periodo_gratis_dias: periodoGratisDias,
        data_inicio_periodo_gratis: new Date().toISOString()
      })
      .eq('id', userId);

    if (profileUpdateError) {
      console.log('[PUBLIC-SIGNUP] Profile update error:', profileUpdateError.message);
    } else {
      console.log('[PUBLIC-SIGNUP] Profile updated with periodo_gratis_dias:', periodoGratisDias);
    }

    console.log('[PUBLIC-SIGNUP] Signup completed for:', sanitizedEmail);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: couponResult.valid 
          ? `Cadastro realizado! Cupom aplicado: ${couponResult.days} dias grátis.`
          : 'Cadastro realizado com sucesso!',
        user_id: userId,
        coupon_applied: couponResult.valid,
        coupon_days: couponResult.days
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[PUBLIC-SIGNUP] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});