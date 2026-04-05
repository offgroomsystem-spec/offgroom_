import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// VIP users with vitalício (lifetime) access
const VIP_EMAILS = [
  'rodrygo.sv12@gmail.com',
  'offgroom.system@gmail.com',
  'rodrigocampelo87@gmail.com',
  'carloseduardopereira2254@gmail.com'
];

// Stripe product configurations (Production)
const STRIPE_PRODUCTS: Record<string, { name: string; days: number; recurring?: boolean }> = {
  'prod_TkEgedLF4KEFOY': { name: 'Offgroom Power 12', days: 365, recurring: false },
  'prod_TkEhVLxoKBaa7Q': { name: 'Offgroom Flex', days: 31, recurring: true }
};

const STRIPE_PRICE_TO_PRODUCT: Record<string, string> = {
  'price_1SmkDqKHKMPhWHpBqNjYmTPc': 'prod_TkEhVLxoKBaa7Q',
  'price_1SmkCmKHKMPhWHpBTLLT9f3o': 'prod_TkEgedLF4KEFOY'
};

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [CHECK-SUBSCRIPTION-STATUS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("ERROR: No authorization header");
      return new Response(JSON.stringify({
        hasAccess: false, type: 'error',
        message: 'Erro de autenticação: Token não fornecido'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) {
      logStep("ERROR: Authentication failed", { error: userError.message });
      return new Response(JSON.stringify({
        hasAccess: false, type: 'error',
        message: `Erro de autenticação: ${userError.message}`
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }
    
    const user = userData.user;
    if (!user?.email) {
      logStep("ERROR: User not authenticated or no email");
      return new Response(JSON.stringify({
        hasAccess: false, type: 'error',
        message: 'Usuário não autenticado ou e-mail não disponível'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 });
    }
    
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check if user is a staff member and get owner's email
    let emailToCheck = user.email;
    let isStaffMember = false;
    const { data: staffAccount } = await supabaseClient
      .from('staff_accounts')
      .select('owner_id')
      .eq('user_id', user.id)
      .single();

    if (staffAccount?.owner_id) {
      isStaffMember = true;
      const { data: ownerProfile } = await supabaseClient
        .from('profiles')
        .select('email_hotmart')
        .eq('id', staffAccount.owner_id)
        .single();
      
      if (ownerProfile?.email_hotmart) {
        emailToCheck = ownerProfile.email_hotmart;
        logStep("Staff member detected, checking owner subscription", { 
          staffUserId: user.id, ownerId: staffAccount.owner_id, ownerEmail: emailToCheck 
        });
      }
    }

    const profileId = staffAccount?.owner_id || user.id;

    const updateProfileStatus = async (planoAtivo: string, pagamentoEmDia: string) => {
      try {
        await supabaseClient
          .from('profiles')
          .update({ plano_ativo: planoAtivo, pagamento_em_dia: pagamentoEmDia, updated_at: new Date().toISOString() })
          .eq('id', profileId);
        logStep("Profile status updated", { planoAtivo, pagamentoEmDia });
      } catch (err) {
        logStep("Warning: Failed to update profile status", { error: err });
      }
    };

    const checkLocalSubscriptionFallback = async () => {
      try {
        const { data: localSubscription, error: localSubscriptionError } = await supabaseClient
          .from('subscriptions')
          .select('stripe_product_id, plan_name, subscription_end, subscription_start, status, is_active, customer_email')
          .eq('user_id', profileId)
          .not('subscription_end', 'is', null)
          .order('subscription_end', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (localSubscriptionError) {
          logStep("Warning: Failed to load local subscription fallback", { error: localSubscriptionError.message });
          return null;
        }

        if (!localSubscription?.subscription_end) {
          logStep("No local subscription fallback found", { profileId, emailToCheck });
          return null;
        }

        const subscriptionEnd = new Date(localSubscription.subscription_end);
        const now = Date.now();
        const daysRemaining = Math.ceil((subscriptionEnd.getTime() - now) / (1000 * 60 * 60 * 24));

        if (subscriptionEnd.getTime() <= now) {
          logStep("Local subscription fallback found but expired", {
            profileId,
            subscriptionEnd: localSubscription.subscription_end,
            status: localSubscription.status
          });
          return null;
        }

        logStep("✅ LOCAL SUBSCRIPTION FALLBACK - ACCESS GRANTED", {
          profileId,
          planName: localSubscription.plan_name,
          stripeProductId: localSubscription.stripe_product_id,
          daysRemaining,
          subscriptionEnd: localSubscription.subscription_end
        });

        await updateProfileStatus(localSubscription.plan_name, 'Sim');

        return new Response(JSON.stringify({
          hasAccess: true,
          type: 'subscription_fallback',
          productId: localSubscription.stripe_product_id,
          productName: localSubscription.plan_name,
          daysRemaining: Math.max(0, daysRemaining),
          subscriptionEnd: subscriptionEnd.toISOString(),
          message: 'Bem vindo(a) ao Offgroom!'
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      } catch (fallbackError) {
        const errorMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        logStep("Warning: Local subscription fallback failed", { error: errorMsg });
        return null;
      }
    };

    // 1️⃣ CHECK VIP WHITELIST
    if (VIP_EMAILS.includes(emailToCheck.toLowerCase())) {
      logStep("VIP user detected - vitalício access granted", { email: emailToCheck });
      await updateProfileStatus('VIP', 'Sim');
      return new Response(JSON.stringify({
        hasAccess: true, type: 'vip',
        message: 'Bem vindo(a) ao Offgroom! Acesso vitalício ativo.'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select(`
        created_at, trial_end_date, periodo_gratis_dias,
        data_inicio_periodo_gratis, data_fim_periodo_gratis,
        dias_liberacao_extra, data_fim_liberacao_extra,
        liberacao_manual_ativa, plano_ativo, pagamento_em_dia
      `)
      .eq('id', profileId)
      .single();

    if (profileError) {
      logStep("Warning: Error fetching profile", { error: profileError.message });
    }

    logStep("Profile data loaded", {
      periodoGratisDias: profile?.periodo_gratis_dias,
      dataFimPeriodoGratis: profile?.data_fim_periodo_gratis,
      liberacaoManualAtiva: profile?.liberacao_manual_ativa,
      planoAtivo: profile?.plano_ativo
    });

    // 2️⃣ CHECK STRIPE SUBSCRIPTION
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    
    if (stripeKey && stripeKey.startsWith('sk_')) {
      try {
        logStep("Checking Stripe subscriptions...");
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

        const customers = await stripe.customers.list({ email: emailToCheck, limit: 1 });
        
        if (customers.data.length > 0) {
          const customerId = customers.data[0].id;
          logStep("Stripe customer found", { customerId, email: emailToCheck });

          const activeSubscriptions = await stripe.subscriptions.list({
            customer: customerId, status: 'active', limit: 10,
          });

          const canceledSubscriptions = await stripe.subscriptions.list({
            customer: customerId, status: 'canceled', limit: 10,
          });

          const allSubscriptions = [...activeSubscriptions.data, ...canceledSubscriptions.data];

          for (const subscription of allSubscriptions) {
            const subscriptionItem = subscription.items.data[0];
            if (!subscriptionItem) continue;

            const productId = subscriptionItem.price.product as string;
            const productConfig = STRIPE_PRODUCTS[productId];

            if (productConfig) {
              const periodEnd = subscription.current_period_end;
              const periodStart = subscription.current_period_start;
              
              let subscriptionStart: Date;
              let subscriptionEnd: Date;

              if (periodEnd) {
                subscriptionStart = new Date(periodStart * 1000);
                subscriptionEnd = new Date(periodEnd * 1000);
              } else {
                const startTimestamp = subscription.start_date || subscription.created;
                subscriptionStart = new Date(startTimestamp * 1000);
                subscriptionEnd = new Date(subscriptionStart.getTime() + (productConfig.days * 24 * 60 * 60 * 1000));
              }

              const now = Date.now();
              const daysRemaining = Math.floor((subscriptionEnd.getTime() - now) / (1000 * 60 * 60 * 24));

              if (subscriptionEnd.getTime() > now) {
                logStep("✅ ACTIVE SUBSCRIPTION - ACCESS GRANTED", {
                  productName: productConfig.name, daysRemaining
                });

                await updateProfileStatus(productConfig.name, 'Sim');

                try {
                  await supabaseClient
                    .from('subscriptions')
                    .upsert({
                      user_id: profileId,
                      stripe_customer_id: customerId,
                      stripe_subscription_id: subscription.id,
                      stripe_product_id: productId,
                      plan_name: productConfig.name,
                      customer_email: emailToCheck,
                      subscription_start: subscriptionStart.toISOString(),
                      subscription_end: subscriptionEnd.toISOString(),
                      is_active: true,
                      status: subscription.status === 'active' ? 'active' : 'canceled_with_access',
                      updated_at: new Date().toISOString()
                    }, { onConflict: 'stripe_subscription_id' });
                } catch (upsertError) {
                  logStep("Warning: Failed to upsert subscription", { error: upsertError });
                }

                return new Response(JSON.stringify({
                  hasAccess: true, type: 'subscription',
                  productId, productName: productConfig.name,
                  daysRemaining: Math.max(0, daysRemaining),
                  subscriptionEnd: subscriptionEnd.toISOString(),
                  message: `Bem vindo(a) ao Offgroom!`
                }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
              }
            }
          }

          if (allSubscriptions.length > 0) {
            logStep("⚠️ Customer has expired subscription(s) - payment overdue");
            await updateProfileStatus(profile?.plano_ativo || 'Expirado', 'Nao');
            
            return new Response(JSON.stringify({
              hasAccess: false, type: 'payment_overdue',
              message: 'Favor regularizar pagamento da assinatura'
            }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
          }

          logStep("Customer found but no matching subscriptions");

          const localFallbackResponse = await checkLocalSubscriptionFallback();
          if (localFallbackResponse) {
            return localFallbackResponse;
          }
        } else {
          logStep("No Stripe customer found for email", { email: emailToCheck });

          const localFallbackResponse = await checkLocalSubscriptionFallback();
          if (localFallbackResponse) {
            return localFallbackResponse;
          }
        }
      } catch (stripeError) {
        const errorMsg = stripeError instanceof Error ? stripeError.message : String(stripeError);
        logStep("⚠️ Stripe API error - checking local subscription fallback", { error: errorMsg });

        const localFallbackResponse = await checkLocalSubscriptionFallback();
        if (localFallbackResponse) {
          return localFallbackResponse;
        }
      }
    } else {
      logStep("Warning: STRIPE_SECRET_KEY not configured or invalid");

      const localFallbackResponse = await checkLocalSubscriptionFallback();
      if (localFallbackResponse) {
        return localFallbackResponse;
      }
    }

    // 3️⃣ CHECK LIBERAÇÃO MANUAL ATIVA
    if (profile?.liberacao_manual_ativa && profile?.data_fim_liberacao_extra) {
      const liberacaoEnd = new Date(profile.data_fim_liberacao_extra);
      const now = new Date();
      
      if (liberacaoEnd > now) {
        const diasRestantes = Math.ceil((liberacaoEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        logStep("Manual release active - access granted", { diasRestantes });
        await updateProfileStatus('Liberacao Manual', 'Sim');
        
        return new Response(JSON.stringify({
          hasAccess: true, type: 'liberacao_manual',
          daysRemaining: diasRestantes,
          message: `Bem vindo(a) ao Offgroom! Acesso liberado por ${diasRestantes} dias.`
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      } else {
        logStep("Manual release expired");
      }
    }

    // 4️⃣ CHECK TRIAL/COUPON PERIOD
    // Only grant trial if periodo_gratis_dias > 0 (coupon-based or legacy users)
    let trialDaysRemaining = 0;
    
    if (profile?.data_fim_periodo_gratis) {
      const trialEnd = new Date(profile.data_fim_periodo_gratis);
      trialDaysRemaining = Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      logStep("Trial calculated from data_fim_periodo_gratis", { 
        dataFimPeriodoGratis: trialEnd.toISOString(), trialDaysRemaining 
      });
    } else if (profile?.trial_end_date) {
      // Legacy support for old trial_end_date field
      const trialEnd = new Date(profile.trial_end_date);
      trialDaysRemaining = Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      logStep("Trial calculated from legacy trial_end_date", { trialDaysRemaining });
    }
    // REMOVED: fallback that auto-granted 30 days from created_at
    // New users without coupon will have periodo_gratis_dias=0, so data_fim_periodo_gratis will be in the past

    if (trialDaysRemaining > 0) {
      logStep("✅ Trial/coupon period active", { daysRemaining: trialDaysRemaining });
      await updateProfileStatus('Periodo Gratis', 'Periodo Gratis Ativo');
      
      return new Response(JSON.stringify({
        hasAccess: true, type: 'trial',
        daysRemaining: trialDaysRemaining,
        message: `Bem vindo(a) ao Offgroom! ${trialDaysRemaining} dias de teste restantes.`
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // 5️⃣ NO ACCESS
    logStep("❌ Access denied - no active subscription, no valid trial/coupon");
    await updateProfileStatus('Sem Plano', 'Nao');
    
    return new Response(JSON.stringify({
      hasAccess: false, type: 'expired',
      message: 'Seu acesso expirou. Escolha um plano para continuar utilizando o Offgroom.'
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("CRITICAL ERROR", { message: errorMessage });
    
    return new Response(JSON.stringify({ 
      hasAccess: false, type: 'error',
      message: `Erro interno do servidor: ${errorMessage}. Por favor, tente novamente.`
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
  }
});