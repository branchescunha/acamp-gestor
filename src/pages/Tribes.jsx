import { useCallback, useEffect, useMemo, useState } from 'react'
import ActiveCampNotice from '../components/ActiveCampNotice'
import PageHeader from '../components/PageHeader'
import { useActiveCamp } from '../hooks/useActiveCamp'
import { supabase } from '../lib/supabase'

const colorOptions = [
  { name: 'Dourado', value: '#eab308' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Rosa', value: '#ec4899' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Vermelho', value: '#ef4444' },
  { name: 'Roxo', value: '#8b5cf6' },
  { name: 'Laranja', value: '#f97316' },
  { name: 'Ciano', value: '#06b6d4' },
  { name: 'Lima', value: '#84cc16' },
]

const roomTypes = ['UPA Boys', 'UPA Girls', 'UMP Boys', 'UMP Girls']

const initialForm = {
  name: '',
  symbol: '',
  color: '#eab308',
  room_type: '',
  room_name: '',
  leader_name: '',
}

const initialFilters = {
  search: '',
  status: '',
  group: '',
  gender: '',
}

export default function Tribes() {
  const [tribes, setTribes] = useState([])
  const [participants, setParticipants] = useState([])
  const [form, setForm] = useState(initialForm)
  const [filters, setFilters] = useState(initialFilters)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { activeCampId } = useActiveCamp()

  useEffect(() => {
    let shouldIgnore = false

    async function loadData() {
      setLoading(true)

      const { data: tribesData, error: tribesError } = await supabase
        .from('tribes')
        .select('*')
        .eq('camp_id', activeCampId)
        .order('name')

      const { data: participantsData, error: participantsError } =
        await supabase
          .from('participants')
          .select('*')
          .eq('camp_id', activeCampId)
          .eq('is_active', true)
          .order('full_name')

      if (tribesError || participantsError) {
        console.error(tribesError || participantsError)
        if (shouldIgnore) return
        setLoading(false)
        return
      }

      if (shouldIgnore) return

      setTribes(tribesData || [])
      setParticipants(participantsData || [])
      setLoading(false)
    }

    if (activeCampId) {
      loadData()
      return () => {
        shouldIgnore = true
      }
    }

    const timeoutId = window.setTimeout(() => {
      setTribes([])
      setParticipants([])
      setLoading(false)
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [activeCampId])

  async function reloadTribes() {
    const { data, error } = await supabase
      .from('tribes')
      .select('*')
      .eq('camp_id', activeCampId)
      .order('name')

    if (error) {
      console.error(error)
      return
    }

    setTribes(data || [])
  }

  function handleChange(event) {
    const { name, value } = event.target

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
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
    setFilters(initialFilters)
  }

  function handleRoomTypeChange(event) {
    setForm((currentForm) => ({
      ...currentForm,
      room_type: event.target.value,
      leader_name: '',
    }))
  }

  const getTribeParticipants = useCallback((tribeId) => {
    return participants.filter(
      (participant) => participant.tribe_id === tribeId
    )
  }, [participants])

  const getActiveStatus = useCallback((tribeId) => {
    return getTribeParticipants(tribeId).length > 0
  }, [getTribeParticipants])

  function handleEdit(tribe) {
    setEditingId(tribe.id)

    setForm({
      name: tribe.name || '',
      symbol: tribe.symbol || '',
      color: tribe.color || '#eab308',
      room_type: tribe.room_type || '',
      room_name: tribe.room_name || '',
      leader_name: tribe.leader_name || '',
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setEditingId(null)
    setForm(initialForm)
  }

  async function handleDelete() {
    const confirmDelete = confirm(
      'Tem certeza que deseja excluir esta equipe? Essa ação não pode ser desfeita.'
    )

    if (!confirmDelete) return

    const { error } = await supabase
      .from('tribes')
      .delete()
      .eq('id', editingId)
      .eq('camp_id', activeCampId)

    if (error) {
      console.error(error)
      alert('Erro ao excluir equipe.')
      return
    }

    setEditingId(null)
    setForm(initialForm)
    await reloadTribes()
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!activeCampId) {
      alert('Selecione um acampamento antes de cadastrar equipes.')
      return
    }

    if (!form.name.trim()) {
      alert('Informe o nome da equipe.')
      return
    }

    if (!form.symbol.trim()) {
      alert('Informe o símbolo da equipe.')
      return
    }

    setSaving(true)

    const payload = {
      name: form.name.trim(),
      symbol: form.symbol.trim(),
      color: form.color,
      room_type: form.room_type || null,
      room_name: form.room_name.trim() || null,
      leader_name: form.leader_name.trim() || null,
      is_active: editingId ? getActiveStatus(editingId) : false,
      camp_id: activeCampId,
    }

    const request = editingId
      ? supabase
          .from('tribes')
          .update(payload)
          .eq('id', editingId)
          .eq('camp_id', activeCampId)
      : supabase.from('tribes').insert(payload)

    const { error } = await request

    if (error) {
      console.error(error)
      alert('Erro ao salvar equipe.')
      setSaving(false)
      return
    }

    setForm(initialForm)
    setEditingId(null)
    await reloadTribes()
    setSaving(false)
  }

  const selectedColor = colorOptions.find((color) => color.value === form.color)

  const availableLeaders = useMemo(() => {
    if (!editingId) return []

    const currentTribeParticipants = getTribeParticipants(editingId)

    if (form.room_type.includes('Boys')) {
      return currentTribeParticipants.filter(
        (participant) =>
          participant.gender === 'Masculino' && participant.group_type === 'UMP'
      )
    }

    if (form.room_type.includes('Girls')) {
      return currentTribeParticipants.filter(
        (participant) =>
          participant.gender === 'Feminino' && participant.group_type === 'UMP'
      )
    }

    return currentTribeParticipants.filter(
      (participant) => participant.group_type === 'UMP'
    )
  }, [editingId, form.room_type, getTribeParticipants])

  const filteredAndSortedTribes = useMemo(() => {
    return [...tribes]
      .filter((tribe) => {
        const activeStatus = getActiveStatus(tribe.id)
        const search = filters.search.trim().toLowerCase()

        const matchesSearch = search
          ? tribe.name?.toLowerCase().includes(search) ||
            tribe.leader_name?.toLowerCase().includes(search) ||
            tribe.room_name?.toLowerCase().includes(search) ||
            tribe.room_type?.toLowerCase().includes(search)
          : true

        const matchesStatus = filters.status
          ? filters.status === 'active'
            ? activeStatus
            : !activeStatus
          : true

        const matchesGroup = filters.group
          ? tribe.room_type?.includes(filters.group)
          : true

        const matchesGender = filters.gender
          ? tribe.room_type?.includes(filters.gender)
          : true

        return matchesSearch && matchesStatus && matchesGroup && matchesGender
      })
      .sort((a, b) => {
        const aActive = getActiveStatus(a.id)
        const bActive = getActiveStatus(b.id)

        if (aActive !== bActive) {
          return aActive ? -1 : 1
        }

        return a.name.localeCompare(b.name, 'pt-BR')
      })
  }, [tribes, filters, getActiveStatus])

  const activeCount = tribes.filter((tribe) => getActiveStatus(tribe.id)).length

  const isUmpRoom = form.room_type.includes('UMP')
  const isUpaRoom = form.room_type.includes('UPA')

  return (
    <section>
      <PageHeader
        eyebrow="Gestão"
        title="Equipes"
        description="Gerenciamento das equipes livres de competição do acampamento."
      />

      {!activeCampId && (
        <div className="mb-6">
          <ActiveCampNotice message="Selecione um acampamento para cadastrar e gerenciar equipes." />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:p-6"
      >
        <h2 className="text-xl font-bold">
          {editingId ? 'Editar equipe' : 'Nova equipe'}
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Nome da equipe"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <input
            name="symbol"
            value={form.symbol}
            onChange={handleChange}
            placeholder="Símbolo"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <select
            name="color"
            value={form.color}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            {colorOptions.map((color) => (
              <option key={color.value} value={color.value}>
                {color.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3">
            <div
              className="h-6 w-6 rounded-lg"
              style={{ backgroundColor: form.color }}
            />
            <span className="text-sm text-zinc-300">
              {selectedColor?.name || 'Cor selecionada'}
            </span>
          </div>

          <select
            name="room_type"
            value={form.room_type}
            onChange={handleRoomTypeChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Tipo de quarto, opcional</option>

            {roomTypes.map((roomType) => (
              <option key={roomType} value={roomType}>
                {roomType}
              </option>
            ))}
          </select>

          <input
            name="room_name"
            value={form.room_name}
            onChange={handleChange}
            placeholder="Quarto / número, opcional"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          {isUmpRoom && editingId && availableLeaders.length > 0 ? (
            <select
              name="leader_name"
              value={form.leader_name}
              onChange={handleChange}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
            >
              <option value="">Selecione o líder</option>

              {availableLeaders.map((participant) => (
                <option key={participant.id} value={participant.full_name}>
                  {participant.full_name}
                </option>
              ))}
            </select>
          ) : (
            <input
              name="leader_name"
              value={form.leader_name}
              onChange={handleChange}
              placeholder={
                isUpaRoom
                  ? 'Tio responsável'
                  : isUmpRoom
                    ? 'Líder da equipe'
                    : 'Responsável / líder'
              }
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
            />
          )}
        </div>

        {isUmpRoom && editingId && availableLeaders.length === 0 && (
          <p className="mt-3 text-sm text-zinc-400">
            Para selecionar um líder automaticamente, cadastre participantes UMP
            compatíveis nesta equipe.
          </p>
        )}

        <div className="mt-6 flex flex-col justify-end gap-3 sm:flex-row">
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
                : 'Cadastrar equipe'}
          </button>
        </div>
      </form>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-xl font-bold">Lista de equipes</h2>

            <p className="mt-2 text-sm text-zinc-400">
              {filteredAndSortedTribes.length} de {tribes.length} equipe(s)
              exibida(s). {activeCount} ativa(s).
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
            placeholder="Buscar por equipe, quarto ou responsável"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500 xl:col-span-2"
          />

          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Todas</option>
            <option value="active">Ativas</option>
            <option value="inactive">Inativas</option>
          </select>

          <select
            name="group"
            value={filters.group}
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
            <option value="">Boys / Girls</option>
            <option value="Boys">Boys</option>
            <option value="Girls">Girls</option>
          </select>
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <p className="text-zinc-400">Carregando equipes...</p>
        ) : filteredAndSortedTribes.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6 text-center text-zinc-400">
            Nenhuma equipe cadastrada para este acampamento.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredAndSortedTribes.map((tribe) => {
              const activeStatus = getActiveStatus(tribe.id)
              const membersCount = getTribeParticipants(tribe.id).length

              return (
                <article
                  key={tribe.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-2xl text-2xl"
                      style={{ backgroundColor: tribe.color }}
                    >
                      {tribe.symbol}
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          activeStatus
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-zinc-700 text-zinc-300'
                        }`}
                      >
                        {activeStatus ? 'Ativa' : 'Inativa'}
                      </span>

                      {tribe.room_type?.includes('Boys') && (
                        <span className="rounded-full bg-blue-500/20 px-3 py-1 text-xs text-blue-300">
                          Boys
                        </span>
                      )}

                      {tribe.room_type?.includes('Girls') && (
                        <span className="rounded-full bg-pink-500/20 px-3 py-1 text-xs text-pink-300">
                          Girls
                        </span>
                      )}

                      {tribe.room_type?.includes('UPA') && (
                        <span className="rounded-full bg-yellow-500/20 px-3 py-1 text-xs text-yellow-300">
                          UPA
                        </span>
                      )}

                      {tribe.room_type?.includes('UMP') && (
                        <span className="rounded-full bg-purple-500/20 px-3 py-1 text-xs text-purple-300">
                          UMP
                        </span>
                      )}
                    </div>
                  </div>

                  <h2 className="mt-6 text-2xl font-bold">{tribe.name}</h2>

                  <div className="mt-5 space-y-2 text-sm text-zinc-400">
                    <p>Tipo de quarto: {tribe.room_type || 'Opcional'}</p>
                    <p>Quarto: {tribe.room_name || 'Opcional'}</p>
                    <p>Responsável: {tribe.leader_name || 'Não definido'}</p>
                    <p>Integrantes ativos: {membersCount}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleEdit(tribe)}
                    className="mt-6 w-full rounded-xl border border-zinc-700 py-3 text-sm text-zinc-300 transition hover:bg-zinc-800"
                  >
                    Editar
                  </button>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
