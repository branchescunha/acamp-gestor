import assert from 'node:assert/strict'
import test from 'node:test'

import {
  sanitizeExcelRow,
  sanitizeExcelValue,
} from '../sanitizeExcelValue.js'

test('sanitizeExcelValue prefixes formula-like strings', () => {
  assert.equal(sanitizeExcelValue('=1+1'), "'=1+1")
  assert.equal(sanitizeExcelValue('+SUM(A1:A2)'), "'+SUM(A1:A2)")
  assert.equal(sanitizeExcelValue('-10'), "'-10")
  assert.equal(sanitizeExcelValue('@user'), "'@user")
})

test('sanitizeExcelValue handles leading spaces before formula markers', () => {
  assert.equal(sanitizeExcelValue('  =1+1'), "'  =1+1")
})

test('sanitizeExcelValue preserves safe and non-string values', () => {
  assert.equal(sanitizeExcelValue('Participante'), 'Participante')
  assert.equal(sanitizeExcelValue(42), 42)
  assert.equal(sanitizeExcelValue(null), null)
})

test('sanitizeExcelRow sanitizes each string cell without mutating values', () => {
  assert.deepEqual(
    sanitizeExcelRow({ name: '=teste', points: 10, safe: 'ok' }),
    { name: "'=teste", points: 10, safe: 'ok' },
  )
})
