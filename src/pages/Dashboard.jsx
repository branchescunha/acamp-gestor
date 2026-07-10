import { useEffect, useMemo, useState } from 'react'
import ActiveCampNotice from '../components/ActiveCampNotice'
import PageHeader from '../components/PageHeader'
import { calculateRanking } from '../domain/ranking'
import { getCampNameStorageKey, useActiveCamp } from '../hooks/useActiveCamp'
import { supabase } from '../lib/supabase'
import { logError } from '../utils/logger'

export default function Dashboard() {
  const [competitionTeams, setCompetitionTeams] = useState([])
  const [participants, setParticipants] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const { activeCampId } = useActiveCamp()
  const activeCampName = activeCampId
    ? window.localStorage.getItem(getCampNameStorageKey(activeCampId))
    : ''

  useEffect(() => {
    let shouldIgnore = false

    async function loadDashboard() {
      setLoading(true)

      const { data: competitionTeamsData, error: competitionTeamsError } =
        await supabase
          .from('competition_teams')
          .select('id, name, color, symbol, status, camp_id')
          .eq('camp_id', activeCampId)
          .eq('status', 'active')
          .order('name')

      const { data: participantsData, error: participantsError } =
        await supabase
          .from('participants')
          .select('id, competition_team_id, is_active')
          .eq('camp_id', activeCampId)
          .eq('is_active', true)

      const { data: eventsData, error: eventsError } = await supabase
        .from('score_events')
        .select(
          `
          id,
          points,
          category,
          competition_team_id,
          created_at,
          competition_teams (
            name,
            symbol,
            color
          ),
          participants (
            full_name
          )
        `
        )
        .eq('camp_id', activeCampId)
        .not('competition_team_id', 'is', null)
        .order('created_at', { ascending: false })

      if (competitionTeamsError || participantsError || eventsError) {
        logError('Dashboard',
          competitionTeamsError || participantsError || eventsError
        )
        if (shouldIgnore) return
        setLoading(false)
        return
      }

      if (shouldIgnore) return

      setCompetitionTeams(competitionTeamsData || [])
      setParticipants(participantsData || [])
      setEvents(eventsData || [])
      setLoading(false)
    }

    if (activeCampId) {
      loadDashboard()
      return () => {
        shouldIgnore = true
      }
    }

    const timeoutId = window.setTimeout(() => {
      setCompetitionTeams([])
      setParticipants([])
      setEvents([])
      setLoading(false)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [activeCampId])

  const ranking = useMemo(() => {
    return calculateRanking(competitionTeams, events, participants, {
      includeInactive: false,
      scoreTeamIdField: 'competition_team_id',
      participantTeamIdField: 'competition_team_id',
    })
  }, [competitionTeams, participants, events])

  const activeTeams = ranking.length
  const activeParticipants = participants.length

  const totalPoints = events.reduce(
    (sum, eventItem) => sum + Number(eventItem.points || 0),
    0
  )

  const leader = ranking[0]
  const latestEvents = events.slice(0, 5)

  function formatPoints(value) {
    if (value > 0) return `+${value}`
    return value
  }

  if (loading) {
    return (
      <section>
        <PageHeader
          eyebrow="AcampGestor"
          title="Dashboard"
          description="Visão geral do evento."
        />
        <p className="text-zinc-400">Carregando dashboard...</p>
      </section>
    )
  }

  return (
    <section>
      <PageHeader
        eyebrow="AcampGestor"
        title="Dashboard"
        description="Visão geral do evento."
      />

      {activeCampName ? (
        <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-sm text-yellow-100">
          Acampamento ativo:{' '}
          <strong className="text-white">{activeCampName}</strong>
        </div>
      ) : (
        <div className="mb-6">
          <ActiveCampNotice message="Crie ou selecione um acampamento para começar a organizar equipes, participantes e pontuações." />
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-zinc-400">Times ativos</p>
          <strong className="mt-4 block text-3xl">{activeTeams}</strong>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-zinc-400">Participantes ativos</p>
          <strong className="mt-4 block text-3xl">{activeParticipants}</strong>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-zinc-400">Saldo geral de pontos</p>
          <strong
            className={`mt-4 block text-3xl ${
              totalPoints < 0 ? 'text-red-400' : 'text-green-400'
            }`}
          >
            {totalPoints}
          </strong>
        </div>

        <div className="rounded-2xl border border-yellow-500/60 bg-yellow-500/10 p-6">
          <p className="text-zinc-400">Time líder</p>

          {leader ? (
            <div className="mt-4 flex items-center gap-4">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-xl text-xl"
                style={{ backgroundColor: leader.color }}
              >
                {leader.symbol}
              </div>

              <div>
                <strong className="block text-xl">{leader.name}</strong>
                <span className="text-sm text-yellow-400">
                  {leader.total} pontos
                </span>
                <span className="block text-xs text-zinc-400">
                  +{leader.positivePoints} / -{leader.penaltyPoints}
                </span>
              </div>
            </div>
          ) : (
            <strong className="mt-4 block text-xl">Sem líder</strong>
          )}
        </div>
      </div>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-xl font-bold">Últimos lançamentos</h2>

        {latestEvents.length === 0 ? (
          <p className="mt-6 text-zinc-400">Nenhuma pontuação lançada.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {latestEvents.map((eventItem) => (
              <div
                key={eventItem.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-xl"
                    style={{
                      backgroundColor: eventItem.competition_teams?.color,
                    }}
                  >
                    {eventItem.competition_teams?.symbol}
                  </div>

                  <div>
                    <strong>
                      {eventItem.competition_teams?.name || 'Sem time'}
                    </strong>

                    <p className="text-sm text-zinc-400">
                      {eventItem.participants?.full_name || 'Time inteiro'} ·{' '}
                      {eventItem.category}
                    </p>
                  </div>
                </div>

                <strong
                  className={
                    eventItem.points < 0 ? 'text-red-400' : 'text-green-400'
                  }
                >
                  {formatPoints(eventItem.points)}
                </strong>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
