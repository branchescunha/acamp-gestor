import { useCallback, useEffect, useMemo, useState } from 'react'
import ActiveCampNotice from '../components/ActiveCampNotice'
import PageHeader from '../components/PageHeader'
import ResponsiveTable from '../components/ResponsiveTable'
import { useActiveCamp } from '../hooks/useActiveCamp'
import { supabase } from '../lib/supabase'

const initialForm = {
  title: '',
  winning_team: '',
  points_per_member: '',
  notes: '',
}

const legacySettings = {
  team_a_name: 'Equipe A',
  team_b_name: 'Equipe B',
}

export default function Gymkhana() {
  const [tribes, setTribes] = useState([])
  const [participants, setParticipants] = useState([])
  const [history, setHistory] = useState([])
  const [settings, setSettings] = useState(legacySettings)
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { activeCampId } = useActiveCamp()

  const loadData = useCallback(async () => {
    setLoading(true)

    if (!activeCampId) {
      setTribes([])
      setParticipants([])
      setHistory([])
      setSettings(legacySettings)
      setLoading(false)
      return
    }

    const { data: tribesData, error: tribesError } = await supabase
      .from('tribes')
      .select('*')
      .eq('camp_id', activeCampId)
      .order('name')

    const { data: participantsData, error: participantsError } = await supabase
      .from('participants')
      .select(
        `
        *,
        tribes (
          name,
          color,
          symbol
        )
      `
      )
      .eq('camp_id', activeCampId)
      .eq('is_active', true)
      .order('full_name')

    const { data: historyData, error: historyError } = await supabase
      .from('gymkhana_events')
      .select('*')
      .eq('camp_id', activeCampId)
      .order('created_at', { ascending: false })

    const { data: settingsRows, error: settingsError } = await supabase
      .from('gymkhana_settings')
      .select('team_a_name, team_b_name')
      .eq('camp_id', activeCampId)
      .limit(1)

    if (tribesError || participantsError || historyError || settingsError) {
      console.error(
        tribesError || participantsError || historyError || settingsError
      )
      setLoading(false)
      return
    }

    const settingsData = settingsRows?.[0]

    setTribes(tribesData || [])
    setParticipants(participantsData || [])
    setHistory(historyData || [])
    setSettings({
      team_a_name: settingsData?.team_a_name || legacySettings.team_a_name,
      team_b_name: settingsData?.team_b_name || legacySettings.team_b_name,
    })
    setLoading(false)
  }, [activeCampId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadData])

  const participantsByTribe = useMemo(() => {
    return participants.reduce((groups, participant) => {
      const tribeId = participant.tribe_id

      if (!tribeId) return groups

      const currentParticipants = groups.get(tribeId) || []
      groups.set(tribeId, [...currentParticipants, participant])

      return groups
    }, new Map())
  }, [participants])

  function getWinningTeamName(winningTeam) {
    if (winningTeam === 'A') return `${settings.team_a_name} (legado)`
    if (winningTeam === 'B') return `${settings.team_b_name} (legado)`

    const tribe = tribes.find((item) => item.id === winningTeam)
    return tribe?.name || 'Equipe não encontrada'
  }

  function getWinningTeam(winningTeam) {
    return tribes.find((item) => item.id === winningTeam) || null
  }

  function handleChange(event) {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  async function createScoreEvent(gymkhanaEventId, points, winningTeamName) {
    const { error } = await supabase.from('score_events').insert({
      tribe_id: form.winning_team,
      participant_id: null,
      type: 'POINT',
      category: 'Gincana',
      points,
      reason: form.title.trim(),
      notes: form.notes.trim()
        ? `${winningTeamName} | ${form.notes.trim()}`
        : winningTeamName,
      gymkhana_event_id: gymkhanaEventId,
      camp_id: activeCampId,
    })

    if (error) throw error
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!activeCampId) {
      alert('Selecione um acampamento antes de lançar gincanas.')
      return
    }

    if (tribes.length < 2) {
      alert('Cadastre pelo menos duas equipes para lançar resultados da gincana.')
      return
    }

    if (!form.title.trim()) {
      alert('Informe o nome da prova.')
      return
    }

    if (!form.winning_team) {
      alert('Selecione a equipe vencedora.')
      return
    }

    const winningTeam = getWinningTeam(form.winning_team)

    if (!winningTeam) {
      alert('Selecione uma equipe vencedora válida.')
      return
    }

    if (!form.points_per_member || Number(form.points_per_member) <= 0) {
      alert('Informe uma pontuação válida para o resultado.')
      return
    }

    setSaving(true)

    try {
      const points = Number(form.points_per_member)
      const winningTeamName = getWinningTeamName(form.winning_team)
      const eventPayload = {
        title: form.title.trim(),
        winning_team: form.winning_team,
        points_per_member: points,
        notes: form.notes.trim() || null,
        camp_id: activeCampId,
      }

      if (editingId) {
        const { error: deleteScoresError } = await supabase
          .from('score_events')
          .delete()
          .eq('gymkhana_event_id', editingId)
          .eq('camp_id', activeCampId)

        if (deleteScoresError) throw deleteScoresError

        const { error: updateEventError } = await supabase
          .from('gymkhana_events')
          .update(eventPayload)
          .eq('id', editingId)
          .eq('camp_id', activeCampId)

        if (updateEventError) throw updateEventError

        await createScoreEvent(editingId, points, winningTeamName)
      } else {
        const { data: gymkhanaEvent, error: createEventError } = await supabase
          .from('gymkhana_events')
          .insert(eventPayload)
          .select()
          .single()

        if (createEventError) throw createEventError

        await createScoreEvent(gymkhanaEvent.id, points, winningTeamName)
      }

      setForm(initialForm)
      setEditingId(null)
      await loadData()
    } catch (error) {
      console.error(error)
      alert(`Erro ao salvar resultado da gincana: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  function handleEdit(eventItem) {
    setEditingId(eventItem.id)

    setForm({
      title: eventItem.title || '',
      winning_team:
        eventItem.winning_team === 'A' || eventItem.winning_team === 'B'
          ? ''
          : eventItem.winning_team || '',
      points_per_member: eventItem.points_per_member || '',
      notes: eventItem.notes || '',
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setEditingId(null)
    setForm(initialForm)
  }

  async function handleDelete(eventItem) {
    const confirmDelete = confirm(
      'Tem certeza que deseja excluir este lançamento da gincana? As pontuações vinculadas também serão removidas.'
    )

    if (!confirmDelete) return

    setSaving(true)

    try {
      const { error: deleteScoresError } = await supabase
        .from('score_events')
        .delete()
        .eq('gymkhana_event_id', eventItem.id)
        .eq('camp_id', activeCampId)

      if (deleteScoresError) throw deleteScoresError

      const { error: deleteHistoryError } = await supabase
        .from('gymkhana_events')
        .delete()
        .eq('id', eventItem.id)
        .eq('camp_id', activeCampId)

      if (deleteHistoryError) throw deleteHistoryError

      if (editingId === eventItem.id) {
        setEditingId(null)
        setForm(initialForm)
      }

      await loadData()
    } catch (error) {
      console.error(error)
      alert(`Erro ao excluir lançamento da gincana: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  function handleDeleteEditing() {
    const currentEvent = history.find((eventItem) => eventItem.id === editingId)

    if (!currentEvent) {
      alert('Lançamento não encontrado.')
      return
    }

    void handleDelete(currentEvent)
  }

  function renderTeamBadge(winningTeam) {
    const tribe = getWinningTeam(winningTeam)

    if (tribe) {
      return (
        <span className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-200">
          <span
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: tribe.color }}
          />
          {tribe.name}
        </span>
      )
    }

    return (
      <span className="rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-300">
        {getWinningTeamName(winningTeam)}
      </span>
    )
  }

  function renderTeamCard(tribe) {
    const members = participantsByTribe.get(tribe.id) || []

    return (
      <article
        key={tribe.id}
        className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-2xl text-xl"
                style={{ backgroundColor: tribe.color }}
              >
                {tribe.symbol}
              </div>

              <div>
                <h2 className="text-xl font-bold">{tribe.name}</h2>
                <p className="mt-1 text-sm text-zinc-400">
                  {members.length} participante(s) ativo(s)
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-2 text-sm text-zinc-400">
          <p>Responsável: {tribe.leader_name || 'Não definido'}</p>
          <p>Quarto: {tribe.room_name || 'Opcional'}</p>
        </div>
      </article>
    )
  }

  const columns = [
    {
      key: 'date',
      label: 'Data',
      render: (eventItem) => (
        <span className="text-zinc-400">
          {new Date(eventItem.created_at).toLocaleString('pt-BR')}
        </span>
      ),
    },
    {
      key: 'title',
      label: 'Prova',
      render: (eventItem) => (
        <span className="font-medium">{eventItem.title}</span>
      ),
    },
    {
      key: 'team',
      label: 'Equipe vencedora',
      render: (eventItem) => renderTeamBadge(eventItem.winning_team),
    },
    {
      key: 'points',
      label: 'Pontos',
      render: (eventItem) => (
        <strong className="text-green-400">
          +{eventItem.points_per_member}
        </strong>
      ),
    },
    {
      key: 'notes',
      label: 'Observações',
      render: (eventItem) => (
        <span className="text-zinc-400">{eventItem.notes || '-'}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (eventItem) => (
        <button
          type="button"
          onClick={() => handleEdit(eventItem)}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800"
        >
          Editar
        </button>
      ),
    },
  ]

  const hasEnoughTeams = tribes.length >= 2

  return (
    <section>
      <PageHeader
        eyebrow="Gincana"
        title="Gincana dinâmica"
        description="Lance resultados usando as equipes reais cadastradas neste acampamento."
      />

      {!activeCampId && (
        <div className="mb-6">
          <ActiveCampNotice message="Selecione um acampamento para lançar resultados da gincana." />
        </div>
      )}

      {activeCampId && tribes.length === 0 && (
        <p className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
          Cadastre equipes antes de lançar resultados da gincana.
        </p>
      )}

      {activeCampId && tribes.length === 1 && (
        <p className="mb-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
          Cadastre pelo menos mais uma equipe para disputar a gincana.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tribes.map(renderTeamCard)}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:p-6"
      >
        <h2 className="text-xl font-bold">
          {editingId
            ? 'Editar resultado da gincana'
            : 'Lançar resultado da gincana'}
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input
            name="title"
            value={form.title}
            onChange={handleChange}
            placeholder="Nome da prova"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500 xl:col-span-2"
          />

          <select
            name="winning_team"
            value={form.winning_team}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Equipe vencedora</option>
            {tribes.map((tribe) => (
              <option key={tribe.id} value={tribe.id}>
                {tribe.name}
              </option>
            ))}
          </select>

          <input
            name="points_per_member"
            value={form.points_per_member}
            onChange={handleChange}
            type="number"
            min="1"
            placeholder="Pontos do resultado"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />
        </div>

        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Observações"
          className="mt-4 min-h-24 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
        />

        <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
          {editingId && (
            <>
              <button
                type="button"
                onClick={handleDeleteEditing}
                disabled={saving || !activeCampId}
                className="rounded-xl border border-red-500/40 px-6 py-3 font-semibold text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Excluir
              </button>

              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="rounded-xl border border-zinc-700 px-6 py-3 font-semibold text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancelar edição
              </button>
            </>
          )}

          <button
            type="submit"
            disabled={saving || !activeCampId || !hasEnoughTeams}
            className="rounded-xl bg-yellow-500 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? 'Salvando...'
              : editingId
                ? 'Salvar alterações'
                : 'Lançar pontos da gincana'}
          </button>
        </div>
      </form>

      <div className="mt-8">
        {loading ? (
          <p className="text-zinc-400">Carregando gincana...</p>
        ) : (
          <ResponsiveTable
            columns={columns}
            data={history}
            emptyMessage="Nenhum resultado de gincana lançado."
          />
        )}
      </div>
    </section>
  )
}
