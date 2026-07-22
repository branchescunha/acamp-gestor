import assert from 'node:assert/strict'
import test from 'node:test'

import { cleanupOrder } from '../../scripts/qa-cleanup/config.js'
import {
  createDryRunReport,
  executeCleanup,
} from '../../scripts/qa-cleanup/cleanup.js'
import { buildCleanupInventory } from '../../scripts/qa-cleanup/inventory.js'
import {
  assertCleanupConfirmation,
  assertSafeCleanupConfig,
  hasAllowlist,
  validateQaRunId,
} from '../../scripts/qa-cleanup/safety.js'

function createConfig(overrides = {}) {
  return {
    testEnv: 'staging',
    supabaseUrl: 'https://qa-project.supabase.co',
    projectRef: 'qa-project',
    qaRunId: 'QA-RUN-123456',
    cleanupEnabled: false,
    cleanupConfirm: '',
    cleanupConfirmToken: '',
    allowlist: {
      ids: [],
      emails: [],
      slugs: [],
      prefixes: ['QA-RUN-123456'],
      organizationIds: [],
      campIds: [],
    },
    ...overrides,
  }
}

function createTables() {
  return {
    score_events: [
      { id: 'score-current', qa_run_id: 'QA-RUN-123456', reason: 'QA-RUN-123456 pontos', camp_id: 'camp-current' },
      { id: 'score-other', qa_run_id: 'QA-OTHER-999999', reason: 'QA-RUN-123456 outro run', camp_id: 'camp-current' },
    ],
    gymkhana_events: [
      { id: 'gym-current', qa_run_id: 'QA-RUN-123456', title: 'QA-RUN-123456 gincana', camp_id: 'camp-current' },
    ],
    participants: [
      { id: 'participant-current', qa_run_id: 'QA-RUN-123456', full_name: 'QA-RUN-123456 Pessoa', camp_id: 'camp-current' },
    ],
    camps: [
      { id: 'camp-current', qa_run_id: 'QA-RUN-123456', name: 'QA-RUN-123456 Camp', slug: 'qa-run-123456-camp', organization_id: 'org-current' },
    ],
    organizations: [
      { id: 'org-current', qa_run_id: 'QA-RUN-123456', name: 'QA-RUN-123456 Organização' },
    ],
    profiles: [
      { id: 'profile-current', qa_run_id: 'QA-RUN-123456', email: 'qa-run-123456@example.test', role: 'gestor' },
      { id: 'profile-admin', qa_run_id: 'REAL-DATA', email: 'admin@example.test', role: 'admin' },
    ],
    auth_users: [
      { id: 'auth-current', qa_run_id: 'QA-RUN-123456', email: 'qa-run-123456@example.test' },
    ],
    unknown_table: [
      { id: 'unknown-current', qa_run_id: 'QA-RUN-123456', name: 'QA-RUN-123456 desconhecido' },
    ],
  }
}

test('bloqueia ambiente de produção por project ref e URL', () => {
  assert.throws(
    () => assertSafeCleanupConfig(createConfig({ projectRef: 'zuxndxchkeynvjqustxk' })),
    /produção/,
  )

  assert.throws(
    () => assertSafeCleanupConfig(createConfig({ supabaseUrl: 'https://acampgestor.vercel.app' })),
    /produção/,
  )

  assert.throws(
    () => assertSafeCleanupConfig(createConfig({ supabaseUrl: 'https://acamp-gestor.vercel.app' })),
    /produção/,
  )

  assert.throws(
    () => assertSafeCleanupConfig(createConfig({ supabaseUrl: 'https://tribes-tournament.vercel.app' })),
    /produção/,
  )
})

test('bloqueia ausência de allowlist e allowlist vazia', () => {
  const emptyAllowlist = {
    ids: [],
    emails: [],
    slugs: [],
    prefixes: [],
    organizationIds: [],
    campIds: [],
  }

  assert.equal(hasAllowlist(emptyAllowlist), false)
  assert.throws(
    () => assertSafeCleanupConfig(createConfig({ allowlist: emptyAllowlist })),
    /allowlist explícita/,
  )
})

