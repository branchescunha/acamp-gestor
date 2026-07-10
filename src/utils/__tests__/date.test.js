import assert from 'node:assert/strict'
import test from 'node:test'

import {
  calculateAgeFromDateOnly,
  formatDateOnly,
  parseDateOnly,
} from '../date.js'

test('parseDateOnly parses YYYY-MM-DD as a local civil date', () => {
  const date = parseDateOnly('2026-07-10')

  assert.equal(date.getFullYear(), 2026)
  assert.equal(date.getMonth(), 6)
  assert.equal(date.getDate(), 10)
})

test('parseDateOnly rejects invalid or non date-only values', () => {
  assert.equal(parseDateOnly('2026-02-31'), null)
  assert.equal(parseDateOnly('2026-07-10T00:00:00Z'), null)
  assert.equal(parseDateOnly(''), null)
  assert.equal(parseDateOnly(null), null)
})

test('formatDateOnly keeps date-only values stable for pt-BR output', () => {
  assert.equal(formatDateOnly('2026-07-10'), '10/07/2026')
  assert.equal(formatDateOnly(null), '-')
})

test('calculateAgeFromDateOnly calculates age without UTC date shifts', () => {
  const referenceDate = new Date(2026, 6, 10)

  assert.equal(calculateAgeFromDateOnly('2000-07-10', referenceDate), 26)
  assert.equal(calculateAgeFromDateOnly('2000-07-11', referenceDate), 25)
})
