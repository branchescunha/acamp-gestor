import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { calculateRanking } from '../../src/domain/ranking.js'
import { sanitizeExcelRow } from '../../src/features/export/sanitizeExcelValue.js'

const tableNames = [
  'profiles',
  'organizations',
  'organization_members',
  'camps',
  'tribes',
  'competition_teams',
  'participants',
  'score_events',
  'gymkhana_events',
  'room_inspections',
  'invitations',
  'access_requests',
]

const now = () => new Date().toISOString()
const createId = (prefix) => `${prefix}_${randomUUID()}`
const normalizeEmail = (email) => email.trim().toLowerCase()

function assertActiveUser(user) {
  if (!user || user.status !== 'active') throw new Error('Usuário sem permissão ativa.')
}

function sanitizeRows(rows) {
  return rows.map((row) => sanitizeExcelRow(row))
}

export class InMemoryAcampGestorStore {
  constructor({ qaRunId }) {
    this.qaRunId = qaRunId
    this.tables = Object.fromEntries(tableNames.map((table) => [table, []]))
  }

  insert(table, row) {
    const record = { id: row.id || createId(table), qaRunId: this.qaRunId, created_at: row.created_at || now(), updated_at: row.updated_at || now(), ...row }
    this.tables[table].push(record)
    return record
  }

  list(table, predicate = () => true) {
    return this.tables[table].filter(predicate)
  }

  findById(table, id) {
    return this.tables[table].find((row) => row.id === id) || null
  }

  createProfile(data) {
    if (!['admin', 'gestor'].includes(data.role)) throw new Error('Role inválida.')
    if (!['active', 'suspended'].includes(data.status)) throw new Error('Status inválido.')

    const email = normalizeEmail(data.email)
    if (this.tables.profiles.some((profile) => profile.email === email)) throw new Error('Profile duplicado por e-mail.')

    return this.insert('profiles', { ...data, email })
  }

  createOrganization(actor, data) {
    assertActiveUser(actor)
    if (!['admin', 'gestor'].includes(actor.role)) throw new Error('Perfil não cria organização.')
    if (!data.name.trim()) throw new Error('Nome da organização obrigatório.')
    if (this.tables.organizations.some((organization) => organization.name === data.name)) throw new Error('Organização duplicada.')
    return this.insert('organizations', { ...data, created_by: actor.id })
  }

  createMembership(actor, organization, profile, role = 'member', status = 'active') {
    if (actor.role !== 'admin' && actor.id !== organization.created_by) throw new Error('Sem permissão para criar membership.')
    if (this.tables.organization_members.some((member) => member.organization_id === organization.id && member.profile_id === profile.id)) {
      throw new Error('Membro já vinculado à organização.')
    }
    return this.insert('organization_members', { organization_id: organization.id, profile_id: profile.id, role, status })
  }

  createCamp(actor, organization, data) {
    this.assertCanManageOrganization(actor, organization.id)
    if (data.end_date && data.start_date && data.end_date < data.start_date) throw new Error('Data de fim anterior à data de início.')
    if (this.tables.camps.some((camp) => camp.slug === data.slug)) throw new Error('Slug duplicado.')
    return this.insert('camps', { ...data, organization_id: organization.id, created_by: actor.id })
  }

  createTribe(actor, camp, data) {
    this.assertCanManageCamp(actor, camp.id)
    return this.insert('tribes', { is_active: true, ...data, camp_id: camp.id })
  }

  createCompetitionTeam(actor, camp, data) {
    this.assertCanManageCamp(actor, camp.id)
    if (!data.name.trim()) throw new Error('Nome do Time obrigatório.')
    if (this.tables.competition_teams.some((team) => team.camp_id === camp.id && team.name === data.name)) {
      throw new Error('Time duplicado no acampamento.')
    }
    return this.insert('competition_teams', { ...data, camp_id: camp.id, status: data.status || 'active' })
  }

  setCompetitionTeamStatus(actor, team, status) {
    this.assertCanManageCamp(actor, team.camp_id)
    team.status = status
    team.updated_at = now()
    return team
  }

