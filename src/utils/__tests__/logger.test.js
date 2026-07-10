import assert from 'node:assert/strict'
import test from 'node:test'

import { getErrorForLog } from '../logger.js'

test('getErrorForLog sanitizes Error instances', () => {
  assert.deepEqual(getErrorForLog(new Error('Falha')), {
    name: 'Error',
    message: 'Falha',
  })
})

test('getErrorForLog keeps only safe technical fields from objects', () => {
  assert.deepEqual(
    getErrorForLog({
      code: '23505',
      message: 'duplicate key',
      status: 409,
      email: 'pessoa@example.com',
      token: 'secret',
    }),
    {
      name: undefined,
      code: '23505',
      message: 'duplicate key',
      status: 409,
    },
  )
})
