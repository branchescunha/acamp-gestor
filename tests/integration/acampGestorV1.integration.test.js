import assert from 'node:assert/strict'
import process from 'node:process'
import test from 'node:test'

import { buildParticipantPayload, validateParticipantForm } from '../../src/features/participants/participantForm.js'
import { buildScorePayload, validateScoreForm } from '../../src/features/scores/scoreForm.js'
import {
  buildV1QaScenario,
  createQaRunId,
  screenshotCapturePlan,
} from '../fixtures/acampGestorV1Scenario.js'
import {
  assertNoUnsafeExportValues,
  InMemoryAcampGestorStore,
  seedCompleteV1Scenario,
} from '../helpers/inMemoryAcampGestor.js'
import {
  assertSafeIntegrationEnvironment,
  getIntegrationSetupFromEnv,
} from '../helpers/qaSafety.js'

function createSeededStore() {
  const scenario = buildV1QaScenario()
  const store = new InMemoryAcampGestorStore({ qaRunId: scenario.qaRunId })
  const seeded = seedCompleteV1Scenario(store, scenario)

  return { scenario, store, seeded }
}

test('guardas de integração recusam produção e permitem execução mock/local segura', () => {
  const qaRunId = createQaRunId()

  assert.deepEqual(
    assertSafeIntegrationEnvironment({ qaRunId }),
    { mode: 'mock', cleanupRemoteAllowed: false },
  )

  assert.throws(
    () => assertSafeIntegrationEnvironment({ qaRunId, supabaseUrl: 'https://example.supabase.co' }),
    /TEST_ENV=local or TEST_ENV=staging/,
  )

  assert.throws(
    () => assertSafeIntegrationEnvironment({
      qaRunId,
      testEnv: 'staging',
      projectRef: 'zuxndxchkeynvjqustxk',
      supabaseUrl: 'https://zuxndxchkeynvjqustxk.supabase.co',
      allowRemoteCleanup: true,
    }),
    /production Supabase project/,
  )

  assert.deepEqual(
    assertSafeIntegrationEnvironment({
      qaRunId,
      testEnv: 'local',
      supabaseUrl: 'http://127.0.0.1:54321',
      projectRef: 'local',
    }),
    { mode: 'local', cleanupRemoteAllowed: true },
  )
})

test('cenário V1 completo cria ADMIN, gestores, organizações, acampamentos e limpa dados QA', () => {
  const { store, seeded } = createSeededStore()

  assert.equal(store.list('profiles').length, 4)
  assert.equal(store.list('organizations').length, 2)
  assert.equal(store.list('organization_members').length, 4)
  assert.equal(store.list('camps').length, 3)
  assert.equal(store.list('tribes').length, 4)
  assert.equal(store.list('competition_teams').length, 3)
  assert.equal(store.list('participants').length, 5)
  assert.equal(store.list('score_events').length, 5)
  assert.equal(store.list('gymkhana_events').length, 2)
  assert.equal(store.list('room_inspections').length, 1)

  assert.equal(seeded.currentGymkhana.gymkhanaEvent.winning_team, seeded.teams[1].id)
  assert.equal(seeded.currentGymkhana.scoreEvent.competition_team_id, seeded.teams[1].id)
  assert.equal(seeded.currentGymkhana.scoreEvent.category, 'Gincana')
  assert.equal(seeded.legacyGymkhana.winning_team, 'A')
  assert.equal(seeded.legacyGymkhana.winning_competition_team_id, null)

  store.cleanupQaRun()

  assert.equal(store.countQaRows(), 0)
})

test('permissões isolam organização A, organização B, acampamentos e gestor suspenso', () => {
  const { store, seeded } = createSeededStore()

  assert.deepEqual(store.listOrganizationsFor(seeded.gestorA).map((organization) => organization.id), [seeded.organizationA.id])
  assert.deepEqual(store.listOrganizationsFor(seeded.gestorB).map((organization) => organization.id), [seeded.organizationB.id])
  assert.equal(store.listCampsFor(seeded.admin).length, 3)
  assert.equal(store.listCampsFor(seeded.gestorA).length, 2)
  assert.equal(store.listCampsFor(seeded.gestorB).length, 1)

  assert.throws(
    () => store.createTribe(seeded.gestorA, seeded.campRetiro, { name: 'Equipe invasora', room_type: 'Equipe' }),
    /Sem permissão/,
  )

  assert.throws(
    () => store.listCampsFor(seeded.suspendedGestor),
    /permissão ativa/,
  )
})

