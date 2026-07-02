import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ResponsiveTable from '../components/ResponsiveTable'
import RoleAccessNotice from '../components/RoleAccessNotice'
import { useAuthContext } from '../hooks/useAuth'
import { useUserProfile } from '../hooks/useUserProfile'
import { supabase } from '../lib/supabase'

const initialForm = {
  name: '',
  type: 'church',
  city: '',
  state: '',
  notes: '',
}

const typeLabels = {
  church: 'Igreja',
  school: 'Escola',
  other: 'Outra',
}

export default function Organizations() {
  const { session } = useAuthContext()
  const { isAdmin, isGestor } = useUserProfile()
  const [organizations, setOrganizations] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadOrganizations = useCallback(async () => {
    setLoading(true)
    setError('')

    const { data, error: loadError } = await supabase
      .from('organizations')
      .select('id, name, type, city, state, notes, created_by, created_at, updated_at')
      .order('name', { ascending: true })

    if (loadError) {
      console.error(loadError)
      setError('Não foi possível carregar as organizações.')
      setLoading(false)
      return
    }

    setOrganizations(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadOrganizations()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadOrganizations])

  function handleChange(event) {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  function resetForm() {
    setForm(initialForm)
    setEditingId(null)
  }

  function handleEdit(organization) {
    setEditingId(organization.id)
    setForm({
      name: organization.name || '',
      type: organization.type || 'church',
      city: organization.city || '',
      state: organization.state || '',
      notes: organization.notes || '',
    })
    setError('')
    setSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function validateForm() {
    if (!form.name.trim()) {
      return 'Informe o nome da organização.'
    }

    if (!['church', 'school', 'other'].includes(form.type)) {
      return 'Selecione um tipo válido.'
    }

    return ''
  }

  async function createOwnerMembership(organizationId) {
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        profile_id: session.user.id,
        role: 'owner',
        status: 'active',
      })

    return memberError
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
    const wasEditing = Boolean(editingId)
    const now = new Date().toISOString()
    const payload = {
      name: form.name.trim(),
      type: form.type,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      notes: form.notes.trim() || null,
      updated_at: now,
    }

    const request = editingId
      ? supabase
          .from('organizations')
          .update(payload)
          .eq('id', editingId)
          .select()
          .single()
      : supabase
          .from('organizations')
          .insert({
            ...payload,
            created_by: session?.user?.id,
          })
          .select()
          .single()

    const { data: savedOrganization, error: saveError } = await request

    if (saveError) {
      console.error(saveError)
      setError('Não foi possível salvar a organização.')
      setSaving(false)
      return
    }

    let memberError = null

    if (!wasEditing && savedOrganization?.id && session?.user?.id) {
      memberError = await createOwnerMembership(savedOrganization.id)
    }

    resetForm()
    await loadOrganizations()
    setSuccess(
      wasEditing
        ? 'Organização atualizada com sucesso.'
        : 'Organização criada com sucesso.',
    )

    if (memberError) {
      console.error(memberError)
      setError(
        'A organização foi salva, mas não foi possível vincular seu usuário como responsável.',
      )
      setSuccess('')
    }

    setSaving(false)
  }

  const columns = [
    {
      key: 'name',
      label: 'Organização',
      render: (organization) => (
        <span className="font-medium">{organization.name}</span>
      ),
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (organization) => (
        <span className="text-zinc-300">
          {typeLabels[organization.type] || organization.type}
        </span>
      ),
    },
    {
      key: 'location',
      label: 'Local',
      render: (organization) => (
        <span className="text-zinc-400">
          {[organization.city, organization.state].filter(Boolean).join(' - ') ||
            '-'}
        </span>
      ),
    },
    {
      key: 'notes',
      label: 'Observações',
      render: (organization) => (
        <span className="text-zinc-400">{organization.notes || '-'}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (organization) => (
        <div className="flex flex-col gap-2 sm:flex-row md:justify-start">
          <Link
            to={`/admin/organizacoes/${organization.id}/membros`}
            className="rounded-lg border border-yellow-500/40 px-3 py-2 text-xs font-semibold text-yellow-300 transition hover:bg-yellow-500/10"
          >
            Membros
          </Link>

          <button
            type="button"
            onClick={() => handleEdit(organization)}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800"
          >
            Editar
          </button>
        </div>
      ),
    },
  ]

  if (!isAdmin && !isGestor) {
    return (
      <RoleAccessNotice
        title="Acesso negado"
        message="Seu perfil não tem permissão para acessar organizações."
      />
    )
  }

  return (
    <section>
      <PageHeader
        eyebrow="Organizações"
        title={isAdmin ? 'Todas as organizações' : 'Minhas organizações'}
        description="Organize igrejas, escolas ou instituições responsáveis pelos acampamentos."
      />

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

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:p-6"
      >
        <h2 className="text-xl font-bold">
          {editingId ? 'Editar organização' : 'Criar organização'}
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Nome"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="church">Igreja</option>
            <option value="school">Escola</option>
            <option value="other">Outra</option>
          </select>

          <input
            name="city"
            value={form.city}
            onChange={handleChange}
            placeholder="Cidade"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <input
            name="state"
            value={form.state}
            onChange={handleChange}
            placeholder="Estado"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Observações"
            rows={3}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500 md:col-span-2"
          />
        </div>

        <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-xl border border-zinc-700 px-6 py-3 font-semibold text-zinc-300 transition hover:bg-zinc-800"
            >
              Cancelar
            </button>
          )}

          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-yellow-500 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>

      <div className="mt-8">
        {loading ? (
          <p className="text-zinc-400">Carregando organizações...</p>
        ) : (
          <ResponsiveTable
            columns={columns}
            data={organizations}
            emptyMessage="Nenhuma organização cadastrada."
          />
        )}
      </div>
    </section>
  )
}
