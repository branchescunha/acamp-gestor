import { buildCleanupInventory, summarizeInventory } from './inventory.js'
import { assertCleanupConfirmation, assertSafeCleanupConfig } from './safety.js'

export function createDryRunReport({ tables = {}, config }) {
  assertSafeCleanupConfig(config)
  const inventory = buildCleanupInventory({ tables, config })

  return {
    mode: 'dry-run',
    message: '0 registros removidos.',
    summary: summarizeInventory(inventory),
    inventory,
  }
}

export function createInventoryReport({ tables = {}, config }) {
  assertSafeCleanupConfig(config)
  const inventory = buildCleanupInventory({ tables, config })

  return {
    mode: 'inventory',
    message: 'Inventário gerado sem remoção de dados.',
    summary: summarizeInventory(inventory),
    inventory,
  }
}

export async function executeCleanup({ tables = {}, config, deleteAdapter } = {}) {
  assertCleanupConfirmation(config)

  if (typeof deleteAdapter !== 'function') {
    throw new Error('Cleanup real exige deleteAdapter explícito. Nenhum delete foi executado.')
  }

  const inventory = buildCleanupInventory({ tables, config })
  const deletionPlan = inventory.tables.filter((table) => table.count > 0)

  if (deletionPlan.length === 0) {
    return {
      mode: 'cleanup',
      recordsRemoved: 0,
      message: 'Nenhum registro encontrado para remoção.',
      inventory,
    }
  }

  const result = await deleteAdapter(deletionPlan)

  return {
    mode: 'cleanup',
    recordsRemoved: result?.recordsRemoved || 0,
    deletionPlan,
    inventory,
  }
}