  createParticipant(actor, camp, data) {
    this.assertCanManageCamp(actor, camp.id)
    if (!data.full_name?.trim()) throw new Error('Nome do participante obrigatório.')
    if (data.tribe_id) {
      const tribe = this.findById('tribes', data.tribe_id)
      if (!tribe || tribe.camp_id !== camp.id) throw new Error('Equipe/Quarto inválido para o acampamento.')
    }
    if (data.competition_team_id) {
      const team = this.findById('competition_teams', data.competition_team_id)
      if (!team || team.camp_id !== camp.id) throw new Error('Time inválido para o acampamento.')
    }
    return this.insert('participants', { age: null, birth_date: null, is_active: true, tribe_id: null, competition_team_id: null, ...data, camp_id: camp.id })
  }

  createScoreEvent(actor, camp, data) {
    this.assertCanManageCamp(actor, camp.id)
    if (!Number.isFinite(Number(data.points)) || Number(data.points) === 0) throw new Error('Pontuação inválida.')

    if (data.competition_team_id) {
      const team = this.findById('competition_teams', data.competition_team_id)
      if (!team || team.camp_id !== camp.id) throw new Error('Time inválido para pontuação.')
      if (team.status !== 'active') throw new Error('Time inativo não recebe novo lançamento.')
    }
    if (data.tribe_id) {
      const tribe = this.findById('tribes', data.tribe_id)
      if (!tribe || tribe.camp_id !== camp.id) throw new Error('Equipe/Quarto inválido para pontuação.')
    }

    return this.insert('score_events', { participant_id: null, tribe_id: null, competition_team_id: null, ...data, camp_id: camp.id })
  }

  createGymkhanaEvent(actor, camp, data) {
    this.assertCanManageCamp(actor, camp.id)
    const team = this.findById('competition_teams', data.winning_competition_team_id)
    if (!team || team.camp_id !== camp.id) throw new Error('Time vencedor inválido.')
    if (!Number.isFinite(Number(data.points_per_member)) || Number(data.points_per_member) <= 0) throw new Error('Pontuação de gincana inválida.')

    const gymkhanaEvent = this.insert('gymkhana_events', {
      camp_id: camp.id,
      title: data.title,
      winning_competition_team_id: team.id,
      winning_team: team.id,
      points_per_member: Number(data.points_per_member),
      notes: data.notes || null,
    })
    const scoreEvent = this.createScoreEvent(actor, camp, {
      competition_team_id: team.id,
      participant_id: null,
      tribe_id: null,
      type: 'POINT',
      category: 'Gincana',
      points: Number(data.points_per_member),
      reason: data.title,
      notes: data.notes || null,
      gymkhana_event_id: gymkhanaEvent.id,
    })
    return { gymkhanaEvent, scoreEvent }
  }

  createLegacyGymkhanaEvent(actor, camp, winningTeam) {
    this.assertCanManageCamp(actor, camp.id)
    if (!['A', 'B'].includes(winningTeam)) throw new Error('Time legado inválido.')
    return this.insert('gymkhana_events', { camp_id: camp.id, title: `Gincana legado ${winningTeam}`, winning_team: winningTeam, winning_competition_team_id: null, points_per_member: 10, notes: 'Fixture legado A/B' })
  }

  createRoomInspection(actor, camp, data) {
    this.assertCanManageCamp(actor, camp.id)
    const tribe = this.findById('tribes', data.tribe_id)
    if (!tribe || tribe.camp_id !== camp.id) throw new Error('Inspeção exige Equipe/Quarto do acampamento.')
    return this.insert('room_inspections', { ...data, camp_id: camp.id })
  }

  createInvitation(actor, data) {
    if (actor.role !== 'admin') throw new Error('Somente ADMIN cria convite administrativo.')
    const email = normalizeEmail(data.email)
    if (this.tables.invitations.some((invitation) => invitation.email === email && invitation.status === 'pending')) {
      throw new Error('Convite pendente duplicado.')
    }
    return this.insert('invitations', { ...data, email, role: data.role || 'gestor', status: data.status || 'pending', token: data.token || createId('token'), created_by: actor.id })
  }

