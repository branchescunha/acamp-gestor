import assert from 'node:assert/strict'
import test from 'node:test'

import { calculateRanking } from '../../src/domain/ranking.js'
import { buildV1QaScenario } from '../fixtures/acampGestorV1Scenario.js'
import { officialV1ScreenshotPlan } from '../fixtures/officialV1ScreenshotPlan.js'
import {
  assertNoUnsafeExportValues,
  InMemoryAcampGestorStore,
} from '../helpers/inMemoryAcampGestor.js'
import { createDryRunReport } from '../../scripts/qa-cleanup/cleanup.js'

function createCleanupConfig(scenario) {
  return {
    testEnv: 'staging',
    supabaseUrl: 'https://qa-project.supabase.co',
    projectRef: 'qa-project',
    qaRunId: scenario.qaRunId,
    cleanupEnabled: false,
    cleanupConfirm: '',
    cleanupConfirmToken: '',
    allowlist: {
      ids: [],
      emails: [],
      slugs: [],
      prefixes: [scenario.qaRunId],
      organizationIds: [],
      campIds: [],
    },
  }
}

function calculateDashboardSnapshot(store, camp) {
  const teams = store.list('competition_teams', (team) => team.camp_id === camp.id && team.status === 'active')
  const scores = store.list('score_events', (score) => score.camp_id === camp.id && score.competition_team_id)
  const participants = store.list('participants', (participant) => participant.camp_id === camp.id)
  const ranking = calculateRanking(teams, scores, participants, {
    includeInactive: false,
    scoreTeamIdField: 'competition_team_id',
    participantTeamIdField: 'competition_team_id',
  })

  return {
    activeTeams: teams.length,
    activeParticipants: participants.filter((participant) => participant.is_active).length,
    positivePoints: scores.filter((score) => score.points > 0).reduce((total, score) => total + score.points, 0),
    penaltyPoints: Math.abs(scores.filter((score) => score.points < 0).reduce((total, score) => total + score.points, 0)),
    ranking,
    leader: ranking[0] || null,
  }
}

