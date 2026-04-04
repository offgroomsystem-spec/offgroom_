import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple validation helpers
function isValidEmail(email: string): boolean {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 255;
}

function isValidPassword(password: string): boolean {
  return typeof password === 'string' && password.length >= 8 && password.length <= 100;
}

function isValidName(name: string): boolean {
  return typeof name === 'string' && name.length >= 2 && name.length <= 100;
}

function isValidTipoLogin(tipo: string): boolean {
  return ['administrador', 'taxi_dog', 'recepcionista'].includes(tipo);
}

function isValidUUID(id: string): boolean {
  return typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    )

    // Verificar autenticação do requisitante
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    )

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verificar se o requisitante é administrador
    const { data: isAdmin } = await supabaseClient.rpc('is_administrador', { _user_id: user.id })
    
    if (!isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const body = await req.json()

    console.log('Action:', action, 'User:', user.id)

    if (action === 'create') {
      const { email, password, nome, tipo_login, ativo, owner_id } = body

      // Validate inputs
      const errors: string[] = [];
      if (!isValidEmail(email)) errors.push('E-mail inválido ou muito longo');
      if (!isValidPassword(password)) errors.push('Senha deve ter entre 8 e 100 caracteres');
      if (!isValidName(nome)) errors.push('Nome deve ter entre 2 e 100 caracteres');
      if (!isValidTipoLogin(tipo_login)) errors.push('Tipo de login inválido');
      if (!isValidUUID(owner_id)) errors.push('Owner ID inválido');

      if (errors.length > 0) {
        return new Response(
          JSON.stringify({ error: errors.join('. ') }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify the requester owns the owner_id
      if (owner_id !== user.id) {
        return new Response(
          JSON.stringify({ error: 'Não é possível criar staff para outro usuário' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Criar usuário usando Admin API
      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim().toLowerCase(),
        password,
        email_confirm: true,
        user_metadata: {
          nome_completo: nome.trim(),
          email_hotmart: email.trim().toLowerCase(),
        }
      })

      if (createError) {
        console.error('Error creating user:', createError)
        return new Response(
          JSON.stringify({ error: createError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Criar registro em staff_accounts
      const { error: staffError } = await supabaseAdmin
        .from('staff_accounts')
        .insert({
          user_id: newUser.user.id,
          owner_id: owner_id,
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          tipo_login,
          ativo
        })

      if (staffError) {
        console.error('Error creating staff account:', staffError)
        // Rollback: deletar usuário criado
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
        return new Response(
          JSON.stringify({ error: staffError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Criar role em user_roles
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .insert({
          user_id: newUser.user.id,
          role: tipo_login,
          created_by: user.id
        })

      if (roleError) {
        console.error('Error creating user role:', roleError)
        // Rollback: deletar staff e usuário
        await supabaseAdmin.from('staff_accounts').delete().eq('user_id', newUser.user.id)
        await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
        return new Response(
          JSON.stringify({ error: roleError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, user_id: newUser.user.id }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'update') {
      const { user_id, email, password, nome, tipo_login, ativo } = body

      // Validate inputs
      const errors: string[] = [];
      if (!isValidUUID(user_id)) errors.push('User ID inválido');
      if (!isValidEmail(email)) errors.push('E-mail inválido ou muito longo');
      if (password && !isValidPassword(password)) errors.push('Senha deve ter entre 8 e 100 caracteres');
      if (!isValidName(nome)) errors.push('Nome deve ter entre 2 e 100 caracteres');
      if (!isValidTipoLogin(tipo_login)) errors.push('Tipo de login inválido');

      if (errors.length > 0) {
        return new Response(
          JSON.stringify({ error: errors.join('. ') }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Atualizar dados do usuário no auth.users
      const updateData: any = {
        email: email.trim().toLowerCase(),
        user_metadata: {
          nome_completo: nome.trim(),
          email_hotmart: email.trim().toLowerCase(),
        }
      }

      if (password) {
        updateData.password = password
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        user_id,
        updateData
      )

      if (updateError) {
        console.error('Error updating user:', updateError)
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Atualizar staff_accounts
      const { error: staffError } = await supabaseAdmin
        .from('staff_accounts')
        .update({
          nome: nome.trim(),
          email: email.trim().toLowerCase(),
          tipo_login,
          ativo,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user_id)

      if (staffError) {
        console.error('Error updating staff account:', staffError)
        return new Response(
          JSON.stringify({ error: staffError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Atualizar role em user_roles
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .update({ role: tipo_login })
        .eq('user_id', user_id)

      if (roleError) {
        console.error('Error updating user role:', roleError)
        return new Response(
          JSON.stringify({ error: roleError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'delete') {
      const { user_id } = body

      if (!isValidUUID(user_id)) {
        return new Response(
          JSON.stringify({ error: 'User ID inválido' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Deletar de staff_accounts
      const { error: staffError } = await supabaseAdmin
        .from('staff_accounts')
        .delete()
        .eq('user_id', user_id)

      if (staffError) {
        console.error('Error deleting staff account:', staffError)
        return new Response(
          JSON.stringify({ error: staffError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Deletar de user_roles
      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .delete()
        .eq('user_id', user_id)

      if (roleError) {
        console.error('Error deleting user role:', roleError)
      }

      // Deletar usuário do auth
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id)

      if (deleteError) {
        console.error('Error deleting user:', deleteError)
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: any) {
    console.error('Error in manage-staff-user function:', error)
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})