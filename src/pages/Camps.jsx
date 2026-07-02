import { useCallback, useEffect, useState } from 'react'
import PageHeader from '../components/PageHeader'
import ResponsiveTable from '../components/ResponsiveTable'
import { useAuthContext } from '../hooks/useAuth'
import { useActiveCamp } from '../hooks/useActiveCamp'
import { useUserProfile } from '../hooks/useUserProfile'
import { supabase } from '../lib/supabase'
import { generateSlug, getSlugValidationError } from '../utils/slug'

const initialForm = {
  name: '',
  church_name: '',
  theme: '',
  start_date: '',
  end_date: '',
  status: 'draft',
  slug: '',
  public_ranking_enabled: true,
  organization_id: '',
}

const statusLabels = {
  draft: 'Rascunho',
  active: 'Ativo',
  archived: 'Arquivado',
}

const statusStyles = {
  draft: 'bg-zinc-700 text-zinc-300',
  active: 'bg-green-500/20 text-green-400',
  archived: 'bg-yellow-500/20 text-yellow-300',
}

export default function Camps() {
  const { session } = useAuthContext()
  const { isAdmin } = useUserProfile()
  const [camps, setCamps] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const { activeCampId, setActiveCamp } = useActiveCamp(camps)

  function getPublicRankingUrl(slug) {
    if (!slug || typeof window === 'undefined') return ''
    return `${window.location.origin}/${slug}`
  }

  function getCampAdminUrl(slug) {
    if (!slug || typeof window === 'undefined') return ''
    return `${window.location.origin}/${slug}/admin`
  }

  const loadCamps = useCallback(async () => {
    setLoading(true)
    setError('')

    const { data, error: loadError } = await supabase
      .from('camps')
      .select('*, organizations(name)')
      .order('created_at', { ascending: false })

    if (loadError) {
      console.error(loadError)
      setError('Não foi possível carregar seus acampamentos.')
      setLoading(false)
      return
    }

    setCamps(data || [])
    setLoading(false)
  }, [])

  const loadOrganizations = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('organizations')
      .select('id, name')
      .order('name', { ascending: true })

    if (loadError) {
      console.error(loadError)
      setError('Não foi possível carregar as organizações.')
      return
    }

    setOrganizations(data || [])
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadCamps()
      void loadOrganizations()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadCamps, loadOrganizations])

  function handleChange(event) {
    const { name, value, type, checked } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]:
        type === 'checkbox'
          ? checked
          : name === 'slug'
            ? generateSlug(value)
            : value,
      ...(name === 'name' && !editingId && !slugTouched
        ? { slug: generateSlug(value) }
        : {}),
    }))

    if (name === 'slug') {
      setSlugTouched(true)
    }
  }

  function validateForm() {
    if (!form.name.trim()) {
      return 'Informe o nome do acampamento.'
    }

    if (!form.church_name.trim()) {
      return 'Informe a igreja ou organização.'
    }

    if (form.start_date && form.end_date && form.end_date < form.start_date) {
      return 'A data de fim não pode ser anterior à data de início.'
    }

    const slugError = getSlugValidationError(form.slug.trim())

    if (slugError) {
      return slugError
    }

    return ''
  }

  function resetForm() {
    setForm(initialForm)
    setEditingId(null)
    setSlugTouched(false)
  }

  function handleEdit(camp) {
    setEditingId(camp.id)
    setForm({
      name: camp.name || '',
      church_name: camp.church_name || '',
      theme: camp.theme || '',
      start_date: camp.start_date || '',
      end_date: camp.end_date || '',
      status: camp.status || 'draft',
      slug: camp.slug || '',
      public_ranking_enabled: camp.public_ranking_enabled ?? true,
      organization_id: camp.organization_id || '',
    })
    setSlugTouched(true)
    setError('')
    setSuccess('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleCopyLink(slug) {
    const publicRankingUrl = getPublicRankingUrl(slug)

    if (!publicRankingUrl || !navigator.clipboard) return

    try {
      await navigator.clipboard.writeText(publicRankingUrl)
      setSuccess('Link público copiado.')
      setError('')
    } catch (copyError) {
      console.error(copyError)
      setError('Não foi possível copiar o link automaticamente.')
    }
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

    const payload = {
      name: form.name.trim(),
      church_name: form.church_name.trim(),
      theme: form.theme.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      status: form.status,
      slug: form.slug.trim() || null,
      public_ranking_enabled: form.public_ranking_enabled,
      organization_id: form.organization_id || null,
      updated_at: new Date().toISOString(),
    }

    const request = editingId
      ? supabase
          .from('camps')
          .update(payload)
          .eq('id', editingId)
          .select()
          .single()
      : supabase
          .from('camps')
          .insert({
            ...payload,
            created_by: session?.user?.id,
          })
          .select()
          .single()

    const { data: savedCamp, error: saveError } = await request

    if (saveError) {
      console.error(saveError)
      setError(
        saveError.code === '23505'
          ? 'Essa URL pública já está em uso. Escolha outra.'
          : 'Não foi possível salvar o acampamento.',
      )
      setSaving(false)
      return
    }

    resetForm()
    await loadCamps()
    if (savedCamp?.id === activeCampId) {
      setActiveCamp(savedCamp)
    }
    setSuccess(
      wasEditing
        ? 'Acampamento atualizado com sucesso.'
        : 'Acampamento criado com sucesso.',
    )
    setSaving(false)
  }

  function formatDate(value) {
    if (!value) return '-'
    return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR')
  }

  const publicRankingPreview = getPublicRankingUrl(form.slug)
  const pageTitle = isAdmin ? 'Todos os acampamentos' : 'Meus acampamentos'
  const pageDescription = isAdmin
    ? 'Gerencie e selecione acampamentos cadastrados na plataforma.'
    : 'Crie, edite e selecione o acampamento ativo para organizar a operação do evento.'

  const columns = [
    {
      key: 'name',
      label: 'Acampamento',
      render: (camp) => (
        <div>
          <strong className="block">{camp.name}</strong>
          {activeCampId === camp.id && (
            <span className="mt-1 inline-block rounded-full bg-yellow-500/20 px-3 py-1 text-xs font-semibold text-yellow-300">
              Acampamento ativo
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'church_name',
      label: 'Igreja/organização',
      render: (camp) => (
        <span className="text-zinc-400">{camp.church_name}</span>
      ),
    },
    {
      key: 'theme',
      label: 'Tema',
      render: (camp) => <span className="text-zinc-400">{camp.theme || '-'}</span>,
    },
    {
      key: 'organization',
      label: 'Organização',
      render: (camp) => (
        <span className="text-zinc-400">
          {camp.organizations?.name || 'Sem organização'}
        </span>
      ),
    },
    {
      key: 'dates',
      label: 'Datas',
      render: (camp) => (
        <span className="text-zinc-400">
          {formatDate(camp.start_date)} até {formatDate(camp.end_date)}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (camp) => (
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            statusStyles[camp.status] || statusStyles.draft
          }`}
        >
          {statusLabels[camp.status] || camp.status}
        </span>
      ),
    },
    {
      key: 'public_ranking',
      label: 'Links do acampamento',
      render: (camp) =>
        camp.slug ? (
          <div className="flex flex-col gap-2">
            <a
              href={`/${camp.slug}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-semibold text-yellow-400 hover:text-yellow-300"
            >
              Ver ranking
            </a>

            <a
              href={`/${camp.slug}/admin`}
              className="text-sm font-semibold text-zinc-300 hover:text-white"
            >
              Abrir painel
            </a>

            <span className="text-xs text-zinc-500">
              Ranking: {getPublicRankingUrl(camp.slug)}
            </span>

            <span className="text-xs text-zinc-500">
              Painel: {getCampAdminUrl(camp.slug)}
            </span>

            <button
              type="button"
              onClick={() => handleCopyLink(camp.slug)}
              className="text-left text-xs text-zinc-400 transition hover:text-white"
            >
              Copiar link do ranking
            </button>

            {!camp.public_ranking_enabled && (
              <span className="text-xs text-zinc-500">Ranking desativado</span>
            )}
          </div>
        ) : (
          <span className="text-xs text-zinc-500">
            Defina uma URL pública para habilitar os links do acampamento.
          </span>
        ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (camp) => (
        <div className="flex flex-col gap-2 sm:flex-row md:justify-start">
          <button
            type="button"
            onClick={() => setActiveCamp(camp)}
            className="rounded-lg border border-yellow-500/40 px-3 py-2 text-xs font-semibold text-yellow-300 transition hover:bg-yellow-500/10"
          >
            Selecionar
          </button>

          <button
            type="button"
            onClick={() => handleEdit(camp)}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800"
          >
            Editar
          </button>
        </div>
      ),
    },
  ]

  return (
    <section>
      <PageHeader
        eyebrow="Acampamentos"
        title={pageTitle}
        description={pageDescription}
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
          {editingId ? 'Editar acampamento' : 'Criar acampamento'}
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Nome do acampamento"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <input
            name="church_name"
            value={form.church_name}
            onChange={handleChange}
            placeholder="Igreja/organização"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <input
            name="theme"
            value={form.theme}
            onChange={handleChange}
            placeholder="Tema, opcional"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <select
            name="organization_id"
            value={form.organization_id}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Sem organização</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.name}
              </option>
            ))}
          </select>

          <div className="xl:col-span-2">
            <input
              name="slug"
              value={form.slug}
              onChange={handleChange}
              placeholder="url-publica-do-acampamento"
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
            />

            <p className="mt-2 text-xs text-zinc-500">
              {publicRankingPreview
                ? publicRankingPreview
                : 'A URL pública será gerada a partir do nome do acampamento.'}
            </p>
          </div>

          <input
            name="start_date"
            value={form.start_date}
            onChange={handleChange}
            type="date"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <input
            name="end_date"
            value={form.end_date}
            onChange={handleChange}
            type="date"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="draft">Rascunho</option>
            <option value="active">Ativo</option>
            <option value="archived">Arquivado</option>
          </select>

          <label className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              name="public_ranking_enabled"
              checked={form.public_ranking_enabled}
              onChange={handleChange}
              className="h-4 w-4"
            />
            Ranking público ativo
          </label>
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
          <p className="text-zinc-400">Carregando acampamentos...</p>
        ) : (
          <ResponsiveTable
            columns={columns}
            data={camps}
            emptyMessage="Nenhum acampamento cadastrado."
          />
        )}
      </div>
    </section>
  )
}
