export const productionProjectRefs = Object.freeze([
  'zuxndxchkeynvjqustxk',
])

export const productionUrlFragments = Object.freeze([
  'https://acamp-gestor.vercel.app',
  'https://acampgestor.vercel.app',
  'https://tribes-tournament.vercel.app',
  'zuxndxchkeynvjqustxk',
])

export const cleanupOrder = Object.freeze([
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

export const authUsersNotice = 'Auth users devem ser tratados separadamente pela Admin API, com revisão humana explícita.'

export const tableMetadata = Object.freeze({
  score_events: { labelFields: ['reason', 'category'], campField: 'camp_id' },
  gymkhana_events: { labelFields: ['title', 'notes'], campField: 'camp_id' },
  room_inspections: { labelFields: ['notes', 'inspection_day'], campField: 'camp_id' },
  gymkhana_settings: { labelFields: ['id'], campField: 'camp_id' },
  participants: { labelFields: ['full_name', 'email'], campField: 'camp_id' },
  competition_teams: { labelFields: ['name', 'symbol'], campField: 'camp_id' },
  tribes: { labelFields: ['name', 'room_name'], campField: 'camp_id' },
  invitations: { labelFields: ['email', 'name'], emailField: 'email' },
  access_requests: { labelFields: ['email', 'name', 'church_name'], emailField: 'email' },
  camps: { labelFields: ['name', 'slug', 'church_name'], campField: 'id', slugField: 'slug', organizationField: 'organization_id' },
  organization_members: { labelFields: ['role', 'status'], organizationField: 'organization_id' },
  organizations: { labelFields: ['name', 'type'], organizationField: 'id' },
  profiles: { labelFields: ['email', 'name', 'role'], emailField: 'email' },
})

export function normalizeList(value = '') {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean)
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function buildAllowlistFromEnv(env = {}) {
  return {
    ids: normalizeList(env.QA_CLEANUP_IDS),
    emails: normalizeList(env.QA_CLEANUP_EMAILS).map((email) => email.toLowerCase()),
    slugs: normalizeList(env.QA_CLEANUP_SLUGS).map((slug) => slug.toLowerCase()),
    prefixes: normalizeList(env.QA_CLEANUP_PREFIXES),
    organizationIds: normalizeList(env.QA_CLEANUP_ORGANIZATION_IDS),
    campIds: normalizeList(env.QA_CLEANUP_CAMP_IDS),
  }
}

export function buildCleanupConfig(env = {}) {
  return {
    testEnv: env.TEST_ENV || '',
    supabaseUrl: env.SUPABASE_TEST_URL || '',
    projectRef: env.SUPABASE_TEST_PROJECT_REF || '',
    qaRunId: env.QA_RUN_ID || '',
    cleanupEnabled: env.QA_CLEANUP_ENABLED === 'true',
    cleanupConfirm: env.QA_CLEANUP_CONFIRM || '',
    cleanupConfirmToken: env.QA_CLEANUP_CONFIRM_TOKEN || '',
    allowlist: buildAllowlistFromEnv(env),
  }
}