  createAccessRequest(data) {
    const email = normalizeEmail(data.email)
    if (!email.includes('@')) throw new Error('E-mail inválido.')
    return this.insert('access_requests', { ...data, email, status: 'pending', reviewed_at: null, reviewed_by: null })
  }

  approveAccessRequest(actor, request) {
    if (actor.role !== 'admin') throw new Error('Somente ADMIN aprova solicitações.')
    if (request.status !== 'pending') throw new Error('Solicitação já processada.')
    request.status = 'approved'
    request.reviewed_at = now()
    request.reviewed_by = actor.id
    const invitation = this.createInvitation(actor, { name: request.name, email: request.email, status: 'accepted', notes: 'Aprovação automática de QA.' })
    return { request, invitation }
  }

  listOrganizationsFor(actor) {
    assertActiveUser(actor)
    if (actor.role === 'admin') return [...this.tables.organizations]
    const organizationIds = new Set(this.tables.organization_members
      .filter((member) => member.profile_id === actor.id && member.status === 'active')
      .map((member) => member.organization_id))
    return this.tables.organizations.filter((organization) => organizationIds.has(organization.id))
  }

  listCampsFor(actor) {
    assertActiveUser(actor)
    if (actor.role === 'admin') return [...this.tables.camps]
    const organizationIds = new Set(this.listOrganizationsFor(actor).map((organization) => organization.id))
    return this.tables.camps.filter((camp) => organizationIds.has(camp.organization_id))
  }

  getPublicRankingBySlug(slug) {
    const camp = this.tables.camps.find((candidate) => candidate.slug === slug)
    if (!camp || !camp.public_ranking_enabled) throw new Error('Ranking público indisponível.')

    const teams = this.tables.competition_teams.filter((team) => team.camp_id === camp.id && team.status === 'active')
    const scores = this.tables.score_events.filter((score) => score.camp_id === camp.id && score.competition_team_id)
    const participants = this.tables.participants.filter((participant) => participant.camp_id === camp.id)
    const ranking = calculateRanking(teams, scores, participants, {
      includeInactive: false,
      scoreTeamIdField: 'competition_team_id',
      participantTeamIdField: 'competition_team_id',
    })

    return ranking.map((team) => ({
      id: team.id,
      name: team.name,
      color: team.color,
      symbol: team.symbol,
      total: team.total,
      positivePoints: team.positivePoints,
      penaltyPoints: team.penaltyPoints,
      participantsCount: team.participantsCount,
    }))
  }

