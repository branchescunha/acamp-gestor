import { normalizeScoreAmount } from '../../domain/scoring.js'

export const initialScoreForm = {
  tribe_id: '',
  competition_team_id: '',
  participant_id: '',
  type: 'POINT',
  category: '',
  points: '',
  reason: '',
  notes: '',
}

export const initialScoreFilters = {
  search: '',
  competition_team_id: '',
  tribe_id: '',
  participant_id: '',
  type: '',
  category: '',
}

export function isLegacyScoreEditing(editingId, form) {
  return Boolean(editingId && form.tribe_id && !form.competition_team_id)
}

export function validateScoreForm(form, activeCampId, legacyEditing = false) {
  if (!activeCampId) {
    return 'Selecione um acampamento antes de lançar pontuações.'
  }

  if (!legacyEditing && !form.competition_team_id) {
    return 'Selecione um Time.'
  }

  if (!form.category) {
    return 'Selecione uma categoria.'
  }

  if (!form.points || Number(form.points) <= 0) {
    return 'Informe uma pontuação válida.'
  }

  return ''
}

export function buildScorePayload(form, activeCampId, legacyEditing = false) {
  return {
    tribe_id: legacyEditing ? form.tribe_id : null,
    competition_team_id: legacyEditing ? null : form.competition_team_id,
    participant_id: form.participant_id || null,
    type: form.type,
    category: form.category,
    points: normalizeScoreAmount(form.type, form.points),
    reason: form.reason.trim() || null,
    notes: form.notes.trim() || null,
    camp_id: activeCampId,
  }
}

export function filterScoreEvents(events = [], filters = initialScoreFilters) {
  return events.filter((eventItem) => {
    const search = filters.search.trim().toLowerCase()

    const matchesSearch = search
      ? eventItem.reason?.toLowerCase().includes(search) ||
        eventItem.notes?.toLowerCase().includes(search) ||
        eventItem.category?.toLowerCase().includes(search) ||
        eventItem.competition_teams?.name?.toLowerCase().includes(search) ||
        eventItem.tribes?.name?.toLowerCase().includes(search) ||
        eventItem.participants?.full_name?.toLowerCase().includes(search)
      : true

    const matchesCompetitionTeam = filters.competition_team_id
      ? eventItem.competition_team_id === filters.competition_team_id
      : true

    const matchesTribe = filters.tribe_id
      ? eventItem.tribe_id === filters.tribe_id
      : true

    const matchesParticipant = filters.participant_id
      ? eventItem.participant_id === filters.participant_id
      : true

    const matchesType = filters.type ? eventItem.type === filters.type : true

    const matchesCategory = filters.category
      ? eventItem.category === filters.category
      : true

    return (
      matchesSearch &&
      matchesCompetitionTeam &&
      matchesTribe &&
      matchesParticipant &&
      matchesType &&
      matchesCategory
    )
  })
}
