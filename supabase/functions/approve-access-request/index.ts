import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

function getBearerToken(request: Request) {
  const authorization = request.headers.get('Authorization') || ''

  if (!authorization.startsWith('Bearer ')) {
    return ''
  }

  return authorization.replace('Bearer ', '').trim()
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function normalizeName(name: string) {
  return name.trim()
}

function getPublicAppUrl() {
  return Deno.env.get('PUBLIC_SITE_URL')?.trim() || ''
}

async function findAuthUserByEmail(supabaseAdmin: any, email: string) {
  let page = 1
  const perPage = 1000

  while (page <= 10) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    })

    if (error) {
      throw error
    }

    const user = data?.users?.find(
      (currentUser: { email?: string }) =>
        normalizeEmail(currentUser.email || '') === email,
    )

    if (user) {
      return user
    }

    if (!data?.users || data.users.length < perPage) {
      return null
    }

    page += 1
  }

  return null
}

async function getOrCreateAuthUser(
  supabaseAdmin: any,
  email: string,
  name: string,
) {
  const existingUser = await findAuthUserByEmail(supabaseAdmin, email)

  if (existingUser) {
    return existingUser
  }

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: {
      name,
    },
  })

  if (!error && data?.user) {
    return data.user
  }

  const fallbackUser = await findAuthUserByEmail(supabaseAdmin, email)

  if (fallbackUser) {
    return fallbackUser
  }

  throw error || new Error('Não foi possível criar o usuário no Supabase Auth.')
}

async function getOrCreateOrganization(
  supabaseAdmin: any,
  organizationName: string,
  createdBy: string,
) {
  const normalizedOrganizationName = normalizeName(organizationName)

  if (!normalizedOrganizationName) {
    return null
  }

  const { data: organizations, error: organizationSearchError } =
    await supabaseAdmin
      .from('organizations')
      .select('id, name, type, city, state, notes, created_by')
      .order('created_at', { ascending: true })

  if (organizationSearchError) {
    throw organizationSearchError
  }

  const existingOrganization = (organizations || []).find(
    (organization: { name?: string }) =>
      normalizeName(organization.name || '').toLowerCase() ===
      normalizedOrganizationName.toLowerCase(),
  )

  if (existingOrganization) {
    return existingOrganization
  }

  const { data: organization, error: organizationCreateError } =
    await supabaseAdmin
      .from('organizations')
      .insert({
        name: normalizedOrganizationName,
        type: 'church',
        created_by: createdBy,
      })
      .select('id, name, type, city, state, notes, created_by')
      .single()

  if (organizationCreateError) {
    throw organizationCreateError
  }

  return organization
}

