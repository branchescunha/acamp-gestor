import { useEffect, useMemo, useState } from 'react'
import ActiveCampNotice from '../components/ActiveCampNotice'
import PageHeader from '../components/PageHeader'
import ResponsiveTable from '../components/ResponsiveTable'
import {
  getScoreCategories,
  getScoreTypeLabel,
  normalizeScoreAmount,
} from '../domain/scoring'
import { useActiveCamp } from '../hooks/useActiveCamp'
import { supabase } from '../lib/supabase'

const initialForm = {
  tribe_id: '',
  competition_team_id: '',
  participant_id: '',
  type: 'POINT',
  category: '',
  points: '',
  reason: '',
  notes: '',
}

const initialFilters = {
  search: '',
  competition_team_id: '',
  tribe_id: '',
  participant_id: '',
  type: '',
  category: '',
}

export default function Scores() {
  const [tribes, setTribes] = useState([])
  const [competitionTeams, setCompetitionTeams] = useState([])
  const [participants, setParticipants] = useState([])
  const [events, setEvents] = useState([])
  const [form, setForm] = useState(initialForm)
  const [filters, setFilters] = useState(initialFilters)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { activeCampId } = useActiveCamp()

  useEffect(() => {
    async function loadData() {
      setLoading(true)

      const { data: tribesData, error: tribesError } = await supabase
        .from('tribes')
        .select('*')
        .eq('camp_id', activeCampId)
        .order('name')

      const { data: competitionTeamsData, error: competitionTeamsError } =
        await supabase
          .from('competition_teams')
          .select('*')
          .eq('camp_id', activeCampId)
          .order('status', { ascending: true })
          .order('name', { ascending: true })

      const { data: participantsData, error: participantsError } =
        await supabase
          .from('participants')
          .select('*')
          .eq('camp_id', activeCampId)
          .eq('is_active', true)
          .order('full_name')

      const { data: eventsData, error: eventsError } = await supabase
        .from('score_events')
        .select(
          `
          *,
          tribes (
            name,
            color,
            symbol
          ),
          competition_teams (
            name,
            color,
            symbol,
            status
          ),
          participants (
            full_name
          )
        `
        )
        .eq('camp_id', activeCampId)
        .order('created_at', { ascending: false })

      if (
        tribesError ||
        competitionTeamsError ||
        participantsError ||
        eventsError
      ) {
        console.error(
          tribesError ||
            competitionTeamsError ||
            participantsError ||
            eventsError
        )
        setLoading(false)
        return
      }

      setTribes(tribesData || [])
      setCompetitionTeams(competitionTeamsData || [])
      setParticipants(participantsData || [])
      setEvents(eventsData || [])
      setLoading(false)
    }

    if (activeCampId) {
      loadData()
      return
    }

    const timeoutId = window.setTimeout(() => {
      setTribes([])
      setCompetitionTeams([])
      setParticipants([])
      setEvents([])
      setLoading(false)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [activeCampId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setForm(initialForm)
      setFilters(initialFilters)
      setEditingId(null)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [activeCampId])

  async function reloadEvents() {
    const { data, error } = await supabase
      .from('score_events')
      .select(
        `
        *,
        tribes (
          name,
          color,
          symbol
        ),
        competition_teams (
          name,
          color,
          symbol,
          status
        ),
        participants (
          full_name
        )
      `
      )
      .eq('camp_id', activeCampId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error(error)
      return
    }

    setEvents(data || [])
  }

  function handleChange(event) {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }))
  }

  function handleParticipantChange(event) {
    const participantId = event.target.value
    const selectedParticipant = participants.find(
      (participant) => participant.id === participantId
    )

    setForm((currentForm) => ({
      ...currentForm,
      participant_id: participantId,
      competition_team_id:
        selectedParticipant?.competition_team_id ||
        currentForm.competition_team_id,
    }))
  }

  function handleCompetitionTeamChange(event) {
    setForm((currentForm) => ({
      ...currentForm,
      competition_team_id: event.target.value,
      participant_id: '',
    }))
  }

  function handleLegacyTribeChange(event) {
    setForm((currentForm) => ({
      ...currentForm,
      tribe_id: event.target.value,
      participant_id: '',
    }))
  }

  function handleFilterChange(event) {
    const { name, value } = event.target

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }))
  }

  function clearFilters() {
    setFilters(initialFilters)
  }

  function handleEdit(eventItem) {
    setEditingId(eventItem.id)

    setForm({
      tribe_id: eventItem.tribe_id || '',
      competition_team_id: eventItem.competition_team_id || '',
      participant_id: eventItem.participant_id || '',
      type: eventItem.type,
      category: eventItem.category || '',
      points: Math.abs(eventItem.points).toString(),
      reason: eventItem.reason || '',
      notes: eventItem.notes || '',
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setEditingId(null)
    setForm(initialForm)
  }

  async function handleDelete() {
    const confirmDelete = confirm(
      'Tem certeza que deseja excluir este lançamento? Essa ação não pode ser desfeita.'
    )

    if (!confirmDelete) return

    const { error } = await supabase
      .from('score_events')
      .delete()
      .eq('id', editingId)
      .eq('camp_id', activeCampId)

    if (error) {
      console.error(error)
      alert('Erro ao excluir lançamento.')
      return
    }

    setEditingId(null)
    setForm(initialForm)
    await reloadEvents()
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!activeCampId) {
      alert('Selecione um acampamento antes de lançar pontuações.')
      return
    }

    const isLegacyEditing = Boolean(
      editingId && form.tribe_id && !form.competition_team_id
    )

    if (!isLegacyEditing && !form.competition_team_id) {
      alert('Selecione um Time.')
      return
    }

    if (!form.category) {
      alert('Selecione uma categoria.')
      return
    }

    if (!form.points || Number(form.points) <= 0) {
      alert('Informe uma pontuação válida.')
      return
    }

    setSaving(true)

    const payload = {
      tribe_id: isLegacyEditing ? form.tribe_id : null,
      competition_team_id: isLegacyEditing ? null : form.competition_team_id,
      participant_id: form.participant_id || null,
      type: form.type,
      category: form.category,
      points: normalizeScoreAmount(form.type, form.points),
      reason: form.reason.trim() || null,
      notes: form.notes.trim() || null,
      camp_id: activeCampId,
    }

    const request = editingId
      ? supabase
          .from('score_events')
          .update(payload)
          .eq('id', editingId)
          .eq('camp_id', activeCampId)
      : supabase.from('score_events').insert(payload)

    const { error } = await request

    if (error) {
      console.error(error)
      const message =
        `${error.message || ''} ${error.details || ''}`.toLowerCase()
      alert(
        error.code === '23503' ||
          error.code === '23514' ||
          message.includes('foreign key')
          ? 'O Time selecionado não pertence a este acampamento.'
          : 'Erro ao salvar lançamento.'
      )
      setSaving(false)
      return
    }

    setForm(initialForm)
    setEditingId(null)
    await reloadEvents()
    setSaving(false)
  }

  const activeCompetitionTeams = useMemo(() => {
    return competitionTeams.filter((team) => team.status === 'active')
  }, [competitionTeams])

  const formCompetitionTeams = useMemo(() => {
    if (!form.competition_team_id) return activeCompetitionTeams

    const selectedTeam = competitionTeams.find(
      (team) => team.id === form.competition_team_id
    )

    if (!selectedTeam || selectedTeam.status === 'active') {
      return activeCompetitionTeams
    }

    return [...activeCompetitionTeams, selectedTeam].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR')
    )
  }, [activeCompetitionTeams, competitionTeams, form.competition_team_id])

  const isLegacyEditing = Boolean(
    editingId && form.tribe_id && !form.competition_team_id
  )

  const formParticipants = isLegacyEditing
    ? form.tribe_id
      ? participants.filter(
          (participant) => participant.tribe_id === form.tribe_id
        )
      : participants
    : form.competition_team_id
      ? participants.filter(
          (participant) =>
            participant.competition_team_id === form.competition_team_id
        )
      : participants

  const filterParticipants = filters.tribe_id
    ? participants.filter(
        (participant) => participant.tribe_id === filters.tribe_id
      )
    : participants

  const formCategories = getScoreCategories(form.type)

  const filterCategories = useMemo(() => {
    return getScoreCategories(filters.type)
  }, [filters.type])

  const filteredEvents = useMemo(() => {
    return events.filter((eventItem) => {
      const search = filters.search.trim().toLowerCase()

      const matchesSearch = search
        ? eventItem.reason?.toLowerCase().includes(search) ||
          eventItem.notes?.toLowerCase().includes(search) ||
          eventItem.category?.toLowerCase().includes(search) ||
          eventItem.competition_teams?.name?.toLowerCase().includes(search) ||
          eventItem.tribes?.name?.toLowerCase().includes(search) ||
          eventItem.participants?.full_name?.toLowerCase().includes(search)
        : true

      const matchesCompetitionTeam = filters.competition_team_id
        ? eventItem.competition_team_id === filters.competition_team_id
        : true

      const matchesTribe = filters.tribe_id
        ? eventItem.tribe_id === filters.tribe_id
        : true

      const matchesParticipant = filters.participant_id
        ? eventItem.participant_id === filters.participant_id
        : true

      const matchesType = filters.type ? eventItem.type === filters.type : true

      const matchesCategory = filters.category
        ? eventItem.category === filters.category
        : true

      return (
        matchesSearch &&
        matchesCompetitionTeam &&
        matchesTribe &&
        matchesParticipant &&
        matchesType &&
        matchesCategory
      )
    })
  }, [events, filters])

  const columns = [
    {
      key: 'target',
      label: 'Destino',
      render: (eventItem) =>
        eventItem.competition_teams ? (
          <div className="flex items-center justify-end gap-3 md:justify-start">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
              style={{ backgroundColor: eventItem.competition_teams.color }}
            >
              {eventItem.competition_teams.symbol}
            </div>
            <span>Time: {eventItem.competition_teams.name}</span>
          </div>
        ) : eventItem.tribes ? (
          <div className="flex items-center justify-end gap-3 md:justify-start">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
              style={{ backgroundColor: eventItem.tribes.color }}
            >
              {eventItem.tribes.symbol}
            </div>
            <span>Equipe/Quarto: {eventItem.tribes.name}</span>
          </div>
        ) : (
          <span className="text-zinc-500">Sem destino</span>
        ),
    },
    {
      key: 'participant',
      label: 'Participante',
      render: (eventItem) => (
        <span className="text-zinc-400">
          {eventItem.participants?.full_name ||
            (eventItem.competition_team_id
              ? 'Time inteiro'
              : 'Equipe/Quarto inteiro')}
        </span>
      ),
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (eventItem) => (
        <span>{getScoreTypeLabel(eventItem.type)}</span>
      ),
    },
    {
      key: 'category',
      label: 'Categoria',
      render: (eventItem) => (
        <span className="text-zinc-400">{eventItem.category}</span>
      ),
    },
    {
      key: 'points',
      label: 'Pontos',
      render: (eventItem) => (
        <strong
          className={eventItem.points >= 0 ? 'text-green-400' : 'text-red-400'}
        >
          {eventItem.points > 0 ? `+${eventItem.points}` : eventItem.points}
        </strong>
      ),
    },
    {
      key: 'reason',
      label: 'Motivo',
      render: (eventItem) => (
        <span className="text-zinc-400">{eventItem.reason || '-'}</span>
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

  return (
    <section>
      <PageHeader
        eyebrow="Pontuação"
        title="Lançar Pontos"
        description="Registro manual de pontos e penalidades dos Times competitivos."
      />

      {!activeCampId && (
        <div className="mb-6">
          <ActiveCampNotice message="Selecione um acampamento para lançar e consultar pontuações." />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:p-6"
      >
        <h2 className="text-xl font-bold">
          {editingId ? 'Editar lançamento' : 'Novo lançamento'}
        </h2>

        {!editingId && activeCompetitionTeams.length === 0 && (
          <p className="mt-4 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
            Cadastre pelo menos um Time ativo antes de lançar pontuações
            competitivas.
          </p>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {isLegacyEditing ? (
            <select
              name="tribe_id"
              value={form.tribe_id}
              onChange={handleLegacyTribeChange}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
            >
              <option value="">Selecione a Equipe/Quarto</option>
              {tribes.map((tribe) => (
                <option key={tribe.id} value={tribe.id}>
                  {tribe.name}
                </option>
              ))}
            </select>
          ) : (
            <select
              name="competition_team_id"
              value={form.competition_team_id}
              onChange={handleCompetitionTeamChange}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
            >
              <option value="">Selecione o Time</option>
              {formCompetitionTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                  {team.status === 'inactive' ? ' (inativo)' : ''}
                </option>
              ))}
            </select>
          )}

          <select
            name="participant_id"
            value={form.participant_id}
            onChange={handleParticipantChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">
              {isLegacyEditing
                ? 'Equipe/Quarto inteiro / participante'
                : 'Time inteiro / participante'}
            </option>
            {formParticipants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.full_name}
              </option>
            ))}
          </select>

          <select
            name="type"
            value={form.type}
            onChange={(event) =>
              setForm((currentForm) => ({
                ...currentForm,
                type: event.target.value,
                category: '',
              }))
            }
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="POINT">{getScoreTypeLabel('POINT')}</option>
            <option value="PENALTY">{getScoreTypeLabel('PENALTY')}</option>
          </select>

          <select
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Categoria</option>
            {formCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <input
            name="points"
            value={form.points}
            onChange={handleChange}
            type="number"
            min="1"
            placeholder="Pontos"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <input
            name="reason"
            value={form.reason}
            onChange={handleChange}
            placeholder="Motivo"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500 md:col-span-2 xl:col-span-3"
          />
        </div>

        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Observações"
          className="mt-4 min-h-24 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
        />

        <div className="mt-4 flex flex-col justify-end gap-3 sm:flex-row">
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
            disabled={
              saving ||
              !activeCampId ||
              (!editingId && activeCompetitionTeams.length === 0)
            }
            className="rounded-xl bg-yellow-500 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving
              ? 'Salvando...'
              : editingId
                ? 'Salvar alterações'
                : 'Lançar pontuação'}
          </button>
        </div>
      </form>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-xl font-bold">Filtros</h2>
            <p className="mt-2 text-sm text-zinc-400">
              {filteredEvents.length} de {events.length} lançamento(s)
              exibido(s).
            </p>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            Limpar filtros
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <input
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Buscar por motivo, Time, Equipe/Quarto ou participante"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500 xl:col-span-2"
          />

          <select
            name="competition_team_id"
            value={filters.competition_team_id}
            onChange={handleFilterChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Todos os Times</option>
            {activeCompetitionTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>

          <select
            name="tribe_id"
            value={filters.tribe_id}
            onChange={(event) =>
              setFilters((currentFilters) => ({
                ...currentFilters,
                tribe_id: event.target.value,
                participant_id: '',
              }))
            }
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Todas as Equipes/Quartos</option>
            {tribes.map((tribe) => (
              <option key={tribe.id} value={tribe.id}>
                {tribe.name}
              </option>
            ))}
          </select>

          <select
            name="participant_id"
            value={filters.participant_id}
            onChange={handleFilterChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Todos os participantes</option>
            {filterParticipants.map((participant) => (
              <option key={participant.id} value={participant.id}>
                {participant.full_name}
              </option>
            ))}
          </select>

          <select
            name="type"
            value={filters.type}
            onChange={(event) =>
              setFilters((currentFilters) => ({
                ...currentFilters,
                type: event.target.value,
                category: '',
              }))
            }
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Todos os tipos</option>
            <option value="POINT">Pontos</option>
            <option value="PENALTY">Penalidades</option>
          </select>

          <select
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Todas as categorias</option>
            {filterCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <p className="text-zinc-400">Carregando pontuações...</p>
        ) : (
          <ResponsiveTable
            columns={columns}
            data={filteredEvents}
            emptyMessage="Nenhuma pontuação encontrada."
          />
        )}
      </div>
    </section>
  )
}
