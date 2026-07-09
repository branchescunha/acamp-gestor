import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { calculateRanking } from '../domain/ranking'
import { supabase } from '../lib/supabase'
import { isValidSlug } from '../utils/slug'

export default function PublicCampRanking() {
  const { campSlug = '' } = useParams()
  const [camp, setCamp] = useState(null)
  const [ranking, setRanking] = useState([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    async function loadRanking() {
      setLoading(true)
      setNotFound(false)

      if (!isValidSlug(campSlug)) {
        setCamp(null)
        setRanking([])
        setNotFound(true)
        setLoading(false)
        return
      }

      const { data: campData, error: campError } = await supabase
        .from('camps')
        .select('id, name, church_name, theme, slug, public_ranking_enabled')
        .eq('slug', campSlug)
        .eq('public_ranking_enabled', true)
        .maybeSingle()

      if (campError) {
        console.error(campError)
        setNotFound(true)
        setLoading(false)
        return
      }

      if (!campData) {
        setCamp(null)
        setRanking([])
        setNotFound(true)
        setLoading(false)
        return
      }

      const { data: teamsData, error: teamsError } = await supabase
        .from('public_ranking_competition_teams')
        .select('id, name, color, symbol')
        .eq('camp_id', campData.id)
        .order('name')

      const { data: eventsData, error: eventsError } = await supabase
        .from('public_ranking_competition_score_events')
        .select('competition_team_id, points')
        .eq('camp_id', campData.id)

      const { data: participantsData, error: participantsError } =
        await supabase
          .from('public_ranking_competition_participants')
          .select('competition_team_id, is_active')
          .eq('camp_id', campData.id)
          .eq('is_active', true)

      if (teamsError || eventsError || participantsError) {
        console.error(teamsError || eventsError || participantsError)
        setNotFound(true)
        setLoading(false)
        return
      }

      setCamp(campData)
      setRanking(
        calculateRanking(
          teamsData || [],
          eventsData || [],
          participantsData || [],
          {
            includeInactive: false,
            scoreTeamIdField: 'competition_team_id',
            participantTeamIdField: 'competition_team_id',
          },
        ),
      )
      setLoading(false)
    }

    loadRanking()
  }, [campSlug])

  function getPointsColor(total, index) {
    if (total < 0) return 'text-red-400'
    if (index <= 2) return 'text-green-400'
    return 'text-yellow-500'
  }

  const topThree = ranking.slice(0, 3)

  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-8 text-white md:px-8 md:py-10">
      <section className="mx-auto w-full max-w-6xl">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-500 md:text-sm">
              AcampGestor
            </p>

            <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
              {camp?.name || 'Ranking do acampamento'}
            </h1>

            {camp ? (
              <div className="mt-4 max-w-2xl space-y-2 text-sm leading-relaxed text-zinc-400 md:text-base">
                <p>{camp.church_name}</p>
                {camp.theme && <p>Tema: {camp.theme}</p>}
              </div>
            ) : (
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">
                Ranking público dos times do acampamento.
              </p>
            )}
          </div>

          <Link
            to="/login"
            className="rounded-2xl border border-zinc-800 px-5 py-4 text-center text-sm transition hover:border-yellow-500 hover:text-yellow-500 md:text-base"
          >
            Área administrativa
          </Link>
        </div>

        {loading ? (
          <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center text-zinc-400">
            Carregando ranking...
          </div>
        ) : notFound ? (
          <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <h2 className="text-2xl font-bold">
              Ranking não encontrado ou indisponível
            </h2>

            <p className="mt-3 text-zinc-400">
              Confira o link com a organização do acampamento.
            </p>

            <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to="/login"
                className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
              >
                Área administrativa
              </Link>

              <Link
                to="/solicitar-acesso"
                className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-yellow-400"
              >
                Solicitar acesso
              </Link>
            </div>
          </div>
        ) : ranking.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center">
            <h2 className="text-2xl font-bold">Nenhum time ativo ainda</h2>

            <p className="mt-3 text-zinc-400">
              Um time aparece no ranking quando possuir pelo menos um
              participante ativo.
            </p>
          </div>
        ) : (
          <>
            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {topThree.map((tribe, index) => (
                <article
                  key={tribe.id}
                  className={`rounded-3xl border p-5 ${
                    index === 0
                      ? 'border-yellow-500 bg-yellow-500/10'
                      : 'border-zinc-800 bg-zinc-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <span className="text-4xl font-black text-yellow-500 md:text-5xl">
                      #{index + 1}
                    </span>

                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl md:h-16 md:w-16 md:text-3xl"
                      style={{ backgroundColor: tribe.color }}
                    >
                      {tribe.symbol}
                    </div>
                  </div>

                  <h2 className="mt-6 text-2xl font-bold md:text-4xl">
                    {tribe.name}
                  </h2>

                  <div className="mt-6">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 md:text-sm">
                      Saldo final
                    </p>

                    <p
                      className={`mt-2 text-5xl font-black md:text-6xl ${getPointsColor(tribe.total, index)}`}
                    >
                      {tribe.total}
                    </p>

                    <p className="mt-3 text-sm text-zinc-400">
                      +{tribe.positivePoints} / -{tribe.penaltyPoints}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <div className="mt-10 hidden overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-900 md:block">
              <table className="w-full border-collapse">
                <thead className="bg-zinc-950">
                  <tr className="text-left text-sm">
                    <th className="px-6 py-5">Posição</th>
                    <th className="px-6 py-5">Time</th>
                    <th className="px-6 py-5">Integrantes</th>
                    <th className="px-6 py-5">Pontos +</th>
                    <th className="px-6 py-5">Penalidades</th>
                    <th className="px-6 py-5 text-right">Saldo</th>
                  </tr>
                </thead>

                <tbody>
                  {ranking.map((tribe, index) => (
                    <tr
                      key={tribe.id}
                      className="border-t border-zinc-800 text-sm"
                    >
                      <td className="px-6 py-5 font-bold text-yellow-500">
                        #{index + 1}
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl"
                            style={{ backgroundColor: tribe.color }}
                          >
                            {tribe.symbol}
                          </div>

                          <span className="font-semibold">{tribe.name}</span>
                        </div>
                      </td>

                      <td className="px-6 py-5 text-zinc-300">
                        {tribe.participantsCount}
                      </td>

                      <td className="px-6 py-5 text-green-400">
                        +{tribe.positivePoints}
                      </td>

                      <td className="px-6 py-5 text-red-400">
                        -{tribe.penaltyPoints}
                      </td>

                      <td
                        className={`px-6 py-5 text-right text-2xl font-black ${getPointsColor(tribe.total, index)}`}
                      >
                        {tribe.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-10 space-y-3 md:hidden">
              {ranking.map((tribe, index) => (
                <article
                  key={tribe.id}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-yellow-500">
                        #{index + 1}
                      </span>

                      <div
                        className="flex h-11 w-11 items-center justify-center rounded-xl text-lg"
                        style={{ backgroundColor: tribe.color }}
                      >
                        {tribe.symbol}
                      </div>

                      <h2 className="text-xl font-bold">{tribe.name}</h2>
                    </div>

                    <strong
                      className={`text-3xl font-black ${getPointsColor(tribe.total, index)}`}
                    >
                      {tribe.total}
                    </strong>
                  </div>

                  <div className="mt-5 grid gap-3 text-sm">
                    <div className="flex justify-between gap-4 border-t border-zinc-800 pt-3">
                      <span className="text-zinc-500">Pontos positivos</span>
                      <span className="text-right text-green-400">
                        +{tribe.positivePoints}
                      </span>
                    </div>

                    <div className="flex justify-between gap-4 border-t border-zinc-800 pt-3">
                      <span className="text-zinc-500">Penalidades</span>
                      <span className="text-right text-red-400">
                        -{tribe.penaltyPoints}
                      </span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  )
}
