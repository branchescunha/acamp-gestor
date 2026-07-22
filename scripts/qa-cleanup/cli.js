#!/usr/bin/env node
import process from 'node:process'

import { buildCleanupConfig } from './config.js'
import {
  createDryRunReport,
  createInventoryReport,
  executeCleanup,
} from './cleanup.js'

function printJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`)
}

function createEmptyTables() {
  return {}
}

async function main() {
  const command = process.argv[2] || 'inventory'
  const config = buildCleanupConfig(process.env)
  const tables = createEmptyTables()

  if (command === 'inventory') {
    printJson(createInventoryReport({ tables, config }))
    return
  }

  if (command === 'dry-run') {
    printJson(createDryRunReport({ tables, config }))
    return
  }

  if (command === 'cleanup') {
    await executeCleanup({ tables, config })
    return
  }

  throw new Error(`Comando inválido: ${command}. Use inventory, dry-run ou cleanup.`)
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`)
  process.exitCode = 1
})
