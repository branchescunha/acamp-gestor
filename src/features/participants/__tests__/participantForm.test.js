import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildParticipantPayload,
  filterParticipants,
  initialParticipantForm,
  validateParticipantForm,
} from '../participantForm.js'

test('validateParticipantForm preserves required participant fields', () => {
  assert.equal(
    validateParticipantForm(initialParticipantForm, ''),
    'Selecione um acampamento antes de cadastrar participantes.',
  )
  assert.equal(
    validateParticipantForm(initialParticipantForm, 'camp-1'),
    'Informe o nome do participante.',
  )
})

test('buildParticipantPayload keeps tribe and competition team independent', () => {
  const payload = buildParticipantPayload(
    {
      ...initialParticipantForm,
      full_name: ' Ana ',
      gender: 'Feminino',
      group_type: 'UMP',
      tribe_id: 'tribe-1',
      competition_team_id: 'team-1',
    },
    'camp-1',
  )

  assert.equal(payload.tribe_id, 'tribe-1')
  assert.equal(payload.competition_team_id, 'team-1')
  assert.equal(payload.camp_id, 'camp-1')
  assert.equal(payload.full_name, 'Ana')
})

test('filterParticipants supports Sem time without changing tribe filters', () => {
  const participants = [
    { full_name: 'Ana', tribe_id: 'a', competition_team_id: null, is_active: true },
    { full_name: 'Bia', tribe_id: 'a', competition_team_id: 'team-1', is_active: true },
  ]

  assert.deepEqual(
    filterParticipants(participants, {
      search: '',
      tribe_id: 'a',
      competition_team_id: 'none',
      group_type: '',
      gender: '',
      age: '',
      shirt_size: '',
      board: '',
      status: '',
    }),
    [participants[0]],
  )
})
