import assert from 'node:assert/strict'
import test from 'node:test'
import {
  calculateRanking,
  calculateTeamStanding,
  compareRankingEntries,
  groupActiveParticipantsByTeam,
  groupScoresByTeam,
} from '../ranking.js'

const teams = [
  { id: 'alpha', name: 'Águia' },
  { id: 'beta', name: 'Beta' },
  { id: 'gamma', name: 'Gama' },
]

test('groupScoresByTeam groups scores without mutating the source array', () => {
  const scores = [
    { id: 1, tribe_id: 'alpha', points: 10 },
    { id: 2, tribe_id: 'beta', points: -5 },
    { id: 3, tribe_id: 'alpha', points: 4 },
  ]
  const snapshot = structuredClone(scores)

  const grouped = groupScoresByTeam(scores)

  assert.deepEqual(grouped.get('alpha'), [scores[0], scores[2]])
  assert.deepEqual(grouped.get('beta'), [scores[1]])
  assert.deepEqual(scores, snapshot)
})

test('groupScoresByTeam supports a custom team id field', () => {
  const scores = [
    { id: 1, competition_team_id: 'alpha', points: 10 },
    { id: 2, competition_team_id: 'beta', points: 5 },
  ]

  const grouped = groupScoresByTeam(scores, 'competition_team_id')

  assert.deepEqual(grouped.get('alpha'), [scores[0]])
  assert.deepEqual(grouped.get('beta'), [scores[1]])
})

test('groupActiveParticipantsByTeam ignores inactive participants', () => {
  const participants = [
    { id: 1, tribe_id: 'alpha', is_active: true },
    { id: 2, tribe_id: 'alpha', is_active: false },
    { id: 3, tribe_id: 'beta', is_active: true },
  ]

  const grouped = groupActiveParticipantsByTeam(participants)

  assert.deepEqual(grouped.get('alpha'), [participants[0]])
  assert.deepEqual(grouped.get('beta'), [participants[2]])
})

test('groupActiveParticipantsByTeam supports a custom team id field', () => {
  const participants = [
    { id: 1, competition_team_id: 'alpha', is_active: true },
    { id: 2, competition_team_id: 'beta', is_active: false },
  ]

  const grouped = groupActiveParticipantsByTeam(
    participants,
    'competition_team_id'
  )

  assert.deepEqual(grouped.get('alpha'), [participants[0]])
  assert.equal(grouped.has('beta'), false)
})

test('calculateTeamStanding combines score totals and active participant count', () => {
  const team = { id: 'alpha', name: 'Alpha' }
  const scores = [{ points: 12 }, { points: -5 }]
  const participants = [
    { id: 1, is_active: true },
    { id: 2, is_active: true },
  ]

  assert.deepEqual(calculateTeamStanding(team, scores, participants), {
    id: 'alpha',
    name: 'Alpha',
    positivePoints: 12,
    penaltyPoints: 5,
    total: 7,
    participantsCount: 2,
    eventsCount: 2,
    isActive: true,
  })
})

test('calculateRanking excludes teams without active participants by default', () => {
  const participants = [
    { id: 1, tribe_id: 'alpha', is_active: true },
    { id: 2, tribe_id: 'beta', is_active: false },
  ]

  const ranking = calculateRanking(teams, [], participants)

  assert.deepEqual(
    ranking.map((team) => team.id),
    ['alpha']
  )
})

test('calculateRanking includes inactive teams when includeInactive is true', () => {
  const participants = [{ id: 1, tribe_id: 'alpha', is_active: true }]

  const ranking = calculateRanking(teams, [], participants, {
    includeInactive: true,
  })

  assert.deepEqual(
    ranking.map((team) => team.id),
    ['alpha', 'beta', 'gamma']
  )
})

test('compareRankingEntries prioritizes the highest total', () => {
  const ranking = [
    { name: 'Beta', total: 5, penaltyPoints: 0, positivePoints: 5 },
    { name: 'Alpha', total: 10, penaltyPoints: 20, positivePoints: 30 },
  ].sort(compareRankingEntries)

  assert.equal(ranking[0].name, 'Alpha')
})

