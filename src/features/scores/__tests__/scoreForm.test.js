import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScorePayload,
  filterScoreEvents,
  initialScoreForm,
  isLegacyScoreEditing,
  validateScoreForm,
} from '../scoreForm.js'

test('validateScoreForm requires a competition team for new scores', () => {
  assert.equal(
    validateScoreForm(initialScoreForm, 'camp-1', false),
    'Selecione um Time.',
  )
})

test('validateScoreForm allows legacy editing with tribe only', () => {
  assert.equal(
    validateScoreForm(
      { ...initialScoreForm, tribe_id: 'tribe-1', category: 'Geral', points: '5' },
      'camp-1',
      true,
    ),
    '',
  )
})

test('buildScorePayload keeps competitive and legacy destinations explicit', () => {
  const competitivePayload = buildScorePayload(
    {
      ...initialScoreForm,
      competition_team_id: 'team-1',
      category: 'Geral',
      points: '10',
    },
    'camp-1',
    false,
  )
  const legacyPayload = buildScorePayload(
    { ...initialScoreForm, tribe_id: 'tribe-1', category: 'Geral', points: '10' },
    'camp-1',
    true,
  )

  assert.equal(competitivePayload.competition_team_id, 'team-1')
  assert.equal(competitivePayload.tribe_id, null)
  assert.equal(legacyPayload.tribe_id, 'tribe-1')
  assert.equal(legacyPayload.competition_team_id, null)
})

test('isLegacyScoreEditing detects legacy tribe-only edits', () => {
  assert.equal(
    isLegacyScoreEditing('score-1', {
      ...initialScoreForm,
      tribe_id: 'tribe-1',
    }),
    true,
  )
})

test('filterScoreEvents filters by competition team and search text', () => {
  const events = [
    {
      reason: 'Prova',
      competition_team_id: 'team-1',
      competition_teams: { name: 'Time Azul' },
    },
    {
      reason: 'Outro',
      competition_team_id: 'team-2',
      competition_teams: { name: 'Time Verde' },
    },
  ]

  assert.deepEqual(
    filterScoreEvents(events, {
      search: 'azul',
      competition_team_id: 'team-1',
      tribe_id: '',
      participant_id: '',
      type: '',
      category: '',
    }),
    [events[0]],
  )
})