async function createOrUpdateInvitation(
  supabaseAdmin: any,
  request: { name: string; email: string },
  reviewerId: string,
) {
  const now = new Date().toISOString()

  const { data: existingInvitation, error: invitationSearchError } =
    await supabaseAdmin
      .from('invitations')
      .select('id')
      .eq('email', request.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

  if (invitationSearchError) {
    throw invitationSearchError
  }

  const invitationPayload = {
    name: request.name,
    email: request.email,
    role: 'gestor',
    status: 'accepted',
    notes: 'Registro automático gerado pela aprovação de solicitação de acesso.',
    created_by: reviewerId,
    updated_at: now,
    accepted_at: now,
    canceled_at: null,
    sent_at: now,
    sent_by: reviewerId,
  }

  const query = existingInvitation?.id
    ? supabaseAdmin
        .from('invitations')
        .update(invitationPayload)
        .eq('id', existingInvitation.id)
    : supabaseAdmin.from('invitations').insert(invitationPayload)

  const { data: invitation, error: invitationError } = await query
    .select('id, name, email, role, status, token, accepted_at, sent_at')
    .single()

  if (invitationError) {
    throw invitationError
  }

  return invitation
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ success: false, message: 'Método não permitido.' }, 405)
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const adminApiKey =
      Deno.env.get('ACAMPGESTOR_ADMIN_API_KEY') ||
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !adminApiKey) {
      return jsonResponse(
        {
          success: false,
          message: 'Configuração da Edge Function incompleta.',
        },
        500,
      )
    }

    const token = getBearerToken(request)

    if (!token) {
      return jsonResponse(
        { success: false, message: 'Token de autenticação obrigatório.' },
        401,
      )
    }

    const supabaseAdmin = createClient(supabaseUrl, adminApiKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const {
      data: { user: caller },
      error: callerError,
    } = await supabaseAdmin.auth.getUser(token)

    if (callerError || !caller) {
      return jsonResponse(
        { success: false, message: 'Sessão inválida ou expirada.' },
        401,
      )
    }

    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, name, email, role, status')
      .eq('id', caller.id)
      .maybeSingle()

    if (profileError) {
      throw profileError
    }

    if (
      !callerProfile ||
      callerProfile.role !== 'admin' ||
      callerProfile.status !== 'active'
    ) {
      return jsonResponse(
        {
          success: false,
          message: 'Apenas ADMIN ativo pode aprovar solicitações.',
        },
        403,
      )
    }

    const body = await request.json().catch(() => ({}))
    const requestId =
      typeof body.requestId === 'string' ? body.requestId.trim() : ''

    if (!requestId) {
      return jsonResponse(
        { success: false, message: 'requestId é obrigatório.' },
        400,
      )
    }

    const { data: accessRequest, error: requestError } = await supabaseAdmin
      .from('access_requests')
      .select('id, name, email, church_name, message, status')
      .eq('id', requestId)
      .maybeSingle()

    if (requestError) {
      throw requestError
    }

    if (!accessRequest) {
      return jsonResponse(
        { success: false, message: 'Solicitação não encontrada.' },
        404,
      )
    }

    if (accessRequest.status !== 'pending') {
      return jsonResponse(
        {
          success: false,
          message: 'Esta solicitação não está pendente de aprovação.',
        },
        400,
      )
    }

    const normalizedRequest = {
      name: normalizeName(accessRequest.name || ''),
      email: normalizeEmail(accessRequest.email || ''),
      churchName: normalizeName(accessRequest.church_name || ''),
    }

    if (!normalizedRequest.name || !normalizedRequest.email) {
      return jsonResponse(
        {
          success: false,
          message: 'Solicitação sem nome ou e-mail válido.',
        },
        400,
      )
    }

    const authUser = await getOrCreateAuthUser(
      supabaseAdmin,
      normalizedRequest.email,
      normalizedRequest.name,
    )
    const now = new Date().toISOString()

    const { data: existingProfile, error: existingProfileError } =
      await supabaseAdmin
        .from('profiles')
        .select('id, name, email, role, status')
        .eq('id', authUser.id)
        .maybeSingle()

    if (existingProfileError) {
      throw existingProfileError
    }

    if (existingProfile?.role === 'admin') {
      return jsonResponse(
        {
          success: false,
          message:
            'Este e-mail já pertence a um ADMIN. Revise a solicitação manualmente.',
        },
        409,
      )
    }

    if (existingProfile && existingProfile.role !== 'gestor') {
      return jsonResponse(
        {
          success: false,
          message:
            'Este e-mail já possui um perfil incompatível. Revise a solicitação manualmente.',
        },
        409,
      )
    }

    const { data: profile, error: upsertProfileError } = await supabaseAdmin
      .from('profiles')
      .upsert(
        {
          id: authUser.id,
          name: normalizedRequest.name,
          email: normalizedRequest.email,
          role: 'gestor',
          status: 'active',
          updated_at: now,
        },
        { onConflict: 'id' },
      )
      .select('id, name, email, role, status')
      .single()

    if (upsertProfileError) {
      throw upsertProfileError
    }

    const organization = await getOrCreateOrganization(
      supabaseAdmin,
      normalizedRequest.churchName,
      authUser.id,
    )

    if (organization?.id) {
      const { error: membershipError } = await supabaseAdmin
        .from('organization_members')
        .upsert(
          {
            organization_id: organization.id,
            profile_id: authUser.id,
            role: 'owner',
            status: 'active',
            updated_at: now,
          },
          { onConflict: 'organization_id,profile_id' },
        )

      if (membershipError) {
        throw membershipError
      }
    }

    const invitation = await createOrUpdateInvitation(
      supabaseAdmin,
      {
        name: normalizedRequest.name,
        email: normalizedRequest.email,
      },
      caller.id,
    )

    const publicAppUrl = getPublicAppUrl()
    const redirectTo = publicAppUrl
      ? `${publicAppUrl.replace(/\/$/, '')}/redefinir-senha`
      : undefined

    const { data: linkData, error: linkError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: normalizedRequest.email,
        options: redirectTo ? { redirectTo } : undefined,
      })

    const { data: reviewedRequest, error: reviewError } = await supabaseAdmin
      .from('access_requests')
      .update({
        status: 'approved',
        reviewed_at: now,
        reviewed_by: caller.id,
      })
      .eq('id', accessRequest.id)
      .eq('status', 'pending')
      .select('id, name, email, church_name, status, reviewed_at, reviewed_by')
      .maybeSingle()

    if (reviewError) {
      throw reviewError
    }

    if (!reviewedRequest) {
      return jsonResponse(
        {
          success: false,
          message:
            'Esta solicitação já foi processada ou não está mais pendente.',
        },
        409,
      )
    }

    return jsonResponse({
      success: true,
      message:
        'Solicitação aprovada. Usuário, profile e vínculo com organização foram criados automaticamente.',
      userId: authUser.id,
      profile,
      organization,
      onboarding: invitation,
      invitation,
      firstAccessLink: linkError ? null : linkData?.properties?.action_link,
      firstAccessLinkError: linkError
        ? 'Não foi possível gerar o link de primeiro acesso automaticamente.'
        : null,
      accessRequest: reviewedRequest,
    })
  } catch (error) {
    console.error(error)

    return jsonResponse(
      {
        success: false,
        message: 'Não foi possível aprovar automaticamente esta solicitação.',
        detail: 'Revise os dados da solicitação ou tente novamente.',
      },
      500,
    )
  }
})
