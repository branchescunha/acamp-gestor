import process from 'node:process'

const productionProjectRefs = new Set(['zuxndxchkeynvjqustxk'])
const productionHostFragments = ['acampgestor.vercel.app', 'acamp-gestor.vercel.app', 'tribes-tournament.vercel.app', 'acampgestor', 'zuxndxchkeynvjqustxk']

export function assertSafeIntegrationEnvironment({ testEnv = '', supabaseUrl = '', projectRef = '', qaRunId = '', allowRemoteCleanup = false } = {}) {
  if (!qaRunId.startsWith('QA-')) throw new Error('Integration tests require a QA-* run id.')

  const normalizedEnv = testEnv.trim().toLowerCase()
  const normalizedUrl = supabaseUrl.trim().toLowerCase()
  const normalizedProjectRef = projectRef.trim().toLowerCase()

  if (!normalizedUrl) return { mode: 'mock', cleanupRemoteAllowed: false }

  if (!['local', 'staging'].includes(normalizedEnv)) {
    throw new Error('Live integration tests require TEST_ENV=local or TEST_ENV=staging.')
  }

  if (productionProjectRefs.has(normalizedProjectRef)) {
    throw new Error('Refusing to run integration tests against the production Supabase project.')
  }

  if (productionHostFragments.some((fragment) => normalizedUrl.includes(fragment))) {
    throw new Error('Refusing to run integration tests against a production-like URL.')
  }

  if (normalizedEnv === 'staging' && !allowRemoteCleanup) {
    throw new Error('Staging integration tests require explicit remote cleanup permission.')
  }

  return { mode: normalizedEnv, cleanupRemoteAllowed: normalizedEnv === 'local' || allowRemoteCleanup }
}

export function getIntegrationSetupFromEnv(env = process.env) {
  return {
    testEnv: env.TEST_ENV || '',
    supabaseUrl: env.SUPABASE_TEST_URL || '',
    projectRef: env.SUPABASE_TEST_PROJECT_REF || '',
    allowRemoteCleanup: env.ALLOW_REMOTE_QA_CLEANUP === 'true',
  }
}
