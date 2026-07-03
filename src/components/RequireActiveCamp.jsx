import { Link } from 'react-router-dom'
import { useActiveCamp } from '../hooks/useActiveCamp'

export default function RequireActiveCamp({ children }) {
  const { activeCampId } = useActiveCamp()

  if (activeCampId) {
    return children
  }

  return (
    <section className="rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 md:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-yellow-300">
        Acampamento obrigatório
      </p>

      <h1 className="mt-3 text-2xl font-bold text-white">
        Selecione um acampamento para continuar.
      </h1>

      <p className="mt-3 max-w-2xl text-sm leading-6 text-yellow-100/90">
        Equipes, participantes, pontuações, histórico, gincanas, inspeções e
        exportações pertencem a um acampamento específico.
      </p>

      <Link
        to="/admin/acampamentos"
        className="mt-5 inline-flex rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-yellow-400"
      >
        Selecionar acampamento
      </Link>
    </section>
  )
}
