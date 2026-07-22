import {
  productionProjectRefs,
  productionUrlFragments,
} from './config.js'

const validTestEnvs = new Set(['local', 'staging'])

export function hasAllowlist(allowlist = {}) {
  return Object.values(allowlist).some((values) => Array.isArray(values) && values.length > 0)
}

export function validateQaRunId(qaRunId = '') {
  return /^QA-[A-Za-z0-9._-]{6,}$/.test(qaRunId)
}

export function assertSafePrefix(prefix = '') {
  if (!prefix.startsWith('QA-')) throw new Error('Prefixos de limpeza precisam começar com QA-.')
}

export function assertSafeCleanupConfig(config = {}) {
  const testEnv = config.testEnv.trim().toLowerCase()
  const supabaseUrl = config.supabaseUrl.trim().toLowerCase()
  const projectRef = config.projectRef.trim().toLowerCase()

  if (!validTestEnvs.has(testEnv)) {
    throw new Error('Limpeza exige TEST_ENV=local ou TEST_ENV=staging.')
  }

  if (!validateQaRunId(config.qaRunId)) {
    throw new Error('Limpeza exige QA_RUN_ID válido começando com QA-.')
  }

  if (!hasAllowlist(config.allowlist)) {
    throw new Error('Limpeza exige allowlist explícita de IDs, e-mails, slugs, prefixos, organizations ou camps.')
  }

  for (const prefix of config.allowlist.prefixes || []) assertSafePrefix(prefix)

  if (productionProjectRefs.includes(projectRef)) {
    throw new Error('Projeto Supabase de produção bloqueado para limpeza.')
  }

  if (productionUrlFragments.some((fragment) => supabaseUrl.includes(fragment))) {
    throw new Error('URL de produção bloqueada para limpeza.')
  }

  return true
}

export function assertCleanupConfirmation(config = {}) {
  assertSafeCleanupConfig(config)

  if (!config.cleanupEnabled) {
    throw new Error('Cleanup real exige QA_CLEANUP_ENABLED=true.')
  }

  if (!config.cleanupConfirmToken) {
    throw new Error('Cleanup real exige QA_CLEANUP_CONFIRM_TOKEN fora do código versionado.')
  }

  if (config.cleanupConfirm !== config.cleanupConfirmToken) {
    throw new Error('Confirmação de cleanup inválida.')
  }

  return true
}