test('E2E oficial V1 percorre plataforma, acampamento, gestão, ranking, exportação e cleanup', () => {
  const scenario = buildV1QaScenario()
  const store = new InMemoryAcampGestorStore({ qaRunId: scenario.qaRunId })

  const admin = store.createProfile(scenario.admin)
  const organization = store.createOrganization(admin, scenario.organizations.a)

  const accessRequest = store.createAccessRequest({
    name: scenario.gestors.a.name,
    email: scenario.gestors.a.email,
    church_name: organization.name,
    message: 'Solicitação E2E oficial V1.',
  })
  const approval = store.approveAccessRequest(admin, accessRequest)
  const gestor = store.createProfile(scenario.gestors.a)
  store.createMembership(admin, organization, gestor, 'manager')

  assert.equal(accessRequest.status, 'approved')
  assert.equal(approval.invitation.status, 'accepted')
  assert.equal(store.listOrganizationsFor(gestor).length, 1)

  const camp = store.createCamp(gestor, organization, scenario.camps.jovens)
  assert.equal(camp.public_ranking_enabled, true)

  const [leviData, judaData, quartoMasculinoData] = scenario.tribes
  const levi = store.createTribe(gestor, camp, leviData)
  const juda = store.createTribe(gestor, camp, judaData)
  const quartoMasculino = store.createTribe(gestor, camp, quartoMasculinoData)

  const [azulData, verdeData, vermelhoData] = scenario.competitionTeams
  const azul = store.createCompetitionTeam(gestor, camp, azulData)
  const verde = store.createCompetitionTeam(gestor, camp, verdeData)
  const vermelho = store.createCompetitionTeam(gestor, camp, vermelhoData)

  const participanteAzul = store.createParticipant(gestor, camp, {
    full_name: `${scenario.qaRunId} Participante Azul`,
    gender: 'Feminino',
    group_type: 'UMP',
    tribe_id: levi.id,
    competition_team_id: azul.id,
  })
  const participanteMovido = store.createParticipant(gestor, camp, {
    full_name: `${scenario.qaRunId} Participante Movido`,
    gender: 'Masculino',
    group_type: 'UPA',
    tribe_id: juda.id,
    competition_team_id: azul.id,
  })
  const participanteVerde = store.createParticipant(gestor, camp, {
    full_name: `${scenario.qaRunId} Participante Verde`,
    gender: 'Masculino',
    group_type: 'UPA',
    tribe_id: quartoMasculino.id,
    competition_team_id: verde.id,
  })

  participanteMovido.competition_team_id = verde.id
  participanteMovido.tribe_id = quartoMasculino.id
  participanteMovido.updated_at = new Date().toISOString()
  store.setCompetitionTeamStatus(gestor, vermelho, 'inactive')

  assert.equal(participanteMovido.competition_team_id, verde.id)
  assert.equal(vermelho.status, 'inactive')

  const pontoAzul = store.createScoreEvent(gestor, camp, {
    competition_team_id: azul.id,
    participant_id: participanteAzul.id,
    type: 'POINT',
    category: 'Participação',
    points: 100,
    reason: `${scenario.qaRunId} Pontos positivos`,
  })
  const penalidadeAzul = store.createScoreEvent(gestor, camp, {
    competition_team_id: azul.id,
    type: 'PENALTY',
    category: 'Disciplina',
    points: -15,
    reason: `${scenario.qaRunId} Penalidade`,
  })
  const pontoVerde = store.createScoreEvent(gestor, camp, {
    competition_team_id: verde.id,
    participant_id: participanteVerde.id,
    type: 'POINT',
    category: 'Espírito de equipe',
    points: 80,
    reason: `${scenario.qaRunId} Pontos verdes`,
  })

  assert.equal(pontoAzul.points, 100)
  assert.equal(penalidadeAzul.points, -15)
  assert.equal(pontoVerde.points, 80)

  const gymkhana = store.createGymkhanaEvent(gestor, camp, {
    title: `${scenario.qaRunId} Prova relâmpago`,
    winning_competition_team_id: verde.id,
    points_per_member: 25,
    notes: 'Fluxo E2E oficial.',
  })
  assert.equal(gymkhana.gymkhanaEvent.winning_competition_team_id, verde.id)
  assert.equal(gymkhana.scoreEvent.category, 'Gincana')

  const inspection = store.createRoomInspection(gestor, camp, {
    tribe_id: quartoMasculino.id,
    inspection_day: '2026-07-22',
    inspection_period: 'morning',
    type: 'POINT',
    points: 10,
    notes: `${scenario.qaRunId} Inspeção E2E`,
    has_photo: false,
  })
  assert.equal(inspection.points, 10)

  const history = store.list('score_events', (score) => score.camp_id === camp.id)
  assert.equal(history.length, 4)
  assert.equal(history.some((score) => score.points < 0), true)
  assert.equal(history.some((score) => score.category === 'Gincana'), true)

  const dashboard = calculateDashboardSnapshot(store, camp)
  assert.equal(dashboard.activeTeams, 2)
  assert.equal(dashboard.activeParticipants, 3)
  assert.equal(dashboard.positivePoints, 205)
  assert.equal(dashboard.penaltyPoints, 15)
  assert.equal(dashboard.leader.id, verde.id)
  assert.equal(dashboard.leader.total, 105)

  const publicRanking = store.getPublicRankingBySlug(camp.slug)
  assert.equal(publicRanking[0].id, verde.id)
  assert.equal(publicRanking[0].total, 105)
  assert.equal(publicRanking[1].id, azul.id)
  assert.equal(publicRanking[1].total, 85)
  assert.equal(publicRanking.some((entry) => entry.id === vermelho.id), false)
  assert.equal(publicRanking.some((entry) => 'full_name' in entry || 'phone' in entry || 'cpf' in entry), false)

  const workbook = store.buildExportWorkbookModel(camp)
  assert.deepEqual(workbook.map((worksheet) => worksheet.name), [
    'Resumo do acampamento',
    'Ranking competitivo',
    'Times competitivos',
    'Times inativos',
    'Participantes',
    'Pontuações',
    'Pontuações legadas',
    'Gincanas',
    'Inspeções',
    'Equipes/Quartos',
    'Configurações',
  ])
  assertNoUnsafeExportValues(workbook)
  assert.equal(workbook.find((worksheet) => worksheet.name === 'Times inativos').rows.length, 1)
  assert.equal(workbook.find((worksheet) => worksheet.name === 'Pontuações').rows.length, 4)

  const organizationB = store.createOrganization(admin, scenario.organizations.b)
  const gestorB = store.createProfile(scenario.gestors.b)
  store.createMembership(admin, organizationB, gestorB, 'manager')
  const campB = store.createCamp(gestorB, organizationB, scenario.camps.retiro)

  assert.throws(
    () => store.createCompetitionTeam(gestor, campB, { name: `${scenario.qaRunId} Time indevido` }),
    /Sem permissão/,
  )
  assert.throws(
    () => store.getPublicRankingBySlug(campB.slug),
    /Ranking público indisponível/,
  )

  const cleanupReport = createDryRunReport({
    tables: store.tables,
    config: createCleanupConfig(scenario),
  })

  assert.equal(cleanupReport.mode, 'dry-run')
  assert.equal(cleanupReport.summary.recordsRemoved, 0)
  assert.equal(cleanupReport.summary.recordsMatched > 0, true)
  assert.deepEqual(cleanupReport.summary.removalOrder.slice(0, 6), [
    'score_events',
    'gymkhana_events',
    'room_inspections',
    'gymkhana_settings',
    'participants',
    'competition_teams',
  ])

  store.cleanupQaRun()
  assert.equal(store.countQaRows(), 0)
})

test('plano oficial de screenshots V1 lista telas futuras sem capturar imagens', () => {
  assert.deepEqual(officialV1ScreenshotPlan, [
    'Landing',
    'Login',
    'Solicitação',
    'Dashboard Admin',
    'Dashboard Gestor',
    'Acampamentos',
    'Equipes',
    'Times',
    'Participantes',
    'Pontuação',
    'Histórico',
    'Gincanas',
    'Inspeções',
    'Ranking Público',
    'Exportação',
  ])
})