test('modelo operacional mantém Equipes/Quartos, Times e lançamentos independentes', () => {
  const { store, seeded } = createSeededStore()
  const [azul,, vermelho] = seeded.teams
  const [levi] = seeded.tribes

  const participantForm = {
    full_name: ' Participante QA Novo ',
    age: '17',
    birth_date: '',
    church: ' Igreja QA ',
    cpf: '',
    address: '',
    shirt_size: 'M',
    gender: 'Masculino',
    group_type: 'UPA',
    phone: '',
    guardian_phone: '',
    food_restriction: '',
    notes: '',
    is_board_member: false,
    tribe_id: levi.id,
    competition_team_id: azul.id,
    is_active: true,
  }

  assert.equal(validateParticipantForm(participantForm, seeded.campJovens.id), '')
  const participantPayload = buildParticipantPayload(participantForm, seeded.campJovens.id)
  assert.equal(participantPayload.full_name, 'Participante QA Novo')
  assert.equal(participantPayload.tribe_id, levi.id)
  assert.equal(participantPayload.competition_team_id, azul.id)

  const scoreForm = {
    tribe_id: '',
    competition_team_id: azul.id,
    participant_id: '',
    type: 'PENALTY',
    category: 'Disciplina',
    points: '15',
    reason: ' Penalidade QA ',
    notes: '',
  }

  assert.equal(validateScoreForm(scoreForm, seeded.campJovens.id), '')
  const scorePayload = buildScorePayload(scoreForm, seeded.campJovens.id)
  assert.equal(scorePayload.competition_team_id, azul.id)
  assert.equal(scorePayload.tribe_id, null)
  assert.equal(scorePayload.points, -15)

  const legacyScoreForm = { ...scoreForm, tribe_id: levi.id, competition_team_id: '', type: 'POINT', points: '5' }
  assert.equal(validateScoreForm(legacyScoreForm, seeded.campJovens.id, true), '')
  const legacyPayload = buildScorePayload(legacyScoreForm, seeded.campJovens.id, true)
  assert.equal(legacyPayload.tribe_id, levi.id)
  assert.equal(legacyPayload.competition_team_id, null)
  assert.equal(legacyPayload.points, 5)

  assert.throws(
    () => store.createScoreEvent(seeded.gestorA, seeded.campJovens, { competition_team_id: vermelho.id, type: 'POINT', category: 'Teste', points: 10 }),
    /Time inativo/,
  )
  assert.throws(() => store.deleteCompetitionTeam(seeded.gestorA, azul), /vinculado/)
  assert.throws(() => store.deleteTribe(seeded.gestorA, levi), /vinculada/)
})

test('ranking público respeita status público, Time ativo e não expõe dados pessoais', () => {
  const { store, seeded } = createSeededStore()

  const ranking = store.getPublicRankingBySlug(seeded.campJovens.slug)

  assert.equal(ranking[0].id, seeded.teams[1].id)
  assert.equal(ranking[0].total, 110)
  assert.equal(ranking[1].id, seeded.teams[0].id)
  assert.equal(ranking[1].total, 100)
  assert.equal(ranking.some((entry) => entry.id === seeded.teams[2].id), false)
  assert.equal(ranking.some((entry) => 'full_name' in entry || 'phone' in entry || 'cpf' in entry), false)

  assert.throws(() => store.getPublicRankingBySlug(seeded.campRetiro.slug), /indisponível/)
})

test('exportação em memória gera 11 abas, separa legado e sanitiza valores', () => {
  const { store, seeded } = createSeededStore()
  const worksheets = store.buildExportWorkbookModel(seeded.campJovens)
  const names = worksheets.map((worksheet) => worksheet.name)

  assert.deepEqual(names, [
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
  assertNoUnsafeExportValues(worksheets)

  const scoreSheet = worksheets.find((worksheet) => worksheet.name === 'Pontuações')
  const legacyScoreSheet = worksheets.find((worksheet) => worksheet.name === 'Pontuações legadas')
  const gymkhanaSheet = worksheets.find((worksheet) => worksheet.name === 'Gincanas')

  assert.equal(legacyScoreSheet.rows.length, 1)
  assert.equal(gymkhanaSheet.rows.some((row) => row.Time === 'A'), true)
  assert.equal(scoreSheet.rows.some((row) => String(row.Time).startsWith('competition_teams_')), false)
  assert.equal(scoreSheet.rows.some((row) => String(row.Motivo).startsWith("'=")), true)
})

test('solicitações, convites e reprocessamento seguem contrato administrativo seguro', () => {
  const { store, seeded, scenario } = createSeededStore()
  const request = store.createAccessRequest({ name: `${scenario.qaRunId} Solicitante`, email: `solicitante.${scenario.qaRunId.toLowerCase()}@example.test`, organization_name: 'Igreja QA' })
  const { invitation } = store.approveAccessRequest(seeded.admin, request)

  assert.equal(request.status, 'approved')
  assert.equal(invitation.status, 'accepted')
  assert.equal(invitation.email, request.email)

  assert.throws(() => store.approveAccessRequest(seeded.admin, request), /já processada/)
  assert.throws(() => store.createAccessRequest({ name: 'E-mail inválido', email: 'sem-arroba' }), /E-mail inválido/)
  assert.throws(() => store.createInvitation(seeded.gestorA, { name: 'Convite gestor', email: 'gestor-criando@example.test' }), /Somente ADMIN/)
})

test('roteiro de screenshots manuais usa apenas fixtures fictícias e não abre navegador', () => {
  assert.deepEqual(screenshotCapturePlan, [
    'Landing pública em desktop e mobile',
    'Dashboard ADMIN da plataforma',
    'Dashboard GESTOR do acampamento',
    'Acampamentos com seleção ativa',
    'Times competitivos',
    'Participantes com Time e Equipe/Quarto',
    'Pontuação com ponto e penalidade',
    'Ranking público do acampamento',
    'Histórico de lançamentos',
    'Exportação de dados',
  ])
})

const liveSetup = getIntegrationSetupFromEnv(process.env)
const shouldRunLiveSafetyCheck = Boolean(liveSetup.supabaseUrl && liveSetup.testEnv)

test('execução Supabase real fica condicionada a ambiente local/staging seguro', { skip: shouldRunLiveSafetyCheck ? false : 'Defina TEST_ENV=local|staging e SUPABASE_TEST_URL para habilitar verificação live segura.' }, () => {
  const qaRunId = createQaRunId()
  const safety = assertSafeIntegrationEnvironment({ ...liveSetup, qaRunId })

  assert.ok(['local', 'staging'].includes(safety.mode))
  assert.equal(safety.cleanupRemoteAllowed, true)
})
