import { useEffect, useMemo, useState } from 'react'
import ActiveCampNotice from '../components/ActiveCampNotice'
import PageHeader from '../components/PageHeader'
import ResponsiveTable from '../components/ResponsiveTable'
import { getScoreCategories, getScoreTypeLabel } from '../domain/scoring'
import { useActiveCamp } from '../hooks/useActiveCamp'
import { supabase } from '../lib/supabase'

const initialFilters = {
  search: '',
  competition_team_id: '',
  tribe_id: '',
  participant_id: '',
  type: '',
  category: '',
}

export default function History() {
  const [events, setEvents] = useState([])
  const [tribes, setTribes] = useState([])
  const [competitionTeams, setCompetitionTeams] = useState([])
  const [participants, setParticipants] = useState([])
  const [filters, setFilters] = useState(initialFilters)
  const [loading, setLoading] = useState(true)
  const { activeCampId } = useActiveCamp()

  useEffect(() => {
    let shouldIgnore = false

    async function loadData() {
      setLoading(true)

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
          .order('full_name')

      if (
        eventsError ||
        tribesError ||
        competitionTeamsError ||
        participantsError
      ) {
        console.error(
          eventsError ||
            tribesError ||
            competitionTeamsError ||
            participantsError
        )
        if (shouldIgnore) return
        setLoading(false)
        return
      }

      if (shouldIgnore) return

      setEvents(eventsData || [])
      setTribes(tribesData || [])
      setCompetitionTeams(competitionTeamsData || [])
      setParticipants(participantsData || [])
      setLoading(false)
    }

    if (activeCampId) {
      loadData()
      return () => {
        shouldIgnore = true
      }
    }

    const timeoutId = window.setTimeout(() => {
      setEvents([])
      setTribes([])
      setCompetitionTeams([])
      setParticipants([])
      setFilters(initialFilters)
      setLoading(false)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [activeCampId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFilters(initialFilters)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [activeCampId])

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

  function formatDate(value) {
    return new Date(value).toLocaleString('pt-BR')
  }

  function getEventDestination(eventItem) {
    if (eventItem.competition_team_id || eventItem.competition_teams) {
      return {
        label: eventItem.competition_teams?.name || 'Time não encontrado',
        prefix: 'Time',
        color: eventItem.competition_teams?.color,
        symbol: eventItem.competition_teams?.symbol,
      }
    }

    if (eventItem.tribe_id || eventItem.tribes) {
      return {
        label: eventItem.tribes?.name || 'Equipe/Quarto não encontrada',
        prefix: 'Equipe/Quarto',
        color: eventItem.tribes?.color,
        symbol: eventItem.tribes?.symbol,
      }
    }

    return {
      label: 'Sem destino',
      prefix: '',
      color: '',
      symbol: '',
    }
  }

  function getEventParticipantLabel(eventItem) {
    if (eventItem.participants?.full_name) return eventItem.participants.full_name
    if (eventItem.competition_team_id) return 'Time inteiro'
    if (eventItem.tribe_id) return 'Equipe/Quarto inteiro'
    return 'Sem participante'
  }

  const filteredParticipants = filters.competition_team_id
    ? participants.filter(
        (participant) =>
          participant.competition_team_id === filters.competition_team_id
      )
    : filters.tribe_id
      ? participants.filter(
          (participant) => participant.tribe_id === filters.tribe_id
        )
      : participants

  const effectiveParticipantId = filteredParticipants.some(
    (participant) => participant.id === filters.participant_id
  )
    ? filters.participant_id
    : ''

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

      const matchesParticipant = effectiveParticipantId
        ? eventItem.participant_id === effectiveParticipantId
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
  }, [effectiveParticipantId, events, filters])

  const columns = [
    {
      key: 'date',
      label: 'Data',
      render: (eventItem) => (
        <span className="text-zinc-400">
          {formatDate(eventItem.created_at)}
        </span>
      ),
    },
    {
      key: 'destination',
      label: 'Destino',
      render: (eventItem) => {
        const destination = getEventDestination(eventItem)

        return (
          <div className="flex items-center justify-end gap-3 md:justify-start">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
              style={{ backgroundColor: destination.color }}
            >
              {destination.symbol}
            </div>

            <div>
              <span>{destination.label}</span>
              {destination.prefix && (
                <p className="text-xs text-zinc-500">{destination.prefix}</p>
              )}
            </div>
          </div>
        )
      },
    },
    {
      key: 'participant',
      label: 'Participante',
      render: (eventItem) => (
        <span className="text-zinc-400">{getEventParticipantLabel(eventItem)}</span>
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
  ]

  return (
    <section>
      <PageHeader
        eyebrow="Histórico"
        title="Histórico de Lançamentos"
        description="Consulta completa de pontos e penalidades registrados."
      />

      {!activeCampId && (
        <div className="mb-6">
          <ActiveCampNotice message="Selecione um acampamento para consultar o histórico." />
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:p-6">
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
            onChange={(event) =>
              setFilters((currentFilters) => ({
                ...currentFilters,
                competition_team_id: event.target.value,
                tribe_id: '',
                participant_id: '',
              }))
            }
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Todos os Times</option>

            {competitionTeams.map((team) => (
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
                competition_team_id: '',
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
            value={effectiveParticipantId}
            onChange={handleFilterChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Todos os participantes</option>

            {filteredParticipants.map((participant) => (
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
          <p className="text-zinc-400">Carregando histórico...</p>
        ) : (
          <ResponsiveTable
            columns={columns}
            data={filteredEvents}
            emptyMessage="Nenhum lançamento encontrado."
          />
        )}
      </div>
    </section>
  )
}
