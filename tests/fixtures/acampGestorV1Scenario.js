import { randomUUID } from 'node:crypto'

export const screenshotCapturePlan = Object.freeze([
  'Landing pública em desktop e mobile',
  'Dashboard ADMIN da plataforma',
  'Dashboard GESTOR do acampamento',
  'Acampamentos com seleção ativa',
  'Times competitivos',
  'Participantes com Time e Equipe/Quarto',
  'Pontuação com ponto e penalidade',
  'Ranking público do acampamento',
  'Histórico de lançamentos',
  'Exportação de dados',
])

export function createQaRunId(date = new Date()) {
  return `QA-${date.toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)}-${randomUUID().slice(0, 8)}`
}

export function buildV1QaScenario(qaRunId = createQaRunId()) {
  const prefix = qaRunId

  return {
    qaRunId,
    admin: { name: `${prefix} Admin Plataforma`, email: `admin.${prefix.toLowerCase()}@example.test`, role: 'admin', status: 'active' },
    gestors: {
      a: { name: `${prefix} Gestor A`, email: `gestor.a.${prefix.toLowerCase()}@example.test`, role: 'gestor', status: 'active' },
      b: { name: `${prefix} Gestor B`, email: `gestor.b.${prefix.toLowerCase()}@example.test`, role: 'gestor', status: 'active' },
      suspended: { name: `${prefix} Gestor Suspenso`, email: `gestor.suspenso.${prefix.toLowerCase()}@example.test`, role: 'gestor', status: 'suspended' },
    },
    organizations: {
      a: { name: `${prefix} Igreja Central QA`, type: 'church' },
      b: { name: `${prefix} Escola Horizonte QA`, type: 'school' },
    },
    camps: {
      jovens: { name: `${prefix} Acampamento Jovens QA`, church_name: 'Igreja Central QA', theme: 'Unidade e serviço', slug: `${prefix.toLowerCase()}-jovens`, status: 'active', public_ranking_enabled: true, start_date: '2026-07-10', end_date: '2026-07-14' },
      retiro: { name: `${prefix} Retiro Escolar QA`, church_name: 'Escola Horizonte QA', theme: 'Aprender juntos', slug: `${prefix.toLowerCase()}-retiro`, status: 'active', public_ranking_enabled: false, start_date: '2026-08-01', end_date: '2026-08-03' },
      jovensExtra: { name: `${prefix} Segundo Camp QA`, church_name: 'Igreja Central QA', theme: 'Isolamento interno', slug: `${prefix.toLowerCase()}-jovens-extra`, status: 'active', public_ranking_enabled: true, start_date: '2026-09-01', end_date: '2026-09-02' },
    },
    tribes: [
      { name: `${prefix} Levi`, color: '#0ea5e9', symbol: 'L', room_type: 'Equipe' },
      { name: `${prefix} Judá`, color: '#facc15', symbol: 'J', room_type: 'Equipe' },
      { name: `${prefix} Quarto Masculino`, color: '#2563eb', symbol: 'M', room_type: 'Quarto' },
      { name: `${prefix} Quarto Feminino`, color: '#db2777', symbol: 'F', room_type: 'Quarto' },
    ],
    competitionTeams: [
      { name: `${prefix} Azul`, color: '#2563eb', symbol: 'A', status: 'active' },
      { name: `${prefix} Verde`, color: '#16a34a', symbol: 'V', status: 'active' },
      { name: `${prefix} Vermelho`, color: '#dc2626', symbol: 'R', status: 'active' },
    ],
    participants: [
      { full_name: `${prefix} Sem Time`, gender: 'Masculino', group_type: 'UPA' },
      { full_name: `${prefix} Com Time`, gender: 'Feminino', group_type: 'UMP', competitionTeamName: `${prefix} Azul` },
      { full_name: `${prefix} Com Equipe e Time`, gender: 'Masculino', group_type: 'UPA', tribeName: `${prefix} Levi`, competitionTeamName: `${prefix} Verde` },
      { full_name: `${prefix} Sem Vínculo`, gender: 'Feminino', group_type: 'UMP' },
      { full_name: `${prefix} Time Inativado`, gender: 'Masculino', group_type: 'UPA', competitionTeamName: `${prefix} Vermelho` },
    ],
  }
}