  buildExportWorkbookModel(camp) {
    const teams = this.tables.competition_teams.filter((team) => team.camp_id === camp.id)
    const activeTeams = teams.filter((team) => team.status === 'active')
    const inactiveTeams = teams.filter((team) => team.status !== 'active')
    const tribes = this.tables.tribes.filter((tribe) => tribe.camp_id === camp.id)
    const participants = this.tables.participants.filter((participant) => participant.camp_id === camp.id)
    const scoreEvents = this.tables.score_events.filter((score) => score.camp_id === camp.id)
    const inspections = this.tables.room_inspections.filter((inspection) => inspection.camp_id === camp.id)
    const gymkhana = this.tables.gymkhana_events.filter((event) => event.camp_id === camp.id)
    const getTeamName = (id) => teams.find((team) => team.id === id)?.name || 'Sem time'
    const getTribeName = (id) => tribes.find((tribe) => tribe.id === id)?.name || 'Sem equipe/quarto'
    const ranking = calculateRanking(activeTeams, scoreEvents, participants, {
      includeInactive: false,
      scoreTeamIdField: 'competition_team_id',
      participantTeamIdField: 'competition_team_id',
    })

    return [
      { name: 'Resumo do acampamento', rows: sanitizeRows([{ campo: 'Nome', valor: camp.name }, { campo: 'Igreja/organização', valor: camp.church_name }, { campo: 'Tema', valor: camp.theme }, { campo: 'Status', valor: camp.status }, { campo: 'Slug', valor: camp.slug }]) },
      { name: 'Ranking competitivo', rows: sanitizeRows(ranking.map((team) => ({ Time: team.name, Saldo: team.total }))) },
      { name: 'Times competitivos', rows: sanitizeRows(activeTeams.map((team) => ({ Time: team.name, Status: team.status }))) },
      { name: 'Times inativos', rows: sanitizeRows(inactiveTeams.map((team) => ({ Time: team.name, Status: team.status }))) },
      { name: 'Participantes', rows: sanitizeRows(participants.map((participant) => ({ Nome: participant.full_name, Time: participant.competition_team_id ? getTeamName(participant.competition_team_id) : 'Sem time', 'Equipe/Quarto': participant.tribe_id ? getTribeName(participant.tribe_id) : 'Sem equipe/quarto' }))) },
      { name: 'Pontuações', rows: sanitizeRows(scoreEvents.filter((score) => score.competition_team_id).map((score) => ({ Time: getTeamName(score.competition_team_id), Categoria: score.category, Motivo: score.reason, Pontos: score.points }))) },
      { name: 'Pontuações legadas', rows: sanitizeRows(scoreEvents.filter((score) => score.tribe_id && !score.competition_team_id).map((score) => ({ 'Equipe/Quarto': getTribeName(score.tribe_id), Categoria: score.category, Pontos: score.points }))) },
      { name: 'Gincanas', rows: sanitizeRows(gymkhana.map((event) => ({ Evento: event.title, Time: event.winning_competition_team_id ? getTeamName(event.winning_competition_team_id) : event.winning_team, Pontos: event.points_per_member }))) },
      { name: 'Inspeções', rows: sanitizeRows(inspections.map((inspection) => ({ 'Equipe/Quarto': getTribeName(inspection.tribe_id), Pontos: inspection.points }))) },
      { name: 'Equipes/Quartos', rows: sanitizeRows(tribes.map((tribe) => ({ Nome: tribe.name, Tipo: tribe.room_type }))) },
      { name: 'Configurações', rows: sanitizeRows([{ chave: 'gymkhana_legacy', valor: 'A/B preservado' }]) },
    ]
  }

  assertCanManageOrganization(actor, organizationId) {
    assertActiveUser(actor)
    if (actor.role === 'admin') return
    const membership = this.tables.organization_members.find((member) => member.organization_id === organizationId && member.profile_id === actor.id && member.status === 'active' && ['owner', 'manager'].includes(member.role))
    if (!membership) throw new Error('Sem permissão para gerenciar organização.')
  }

  assertCanManageCamp(actor, campId) {
    const camp = this.findById('camps', campId)
    if (!camp) throw new Error('Acampamento não encontrado.')
    this.assertCanManageOrganization(actor, camp.organization_id)
  }

  deleteCompetitionTeam(actor, team) {
    this.assertCanManageCamp(actor, team.camp_id)
    const linked = this.tables.participants.some((participant) => participant.competition_team_id === team.id) || this.tables.score_events.some((score) => score.competition_team_id === team.id)
    if (linked) throw new Error('Time vinculado não pode ser excluído.')
    this.tables.competition_teams = this.tables.competition_teams.filter((current) => current.id !== team.id)
  }

  deleteTribe(actor, tribe) {
    this.assertCanManageCamp(actor, tribe.camp_id)
    const linked = this.tables.participants.some((participant) => participant.tribe_id === tribe.id) || this.tables.room_inspections.some((inspection) => inspection.tribe_id === tribe.id)
    if (linked) throw new Error('Equipe/Quarto vinculada não pode ser excluída.')
    this.tables.tribes = this.tables.tribes.filter((current) => current.id !== tribe.id)
  }

  cleanupQaRun() {
    for (const table of [...tableNames].reverse()) {
      this.tables[table] = this.tables[table].filter((row) => row.qaRunId !== this.qaRunId)
    }
  }

  countQaRows() {
    return tableNames.reduce((total, table) => total + this.tables[table].filter((row) => row.qaRunId === this.qaRunId).length, 0)
  }
}

