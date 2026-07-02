import { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import ResponsiveTable from '../components/ResponsiveTable'
import { useAuthContext } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const initialForm = {
  name: '',
  email: '',
  role: 'gestor',
  status: 'pending',
  notes: '',
}

const roleLabels = {
  admin: 'Administrador',
  gestor: 'Gestor',
}

const statusLabels = {
  pending: 'Pendente',
  accepted: 'Aceito',
  canceled: 'Cancelado',
}

const statusStyles = {
  pending: 'bg-yellow-500/20 text-yellow-300',
  accepted: 'bg-green-500/20 text-green-400',
  canceled: 'bg-red-500/20 text-red-300',
}

export default function Invitations() {
  const { session } = useAuthContext()
  const [searchParams] = useSearchParams()
  const [invitations, setInvitations] = useState([])
  const [form, setForm] = useState(() => ({
    ...initialForm,
    name: searchParams.get('name') || '',
    email: searchParams.get('email') || '',
  }))
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadInvitations = useCallback(async () => {
    setLoading(true)
    setError('')

    const { data, error: loadError } = await supabase
      .from('invitations')
      .select(
        'id, name, email, role, status, token, notes, created_by, created_at, updated_at, accepted_at, canceled_at',
      )
      .order('created_at', { ascending: false })

    if (loadError) {
      console.error(loadError)
      setError('Não foi possível carregar os convites.')
      setLoading(false)
      return
    }

    setInvitations(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadInvitations()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadInvitations])

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

  function handleEdit(invitation) {
    setEditingId(invitation.id)
    setForm({
      name: invitation.name || '',
      email: invitation.email || '',
      role: invitation.role || 'gestor',
      status: invitation.status || 'pending',
      notes: invitation.notes || '',
    })
    setError('')
    setSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function validateForm() {
    if (!form.name.trim()) {
      return 'Informe o nome.'
    }

    if (!form.email.trim()) {
      return 'Informe o e-mail.'
    }

    if (!['admin', 'gestor'].includes(form.role)) {
      return 'Selecione um papel válido.'
    }

    if (!['pending', 'accepted', 'canceled'].includes(form.status)) {
      return 'Selecione um status válido.'
    }

    return ''
  }

  function getStatusDates(status) {
    const now = new Date().toISOString()

    if (status === 'accepted') {
      return {
        accepted_at: now,
        canceled_at: null,
      }
    }

    if (status === 'canceled') {
      return {
        accepted_at: null,
        canceled_at: now,
      }
    }

    return {
      accepted_at: null,
      canceled_at: null,
    }
  }

  function getSaveErrorMessage(saveError) {
    if (saveError.code === '23505') {
      return 'Já existe um convite com token duplicado. Tente salvar novamente.'
    }

    return 'Não foi possível salvar o convite.'
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

    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      status: form.status,
      notes: form.notes.trim() || null,
      updated_at: new Date().toISOString(),
      ...getStatusDates(form.status),
    }

    const request = editingId
      ? supabase
          .from('invitations')
          .update(payload)
          .eq('id', editingId)
          .select()
          .single()
      : supabase
          .from('invitations')
          .insert({
            ...payload,
            created_by: session?.user?.id,
          })
          .select()
          .single()

    const { error: saveError } = await request

    if (saveError) {
      console.error(saveError)
      setError(getSaveErrorMessage(saveError))
      setSaving(false)
      return
    }

    resetForm()
    await loadInvitations()
    setSuccess(
      editingId
        ? 'Convite atualizado com sucesso.'
        : 'Convite criado com sucesso. Crie o usuário manualmente no Supabase Auth e cadastre o perfil em Usuários.',
    )
    setSaving(false)
  }

  function formatDate(value) {
    if (!value) return '-'
    return new Date(value).toLocaleString('pt-BR')
  }

  const columns = [
    {
      key: 'name',
      label: 'Nome',
      render: (invitation) => (
        <span className="font-medium">{invitation.name}</span>
      ),
    },
    {
      key: 'email',
      label: 'E-mail',
      render: (invitation) => (
        <span className="break-all text-zinc-400">{invitation.email}</span>
      ),
    },
    {
      key: 'role',
      label: 'Papel',
      render: (invitation) => (
        <span className="text-zinc-300">
          {roleLabels[invitation.role] || invitation.role}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (invitation) => (
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            statusStyles[invitation.status] || statusStyles.pending
          }`}
        >
          {statusLabels[invitation.status] || invitation.status}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Criado em',
      render: (invitation) => (
        <span className="text-zinc-400">
          {formatDate(invitation.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (invitation) => (
        <button
          type="button"
          onClick={() => handleEdit(invitation)}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800"
        >
          Editar
        </button>
      ),
    },
  ]

  return (
    <section>
      <PageHeader
        eyebrow="Convites"
        title="Convites administrativos"
        description="Organize convites administrativos sem criar usuários automaticamente."
      />

      <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-sm text-yellow-100">
        Após criar o convite, crie o usuário manualmente no Supabase Auth e
        cadastre o perfil em{' '}
        <Link
          to="/admin/usuarios"
          className="font-semibold text-yellow-300 hover:text-yellow-200"
        >
          Usuários
        </Link>
        .
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

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:p-6"
      >
        <h2 className="text-xl font-bold">
          {editingId ? 'Editar convite' : 'Criar convite'}
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Nome"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            type="email"
            placeholder="E-mail"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <select
            name="role"
            value={form.role}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="admin">Administrador</option>
            <option value="gestor">Gestor</option>
          </select>

          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="pending">Pendente</option>
            <option value="accepted">Aceito</option>
            <option value="canceled">Cancelado</option>
          </select>

          <textarea
            name="notes"
            value={form.notes}
            onChange={handleChange}
            placeholder="Observações"
            rows={3}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500 md:col-span-2 xl:col-span-3"
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
          <p className="text-zinc-400">Carregando convites...</p>
        ) : (
          <ResponsiveTable
            columns={columns}
            data={invitations}
            emptyMessage="Nenhum convite encontrado."
          />
        )}
      </div>
    </section>
  )
}