test('bloqueia run ID inválido e prefixo inseguro', () => {
  assert.equal(validateQaRunId('RUN-123'), false)
  assert.equal(validateQaRunId('QA-RUN-123456'), true)

  assert.throws(
    () => assertSafeCleanupConfig(createConfig({ qaRunId: 'RUN-123' })),
    /QA_RUN_ID válido/,
  )

  assert.throws(
    () => assertSafeCleanupConfig(createConfig({ allowlist: { ...createConfig().allowlist, prefixes: ['teste'] } })),
    /começar com QA-/,
  )
})

test('ordem de limpeza preserva filhos antes de pais', () => {
  assert.deepEqual(cleanupOrder, [
    'score_events',
    'gymkhana_events',
    'room_inspections',
    'gymkhana_settings',
    'participants',
    'competition_teams',
    'tribes',
    'invitations',
    'access_requests',
    'camps',
    'organization_members',
    'organizations',
    'profiles',
  ])
})

test('inventário seleciona somente registros do run atual', () => {
  const inventory = buildCleanupInventory({ tables: createTables(), config: createConfig() })
  const scoreTable = inventory.tables.find((table) => table.table === 'score_events')

  assert.deepEqual(scoreTable.ids, ['score-current'])
  assert.equal(inventory.blocked.length, 1)
  assert.equal(inventory.blocked[0].id, 'score-other')
  assert.match(inventory.blocked[0].reason, /QA_RUN_ID/)
})

test('inventário reporta tabelas não reconhecidas e Auth users separadamente', () => {
  const inventory = buildCleanupInventory({ tables: createTables(), config: createConfig() })

  assert.deepEqual(inventory.unknownTables, ['unknown_table'])
  assert.equal(inventory.authUsersForSeparateReview.length, 1)
  assert.equal(inventory.authUsersForSeparateReview[0].id, 'auth-current')
})

test('dry-run não remove registros e retorna contagem auditável', () => {
  const report = createDryRunReport({ tables: createTables(), config: createConfig() })

  assert.equal(report.mode, 'dry-run')
  assert.equal(report.summary.recordsRemoved, 0)
  assert.equal(report.inventory.recordsRemoved, 0)
  assert.equal(report.summary.recordsMatched, 6)
  assert.match(report.message, /0 registros removidos/)
})

test('cleanup real exige confirmação explícita e token não versionado', () => {
  assert.throws(
    () => assertCleanupConfirmation(createConfig()),
    /QA_CLEANUP_ENABLED=true/,
  )

  assert.throws(
    () => assertCleanupConfirmation(createConfig({ cleanupEnabled: true })),
    /QA_CLEANUP_CONFIRM_TOKEN/,
  )

  assert.throws(
    () => assertCleanupConfirmation(createConfig({ cleanupEnabled: true, cleanupConfirm: 'errado', cleanupConfirmToken: 'certo' })),
    /Confirmação de cleanup inválida/,
  )
})

test('cleanup real não executa delete sem adapter explícito', async () => {
  await assert.rejects(
    () => executeCleanup({
      tables: createTables(),
      config: createConfig({ cleanupEnabled: true, cleanupConfirm: 'TOKEN-QA', cleanupConfirmToken: 'TOKEN-QA' }),
    }),
    /deleteAdapter explícito/,
  )
})

test('filtros explícitos por email, slug, organization e camp permanecem restritos ao run atual', () => {
  const config = createConfig({
    allowlist: {
      ids: [],
      emails: ['qa-run-123456@example.test'],
      slugs: ['qa-run-123456-camp'],
      prefixes: [],
      organizationIds: ['org-current'],
      campIds: ['camp-current'],
    },
  })
  const inventory = buildCleanupInventory({ tables: createTables(), config })

  assert.equal(inventory.tables.find((table) => table.table === 'profiles').count, 1)
  assert.equal(inventory.tables.find((table) => table.table === 'camps').count, 1)
  assert.equal(inventory.tables.find((table) => table.table === 'organizations').count, 1)
  assert.equal(inventory.tables.find((table) => table.table === 'score_events').count, 1)
})