export function seedCompleteV1Scenario(store, scenario) {
  const admin = store.createProfile(scenario.admin)
  const gestorA = store.createProfile(scenario.gestors.a)
  const gestorB = store.createProfile(scenario.gestors.b)
  const suspendedGestor = store.createProfile(scenario.gestors.suspended)
  const organizationA = store.createOrganization(admin, scenario.organizations.a)
  const organizationB = store.createOrganization(admin, scenario.organizations.b)

  store.createMembership(admin, organizationA, admin, 'owner')
  store.createMembership(admin, organizationA, gestorA, 'manager')
  store.createMembership(admin, organizationB, gestorB, 'manager')
  store.createMembership(admin, organizationA, suspendedGestor, 'manager')

  const campJovens = store.createCamp(admin, organizationA, scenario.camps.jovens)
  const campRetiro = store.createCamp(admin, organizationB, scenario.camps.retiro)
  const campJovensExtra = store.createCamp(admin, organizationA, scenario.camps.jovensExtra)
  const tribes = scenario.tribes.map((tribe) => store.createTribe(gestorA, campJovens, tribe))
  const teams = scenario.competitionTeams.map((team) => store.createCompetitionTeam(gestorA, campJovens, team))
  const findTeam = (name) => teams.find((team) => team.name === name)
  const findTribe = (name) => tribes.find((tribe) => tribe.name === name)
  const participants = scenario.participants.map((participant) => store.createParticipant(gestorA, campJovens, { full_name: participant.full_name, gender: participant.gender, group_type: participant.group_type, tribe_id: participant.tribeName ? findTribe(participant.tribeName).id : null, competition_team_id: participant.competitionTeamName ? findTeam(participant.competitionTeamName).id : null, phone: '0000-0000', cpf: `${scenario.qaRunId}-CPF` }))
  const [azul, verde, vermelho] = teams
  const [levi] = tribes

  store.createScoreEvent(gestorA, campJovens, { competition_team_id: azul.id, participant_id: participants[1].id, type: 'POINT', category: 'Participação', points: 120, reason: '=tentativa de formula' })
  store.createScoreEvent(gestorA, campJovens, { competition_team_id: azul.id, type: 'PENALTY', category: 'Atraso', points: -20, reason: 'Atraso controlado' })
  store.createScoreEvent(gestorA, campJovens, { competition_team_id: verde.id, participant_id: participants[2].id, type: 'POINT', category: 'Espírito de equipe', points: 80, reason: 'Boa participação' })
  store.createScoreEvent(gestorA, campJovens, { tribe_id: levi.id, type: 'POINT', category: 'Legado', points: 999, reason: 'Score legado por Equipe/Quarto' })
  const currentGymkhana = store.createGymkhanaEvent(gestorA, campJovens, { title: 'Caça ao tesouro QA', winning_competition_team_id: verde.id, points_per_member: 30, notes: 'Gincana atual' })
  const legacyGymkhana = store.createLegacyGymkhanaEvent(gestorA, campJovens, 'A')
  store.createRoomInspection(gestorA, campJovens, { tribe_id: levi.id, inspection_day: '2026-07-11', inspection_period: 'morning', type: 'POINT', points: 10, notes: 'Inspeção por quarto', has_photo: false })
  store.setCompetitionTeamStatus(gestorA, vermelho, 'inactive')

  return { admin, gestorA, gestorB, suspendedGestor, organizationA, organizationB, campJovens, campRetiro, campJovensExtra, tribes, teams, participants, currentGymkhana, legacyGymkhana }
}

export function assertNoUnsafeExportValues(worksheets) {
  for (const worksheet of worksheets) {
    for (const row of worksheet.rows) {
      for (const [key, value] of Object.entries(row)) {
        assert.notEqual(value, undefined, `${worksheet.name}.${key} não pode ser undefined`)
        assert.notEqual(String(value), '[object Object]', `${worksheet.name}.${key} não pode ser objeto serializado`)
      }
    }
  }
}
