import { summarizeScores } from './scoring.js'

export function groupScoresByTeam(scores = [], teamIdField = 'tribe_id') {
  return scores.reduce((groups, scoreEntry) => {
    const teamId = scoreEntry[teamIdField]

    if (!teamId) return groups

    const teamScores = groups.get(teamId) || []

    groups.set(teamId, [...teamScores, scoreEntry])
    return groups
  }, new Map())
}

export function groupActiveParticipantsByTeam(
  participants = [],
  teamIdField = 'tribe_id'
) {
  return participants.reduce((groups, participant) => {
    if (!participant.is_active) return groups

    const teamId = participant[teamIdField]

    if (!teamId) return groups

    const teamParticipants = groups.get(teamId) || []

    groups.set(teamId, [...teamParticipants, participant])
    return groups
  }, new Map())
}

export function calculateTeamStanding(
  team,
  scores = [],
  activeParticipants = []
) {
  const scoreSummary = summarizeScores(scores)
  const participantsCount = activeParticipants.length

  return {
    ...team,
    ...scoreSummary,
    participantsCount,
    eventsCount: scores.length,
    isActive: participantsCount > 0,
  }
}

export function compareRankingEntries(a, b) {
  if (b.total !== a.total) return b.total - a.total
  if (a.penaltyPoints !== b.penaltyPoints)
    return a.penaltyPoints - b.penaltyPoints
  if (b.positivePoints !== a.positivePoints)
    return b.positivePoints - a.positivePoints
  return a.name.localeCompare(b.name, 'pt-BR')
}

export function calculateRanking(
  teams = [],
  scores = [],
  participants = [],
  {
    includeInactive = false,
    scoreTeamIdField = 'tribe_id',
    participantTeamIdField = 'tribe_id',
  } = {}
) {
  const scoresByTeam = groupScoresByTeam(scores, scoreTeamIdField)
  const participantsByTeam = groupActiveParticipantsByTeam(
    participants,
    participantTeamIdField
  )

  return teams
    .map((team) =>
      calculateTeamStanding(
        team,
        scoresByTeam.get(team.id) || [],
        participantsByTeam.get(team.id) || []
      )
    )
    .filter((team) => includeInactive || team.isActive)
    .sort(compareRankingEntries)
}
