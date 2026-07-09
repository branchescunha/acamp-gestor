import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import PageHeader from '../components/PageHeader'
import { calculateRanking } from '../domain/ranking'
import { summarizeScores } from '../domain/scoring'
import { useActiveCamp } from '../hooks/useActiveCamp'
import { supabase } from '../lib/supabase'

export default function Export() {
  const [loading, setLoading] = useState(false)
  const [loadingScope, setLoadingScope] = useState(true)
  const [scopeError, setScopeError] = useState('')
  const [camps, setCamps] = useState([])
  const [slugCamp, setSlugCamp] = useState(null)
  const [selectedCampId, setSelectedCampId] = useState('')
  const { campSlug = '' } = useParams()
  const { activeCampId } = useActiveCamp()
  const isSlugExport = Boolean(campSlug)

  const selectedCamp = useMemo(() => {
    if (isSlugExport) return slugCamp
    return camps.find((camp) => camp.id === selectedCampId) || null
  }, [camps, isSlugExport, selectedCampId, slugCamp])

  useEffect(() => {
    let shouldIgnore = false

    async function loadExportScope() {
      setLoadingScope(true)
      setScopeError('')

      if (isSlugExport) {
        const { data, error } = await supabase
          .from('camps')
          .select('id, name, church_name, theme, status, slug, start_date, end_date')
          .eq('slug', campSlug)
          .maybeSingle()

        if (shouldIgnore) return

        if (error || !data) {
          if (error) console.error(error)
          setSlugCamp(null)
          setSelectedCampId('')
          setScopeError('Não foi possível carregar o acampamento desta URL.')
          setLoadingScope(false)
          return
        }

        setSlugCamp(data)
        setSelectedCampId(data.id)
        setLoadingScope(false)
        return
      }

      const { data, error } = await supabase
        .from('camps')
        .select('id, name, church_name, theme, status, slug, start_date, end_date')
        .order('name', { ascending: true })

      if (shouldIgnore) return

      if (error) {
        console.error(error)
        setCamps([])
        setSelectedCampId('')
        setScopeError('Não foi possível carregar os acampamentos disponíveis.')
        setLoadingScope(false)
        return
      }

      const availableCamps = data || []
      setCamps(availableCamps)

      if (activeCampId && availableCamps.some((camp) => camp.id === activeCampId)) {
        setSelectedCampId(activeCampId)
      } else {
        setSelectedCampId('')
      }

      setLoadingScope(false)
    }

    void loadExportScope()

    return () => {
      shouldIgnore = true
    }
  }, [activeCampId, campSlug, isSlugExport])

  function formatDate(date) {
    if (!date) return ''
    return new Date(date).toLocaleString('pt-BR')
  }

  function formatCampDate(date) {
    if (!date) return '-'
    return new Date(`${date}T00:00:00`).toLocaleDateString('pt-BR')
  }

  function getExportFileName(camp) {
    const campSlugOrId = camp?.slug || camp?.id || 'acampamento'
    return `acampgestor-backup-${campSlugOrId}-${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`
  }

  function getLegacyGymkhanaTeamName(team, settings, tribes = []) {
    const tribe = tribes.find((item) => item.id === team)

    if (tribe) return tribe.name
    if (team === 'A') return settings.team_a_name || 'Equipe A'
    if (team === 'B') return settings.team_b_name || 'Equipe B'
    return 'Sem time/equipe'
  }

  function getCompetitionTeamStatusLabel(status) {
    if (status === 'active') return 'Ativo'
    if (status === 'inactive') return 'Inativo'
    return status || ''
  }

  function getScoreDestination(eventItem) {
    if (eventItem.competition_team_id || eventItem.competition_teams) {
      return {
        type: 'Time',
        label: eventItem.competition_teams?.name || 'Time não encontrado',
        competitionTeamId: eventItem.competition_team_id || '',
        tribeId: eventItem.tribe_id || '',
        tribeLabel: eventItem.tribes?.name || '',
      }
    }

    if (eventItem.tribe_id || eventItem.tribes) {
      return {
        type: 'Equipe/Quarto',
        label: eventItem.tribes?.name || 'Equipe/Quarto não encontrada',
        competitionTeamId: '',
        tribeId: eventItem.tribe_id || '',
        tribeLabel: eventItem.tribes?.name || '',
      }
    }

    return {
      type: 'Sem destino',
      label: 'Sem destino',
      competitionTeamId: '',
      tribeId: '',
      tribeLabel: '',
    }
  }

  function getScoreParticipantLabel(eventItem) {
    if (eventItem.participants?.full_name) return eventItem.participants.full_name
    if (eventItem.competition_team_id) return 'Time inteiro'
    if (eventItem.tribe_id) return 'Equipe/Quarto inteiro'
    return 'Sem participante'
  }

  function getGymkhanaWinner(eventItem, competitionTeams, tribes, settings) {
    if (eventItem.winning_competition_team_id) {
      const team = competitionTeams.find(
        (item) => item.id === eventItem.winning_competition_team_id
      )

      return {
        type: 'Time',
        label: team?.name || 'Time não encontrado',
        competitionTeamId: eventItem.winning_competition_team_id,
        legacyValue: eventItem.winning_team || '',
      }
    }

    if (eventItem.winning_team === 'A' || eventItem.winning_team === 'B') {
      return {
        type: 'Legado A/B',
        label: getLegacyGymkhanaTeamName(eventItem.winning_team, settings, tribes),
        competitionTeamId: '',
        legacyValue: eventItem.winning_team,
      }
    }

    const legacyTribe = tribes.find((tribe) => tribe.id === eventItem.winning_team)

    return {
      type: legacyTribe ? 'Equipe/Quarto legado' : 'Legado não encontrado',
      label: legacyTribe?.name || eventItem.winning_team || 'Sem vencedor',
      competitionTeamId: '',
      legacyValue: eventItem.winning_team || '',
    }
  }

  function getGymkhanaWinnerParticipantsCount(eventItem, participants) {
    if (eventItem.winning_competition_team_id) {
      return participants.filter(
        (participant) =>
          participant.is_active &&
          participant.competition_team_id === eventItem.winning_competition_team_id
      ).length
    }

    if (eventItem.winning_team === 'A' || eventItem.winning_team === 'B') {
      return participants.filter(
        (participant) =>
          participant.is_active &&
          participant.gymkhana_team === eventItem.winning_team
      ).length
    }

    return participants.filter(
      (participant) =>
        participant.is_active && participant.tribe_id === eventItem.winning_team
    ).length
  }

  function getGymkhanaDistributedPoints(eventItem, participants) {
    const points = Number(eventItem.points_per_member || 0)

    if (eventItem.winning_competition_team_id) return points

    if (eventItem.winning_team === 'A' || eventItem.winning_team === 'B') {
      return getGymkhanaWinnerParticipantsCount(eventItem, participants) * points
    }

    return points
  }

  function styleWorksheet(worksheet) {
    worksheet.views = [{ state: 'frozen', ySplit: 1 }]

    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        }

        cell.alignment = {
          vertical: 'middle',
          horizontal: rowNumber === 1 ? 'center' : 'left',
          wrapText: true,
        }

        if (rowNumber === 1) {
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF111827' },
          }
        }
      })
    })

    worksheet.columns.forEach((column) => {
      let maxLength = 12

      column.eachCell({ includeEmpty: true }, (cell) => {
        const value = cell.value ? String(cell.value) : ''
        maxLength = Math.max(maxLength, value.length)
      })

      column.width = Math.min(maxLength + 4, 45)
    })

    worksheet.autoFilter = {
      from: 'A1',
      to: worksheet.getRow(1).getCell(worksheet.columnCount).address,
    }
  }

  function addSheet(workbook, name, columns, rows) {
    const worksheet = workbook.addWorksheet(name)

    worksheet.columns = columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width || 20,
    }))

    rows.forEach((row) => worksheet.addRow(row))

    styleWorksheet(worksheet)

    return worksheet
  }

  async function handleExport() {
    if (!selectedCamp?.id) {
      alert('Selecione um acampamento para exportar.')
      return
    }

    setLoading(true)

    try {
      const exportCampId = selectedCamp.id
      const { data: tribesData, error: tribesError } = await supabase
        .from('tribes')
        .select('*')
        .eq('camp_id', exportCampId)
        .order('name')

      const { data: competitionTeamsData, error: competitionTeamsError } =
        await supabase
          .from('competition_teams')
          .select('*')
          .eq('camp_id', exportCampId)
          .order('status', { ascending: true })
          .order('name', { ascending: true })

      const { data: participantsData, error: participantsError } =
        await supabase
          .from('participants')
          .select(
            `
          *,
          tribes (
            name,
            symbol,
            color
          ),
          competition_teams (
            name,
            symbol,
            color,
            status
          )
        `
          )
          .eq('camp_id', exportCampId)
          .order('full_name')

      const { data: eventsData, error: eventsError } = await supabase
        .from('score_events')
        .select(
          `
          *,
          tribes (
            name,
            symbol,
            color
          ),
          competition_teams (
            name,
            symbol,
            color,
            status
          ),
          participants (
            full_name
          )
        `
        )
        .eq('camp_id', exportCampId)
        .order('created_at', { ascending: false })

      const { data: gymkhanaData, error: gymkhanaError } = await supabase
        .from('gymkhana_events')
        .select('*')
        .eq('camp_id', exportCampId)
        .order('created_at', { ascending: false })

      const { data: inspectionsData, error: inspectionsError } = await supabase
        .from('room_inspections')
        .select(
          `
          *,
          tribes (
            name,
            symbol,
            color,
            room_name,
            room_type
          )
        `
        )
        .eq('camp_id', exportCampId)
        .order('created_at', { ascending: false })

      const { data: settingsRows, error: settingsError } = await supabase
        .from('gymkhana_settings')
        .select('*')
        .eq('camp_id', exportCampId)
        .limit(1)

      if (
        tribesError ||
        competitionTeamsError ||
        participantsError ||
        eventsError ||
        gymkhanaError ||
        inspectionsError ||
        settingsError
      ) {
        throw (
          tribesError ||
          competitionTeamsError ||
          participantsError ||
          eventsError ||
          gymkhanaError ||
          inspectionsError ||
          settingsError
        )
      }

      const tribes = tribesData || []
      const competitionTeams = competitionTeamsData || []
      const participants = participantsData || []
      const events = eventsData || []
      const gymkhanaEvents = gymkhanaData || []
      const inspections = inspectionsData || []
      const settingsData = settingsRows?.[0]

      const settings = {
        team_a_name: settingsData?.team_a_name || 'Equipe A',
        team_b_name: settingsData?.team_b_name || 'Equipe B',
      }

      const competitiveEvents = events.filter(
        (eventItem) => eventItem.competition_team_id
      )

      const ranking = calculateRanking(
        competitionTeams,
        competitiveEvents,
        participants,
        {
          includeInactive: true,
          scoreTeamIdField: 'competition_team_id',
          participantTeamIdField: 'competition_team_id',
        }
      )

      const activeRanking = ranking.filter((team) => team.isActive)

      const activeCompetitionTeams = competitionTeams.filter(
        (team) => team.status === 'active'
      )

      const inactiveCompetitionTeams = competitionTeams.filter(
        (team) => team.status === 'inactive'
      )

      const positiveEvents = events.filter(
        (eventItem) => Number(eventItem.points || 0) > 0
      )

      const penaltyEvents = events.filter(
        (eventItem) => Number(eventItem.points || 0) < 0
      )

      const competitivePositiveEvents = competitiveEvents.filter(
        (eventItem) => Number(eventItem.points || 0) > 0
      )

      const competitivePenaltyEvents = competitiveEvents.filter(
        (eventItem) => Number(eventItem.points || 0) < 0
      )

      const {
        positivePoints: totalPositivePoints,
        penaltyPoints: totalPenaltyPoints,
        total: totalBalance,
      } = summarizeScores(competitiveEvents)

      const leader = activeRanking[0]

      const legacyGymkhanaParticipants = participants.filter(
        (participant) => participant.gymkhana_team
      )

      const workbook = new ExcelJS.Workbook()
      workbook.creator = 'AcampGestor'
      workbook.created = new Date()

      addSheet(
        workbook,
        'Resumo Geral',
        [
          { header: 'Métrica', key: 'metric' },
          { header: 'Valor', key: 'value' },
        ],
        [
          { metric: 'Acampamento', value: selectedCamp.name || '-' },
          {
            metric: 'Igreja/organização',
            value: selectedCamp.church_name || '-',
          },
          { metric: 'Tema', value: selectedCamp.theme || '-' },
          { metric: 'Status do acampamento', value: selectedCamp.status || '-' },
          { metric: 'Slug público', value: selectedCamp.slug || '-' },
          {
            metric: 'Data de início',
            value: formatCampDate(selectedCamp.start_date),
          },
          {
            metric: 'Data de fim',
            value: formatCampDate(selectedCamp.end_date),
          },
          { metric: 'Data da exportação', value: formatDate(new Date()) },
          { metric: 'Times cadastrados', value: competitionTeams.length },
          { metric: 'Times ativos', value: activeCompetitionTeams.length },
          { metric: 'Times inativos', value: inactiveCompetitionTeams.length },
          { metric: 'Equipes/Quartos cadastrados', value: tribes.length },
          {
            metric: 'Participantes cadastrados',
            value: participants.length,
          },
          {
            metric: 'Participantes ativos',
            value: participants.filter((participant) => participant.is_active)
              .length,
          },
          {
            metric: 'Lançamentos competitivos',
            value: competitiveEvents.length,
          },
          {
            metric: 'Lançamentos positivos competitivos',
            value: competitivePositiveEvents.length,
          },
          {
            metric: 'Penalidades competitivas',
            value: competitivePenaltyEvents.length,
          },
          { metric: 'Pontos positivos competitivos', value: totalPositivePoints },
          { metric: 'Pontos perdidos competitivos', value: totalPenaltyPoints },
          { metric: 'Saldo competitivo geral', value: totalBalance },
          { metric: 'Time líder atual', value: leader?.name || '-' },
          {
            metric: 'Saldo do Time líder',
            value: leader ? leader.total : '-',
          },
          {
            metric: 'Lançamentos totais no histórico',
            value: events.length,
          },
          {
            metric: 'Participantes com gincana legada A/B',
            value: legacyGymkhanaParticipants.length,
          },
          {
            metric: 'Gincanas cadastradas',
            value: gymkhanaEvents.length,
          },
          {
            metric: 'Inspeções realizadas',
            value: inspections.length,
          },
        ]
      )

      addSheet(
        workbook,
        'Ranking Atual',
        [
          { header: 'Posição', key: 'position' },
          { header: 'ID do Time', key: 'id' },
          { header: 'Time', key: 'name' },
          { header: 'Símbolo', key: 'symbol' },
          { header: 'Cor', key: 'color' },
          { header: 'Líder/Responsável', key: 'leader_name' },
          { header: 'Participantes ativos', key: 'participantsCount' },
          { header: 'Pontos positivos', key: 'positivePoints' },
          { header: 'Penalidades', key: 'penaltyPoints' },
          { header: 'Saldo total', key: 'total' },
          { header: 'Lançamentos', key: 'eventsCount' },
          { header: 'Participa do ranking?', key: 'isActive' },
          { header: 'Status cadastral', key: 'status' },
          { header: 'Criado em', key: 'created_at' },
        ],
        ranking.map((team, index) => ({
          position: index + 1,
          id: team.id,
          name: team.name,
          symbol: team.symbol,
          color: team.color,
          leader_name: team.leader_name || '',
          participantsCount: team.participantsCount,
          positivePoints: team.positivePoints,
          penaltyPoints: team.penaltyPoints,
          total: team.total,
          eventsCount: team.eventsCount,
          isActive: team.isActive ? 'Sim' : 'Não',
          status: getCompetitionTeamStatusLabel(team.status),
          created_at: formatDate(team.created_at),
        }))
      )

      addSheet(
        workbook,
        'Times',
        [
          { header: 'ID', key: 'id' },
          { header: 'Nome', key: 'name' },
          { header: 'Símbolo', key: 'symbol' },
          { header: 'Cor', key: 'color' },
          { header: 'Líder/Responsável', key: 'leader_name' },
          { header: 'Status cadastral', key: 'status' },
          { header: 'Participantes', key: 'participantsCount' },
          { header: 'Participantes ativos', key: 'activeParticipantsCount' },
          { header: 'Criado em', key: 'created_at' },
        ],
        competitionTeams.map((team) => {
          const teamParticipants = participants.filter(
            (participant) => participant.competition_team_id === team.id
          )

          return {
            id: team.id,
            name: team.name,
            symbol: team.symbol,
            color: team.color,
            leader_name: team.leader_name || '',
            status: getCompetitionTeamStatusLabel(team.status),
            participantsCount: teamParticipants.length,
            activeParticipantsCount: teamParticipants.filter(
              (participant) => participant.is_active
            ).length,
            created_at: formatDate(team.created_at),
          }
        })
      )

      addSheet(
        workbook,
        'Equipes-Quartos',
        [
          { header: 'ID', key: 'id' },
          { header: 'Nome', key: 'name' },
          { header: 'Símbolo', key: 'symbol' },
          { header: 'Cor', key: 'color' },
          { header: 'Tipo de quarto', key: 'room_type' },
          { header: 'Quarto', key: 'room_name' },
          { header: 'Responsável', key: 'leader_name' },
          { header: 'Participantes', key: 'participantsCount' },
          { header: 'Participantes ativos', key: 'activeParticipantsCount' },
          { header: 'Criada em', key: 'created_at' },
        ],
        tribes.map((tribe) => {
          const tribeParticipants = participants.filter(
            (participant) => participant.tribe_id === tribe.id
          )

          return {
            id: tribe.id,
            name: tribe.name,
            symbol: tribe.symbol,
            color: tribe.color,
            room_type: tribe.room_type || '',
            room_name: tribe.room_name || '',
            leader_name: tribe.leader_name || '',
            participantsCount: tribeParticipants.length,
            activeParticipantsCount: tribeParticipants.filter(
              (participant) => participant.is_active
            ).length,
            created_at: formatDate(tribe.created_at),
          }
        })
      )

      addSheet(
        workbook,
        'Participantes',
        [
          { header: 'ID', key: 'id' },
          { header: 'Nome', key: 'full_name' },
          { header: 'Data de nascimento', key: 'birth_date' },
          { header: 'Idade', key: 'age' },
          { header: 'Igreja', key: 'church' },
          { header: 'CPF', key: 'cpf' },
          { header: 'Endereço completo', key: 'address' },
          { header: 'Tamanho da camiseta', key: 'shirt_size' },
          { header: 'Sexo', key: 'gender' },
          { header: 'Grupo', key: 'group_type' },
          { header: 'Equipe da gincana legada', key: 'gymkhana_team' },
          { header: 'Telefone', key: 'phone' },
          { header: 'Telefone responsável', key: 'guardian_phone' },
          { header: 'ID da Equipe/Quarto', key: 'tribe_id' },
          { header: 'Equipe/Quarto', key: 'tribe_name' },
          { header: 'ID do Time', key: 'competition_team_id' },
          { header: 'Time', key: 'competition_team_name' },
          { header: 'Status do Time', key: 'competition_team_status' },
          { header: 'Diretoria', key: 'is_board_member' },
          { header: 'Status', key: 'is_active' },
          { header: 'Restrição alimentar', key: 'food_restriction' },
          { header: 'Observações', key: 'notes' },
          { header: 'Criado em', key: 'created_at' },
        ],
        participants.map((participant) => ({
          id: participant.id,
          full_name: participant.full_name,
          birth_date: participant.birth_date
            ? new Date(participant.birth_date).toLocaleDateString('pt-BR')
            : '',
          age: participant.age || '',
          church: participant.church || '',
          cpf: participant.cpf || '',
          address: participant.address || '',
          shirt_size: participant.shirt_size || '',
          gender: participant.gender || '',
          group_type: participant.group_type || '',
          gymkhana_team: getLegacyGymkhanaTeamName(
            participant.gymkhana_team,
            settings,
            tribes
          ),
          phone: participant.phone || '',
          guardian_phone: participant.guardian_phone || '',
          tribe_id: participant.tribe_id || '',
          tribe_name: participant.tribes?.name || '',
          competition_team_id: participant.competition_team_id || '',
          competition_team_name: participant.competition_teams?.name || '',
          competition_team_status: getCompetitionTeamStatusLabel(
            participant.competition_teams?.status
          ),
          is_board_member: participant.is_board_member ? 'Sim' : 'Não',
          is_active: participant.is_active ? 'Ativo' : 'Inativo',
          food_restriction: participant.food_restriction || '',
          notes: participant.notes || '',
          created_at: formatDate(participant.created_at),
        }))
      )

      addSheet(
        workbook,
        'Histórico Completo',
        [
          { header: 'ID', key: 'id' },
          { header: 'Data', key: 'created_at' },
          { header: 'Tipo do destino', key: 'destination_type' },
          { header: 'Destino', key: 'destination_name' },
          { header: 'ID do Time', key: 'competition_team_id' },
          { header: 'Time', key: 'competition_team_name' },
          { header: 'ID da Equipe/Quarto', key: 'tribe_id' },
          { header: 'Equipe/Quarto', key: 'tribe_name' },
          { header: 'ID do participante', key: 'participant_id' },
          { header: 'Participante', key: 'participant_name' },
          { header: 'Tipo', key: 'type' },
          { header: 'Categoria', key: 'category' },
          { header: 'Pontos', key: 'points' },
          { header: 'Motivo', key: 'reason' },
          { header: 'Observações', key: 'notes' },
          { header: 'ID da gincana', key: 'gymkhana_event_id' },
        ],
        events.map((eventItem) => {
          const destination = getScoreDestination(eventItem)

          return {
            id: eventItem.id,
            created_at: formatDate(eventItem.created_at),
            destination_type: destination.type,
            destination_name: destination.label,
            competition_team_id: destination.competitionTeamId,
            competition_team_name:
              eventItem.competition_teams?.name ||
              (destination.type === 'Time' ? destination.label : ''),
            tribe_id: destination.tribeId,
            tribe_name: destination.tribeLabel,
            participant_id: eventItem.participant_id || '',
            participant_name: getScoreParticipantLabel(eventItem),
            type: Number(eventItem.points || 0) < 0 ? 'Penalidade' : 'Ponto',
            category: eventItem.category || '',
            points: eventItem.points,
            reason: eventItem.reason || '',
            notes: eventItem.notes || '',
            gymkhana_event_id: eventItem.gymkhana_event_id || '',
          }
        })
      )

      addSheet(
        workbook,
        'Pontos Positivos',
        [
          { header: 'Data', key: 'created_at' },
          { header: 'Tipo do destino', key: 'destination_type' },
          { header: 'Destino', key: 'destination_name' },
          { header: 'Participante', key: 'participant_name' },
          { header: 'Categoria', key: 'category' },
          { header: 'Pontos', key: 'points' },
          { header: 'Motivo', key: 'reason' },
          { header: 'Observações', key: 'notes' },
        ],
        positiveEvents.map((eventItem) => {
          const destination = getScoreDestination(eventItem)

          return {
            created_at: formatDate(eventItem.created_at),
            destination_type: destination.type,
            destination_name: destination.label,
            participant_name: getScoreParticipantLabel(eventItem),
            category: eventItem.category || '',
            points: eventItem.points,
            reason: eventItem.reason || '',
            notes: eventItem.notes || '',
          }
        })
      )

      addSheet(
        workbook,
        'Penalidades',
        [
          { header: 'Data', key: 'created_at' },
          { header: 'Tipo do destino', key: 'destination_type' },
          { header: 'Destino', key: 'destination_name' },
          { header: 'Participante', key: 'participant_name' },
          { header: 'Categoria', key: 'category' },
          { header: 'Pontos', key: 'points' },
          { header: 'Motivo', key: 'reason' },
          { header: 'Observações', key: 'notes' },
        ],
        penaltyEvents.map((eventItem) => {
          const destination = getScoreDestination(eventItem)

          return {
            created_at: formatDate(eventItem.created_at),
            destination_type: destination.type,
            destination_name: destination.label,
            participant_name: getScoreParticipantLabel(eventItem),
            category: eventItem.category || '',
            points: eventItem.points,
            reason: eventItem.reason || '',
            notes: eventItem.notes || '',
          }
        })
      )

      addSheet(
        workbook,
        'Gincana',
        [
          { header: 'ID', key: 'id' },
          { header: 'Data', key: 'created_at' },
          { header: 'Prova', key: 'title' },
          { header: 'Tipo do vencedor', key: 'winner_type' },
          { header: 'Time vencedor', key: 'winner_name' },
          { header: 'ID do Time vencedor', key: 'competition_team_id' },
          { header: 'Vencedor legado', key: 'legacy_winning_team' },
          { header: 'Pontos do resultado', key: 'points_per_member' },
          { header: 'Participantes ativos do vencedor', key: 'members_count' },
          { header: 'Total distribuído', key: 'total_distributed' },
          { header: 'Observações', key: 'notes' },
        ],
        gymkhanaEvents.map((eventItem) => {
          const winner = getGymkhanaWinner(
            eventItem,
            competitionTeams,
            tribes,
            settings
          )
          const membersCount = getGymkhanaWinnerParticipantsCount(
            eventItem,
            participants
          )

          return {
            id: eventItem.id,
            created_at: formatDate(eventItem.created_at),
            title: eventItem.title,
            winner_type: winner.type,
            winner_name: winner.label,
            competition_team_id: winner.competitionTeamId,
            legacy_winning_team: winner.legacyValue,
            points_per_member: eventItem.points_per_member,
            members_count: membersCount,
            total_distributed: getGymkhanaDistributedPoints(
              eventItem,
              participants
            ),
            notes: eventItem.notes || '',
          }
        })
      )

      addSheet(
        workbook,
        'Inspeções',
        [
          { header: 'ID', key: 'id' },
          { header: 'Data', key: 'created_at' },
          { header: 'Equipe/Quarto', key: 'tribe_name' },
          { header: 'Tipo de quarto', key: 'room_type' },
          { header: 'Quarto', key: 'room_name' },
          { header: 'Dia', key: 'inspection_day' },
          { header: 'Período', key: 'inspection_period' },
          { header: 'Tipo', key: 'type' },
          { header: 'Pontos', key: 'points' },
          { header: 'Possui foto', key: 'has_photo' },
          { header: 'Observações', key: 'notes' },
        ],
        inspections.map((inspection) => ({
          id: inspection.id,
          created_at: formatDate(inspection.created_at),
          tribe_name: inspection.tribes?.name || '',
          room_type: inspection.tribes?.room_type || '',
          room_name: inspection.tribes?.room_name || '',
          inspection_day: inspection.inspection_day || '',
          inspection_period: inspection.inspection_period || '',
          type: inspection.type === 'POINT' ? 'Pontuação' : 'Penalidade',
          points: inspection.points || 0,
          has_photo: inspection.has_photo ? 'Sim' : 'Não',
          notes: inspection.notes || '',
        }))
      )

      addSheet(
        workbook,
        'Estatísticas por Time',
        [
          { header: 'Time', key: 'name' },
          { header: 'Líder/Responsável', key: 'leader_name' },
          { header: 'Participantes ativos', key: 'participantsCount' },
          { header: 'Pontos positivos', key: 'positivePoints' },
          { header: 'Penalidades', key: 'penaltyPoints' },
          { header: 'Saldo total', key: 'total' },
          { header: 'Lançamentos', key: 'eventsCount' },
          { header: 'Participa do ranking?', key: 'isActive' },
          { header: 'Status cadastral', key: 'status' },
        ],
        ranking.map((team) => ({
          name: team.name,
          leader_name: team.leader_name || '',
          participantsCount: team.participantsCount,
          positivePoints: team.positivePoints,
          penaltyPoints: team.penaltyPoints,
          total: team.total,
          eventsCount: team.eventsCount,
          isActive: team.isActive ? 'Sim' : 'Não',
          status: getCompetitionTeamStatusLabel(team.status),
        }))
      )

      const buffer = await workbook.xlsx.writeBuffer()

      saveAs(new Blob([buffer]), getExportFileName(selectedCamp))
    } catch (error) {
      console.error(error)
      alert(`Erro ao exportar relatório: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section>
      <PageHeader
        eyebrow="Exportação"
        title="Exportação por acampamento"
        description="Exporte os dados operacionais de um acampamento específico em uma planilha organizada."
      />

      {scopeError && (
        <p
          role="alert"
          className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {scopeError}
        </p>
      )}

      {isSlugExport ? (
        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-yellow-500">
            Escopo da exportação
          </p>

          <h2 className="mt-3 text-xl font-bold">
            {selectedCamp
              ? `Exportação do acampamento: ${selectedCamp.name}`
              : 'Carregando acampamento...'}
          </h2>

          <p className="mt-2 text-sm text-zinc-400">
            A exportação por slug usa somente os dados do acampamento acessado
            pela URL atual.
          </p>
        </div>
      ) : (
        <div className="mb-6 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-yellow-500">
            Escopo da exportação
          </p>

          <h2 className="mt-3 text-xl font-bold">
            {selectedCamp
              ? `Acampamento selecionado para exportação: ${selectedCamp.name}`
              : 'Selecione um acampamento para exportar.'}
          </h2>

          <p className="mt-2 text-sm text-zinc-400">
            A exportação inclui ranking dos Times, Times, Equipes/Quartos,
            participantes, pontuações, histórico, gincana e inspeções apenas do
            acampamento escolhido.
          </p>

          <select
            value={selectedCampId}
            onChange={(event) => setSelectedCampId(event.target.value)}
            disabled={loadingScope}
            className="mt-5 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Escolher acampamento</option>
            {camps.map((camp) => (
              <option key={camp.id} value={camp.id}>
                {camp.name}
              </option>
            ))}
          </select>

          {!loadingScope && camps.length === 0 && (
            <p className="mt-3 text-sm text-zinc-500">
              Nenhum acampamento disponível para exportação.
            </p>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-xl font-bold">Relatório completo em Excel</h2>

        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400">
          O arquivo inclui dados do acampamento, resumo geral, ranking dos
          Times, Times, Equipes/Quartos, participantes, histórico completo,
          pontos positivos, penalidades, gincana, inspeções de quartos e
          estatísticas por Time.
        </p>

        <button
          type="button"
          onClick={handleExport}
          disabled={loading || loadingScope || !selectedCamp?.id}
          className="mt-6 rounded-xl bg-yellow-500 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? 'Exportando...'
            : isSlugExport
              ? 'Exportar este acampamento'
              : 'Exportar acampamento selecionado'}
        </button>
      </div>
    </section>
  )
}
