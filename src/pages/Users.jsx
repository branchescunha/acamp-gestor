import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import ResponsiveTable from '../components/ResponsiveTable'
import { supabase } from '../lib/supabase'
import { logError } from '../utils/logger'

const initialForm = {
  id: '',
  name: '',
  email: '',
  role: 'gestor',
  status: 'active',
}

const roleLabels = {
  admin: 'Administrador',
  gestor: 'Gestor',
}

const statusLabels = {
  active: 'Ativo',
  suspended: 'Suspenso',
}

const statusStyles = {
  active: 'bg-green-500/20 text-green-400',
  suspended: 'bg-yellow-500/20 text-yellow-300',
}

export default function Users() {
  const [profiles, setProfiles] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadProfiles = useCallback(async () => {
    setLoading(true)
    setError('')

    const { data, error: loadError } = await supabase
      .from('profiles')
      .select('id, name, email, role, status, created_at, updated_at')
      .order('name', { ascending: true })

    if (loadError) {
      logError('Users', loadError)
      setError('Não foi possível carregar os perfis de acesso.')
      setLoading(false)
      return
    }

    setProfiles(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadProfiles()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadProfiles])

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

  function handleEdit(profile) {
    setEditingId(profile.id)
    setForm({
      id: profile.id,
      name: profile.name || '',
      email: profile.email || '',
      role: profile.role || 'gestor',
      status: profile.status || 'active',
    })
    setError('')
    setSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function validateForm() {
    if (!editingId && !form.id.trim()) {
      return 'Informe o User UID.'
    }

    if (!form.name.trim()) {
      return 'Informe o nome.'
    }

    if (!['admin', 'gestor'].includes(form.role)) {
      return 'Selecione um papel válido.'
    }

    if (!['active', 'suspended'].includes(form.status)) {
      return 'Selecione um status válido.'
    }

    return ''
  }

  function getSaveErrorMessage(saveError) {
    if (saveError.code === '23503') {
      return 'User UID não encontrado no Supabase Auth. Crie o usuário primeiro em Authentication > Users.'
    }

    if (saveError.code === '23505') {
      return 'Já existe um perfil com esse User UID ou e-mail.'
    }

    return 'Não foi possível salvar o perfil.'
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
      email: form.email.trim() || null,
      role: form.role,
      status: form.status,
      updated_at: new Date().toISOString(),
    }

    const request = editingId
      ? supabase
          .from('profiles')
          .update(payload)
          .eq('id', editingId)
      : supabase
          .from('profiles')
          .insert({
            ...payload,
            id: form.id.trim(),
          })

    const { error: saveError } = await request

    if (saveError) {
      logError('Users', saveError)
      setError(getSaveErrorMessage(saveError))
      setSaving(false)
      return
    }

    resetForm()
    await loadProfiles()
    setSuccess(
      editingId
        ? 'Perfil atualizado com sucesso.'
        : 'Perfil criado com sucesso.',
    )
    setSaving(false)
  }

  const columns = [
    {
      key: 'name',
      label: 'Nome',
      render: (profile) => <span className="font-medium">{profile.name}</span>,
    },
    {
      key: 'email',
      label: 'E-mail',
      render: (profile) => (
        <span className="break-all text-zinc-400">{profile.email || '-'}</span>
      ),
    },
    {
      key: 'id',
      label: 'User UID',
      render: (profile) => (
        <span className="break-all font-mono text-xs text-zinc-400">
          {profile.id}
        </span>
      ),
    },
    {
      key: 'role',
      label: 'Papel',
      render: (profile) => (
        <span className="text-zinc-300">
          {roleLabels[profile.role] || profile.role}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (profile) => (
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            statusStyles[profile.status] || statusStyles.suspended
          }`}
        >
          {statusLabels[profile.status] || profile.status}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (profile) => (
        <button
          type="button"
          onClick={() => handleEdit(profile)}
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
        eyebrow="Usuários"
        title="Perfis de acesso"
        description="Crie primeiro o usuário no Supabase Auth. Depois cadastre aqui o perfil usando o User UID."
      />

      <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-sm text-yellow-100">
        Esta tela não cria usuários no Supabase Auth. Ela apenas vincula um
        usuário existente a um perfil de acesso do AcampGestor.
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
          {editingId ? 'Editar perfil' : 'Criar perfil'}
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <input
            name="id"
            value={form.id}
            onChange={handleChange}
            disabled={Boolean(editingId)}
            placeholder="User UID"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 font-mono text-sm outline-none focus:border-yellow-500 disabled:cursor-not-allowed disabled:opacity-60"
          />

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
            <option value="active">Ativo</option>
            <option value="suspended">Suspenso</option>
          </select>
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
          <p className="text-zinc-400">Carregando usuários...</p>
        ) : (
          <ResponsiveTable
            columns={columns}
            data={profiles}
            emptyMessage="Nenhum perfil de acesso encontrado."
          />
        )}
      </div>
    </section>
  )
}
