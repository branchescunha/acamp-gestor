export const initialParticipantForm = {
  full_name: '',
  age: '',
  birth_date: '',
  church: '',
  cpf: '',
  address: '',
  shirt_size: '',
  gender: '',
  group_type: '',
  phone: '',
  guardian_phone: '',
  food_restriction: '',
  notes: '',
  is_board_member: false,
  tribe_id: '',
  competition_team_id: '',
  is_active: true,
}

export const initialParticipantFilters = {
  search: '',
  tribe_id: '',
  competition_team_id: '',
  group_type: '',
  gender: '',
  age: '',
  shirt_size: '',
  board: '',
  status: '',
}

export function validateParticipantForm(form, activeCampId) {
  if (!activeCampId) {
    return 'Selecione um acampamento antes de cadastrar participantes.'
  }

  if (!form.full_name.trim()) {
    return 'Informe o nome do participante.'
  }

  if (!form.gender) {
    return 'Selecione o sexo.'
  }

  if (!form.group_type) {
    return 'Selecione UPA ou UMP.'
  }

  return ''
}

export function buildParticipantPayload(form, activeCampId) {
  return {
    full_name: form.full_name.trim(),
    age: form.age ? Number(form.age) : null,
    birth_date: form.birth_date || null,
    church: form.church.trim() || null,
    cpf: form.cpf.trim() || null,
    address: form.address.trim() || null,
    shirt_size: form.shirt_size || null,
    gender: form.gender,
    group_type: form.group_type,
    phone: form.phone.trim() || null,
    guardian_phone: form.guardian_phone.trim() || null,
    food_restriction: form.food_restriction.trim() || null,
    notes: form.notes.trim() || null,
    is_board_member: form.is_board_member,
    tribe_id: form.tribe_id || null,
    competition_team_id: form.competition_team_id || null,
    is_active: form.is_active,
    camp_id: activeCampId,
  }
}

export function filterParticipants(participants = [], filters = initialParticipantFilters) {
  return participants.filter((participant) => {
    const search = filters.search.trim().toLowerCase()

    const matchesSearch = search
      ? participant.full_name?.toLowerCase().includes(search) ||
        participant.phone?.toLowerCase().includes(search) ||
        participant.guardian_phone?.toLowerCase().includes(search) ||
        participant.church?.toLowerCase().includes(search) ||
        participant.cpf?.toLowerCase().includes(search)
      : true

    const matchesTribe = filters.tribe_id
      ? participant.tribe_id === filters.tribe_id
      : true

    const matchesCompetitionTeam =
      filters.competition_team_id === 'none'
        ? !participant.competition_team_id
        : filters.competition_team_id
          ? participant.competition_team_id === filters.competition_team_id
          : true

    const matchesGroup = filters.group_type
      ? participant.group_type === filters.group_type
      : true

    const matchesGender = filters.gender
      ? participant.gender === filters.gender
      : true

    const matchesAge = filters.age
      ? Number(participant.age) === Number(filters.age)
      : true

    const matchesShirtSize = filters.shirt_size
      ? participant.shirt_size === filters.shirt_size
      : true

    const matchesStatus = filters.status
      ? String(participant.is_active) === filters.status
      : true

    const matchesBoard = filters.board
      ? String(participant.is_board_member) === filters.board
      : true

    return (
      matchesSearch &&
      matchesTribe &&
      matchesCompetitionTeam &&
      matchesGroup &&
      matchesGender &&
      matchesAge &&
      matchesShirtSize &&
      matchesStatus &&
      matchesBoard
    )
  })
}
