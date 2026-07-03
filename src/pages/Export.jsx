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

  function getTeamName(team, settings, tribes = []) {
    const tribe = tribes.find((item) => item.id === team)

    if (tribe) return tribe.name
    if (team === 'A') return settings.team_a_name || 'Equipe A'
    if (team === 'B') return settings.team_b_name || 'Equipe B'
    return 'Sem equipe'
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
        participantsError ||
        eventsError ||
        gymkhanaError ||
        inspectionsError ||
        settingsError
      ) {
        throw (
          tribesError ||
          participantsError ||
          eventsError ||
          gymkhanaError ||
          inspectionsError ||
          settingsError
        )
      }

      const tribes = tribesData || []
      const participants = participantsData || []
      const events = eventsData || []
      const gymkhanaEvents = gymkhanaData || []
      const inspections = inspectionsData || []
      const settingsData = settingsRows?.[0]

      const settings = {
        team_a_name: settingsData?.team_a_name || 'Equipe A',
        team_b_name: settingsData?.team_b_name || 'Equipe B',
      }

      const ranking = calculateRanking(tribes, events, participants, {
        includeInactive: true,
      })

      const activeRanking = ranking.filter((tribe) => tribe.isActive)

      const positiveEvents = events.filter(
        (eventItem) => Number(eventItem.points || 0) > 0
      )

      const penaltyEvents = events.filter(
        (eventItem) => Number(eventItem.points || 0) < 0
      )

      const teamAParticipants = participants.filter(
        (participant) => participant.gymkhana_team === 'A'
      )

      const teamBParticipants = participants.filter(
        (participant) => participant.gymkhana_team === 'B'
      )

      const {
        positivePoints: totalPositivePoints,
        penaltyPoints: totalPenaltyPoints,
        total: totalBalance,
      } = summarizeScores(events)

      const leader = activeRanking[0]

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
          { metric: 'Equipes cadastradas', value: tribes.length },
          { metric: 'Equipes ativas', value: activeRanking.length },
          {
            metric: 'Equipes inativas',
            value: tribes.length - activeRanking.length,
          },
          {
            metric: 'Participantes cadastrados',
            value: participants.length,
          },
          {
            metric: 'Participantes ativos',
            value: participants.filter((participant) => participant.is_active)
              .length,
          },
          { metric: 'Total de lançamentos', value: events.length },
          { metric: 'Lançamentos positivos', value: positiveEvents.length },
          { metric: 'Penalidades', value: penaltyEvents.length },
          { metric: 'Pontos positivos', value: totalPositivePoints },
          { metric: 'Pontos perdidos', value: totalPenaltyPoints },
          { metric: 'Saldo geral de pontos', value: totalBalance },
          { metric: 'Equipe líder atual', value: leader?.name || '-' },
          {
            metric: 'Saldo da equipe líder',
            value: leader ? leader.total : '-',
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
          { header: 'ID', key: 'id' },
          { header: 'Equipe', key: 'name' },
          { header: 'Símbolo', key: 'symbol' },
          { header: 'Cor', key: 'color' },
          { header: 'Tipo de quarto', key: 'room_type' },
          { header: 'Quarto', key: 'room_name' },
          { header: 'Responsável', key: 'leader_name' },
          { header: 'Participantes ativos', key: 'participantsCount' },
          { header: 'Pontos positivos', key: 'positivePoints' },
          { header: 'Penalidades', key: 'penaltyPoints' },
          { header: 'Saldo total', key: 'total' },
          { header: 'Lançamentos', key: 'eventsCount' },
          { header: 'Status', key: 'status' },
          { header: 'Criada em', key: 'created_at' },
        ],
        ranking.map((tribe, index) => ({
          position: index + 1,
          id: tribe.id,
          name: tribe.name,
          symbol: tribe.symbol,
          color: tribe.color,
          room_type: tribe.room_type || '',
          room_name: tribe.room_name || '',
          leader_name: tribe.leader_name || '',
          participantsCount: tribe.participantsCount,
          positivePoints: tribe.positivePoints,
          penaltyPoints: tribe.penaltyPoints,
          total: tribe.total,
          eventsCount: tribe.eventsCount,
          status: tribe.isActive ? 'Ativa' : 'Inativa',
          created_at: formatDate(tribe.created_at),
        }))
      )

      addSheet(
        workbook,
        'Equipes',
        [
          { header: 'ID', key: 'id' },
          { header: 'Nome', key: 'name' },
          { header: 'Símbolo', key: 'symbol' },
          { header: 'Cor', key: 'color' },
          { header: 'Tipo de quarto', key: 'room_type' },
          { header: 'Quarto', key: 'room_name' },
          { header: 'Responsável', key: 'leader_name' },
          { header: 'Participantes ativos', key: 'participantsCount' },
          { header: 'Status real', key: 'status' },
          { header: 'Criada em', key: 'created_at' },
        ],
        ranking.map((tribe) => ({
          id: tribe.id,
          name: tribe.name,
          symbol: tribe.symbol,
          color: tribe.color,
          room_type: tribe.room_type || '',
          room_name: tribe.room_name || '',
          leader_name: tribe.leader_name || '',
          participantsCount: tribe.participantsCount,
          status: tribe.isActive ? 'Ativa' : 'Inativa',
          created_at: formatDate(tribe.created_at),
        }))
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
          { header: 'ID da equipe', key: 'tribe_id' },
          { header: 'Equipe', key: 'tribe_name' },
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
          gymkhana_team: getTeamName(
            participant.gymkhana_team,
            settings,
            tribes
          ),
          phone: participant.phone || '',
          guardian_phone: participant.guardian_phone || '',
          tribe_id: participant.tribe_id || '',
          tribe_name: participant.tribes?.name || '',
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
          { header: 'ID da equipe', key: 'tribe_id' },
          { header: 'Equipe', key: 'tribe_name' },
          { header: 'ID do participante', key: 'participant_id' },
          { header: 'Participante', key: 'participant_name' },
          { header: 'Tipo', key: 'type' },
          { header: 'Categoria', key: 'category' },
          { header: 'Pontos', key: 'points' },
          { header: 'Motivo', key: 'reason' },
          { header: 'Observações', key: 'notes' },
          { header: 'ID da gincana', key: 'gymkhana_event_id' },
        ],
        events.map((eventItem) => ({
          id: eventItem.id,
          created_at: formatDate(eventItem.created_at),
          tribe_id: eventItem.tribe_id || '',
          tribe_name: eventItem.tribes?.name || '',
          participant_id: eventItem.participant_id || '',
          participant_name:
            eventItem.participants?.full_name || 'Equipe inteira',
          type: Number(eventItem.points || 0) < 0 ? 'Penalidade' : 'Ponto',
          category: eventItem.category || '',
          points: eventItem.points,
          reason: eventItem.reason || '',
          notes: eventItem.notes || '',
          gymkhana_event_id: eventItem.gymkhana_event_id || '',
        }))
      )

      addSheet(
        workbook,
        'Pontos Positivos',
        [
          { header: 'Data', key: 'created_at' },
          { header: 'Equipe', key: 'tribe_name' },
          { header: 'Participante', key: 'participant_name' },
          { header: 'Categoria', key: 'category' },
          { header: 'Pontos', key: 'points' },
          { header: 'Motivo', key: 'reason' },
          { header: 'Observações', key: 'notes' },
        ],
        positiveEvents.map((eventItem) => ({
          created_at: formatDate(eventItem.created_at),
          tribe_name: eventItem.tribes?.name || '',
          participant_name:
            eventItem.participants?.full_name || 'Equipe inteira',
          category: eventItem.category || '',
          points: eventItem.points,
          reason: eventItem.reason || '',
          notes: eventItem.notes || '',
        }))
      )

      addSheet(
        workbook,
        'Penalidades',
        [
          { header: 'Data', key: 'created_at' },
          { header: 'Equipe', key: 'tribe_name' },
          { header: 'Participante', key: 'participant_name' },
          { header: 'Categoria', key: 'category' },
          { header: 'Pontos', key: 'points' },
          { header: 'Motivo', key: 'reason' },
          { header: 'Observações', key: 'notes' },
        ],
        penaltyEvents.map((eventItem) => ({
          created_at: formatDate(eventItem.created_at),
          tribe_name: eventItem.tribes?.name || '',
          participant_name:
            eventItem.participants?.full_name || 'Equipe inteira',
          category: eventItem.category || '',
          points: eventItem.points,
          reason: eventItem.reason || '',
          notes: eventItem.notes || '',
        }))
      )

      addSheet(
        workbook,
        'Gincana',
        [
          { header: 'ID', key: 'id' },
          { header: 'Data', key: 'created_at' },
          { header: 'Prova', key: 'title' },
          { header: 'Equipe vencedora', key: 'winning_team' },
          { header: 'Pontos', key: 'points_per_member' },
          { header: 'Participantes ativos da equipe', key: 'members_count' },
          { header: 'Total distribuído', key: 'total_distributed' },
          { header: 'Observações', key: 'notes' },
        ],
        gymkhanaEvents.map((eventItem) => {
          const legacyMembersCount =
            eventItem.winning_team === 'A'
              ? teamAParticipants.filter((participant) => participant.is_active)
                  .length
              : teamBParticipants.filter((participant) => participant.is_active)
                  .length
          const realTeamMembersCount = participants.filter(
            (participant) =>
              participant.is_active &&
              participant.tribe_id === eventItem.winning_team
          ).length
          const membersCount =
            eventItem.winning_team === 'A' || eventItem.winning_team === 'B'
              ? legacyMembersCount
              : realTeamMembersCount

          return {
            id: eventItem.id,
            created_at: formatDate(eventItem.created_at),
            title: eventItem.title,
            winning_team: getTeamName(eventItem.winning_team, settings, tribes),
            points_per_member: eventItem.points_per_member,
            members_count: membersCount,
            total_distributed:
              eventItem.winning_team === 'A' || eventItem.winning_team === 'B'
                ? membersCount * Number(eventItem.points_per_member || 0)
                : Number(eventItem.points_per_member || 0),
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
          { header: 'Equipe', key: 'tribe_name' },
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
        'Estatísticas por Equipe',
        [
          { header: 'Equipe', key: 'name' },
          { header: 'Tipo de quarto', key: 'room_type' },
          { header: 'Quarto', key: 'room_name' },
          { header: 'Responsável', key: 'leader_name' },
          { header: 'Participantes ativos', key: 'participantsCount' },
          { header: 'Pontos positivos', key: 'positivePoints' },
          { header: 'Penalidades', key: 'penaltyPoints' },
          { header: 'Saldo total', key: 'total' },
          { header: 'Lançamentos', key: 'eventsCount' },
          { header: 'Status', key: 'status' },
        ],
        ranking.map((tribe) => ({
          name: tribe.name,
          room_type: tribe.room_type || '',
          room_name: tribe.room_name || '',
          leader_name: tribe.leader_name || '',
          participantsCount: tribe.participantsCount,
          positivePoints: tribe.positivePoints,
          penaltyPoints: tribe.penaltyPoints,
          total: tribe.total,
          eventsCount: tribe.eventsCount,
          status: tribe.isActive ? 'Ativa' : 'Inativa',
        }))
      )

      addSheet(
        workbook,
        'Equipes da Gincana',
        [
          { header: 'Equipe', key: 'team' },
          { header: 'Integrantes', key: 'members' },
          { header: 'Participantes ativos', key: 'active_members' },
          { header: 'ID da equipe', key: 'team_id' },
        ],
        tribes.map((tribe) => {
          const teamMembers = participants.filter(
            (participant) => participant.tribe_id === tribe.id
          )

          return {
            team: tribe.name,
            members: teamMembers.length,
            active_members: teamMembers.filter(
              (participant) => participant.is_active
            ).length,
            team_id: tribe.id,
          }
        })
      )

      const buffer = await workbook.xlsx.writeBuffer()

      saveAs(
        new Blob([buffer]),
        getExportFileName(selectedCamp)
      )
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
            A exportação inclui ranking, equipes, participantes, pontuações,
            histórico, gincana e inspeções apenas do acampamento escolhido.
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
          O arquivo inclui dados do acampamento, resumo geral, ranking, equipes, participantes,
          histórico completo, pontos positivos, penalidades, gincana, inspeções
          de quartos, estatísticas por equipe e estatísticas das equipes da
          gincana.
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
