import { useCallback, useEffect, useMemo, useState } from 'react'
import ActiveCampNotice from '../components/ActiveCampNotice'
import PageHeader from '../components/PageHeader'
import ResponsiveTable from '../components/ResponsiveTable'
import { normalizeScoreAmount } from '../domain/scoring'
import { useActiveCamp } from '../hooks/useActiveCamp'
import { supabase } from '../lib/supabase'

const initialForm = {
  tribe_id: '',
  inspection_day: 'Sexta',
  inspection_period: 'Noite',
  type: 'POINT',
  points: '',
  notes: '',
  has_photo: false,
}

const availablePeriods = {
  Sexta: ['Noite'],
  Sábado: ['Manhã', 'Tarde', 'Noite'],
  Domingo: ['Manhã', 'Tarde'],
}

const inspectionSchedule = {
  Sexta: ['Noite'],
  Sábado: ['Manhã', 'Tarde', 'Noite'],
  Domingo: ['Manhã', 'Tarde'],
}

export default function Inspections() {
  const [tribes, setTribes] = useState([])
  const [inspections, setInspections] = useState([])
  const [form, setForm] = useState(initialForm)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { activeCampId } = useActiveCamp()

  const loadData = useCallback(async (shouldIgnore = () => false) => {
    if (!activeCampId) {
      if (shouldIgnore()) return
      setTribes([])
      setInspections([])
      setLoading(false)
      return
    }

    const { data: tribesData, error: tribesError } = await supabase
      .from('tribes')
      .select('*')
      .eq('camp_id', activeCampId)
      .order('name')

    const { data: inspectionsData, error: inspectionsError } = await supabase
      .from('room_inspections')
      .select(
        `
        *,
        tribes (
          name,
          color,
          symbol,
          room_name,
          room_type
        )
      `
      )
      .eq('camp_id', activeCampId)
      .order('created_at', { ascending: false })

    if (tribesError || inspectionsError) {
      console.error(tribesError || inspectionsError)
      if (shouldIgnore()) return
      setLoading(false)
      return
    }

    if (shouldIgnore()) return

    setTribes(tribesData || [])
    setInspections(inspectionsData || [])
    setLoading(false)
  }, [activeCampId])

  useEffect(() => {
    let shouldIgnore = false

    const timeoutId = window.setTimeout(() => {
      void loadData(() => shouldIgnore)
    }, 0)

    return () => {
      shouldIgnore = true
      window.clearTimeout(timeoutId)
    }
  }, [loadData])

  function handleChange(event) {
    const { name, value, type, checked } = event.target

    if (name === 'inspection_day') {
      setForm((currentForm) => ({
        ...currentForm,
        inspection_day: value,
        inspection_period: availablePeriods[value][0],
      }))

      return
    }

    setForm((currentForm) => ({
      ...currentForm,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleEdit(inspection) {
    setEditingId(inspection.id)

    setForm({
      tribe_id: inspection.tribe_id || '',
      inspection_day: inspection.inspection_day || 'Sexta',
      inspection_period: inspection.inspection_period || 'Noite',
      type: inspection.type || 'POINT',
      points: Math.abs(Number(inspection.points || 0)),
      notes: inspection.notes || '',
      has_photo: inspection.has_photo || false,
    })

    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleCancelEdit() {
    setEditingId(null)
    setForm(initialForm)
  }

  async function createScoreEvent(inspectionId, payload) {
    const { error } = await supabase.from('score_events').insert({
      tribe_id: payload.tribe_id,
      participant_id: null,
      type: payload.type,
      category: `Inspeção ${payload.inspection_day} - ${payload.inspection_period}`,
      points: payload.points,
      reason: `Inspeção ${payload.inspection_day} - ${payload.inspection_period}`,
      notes: payload.notes,
      room_inspection_id: inspectionId,
      camp_id: activeCampId,
    })

    if (error) throw error
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!activeCampId) {
      alert('Selecione um acampamento antes de lançar inspeções.')
      return
    }

    if (!form.tribe_id) {
      alert('Selecione uma equipe.')
      return
    }

    if (!form.inspection_day) {
      alert('Selecione o dia da inspeção.')
      return
    }

    if (!form.inspection_period) {
      alert('Selecione o período da inspeção.')
      return
    }

    if (form.points === '') {
      alert('Informe a quantidade de pontos.')
      return
    }

    setSaving(true)

    try {
      const payload = {
        tribe_id: form.tribe_id,
        inspection_day: form.inspection_day,
        inspection_period: form.inspection_period,
        type: form.type,
        points: normalizeScoreAmount(form.type, form.points),
        has_photo: form.has_photo,
        notes: form.notes.trim() || null,
        camp_id: activeCampId,
      }

      if (editingId) {
        const { error: deleteOldScoreError } = await supabase
          .from('score_events')
          .delete()
          .eq('room_inspection_id', editingId)
          .eq('camp_id', activeCampId)

        if (deleteOldScoreError) throw deleteOldScoreError

        const { error: updateError } = await supabase
          .from('room_inspections')
          .update(payload)
          .eq('id', editingId)
          .eq('camp_id', activeCampId)

        if (updateError) throw updateError

        await createScoreEvent(editingId, payload)
      } else {
        const { data: inspectionData, error: insertError } = await supabase
          .from('room_inspections')
          .insert(payload)
          .select()
          .single()

        if (insertError) throw insertError

        await createScoreEvent(inspectionData.id, payload)
      }

      setForm(initialForm)
      setEditingId(null)
      await loadData()
    } catch (error) {
      console.error(error)
      alert(`Erro ao salvar inspeção: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    const confirmDelete = confirm(
      'Tem certeza que deseja excluir esta inspeção? Os pontos vinculados também serão removidos.'
    )

    if (!confirmDelete) return

    setSaving(true)

    try {
      const { error: deleteScoreError } = await supabase
        .from('score_events')
        .delete()
        .eq('room_inspection_id', editingId)
        .eq('camp_id', activeCampId)

      if (deleteScoreError) throw deleteScoreError

      const { error: deleteInspectionError } = await supabase
        .from('room_inspections')
        .delete()
        .eq('id', editingId)
        .eq('camp_id', activeCampId)

      if (deleteInspectionError) throw deleteInspectionError

      setForm(initialForm)
      setEditingId(null)
      await loadData()
    } catch (error) {
      console.error(error)
      alert(`Erro ao excluir inspeção: ${error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const inspectionStatus = useMemo(() => {
    const statusMap = {}

    tribes.forEach((tribe) => {
      statusMap[tribe.id] = {}

      Object.entries(inspectionSchedule).forEach(([day, periods]) => {
        periods.forEach((period) => {
          const key = `${day}-${period}`

          statusMap[tribe.id][key] = inspections.some(
            (inspection) =>
              inspection.tribe_id === tribe.id &&
              inspection.inspection_day === day &&
              inspection.inspection_period === period
          )
        })
      })
    })

    return statusMap
  }, [tribes, inspections])

  const activeTribes = useMemo(() => {
    return [...tribes].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
  }, [tribes])

  const columns = [
    {
      key: 'date',
      label: 'Data',
      render: (inspection) => (
        <span className="text-zinc-400">
          {new Date(inspection.created_at).toLocaleString('pt-BR')}
        </span>
      ),
    },
    {
      key: 'tribe',
      label: 'Equipe',
      render: (inspection) => (
        <div className="flex items-center justify-end gap-3 md:justify-start">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm"
            style={{ backgroundColor: inspection.tribes?.color }}
          >
            {inspection.tribes?.symbol}
          </div>

          <span>{inspection.tribes?.name}</span>
        </div>
      ),
    },
    {
      key: 'day',
      label: 'Dia',
      render: (inspection) => (
        <span className="text-zinc-300">{inspection.inspection_day}</span>
      ),
    },
    {
      key: 'period',
      label: 'Período',
      render: (inspection) => (
        <span className="text-zinc-400">{inspection.inspection_period}</span>
      ),
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (inspection) => (
        <span
          className={`rounded-full px-3 py-1 text-xs ${
            inspection.type === 'POINT'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-red-500/20 text-red-400'
          }`}
        >
          {inspection.type === 'POINT' ? 'Pontuação' : 'Penalidade'}
        </span>
      ),
    },
    {
      key: 'points',
      label: 'Pontos',
      render: (inspection) => (
        <strong
          className={
            Number(inspection.points) >= 0 ? 'text-green-400' : 'text-red-400'
          }
        >
          {Number(inspection.points) > 0 ? '+' : ''}
          {inspection.points}
        </strong>
      ),
    },
    {
      key: 'photo',
      label: 'Foto',
      render: (inspection) => (
        <span className="text-zinc-400">
          {inspection.has_photo ? 'Sim' : 'Não'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (inspection) => (
        <button
          type="button"
          onClick={() => handleEdit(inspection)}
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
        title="Inspeções de quartos"
        description="Controle operacional das inspeções dos quartos."
      />

      {!activeCampId && (
        <div className="mb-6">
          <ActiveCampNotice message="Selecione um acampamento para lançar e consultar inspeções." />
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:p-6"
      >
        <h2 className="text-xl font-bold">
          {editingId ? 'Editar inspeção' : 'Nova inspeção'}
        </h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <select
            name="tribe_id"
            value={form.tribe_id}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="">Selecione a equipe</option>

            {activeTribes.map((tribe) => (
              <option key={tribe.id} value={tribe.id}>
                {tribe.name}
              </option>
            ))}
          </select>

          <select
            name="inspection_day"
            value={form.inspection_day}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="Sexta">Sexta</option>
            <option value="Sábado">Sábado</option>
            <option value="Domingo">Domingo</option>
          </select>

          <select
            name="inspection_period"
            value={form.inspection_period}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            {availablePeriods[form.inspection_day]?.map((period) => (
              <option key={period} value={period}>
                {period}
              </option>
            ))}
          </select>

          <select
            name="type"
            value={form.type}
            onChange={handleChange}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          >
            <option value="POINT">Pontuação</option>
            <option value="PENALTY">Penalidade</option>
          </select>

          <input
            name="points"
            value={form.points}
            onChange={handleChange}
            type="number"
            placeholder="Quantidade de pontos"
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <label className="flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              name="has_photo"
              checked={form.has_photo}
              onChange={handleChange}
              className="h-4 w-4"
            />
            Possui foto da inspeção
          </label>
        </div>

        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Observações (opcional)"
          className="mt-4 min-h-24 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
        />

        <div className="mt-4 flex flex-col justify-end gap-3 sm:flex-row">
          {editingId && (
            <>
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="rounded-xl border border-red-500/40 px-6 py-3 font-semibold text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Excluir
              </button>

              <button
                type="button"
                onClick={handleCancelEdit}
                disabled={saving}
                className="rounded-xl border border-zinc-700 px-6 py-3 font-semibold text-zinc-300 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
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
                : 'Cadastrar inspeção'}
          </button>
        </div>
      </form>

      <div className="mt-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 md:p-6">
        <h2 className="text-xl font-bold">Status das inspeções</h2>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {activeTribes.map((tribe) => (
            <div
              key={tribe.id}
              className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-lg"
                  style={{ backgroundColor: tribe.color }}
                >
                  {tribe.symbol}
                </div>

                <div>
                  <h3 className="font-bold">{tribe.name}</h3>

                  <p className="text-sm text-zinc-500">
                    {tribe.room_name
                      ? `Quarto ${tribe.room_name}`
                      : 'Quarto não definido'}
                  </p>
                </div>
              </div>

              <div className="mt-4 space-y-3 text-sm">
                {Object.entries(inspectionSchedule).map(([day, periods]) => (
                  <div key={day}>
                    <p className="mb-2 font-medium text-zinc-300">{day}</p>

                    <div className="space-y-1">
                      {periods.map((period) => {
                        const key = `${day}-${period}`
                        const completed = inspectionStatus[tribe.id]?.[key]

                        return (
                          <div
                            key={key}
                            className="flex items-center justify-between text-xs"
                          >
                            <span className="text-zinc-400">{period}</span>

                            <span
                              className={
                                completed ? 'text-green-400' : 'text-red-400'
                              }
                            >
                              {completed ? 'Lançada' : 'Pendente'}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {loading ? (
          <p className="text-zinc-400">Carregando inspeções...</p>
        ) : (
          <ResponsiveTable
            columns={columns}
            data={inspections}
            emptyMessage="Nenhuma inspeção cadastrada."
          />
        )}
      </div>
    </section>
  )
}
