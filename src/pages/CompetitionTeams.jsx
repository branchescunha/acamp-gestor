import { useEffect, useMemo, useState } from 'react'
import ActiveCampNotice from '../components/ActiveCampNotice'
import PageHeader from '../components/PageHeader'
import { useActiveCamp } from '../hooks/useActiveCamp'
import { useConfirm } from '../hooks/useConfirm'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabase'
import { logError } from '../utils/logger'

const colorOptions = [
  { name: 'Dourado', value: '#eab308' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Roxo', value: '#8b5cf6' },
  { name: 'Laranja', value: '#f97316' },
  { name: 'Ciano', value: '#06b6d4' },
  { name: 'Lima', value: '#84cc16' },
]

const initialForm = {
  name: '',
  color: '#eab308',
  symbol: '',
  leader_name: '',
  status: 'active',
}

function getCompetitionTeamErrorMessage(error, fallback) {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase()

  if (
    error?.code === '23505' ||
    message.includes('competition_teams_camp_name_unique_idx')
  ) {
    return 'Já existe um Time com esse nome neste acampamento.'
  }

  if (
    error?.code === '23503' ||
    error?.code === '23514' ||
    message.includes('foreign key')
  ) {
    return 'O Time selecionado não pertence a este acampamento.'
  }

  return fallback
}

function getDeleteErrorMessage(error) {
  const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase()

  if (
    error?.code === '23503' ||
    message.includes('foreign key') ||
    message.includes('restrict')
  ) {
    return 'Este Time possui vínculos ou histórico. Inative o Time em vez de excluí-lo.'
  }

  return 'Erro ao excluir Time.'
}

export default function CompetitionTeams() {
  const [teams, setTeams] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { activeCampId } = useActiveCamp()
  const requestConfirmation = useConfirm()
  const { showError } = useToast()

  useEffect(() => {
    let shouldIgnore = false

    async function loadTeams() {
      setLoading(true)

      const { data, error } = await supabase
        .from('competition_teams')
        .select(
          'id, camp_id, name, color, symbol, leader_name, status, created_at, updated_at',
        )
        .eq('camp_id', activeCampId)
        .order('status', { ascending: true })
        .order('name', { ascending: true })

      if (error) {
        logError('CompetitionTeams', error)
        if (shouldIgnore) return
        setLoading(false)
        return
      }

      if (shouldIgnore) return

      setTeams(data || [])
      setLoading(false)
    }

    if (activeCampId) {
      loadTeams()
      return () => {
        shouldIgnore = true
      }
    }

    const timeoutId = window.setTimeout(() => {
      setTeams([])
      setLoading(false)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [activeCampId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setForm(initialForm)
      setEditingId(null)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [activeCampId])

  async function reloadTeams() {
    const { data, error } = await supabase
      .from('competition_teams')
      .select(
        'id, camp_id, name, color, symbol, leader_name, status, created_at, updated_at',
      )
      .eq('camp_id', activeCampId)
      .order('status', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      logError('CompetitionTeams', error)
      return
    }

    setTeams(data || [])
  }

  function handleChange(event) {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  function handleEdit(team) {
    setEditingId(team.id)

    setForm({
      name: team.name || '',
      color: team.color || '#eab308',
      symbol: team.symbol || '',
      leader_name: team.leader_name || '',
      status: team.status || 'active',
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setEditingId(null)
    setForm(initialForm)
  }

  async function handleDelete() {
    const confirmDelete = await requestConfirmation({
      title: 'Excluir Time',
      description:
        'Tem certeza que deseja excluir este Time? Essa ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
    })

    if (!confirmDelete) return

    const { error } = await supabase
      .from('competition_teams')
      .delete()
      .eq('id', editingId)
      .eq('camp_id', activeCampId)

    if (error) {
      logError('CompetitionTeams', error)
      showError(getDeleteErrorMessage(error))
      return
    }

    setEditingId(null)
    setForm(initialForm)
    await reloadTeams()
  }

  async function handleStatusToggle(team) {
    const nextStatus = team.status === 'active' ? 'inactive' : 'active'

    const { error } = await supabase
      .from('competition_teams')
      .update({ status: nextStatus })
      .eq('id', team.id)
      .eq('camp_id', activeCampId)

    if (error) {
      logError('CompetitionTeams', error)
      showError('Erro ao alterar status do Time.')
      return
    }

    if (editingId === team.id) {
      setForm((currentForm) => ({
        ...currentForm,
        status: nextStatus,
      }))
    }

    await reloadTeams()
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!activeCampId) {
      showError('Selecione um acampamento antes de cadastrar Times.')
      return
    }

    const teamName = form.name.trim()

    if (!teamName) {
      showError('Informe o nome do Time.')
      return
    }

    setSaving(true)

    const payload = {
      name: teamName,
      color: form.color || null,
      symbol: form.symbol.trim() || null,
      leader_name: form.leader_name.trim() || null,
      status: form.status,
    }

    const request = editingId
      ? supabase
          .from('competition_teams')
          .update(payload)
          .eq('id', editingId)
          .eq('camp_id', activeCampId)
      : supabase.from('competition_teams').insert({
          ...payload,
          camp_id: activeCampId,
        })

    const { error } = await request

    if (error) {
      logError('CompetitionTeams', error)
      showError(getCompetitionTeamErrorMessage(error, 'Erro ao salvar Time.'))
      setSaving(false)
      return
    }

    setForm(initialForm)
    setEditingId(null)
    await reloadTeams()
    setSaving(false)
  }

  const sortedTeams = useMemo(() => {
    return [...teams].sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === 'active' ? -1 : 1
      }

      return a.name.localeCompare(b.name, 'pt-BR')
    })
  }, [teams])

  const activeCount = teams.filter((team) => team.status === 'active').length
  const selectedColor = colorOptions.find((color) => color.value === form.color)

  return (
    <section>
      <PageHeader
        eyebrow="Competição"
        title="Times"
        description="Gerencie os Times competitivos usados em pontuações e gincanas do acampamento."
      />

      {!activeCampId && (
        <div className="mb-6">
          <ActiveCampNotice message="Selecione um acampamento para cadastrar e gerenciar Times." />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:p-6"
      >
        <h2 className="text-xl font-bold">
          {editingId ? 'Editar Time' : 'Novo Time'}
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Nome do Time"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <select
            name="color"
            value={form.color}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            {colorOptions.map((color) => (
              <option key={color.value} value={color.value}>
                {color.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
            <div
              className="h-6 w-6 rounded-lg"
              style={{ backgroundColor: form.color }}
            />
            <span className="text-sm text-zinc-300">
              {selectedColor?.name || 'Cor selecionada'}
            </span>
          </div>

          <input
            name="symbol"
            value={form.symbol}
            onChange={handleChange}
            placeholder="Símbolo"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <select
            name="status"
            value={form.status}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="active">Ativo</option>
            <option value="inactive">Inativo</option>
          </select>

          <input
            name="leader_name"
            value={form.leader_name}
            onChange={handleChange}
            placeholder="Líder / responsável"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500 md:col-span-2 xl:col-span-5"
          />
        </div>

        <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
          {editingId && (
            <>
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-xl border border-red-500/40 px-6 py-3 font-semibold text-red-400 transition hover:bg-red-500/10"
              >
                Excluir
              </button>

              <button
                type="button"
                onClick={handleCancelEdit}
                className="rounded-xl border border-zinc-700 px-6 py-3 font-semibold text-zinc-300 transition hover:bg-zinc-800"
              >
                Cancelar
              </button>
            </>
          )}

          <button
            type="submit"
            disabled={saving || !activeCampId}
            className="rounded-xl bg-yellow-500 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? 'Salvando...'
              : editingId
                ? 'Salvar alterações'
                : 'Criar Time'}
          </button>
        </div>
      </form>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-xl font-bold">Lista de Times</h2>

            <p className="mt-2 text-sm text-zinc-400">
              {teams.length} Time(s) cadastrado(s). {activeCount} ativo(s).
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <p className="text-zinc-400">Carregando Times...</p>
        ) : sortedTeams.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <h2 className="text-xl font-bold">
              Nenhum Time cadastrado neste acampamento.
            </h2>
            <p className="mt-3 text-sm text-zinc-400">
              Crie Times competitivos para organizar a pontuação e a gincana.
            </p>
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="mt-5 rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-yellow-400"
            >
              Criar Time
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sortedTeams.map((team) => (
              <article
                key={team.id}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div
                    className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                    style={{ backgroundColor: team.color || '#27272a' }}
                  >
                    {team.symbol || team.name?.slice(0, 1)}
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      team.status === 'active'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    {team.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>

                <h2 className="mt-6 text-2xl font-bold">{team.name}</h2>

                <div className="mt-5 space-y-2 text-sm text-zinc-400">
                  <p>Símbolo: {team.symbol || 'Não definido'}</p>
                  <p>Responsável: {team.leader_name || 'Não definido'}</p>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handleEdit(team)}
                    className="rounded-xl border border-zinc-700 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800"
                  >
                    Editar
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusToggle(team)}
                    className="rounded-xl border border-zinc-700 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800"
                  >
                    {team.status === 'active' ? 'Inativar' : 'Ativar'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
