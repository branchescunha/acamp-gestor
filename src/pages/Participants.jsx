import { useEffect, useMemo, useState } from 'react'
import ActiveCampNotice from '../components/ActiveCampNotice'
import PageHeader from '../components/PageHeader'
import ResponsiveTable from '../components/ResponsiveTable'
import {
  buildParticipantPayload,
  filterParticipants,
  initialParticipantFilters,
  initialParticipantForm,
  validateParticipantForm,
} from '../features/participants/participantForm'
import { useActiveCamp } from '../hooks/useActiveCamp'
import { useConfirm } from '../hooks/useConfirm'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabase'
import { calculateAgeFromDateOnly } from '../utils/date'
import { logError } from '../utils/logger'

export default function Participants() {
  const [participants, setParticipants] = useState([])
  const [tribes, setTribes] = useState([])
  const [competitionTeams, setCompetitionTeams] = useState([])
  const [form, setForm] = useState(initialParticipantForm)
  const [filters, setFilters] = useState(initialParticipantFilters)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { activeCampId } = useActiveCamp()
  const requestConfirmation = useConfirm()
  const { showError } = useToast()

  useEffect(() => {
    let shouldIgnore = false

    async function loadData() {
      setLoading(true)

      const { data: participantsData, error: participantsError } =
        await supabase
          .from('participants')
          .select(
            `
            id,
            camp_id,
            full_name,
            age,
            birth_date,
            church,
            cpf,
            address,
            shirt_size,
            gender,
            group_type,
            phone,
            guardian_phone,
            food_restriction,
            notes,
            is_board_member,
            tribe_id,
            competition_team_id,
            is_active,
            tribes (
              name,
              color,
              symbol
            ),
            competition_teams (
              name,
              color,
              symbol,
              status
            )
          `
          )
          .eq('camp_id', activeCampId)
          .order('full_name')

      const { data: tribesData, error: tribesError } = await supabase
        .from('tribes')
        .select('id, camp_id, name, color, symbol, room_type, room_name')
        .eq('camp_id', activeCampId)
        .order('name')

      const { data: competitionTeamsData, error: competitionTeamsError } =
        await supabase
          .from('competition_teams')
          .select('id, camp_id, name, color, symbol, leader_name, status')
          .eq('camp_id', activeCampId)
          .order('status', { ascending: true })
          .order('name', { ascending: true })

      if (participantsError || tribesError || competitionTeamsError) {
        logError('Participants',
          participantsError || tribesError || competitionTeamsError
        )
        if (shouldIgnore) return
        setLoading(false)
        return
      }

      if (shouldIgnore) return

      setParticipants(participantsData || [])
      setTribes(tribesData || [])
      setCompetitionTeams(competitionTeamsData || [])
      setLoading(false)
    }

    if (activeCampId) {
      loadData()
      return () => {
        shouldIgnore = true
      }
    }

    const timeoutId = window.setTimeout(() => {
      setParticipants([])
      setTribes([])
      setCompetitionTeams([])
      setLoading(false)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [activeCampId])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setForm(initialParticipantForm)
      setFilters(initialParticipantFilters)
      setEditingId(null)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [activeCampId])

  async function reloadParticipants() {
    const { data, error } = await supabase
      .from('participants')
      .select(
        `
        id,
        camp_id,
        full_name,
        age,
        birth_date,
        church,
        cpf,
        address,
        shirt_size,
        gender,
        group_type,
        phone,
        guardian_phone,
        food_restriction,
        notes,
        is_board_member,
        tribe_id,
        competition_team_id,
        is_active,
        tribes (
          name,
          color,
          symbol
        ),
        competition_teams (
          name,
          color,
          symbol,
          status
        )
      `
      )
      .eq('camp_id', activeCampId)
      .order('full_name')

    if (error) {
      logError('Participants', error)
      return
    }

    setParticipants(data || [])
  }

  function handleChange(event) {
    const { name, value, type, checked } = event.target

    if (name === 'birth_date') {
      setForm((currentForm) => ({
        ...currentForm,
        birth_date: value,
        age: calculateAgeFromDateOnly(value),
      }))

      return
    }

    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleFilterChange(event) {
    const { name, value } = event.target

    setFilters((currentFilters) => ({
      ...currentFilters,
      [name]: value,
    }))
  }

  function clearFilters() {
    setFilters(initialParticipantFilters)
  }

  function handleEdit(participant) {
    setEditingId(participant.id)

    setForm({
      full_name: participant.full_name || '',
      age: participant.age || '',
      birth_date: participant.birth_date || '',
      church: participant.church || '',
      cpf: participant.cpf || '',
      address: participant.address || '',
      shirt_size: participant.shirt_size || '',
      gender: participant.gender || '',
      group_type: participant.group_type || '',
      phone: participant.phone || '',
      guardian_phone: participant.guardian_phone || '',
      food_restriction: participant.food_restriction || '',
      notes: participant.notes || '',
      is_board_member: participant.is_board_member || false,
      tribe_id: participant.tribe_id || '',
      competition_team_id: participant.competition_team_id || '',
      is_active: participant.is_active,
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setEditingId(null)
    setForm(initialParticipantForm)
  }

  async function handleDelete() {
    const confirmDelete = await requestConfirmation({
      title: 'Excluir participante',
      description:
        'Tem certeza que deseja excluir este participante? Essa ação não pode ser desfeita.',
      confirmLabel: 'Excluir',
    })

    if (!confirmDelete) return

    const { error } = await supabase
      .from('participants')
      .delete()
      .eq('id', editingId)
      .eq('camp_id', activeCampId)

    if (error) {
      logError('Participants', error)
      showError('Erro ao excluir participante.')
      return
    }

    setForm(initialParticipantForm)
    setEditingId(null)
    await reloadParticipants()
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const validationError = validateParticipantForm(form, activeCampId)

    if (validationError) {
      showError(validationError)
      return
    }

    setSaving(true)

    const payload = buildParticipantPayload(form, activeCampId)

    const request = editingId
      ? supabase
          .from('participants')
          .update(payload)
          .eq('id', editingId)
          .eq('camp_id', activeCampId)
      : supabase.from('participants').insert(payload)

    const { error } = await request

    if (error) {
      logError('Participants', error)
      const message =
        `${error.message || ''} ${error.details || ''}`.toLowerCase()
      showError(
        error.code === '23503' ||
          error.code === '23514' ||
          message.includes('foreign key')
          ? 'O Time selecionado não pertence a este acampamento.'
          : 'Erro ao salvar participante.'
      )
      setSaving(false)
      return
    }

    setForm(initialParticipantForm)
    setEditingId(null)
    await reloadParticipants()
    setSaving(false)
  }

  const filteredParticipants = useMemo(() => {
    return filterParticipants(participants, filters)
  }, [participants, filters])

  const activeCompetitionTeams = useMemo(() => {
    return competitionTeams.filter((team) => team.status === 'active')
  }, [competitionTeams])

  const formCompetitionTeams = useMemo(() => {
    if (!form.competition_team_id) return activeCompetitionTeams

    const selectedTeam = competitionTeams.find(
      (team) => team.id === form.competition_team_id
    )

    if (!selectedTeam || selectedTeam.status === 'active') {
      return activeCompetitionTeams
    }

    return [...activeCompetitionTeams, selectedTeam].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR')
    )
  }, [activeCompetitionTeams, competitionTeams, form.competition_team_id])

  function renderGenderBadge(gender) {
    const isMale = gender === 'Masculino'

    return (
      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          isMale
            ? 'bg-blue-500/20 text-blue-300'
            : 'bg-pink-500/20 text-pink-300'
        }`}
      >
        {gender || '-'}
      </span>
    )
  }

  const columns = [
    {
      key: 'name',
      label: 'Nome',
      render: (participant) => (
        <span className="font-medium">{participant.full_name}</span>
      ),
    },
    {
      key: 'age',
      label: 'Idade',
      render: (participant) => (
        <span className="text-zinc-400">{participant.age || '-'}</span>
      ),
    },
    {
      key: 'gender',
      label: 'Sexo',
      render: (participant) => renderGenderBadge(participant.gender),
    },
    {
      key: 'group',
      label: 'Grupo',
      render: (participant) => (
        <span className="text-zinc-400">{participant.group_type}</span>
      ),
    },
    {
      key: 'tribe',
      label: 'Equipe/Quarto',
      render: (participant) =>
        participant.tribes ? (
          <div className="flex items-center justify-end gap-3 md:justify-start">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
              style={{ backgroundColor: participant.tribes.color }}
            >
              {participant.tribes.symbol}
            </div>

            <span>{participant.tribes.name}</span>
          </div>
        ) : (
          <span className="text-zinc-500">Sem equipe/quarto</span>
        ),
    },
    {
      key: 'competition_team',
      label: 'Time',
      render: (participant) =>
        participant.competition_teams ? (
          <div className="flex items-center justify-end gap-3 md:justify-start">
            <div
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
              style={{ backgroundColor: participant.competition_teams.color }}
            >
              {participant.competition_teams.symbol}
            </div>

            <span>
              {participant.competition_teams.name}
              {participant.competition_teams.status === 'inactive' && (
                <span className="ml-2 text-xs text-zinc-500">Inativo</span>
              )}
            </span>
          </div>
        ) : (
          <span className="text-zinc-500">Sem time</span>
        ),
    },
    {
      key: 'board',
      label: 'Diretoria',
      render: (participant) => (
        <span className="text-zinc-400">
          {participant.is_board_member ? 'Sim' : 'Não'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (participant) => (
        <span
          className={`rounded-full px-3 py-1 text-xs ${
            participant.is_active
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {participant.is_active ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (participant) => (
        <button
          type="button"
          onClick={() => handleEdit(participant)}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-300 transition hover:bg-zinc-800"
        >
          Editar
        </button>
      ),
    },
  ]

  return (
    <section>
      <PageHeader
        eyebrow="Gestão"
        title="Participantes"
        description="Cadastro, organização e filtragem dos participantes do evento."
      />

      {!activeCampId && (
        <div className="mb-6">
          <ActiveCampNotice message="Selecione um acampamento para cadastrar e gerenciar participantes." />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:p-6"
      >
        <h2 className="text-xl font-bold">
          {editingId ? 'Editar participante' : 'Novo participante'}
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input
            name="full_name"
            value={form.full_name}
            onChange={handleChange}
            placeholder="Nome completo"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <input
            name="age"
            value={form.age}
            onChange={handleChange}
            placeholder="Idade"
            type="number"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <input
            name="birth_date"
            type="date"
            value={form.birth_date}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <input
            name="church"
            value={form.church}
            onChange={handleChange}
            placeholder="Igreja"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <input
            name="cpf"
            value={form.cpf}
            onChange={handleChange}
            placeholder="CPF"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <select
            name="shirt_size"
            value={form.shirt_size}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Tamanho da camiseta</option>
            <option value="PP">PP</option>
            <option value="P">P</option>
            <option value="M">M</option>
            <option value="G">G</option>
            <option value="GG">GG</option>
          </select>

          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Sexo</option>
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
          </select>

          <select
            name="group_type"
            value={form.group_type}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">UPA / UMP</option>
            <option value="UPA">UPA</option>
            <option value="UMP">UMP</option>
          </select>

          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Telefone"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <input
            name="guardian_phone"
            value={form.guardian_phone}
            onChange={handleChange}
            placeholder="Telefone do responsável"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <select
            name="tribe_id"
            value={form.tribe_id}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Sem equipe/quarto</option>

            {tribes.map((tribe) => (
              <option key={tribe.id} value={tribe.id}>
                {tribe.name}
              </option>
            ))}
          </select>

          {tribes.length === 0 && (
            <p className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100 md:col-span-2 xl:col-span-4">
              Nenhuma Equipe/Quarto cadastrada. O participante pode ser salvo
              sem esse vínculo.
            </p>
          )}

          <select
            name="competition_team_id"
            value={form.competition_team_id}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Sem time</option>

            {formCompetitionTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
                {team.status === 'inactive' ? ' (inativo)' : ''}
              </option>
            ))}
          </select>

          {competitionTeams.length === 0 && (
            <p className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100 md:col-span-2 xl:col-span-4">
              Nenhum Time cadastrado. O participante pode ser salvo sem Time.
            </p>
          )}

          <input
            name="food_restriction"
            value={form.food_restriction}
            onChange={handleChange}
            placeholder="Restrição alimentar"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <select
            name="is_active"
            value={form.is_active ? 'true' : 'false'}
            onChange={(event) =>
              setForm((currentForm) => ({
                ...currentForm,
                is_active: event.target.value === 'true',
              }))
            }
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="true">Ativo</option>
            <option value="false">Inativo</option>
          </select>

          <input
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Endereço completo"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500 xl:col-span-2"
          />
        </div>

        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Observações"
          className="mt-4 min-h-24 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
        />

        <div className="mt-4 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <label className="flex items-center gap-3 text-sm text-zinc-300">
            <input
              name="is_board_member"
              type="checkbox"
              checked={form.is_board_member}
              onChange={handleChange}
              className="h-4 w-4"
            />
            Participante faz parte da equipe organizadora
          </label>

          <div className="flex flex-col gap-3 sm:flex-row">
            {editingId && (
              <>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="rounded-xl border border-red-500/40 px-6 py-3 font-semibold text-red-400 transition hover:bg-red-500/10"
                >
                  Excluir
                </button>

                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="rounded-xl border border-zinc-700 px-6 py-3 font-semibold text-zinc-300 transition hover:bg-zinc-800"
                >
                  Cancelar
                </button>
              </>
            )}

            <button
              type="submit"
              disabled={saving || !activeCampId}
              className="rounded-xl bg-yellow-500 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? 'Salvando...'
                : editingId
                  ? 'Salvar alterações'
                  : 'Cadastrar participante'}
            </button>
          </div>
        </div>
      </form>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-xl font-bold">Lista de participantes</h2>

            <p className="mt-2 text-sm text-zinc-400">
              {filteredParticipants.length} de {participants.length}{' '}
              participante(s) exibido(s).
            </p>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="rounded-xl border border-zinc-700 px-4 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800"
          >
            Limpar filtros
          </button>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <input
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Buscar por nome, telefone, igreja ou CPF"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500 xl:col-span-2"
          />

          <select
            name="tribe_id"
            value={filters.tribe_id}
            onChange={handleFilterChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Todas as Equipes/Quartos</option>

            {tribes.map((tribe) => (
              <option key={tribe.id} value={tribe.id}>
                {tribe.name}
              </option>
            ))}
          </select>

          <select
            name="competition_team_id"
            value={filters.competition_team_id}
            onChange={handleFilterChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Todos os Times</option>
            <option value="none">Sem time</option>

            {activeCompetitionTeams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>

          <select
            name="group_type"
            value={filters.group_type}
            onChange={handleFilterChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">UPA / UMP</option>
            <option value="UPA">UPA</option>
            <option value="UMP">UMP</option>
          </select>

          <select
            name="gender"
            value={filters.gender}
            onChange={handleFilterChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Todos os sexos</option>
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
          </select>

          <input
            name="age"
            value={filters.age}
            onChange={handleFilterChange}
            type="number"
            min="0"
            placeholder="Filtrar por idade"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <select
            name="shirt_size"
            value={filters.shirt_size}
            onChange={handleFilterChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Todas as camisetas</option>
            <option value="PP">PP</option>
            <option value="P">P</option>
            <option value="M">M</option>
            <option value="G">G</option>
            <option value="GG">GG</option>
          </select>

          <select
            name="board"
            value={filters.board}
            onChange={handleFilterChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Organização e participantes</option>
            <option value="true">Somente organização</option>
            <option value="false">Somente participantes</option>
          </select>

          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Todos os status</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <p className="text-zinc-400">Carregando participantes...</p>
        ) : (
          <ResponsiveTable
            columns={columns}
            data={filteredParticipants}
            emptyMessage="Nenhum participante encontrado."
          />
        )}
      </div>
    </section>
  )
}
