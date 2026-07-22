import {
  authUsersNotice,
  cleanupOrder,
  tableMetadata,
} from './config.js'
import { assertSafeCleanupConfig } from './safety.js'

function normalize(value) {
  return String(value || '').trim().toLowerCase()
}

function includesSafePrefix(record, prefixes) {
  const searchable = [
    record.name,
    record.email,
    record.slug,
    record.title,
    record.reason,
    record.full_name,
    record.church_name,
    record.notes,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return prefixes.some((prefix) => searchable.includes(prefix.toLowerCase()))
}

function matchesAllowlist(record, allowlist) {
  const normalizedEmail = normalize(record.email)
  const normalizedSlug = normalize(record.slug)

  return (
    allowlist.ids.includes(record.id) ||
    allowlist.emails.includes(normalizedEmail) ||
    allowlist.slugs.includes(normalizedSlug) ||
    allowlist.organizationIds.includes(record.organization_id) ||
    allowlist.organizationIds.includes(record.id) ||
    allowlist.campIds.includes(record.camp_id) ||
    allowlist.campIds.includes(record.id) ||
    includesSafePrefix(record, allowlist.prefixes)
  )
}

function belongsToRun(record, qaRunId) {
  return [record.qa_run_id, record.qaRunId, record.run_id, record.seed_run_id]
    .filter(Boolean)
    .includes(qaRunId)
}

function getSafeLabel(table, record) {
  const fields = tableMetadata[table]?.labelFields || ['id']
  return fields
    .map((field) => record[field])
    .filter((value) => value !== null && value !== undefined && String(value).trim())
    .join(' | ') || record.id
}

function toInventoryItem(table, record) {
  return {
    table,
    id: record.id,
    label: getSafeLabel(table, record),
    organizationId: record.organization_id || null,
    campId: record.camp_id || null,
  }
}

export function recordIsExplicitlyAllowed(record, allowlist, qaRunId) {
  return belongsToRun(record, qaRunId) && matchesAllowlist(record, allowlist)
}

export function buildCleanupInventory({ tables = {}, config }) {
  assertSafeCleanupConfig(config)

  const removable = []
  const blocked = []
  const unknownTables = Object.keys(tables).filter((table) => !cleanupOrder.includes(table) && table !== 'auth_users')

  for (const table of cleanupOrder) {
    const rows = tables[table] || []
    const tableItems = []

    for (const record of rows) {
      const matchesRun = belongsToRun(record, config.qaRunId)
      const matchesSelection = matchesAllowlist(record, config.allowlist)

      if (matchesRun && matchesSelection) {
        tableItems.push(toInventoryItem(table, record))
      } else if (matchesSelection && !matchesRun) {
        blocked.push({ ...toInventoryItem(table, record), reason: 'Registro não pertence ao QA_RUN_ID informado.' })
      }
    }

    removable.push({
      table,
      count: tableItems.length,
      ids: tableItems.map((item) => item.id),
      items: tableItems,
    })
  }

  const authUsers = (tables.auth_users || [])
    .filter((record) => recordIsExplicitlyAllowed(record, config.allowlist, config.qaRunId))
    .map((record) => ({ id: record.id, email: record.email || null, note: authUsersNotice }))

  return {
    qaRunId: config.qaRunId,
    removalOrder: cleanupOrder,
    tables: removable,
    blocked,
    unknownTables,
    authUsersForSeparateReview: authUsers,
    recordsRemoved: 0,
  }
}

export function summarizeInventory(inventory) {
  return {
    qaRunId: inventory.qaRunId,
    recordsMatched: inventory.tables.reduce((total, table) => total + table.count, 0),
    recordsRemoved: 0,
    removalOrder: inventory.removalOrder,
    blockedCount: inventory.blocked.length,
    authUsersForSeparateReview: inventory.authUsersForSeparateReview.length,
  }
}
