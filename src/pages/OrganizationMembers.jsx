import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ResponsiveTable from '../components/ResponsiveTable'
import RoleAccessNotice from '../components/RoleAccessNotice'
import { supabase } from '../lib/supabase'
import { logError } from '../utils/logger'

const initialForm = {
  email: '',
  role: 'manager',
}

const memberRoleLabels = {
  owner: 'Owner',
  manager: 'Manager',
}

const memberStatusLabels = {
  active: 'Ativo',
  suspended: 'Suspenso',
}

const memberStatusStyles = {
  active: 'bg-green-500/20 text-green-400',
  suspended: 'bg-yellow-500/20 text-yellow-300',
}

export default function OrganizationMembers() {
  const { organizationId = '' } = useParams()
  const [organization, setOrganization] = useState(null)
  const [members, setMembers] = useState([])
  const [form, setForm] = useState(initialForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [updatingId, setUpdatingId] = useState(null)
  const [canManageMembers, setCanManageMembers] = useState(false)
  const [accessDenied, setAccessDenied] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadMembers = useCallback(async () => {
    const { data, error: membersError } = await supabase
      .from('organization_members')
      .select(
        'id, organization_id, profile_id, role, status, created_at, updated_at, profiles(name, email)',
      )
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true })

    if (membersError) {
      logError('OrganizationMembers', membersError)
      setError('Não foi possível carregar os membros da organização.')
      return
    }

    setMembers(data || [])
  }, [organizationId])

  const loadPageData = useCallback(async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    setAccessDenied(false)

    const { data: organizationData, error: organizationError } = await supabase
      .from('organizations')
      .select('id, name, type, city, state')
      .eq('id', organizationId)
      .maybeSingle()

    if (organizationError || !organizationData) {
      if (organizationError) logError('OrganizationMembers', organizationError)
      setAccessDenied(true)
      setLoading(false)
      return
    }

    const { data: permissionData, error: permissionError } = await supabase.rpc(
      'can_manage_organization_members',
      {
        target_organization_id: organizationId,
      },
    )

    if (permissionError) {
      logError('OrganizationMembers', permissionError)
      setCanManageMembers(false)
    } else {
      setCanManageMembers(Boolean(permissionData))
    }

    setOrganization(organizationData)
    await loadMembers()
    setLoading(false)
  }, [loadMembers, organizationId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPageData()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadPageData])

  function handleChange(event) {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  function resetForm() {
    setForm(initialForm)
  }

  function wouldLeaveOrganizationWithoutActiveOwner(member, changes) {
    const nextRole = changes.role ?? member.role
    const nextStatus = changes.status ?? member.status
    const activeOwnerCount = members.filter(
      (currentMember) =>
        currentMember.role === 'owner' && currentMember.status === 'active',
    ).length

    return (
      member.role === 'owner' &&
      member.status === 'active' &&
      activeOwnerCount <= 1 &&
      (nextRole !== 'owner' || nextStatus !== 'active')
    )
  }

  function validateForm() {
    if (!form.email.trim()) {
      return 'Informe o e-mail do usuário.'
    }

    if (!['owner', 'manager'].includes(form.role)) {
      return 'Selecione um papel válido.'
    }

    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setSuccess('')

    const validationError = validateForm()

    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)

    const { error: saveError } = await supabase.rpc(
      'add_organization_member_by_email',
      {
        target_organization_id: organizationId,
        member_email: form.email.trim(),
        member_role: form.role,
      },
    )

    if (saveError) {
      logError('OrganizationMembers', saveError)
      setError('Não foi possível adicionar o membro. Verifique se o profile existe e está ativo.')
      setSaving(false)
      return
    }

    resetForm()
    await loadMembers()
    setSuccess('Membro salvo com sucesso.')
    setSaving(false)
  }

  async function handleUpdateMember(member, changes) {
    setError('')
    setSuccess('')

    if (wouldLeaveOrganizationWithoutActiveOwner(member, changes)) {
      setError('A organização precisa manter pelo menos um owner ativo.')
      return
    }

    setUpdatingId(member.id)

    const { data, error: updateError } = await supabase
      .from('organization_members')
      .update({
        ...changes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', member.id)
      .select(
        'id, organization_id, profile_id, role, status, created_at, updated_at, profiles(name, email)',
      )
      .single()

    if (updateError) {
      logError('OrganizationMembers', updateError)
      setError(
        'Não foi possível alterar este membro. Verifique se a organização continuará com pelo menos um owner ativo.',
      )
      setUpdatingId(null)
      return
    }

    setMembers((currentMembers) =>
      currentMembers.map((currentMember) =>
        currentMember.id === member.id ? data : currentMember,
      ),
    )
    setSuccess('Membro atualizado com sucesso.')
    setUpdatingId(null)
  }

  const columns = [
    {
      key: 'name',
      label: 'Nome',
      render: (member) => (
        <span className="font-medium">{member.profiles?.name || '-'}</span>
      ),
    },
    {
      key: 'email',
      label: 'E-mail',
      render: (member) => (
        <span className="break-all text-zinc-400">
          {member.profiles?.email || '-'}
        </span>
      ),
    },
    {
      key: 'role',
      label: 'Papel',
      render: (member) =>
        canManageMembers ? (
          <select
            value={member.role}
            disabled={updatingId === member.id}
            onChange={(event) =>
              handleUpdateMember(member, { role: event.target.value })
            }
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-yellow-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="owner">Owner</option>
            <option value="manager">Manager</option>
          </select>
        ) : (
          <span className="text-zinc-300">
            {memberRoleLabels[member.role] || member.role}
          </span>
        ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (member) =>
        canManageMembers ? (
          <select
            value={member.status}
            disabled={updatingId === member.id}
            onChange={(event) =>
              handleUpdateMember(member, { status: event.target.value })
            }
            className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm outline-none focus:border-yellow-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="active">Ativo</option>
            <option value="suspended">Suspenso</option>
          </select>
        ) : (
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              memberStatusStyles[member.status] || memberStatusStyles.suspended
            }`}
          >
            {memberStatusLabels[member.status] || member.status}
          </span>
        ),
    },
  ]

  if (loading) {
    return <p className="text-zinc-400">Carregando membros da organização...</p>
  }

  if (accessDenied || !organization) {
    return (
      <RoleAccessNotice
        title="Acesso negado"
        message="Você não tem permissão para acessar os membros desta organização."
        actionPath="/admin/organizacoes"
        actionLabel="Voltar para organizações"
      />
    )
  }

  return (
    <section>
      <PageHeader
        eyebrow="Organizações"
        title="Membros da organização"
        description={organization.name}
      />

      <div className="mb-6">
        <Link
          to="/admin/organizacoes"
          className="text-sm font-semibold text-yellow-400 hover:text-yellow-300"
        >
          Voltar para organizações
        </Link>
      </div>

      <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-sm text-yellow-100">
        Para adicionar um membro, o usuário precisa já existir em
        Usuários/Profiles.
      </div>

      {error && (
        <p
          role="alert"
          className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          {success}
        </p>
      )}

      {canManageMembers && (
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:p-6"
        >
          <h2 className="text-xl font-bold">Adicionar membro</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <input
              name="email"
              value={form.email}
              onChange={handleChange}
              type="email"
              placeholder="E-mail do usuário"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
            />

            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
            >
              <option value="owner">Owner</option>
              <option value="manager">Manager</option>
            </select>
          </div>

          <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-zinc-700 px-6 py-3 font-semibold text-zinc-300 transition hover:bg-zinc-800"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-yellow-500 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      {!canManageMembers && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-sm text-zinc-400">
          Managers podem visualizar membros, mas apenas owners ou
          administradores podem gerenciá-los.
        </div>
      )}

      <div className="mt-8">
        <ResponsiveTable
          columns={columns}
          data={members}
          emptyMessage="Nenhum membro cadastrado."
        />
      </div>
    </section>
  )
}
