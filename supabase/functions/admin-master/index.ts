import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ADMIN_EMAIL = 'offgroom.system@gmail.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    // Authenticate and verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !userData.user) throw new Error("Authentication failed");
    if (userData.user.email !== ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { action, params } = await req.json();

    switch (action) {
      case 'dashboard': {
        // Get all profiles with subscription info
        const { data: profiles, count: totalUsers } = await supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact' });

        const { count: totalPets } = await supabaseAdmin
          .from('pets')
          .select('*', { count: 'exact', head: true });

        const { count: totalAgendamentos } = await supabaseAdmin
          .from('agendamentos')
          .select('*', { count: 'exact', head: true });

        // Active users (logged in last 30 days) - based on updated_at
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { count: activeUsers } = await supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('updated_at', thirtyDaysAgo.toISOString());

        // Users with active subscriptions
        const { count: paidUsers } = await supabaseAdmin
          .from('subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('is_active', true);

        // New users this month
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);

        const { count: newUsersMonth } = await supabaseAdmin
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('created_at', startOfMonth.toISOString());

        // Growth data (users per month, last 12 months)
        const growthData = [];
        for (let i = 11; i >= 0; i--) {
          const d = new Date();
          d.setMonth(d.getMonth() - i);
          const start = new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
          const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).toISOString();
          const { count } = await supabaseAdmin
            .from('profiles')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', start)
            .lte('created_at', end);
          growthData.push({
            month: d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
            count: count || 0
          });
        }

        return new Response(JSON.stringify({
          totalUsers: totalUsers || 0,
          activeUsers: activeUsers || 0,
          totalPets: totalPets || 0,
          totalAgendamentos: totalAgendamentos || 0,
          paidUsers: paidUsers || 0,
          freeUsers: (totalUsers || 0) - (paidUsers || 0),
          newUsersMonth: newUsersMonth || 0,
          growthData
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'list_users': {
        const { data: profiles } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        // Get subscriptions for all users
        const { data: subscriptions } = await supabaseAdmin
          .from('subscriptions')
          .select('*')
          .eq('is_active', true);

        const subMap = new Map();
        (subscriptions || []).forEach(s => subMap.set(s.user_id, s));

        const users = (profiles || []).map(p => ({
          ...p,
          subscription: subMap.get(p.id) || null,
          hasActivePlan: subMap.has(p.id)
        }));

        return new Response(JSON.stringify({ users }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'update_user': {
        const { userId, updates } = params;
        const { error } = await supabaseAdmin
          .from('profiles')
          .update(updates)
          .eq('id', userId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'list_pets': {
        const { filters } = params || {};
        let query = supabaseAdmin.from('pets').select(`
          *,
          clientes!pets_cliente_id_fkey(nome_cliente, whatsapp)
        `);

        if (filters?.nome) query = query.ilike('nome_pet', `%${filters.nome}%`);
        if (filters?.sexo === 'sem_sexo') {
          query = query.or('sexo.is.null,sexo.eq.');
        } else if (filters?.sexo) {
          query = query.eq('sexo', filters.sexo);
        }
        if (filters?.porte) query = query.eq('porte', filters.porte);
        if (filters?.raca) query = query.ilike('raca', `%${filters.raca}%`);

        const { data, error } = await query.order('created_at', { ascending: false }).limit(500);
        if (error) throw error;

        return new Response(JSON.stringify({ pets: data || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'bulk_update_pets': {
        const { petIds, updates } = params;
        const { error } = await supabaseAdmin
          .from('pets')
          .update(updates)
          .in('id', petIds);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true, count: petIds.length }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'list_subscriptions': {
        const { data } = await supabaseAdmin
          .from('subscriptions')
          .select('*')
          .order('created_at', { ascending: false });

        return new Response(JSON.stringify({ subscriptions: data || [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      case 'grant_extra_days': {
        const { userId, days } = params;
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({ 
            dias_liberacao_extra: days,
            liberacao_manual_ativa: true
          })
          .eq('id', userId);
        if (error) throw error;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Ação desconhecida' }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