test('compareRankingEntries uses the lowest penalty as the second criterion', () => {
  const ranking = [
    { name: 'Beta', total: 10, penaltyPoints: 5, positivePoints: 15 },
    { name: 'Alpha', total: 10, penaltyPoints: 2, positivePoints: 12 },
  ].sort(compareRankingEntries)

  assert.equal(ranking[0].name, 'Alpha')
})

test('compareRankingEntries uses the highest positive score as the third criterion', () => {
  const ranking = [
    { name: 'Beta', total: 10, penaltyPoints: 5, positivePoints: 15 },
    { name: 'Alpha', total: 10, penaltyPoints: 5, positivePoints: 20 },
  ].sort(compareRankingEntries)

  assert.equal(ranking[0].name, 'Alpha')
})

test('compareRankingEntries uses pt-BR name order as the final criterion', () => {
  const ranking = [
    { name: 'Zulu', total: 10, penaltyPoints: 5, positivePoints: 15 },
    { name: 'Águia', total: 10, penaltyPoints: 5, positivePoints: 15 },
  ].sort(compareRankingEntries)

  assert.equal(ranking[0].name, 'Águia')
})

test('calculateRanking uses the sign of points when type contradicts it', () => {
  const scores = [
    { tribe_id: 'alpha', points: 10, type: 'PENALTY' },
    { tribe_id: 'beta', points: -10, type: 'POINT' },
  ]
  const participants = [
    { id: 1, tribe_id: 'alpha', is_active: true },
    { id: 2, tribe_id: 'beta', is_active: true },
  ]

  const ranking = calculateRanking(teams, scores, participants)

  assert.equal(ranking[0].id, 'alpha')
  assert.equal(ranking[0].total, 10)
  assert.equal(ranking[1].id, 'beta')
  assert.equal(ranking[1].total, -10)
})

test('calculateRanking can use competition team fields explicitly', () => {
  const scores = [
    { competition_team_id: 'alpha', points: 10 },
    { competition_team_id: 'beta', points: -2 },
  ]
  const participants = [
    { id: 1, competition_team_id: 'alpha', is_active: true },
    { id: 2, competition_team_id: 'beta', is_active: true },
  ]

  const ranking = calculateRanking(teams, scores, participants, {
    scoreTeamIdField: 'competition_team_id',
    participantTeamIdField: 'competition_team_id',
  })

  assert.equal(ranking[0].id, 'alpha')
  assert.equal(ranking[0].total, 10)
  assert.equal(ranking[0].participantsCount, 1)
  assert.equal(ranking[1].id, 'beta')
  assert.equal(ranking[1].total, -2)
  assert.equal(ranking[1].participantsCount, 1)
})

test('calculateRanking does not fall back to tribe_id when competition team fields are requested', () => {
  const scores = [
    { tribe_id: 'alpha', competition_team_id: null, points: 50 },
    { competition_team_id: 'beta', points: 10 },
  ]
  const participants = [
    {
      id: 1,
      tribe_id: 'alpha',
      competition_team_id: null,
      is_active: true,
    },
    { id: 2, competition_team_id: 'beta', is_active: true },
  ]

  const ranking = calculateRanking(teams, scores, participants, {
    includeInactive: true,
    scoreTeamIdField: 'competition_team_id',
    participantTeamIdField: 'competition_team_id',
  })

  const alpha = ranking.find((team) => team.id === 'alpha')
  const beta = ranking.find((team) => team.id === 'beta')

  assert.equal(alpha.total, 0)
  assert.equal(alpha.isActive, false)
  assert.equal(alpha.participantsCount, 0)
  assert.equal(beta.total, 10)
  assert.equal(beta.isActive, true)
  assert.equal(beta.participantsCount, 1)
})

test('calculateRanking does not mutate source arrays', () => {
  const sourceTeams = structuredClone(teams)
  const scores = [{ tribe_id: 'alpha', points: 10 }]
  const participants = [{ id: 1, tribe_id: 'alpha', is_active: true }]
  const teamsSnapshot = structuredClone(sourceTeams)
  const scoresSnapshot = structuredClone(scores)
  const participantsSnapshot = structuredClone(participants)

  calculateRanking(sourceTeams, scores, participants, {
    includeInactive: true,
  })

  assert.deepEqual(sourceTeams, teamsSnapshot)
  assert.deepEqual(scores, scoresSnapshot)
  assert.deepEqual(participants, participantsSnapshot)
})
