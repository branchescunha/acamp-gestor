import { Link } from 'react-router-dom'

export default function Ranking() {
  return (
    <main className="min-h-screen bg-zinc-950 px-5 py-8 text-white md:px-8 md:py-10">
      <section className="mx-auto flex min-h-[80vh] w-full max-w-4xl items-center">
        <div className="w-full rounded-3xl border border-zinc-800 bg-zinc-900 p-8 text-center md:p-12">
          <p className="text-xs uppercase tracking-[0.3em] text-yellow-500 md:text-sm">
            AcampGestor
          </p>

          <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
            Ranking indisponível
          </h1>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">
            Verifique se o link está correto ou solicite à organização o link
            público do ranking.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/"
              className="rounded-xl border border-zinc-700 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
            >
              Ir para o início
            </Link>

            <Link
              to="/solicitar-acesso"
              className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-yellow-400"
            >
              Solicitar acesso
            </Link>
          </div>
        </div>
      </section>
    </main>
  )
}
