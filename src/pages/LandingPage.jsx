import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Building2,
  ClipboardCheck,
  Download,
  ListChecks,
  School,
  ShieldCheck,
  Swords,
  TentTree,
  Trophy,
  Users,
} from 'lucide-react'

const audiences = [
  {
    title: 'Igrejas',
    description:
      'Organize retiros, congressos e acampamentos com Times competitivos e ranking público.',
    icon: Building2,
  },
  {
    title: 'Escolas',
    description: 'Acompanhe gincanas, turmas, pontuações e atividades de forma centralizada.',
    icon: School,
  },
  {
    title: 'Organizações',
    description: 'Mantenha eventos, gestores e acampamentos sob uma estrutura clara.',
    icon: ShieldCheck,
  },
  {
    title: 'Equipes de eventos',
    description: 'Dê visibilidade ao placar e reduza controles manuais durante a programação.',
    icon: Users,
  },
]

const features = [
  ['Criação de acampamentos', TentTree],
  ['Equipes/Quartos', Trophy],
  ['Times competitivos', Swords],
  ['Participantes', Users],
  ['Pontuação', BarChart3],
  ['Gincanas', ListChecks],
  ['Inspeções', ClipboardCheck],
  ['Ranking público', Trophy],
  ['Exportação de dados', Download],
  ['Gestão por organizações', Building2],
]

const benefits = [
  'Menos planilhas soltas',
  'Mais organização na operação',
  'Ranking em tempo real',
  'Acesso público para acampantes',
  'Controle para gestores',
  'Visão geral para administradores',
  'Histórico e exportação',
  'Dados centralizados por acampamento',
]

const steps = [
  'A organização solicita acesso',
  'O administrador libera o uso',
  'O gestor cria o acampamento',
  'Equipes/Quartos, Times e participantes são cadastrados',
  'As pontuações são lançadas',
  'O ranking público pode ser compartilhado',
]

const rankingPreview = [
  { name: 'Time Azul', points: 980, color: 'bg-blue-500' },
  { name: 'Time Verde', points: 850, color: 'bg-emerald-500' },
  { name: 'Time Vermelho', points: 730, color: 'bg-red-500' },
]

function PrimaryCta({ className = '' }) {
  return (
    <Link
      to="/solicitar-acesso"
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-yellow-500 px-6 py-4 font-semibold text-zinc-950 transition hover:bg-yellow-400 ${className}`}
    >
      Solicitar acesso
      <ArrowRight size={18} />
    </Link>
  )
}

function SecondaryCta({ className = '' }) {
  return (
    <Link
      to="/login"
      className={`inline-flex items-center justify-center rounded-xl border border-zinc-700 px-6 py-4 font-semibold text-zinc-200 transition hover:border-yellow-500 hover:text-yellow-400 ${className}`}
    >
      Entrar
    </Link>
  )
}

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="relative overflow-hidden border-b border-zinc-800 px-5 py-6 md:px-8">
        <div className="absolute inset-0 opacity-30">
          <div className="h-full w-full bg-[linear-gradient(90deg,rgba(250,204,21,0.08)_1px,transparent_1px),linear-gradient(180deg,rgba(250,204,21,0.06)_1px,transparent_1px)] bg-[size:72px_72px]" />
        </div>

        <div className="relative mx-auto flex max-w-7xl items-center justify-between gap-3">
          <Link to="/" className="shrink-0 text-base font-black tracking-tight sm:text-lg">
            AcampGestor
          </Link>

          <nav className="flex min-w-0 items-center gap-2 text-xs sm:gap-3 sm:text-sm">
            <Link
              to="/login"
              className="whitespace-nowrap rounded-xl px-3 py-2 text-zinc-300 transition hover:bg-zinc-900 hover:text-white sm:px-4 sm:py-3"
            >
              Entrar
            </Link>

            <Link
              to="/solicitar-acesso"
              className="whitespace-nowrap rounded-xl bg-yellow-500 px-3 py-2 font-semibold text-zinc-950 transition hover:bg-yellow-400 sm:px-4 sm:py-3"
            >
              Solicitar acesso
            </Link>
          </nav>
        </div>

        <div className="relative mx-auto grid min-h-[calc(100vh-88px)] max-w-7xl content-center gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-500">
              Plataforma para eventos
            </p>

            <h1 className="mt-5 max-w-4xl text-4xl font-black leading-tight md:text-6xl">
              Gestão de acampamentos com Times, pontuação e ranking público.
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-300 md:text-lg">
              Uma plataforma para igrejas, escolas e organizações acompanharem
              acampamentos de forma simples, organizada e visual.
            </p>

            <div className="mt-8 grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] gap-3 sm:flex sm:flex-row">
              <PrimaryCta className="whitespace-nowrap px-3 py-3 text-sm sm:px-6 sm:py-4 sm:text-base" />
              <SecondaryCta className="whitespace-nowrap px-3 py-3 text-sm sm:px-6 sm:py-4 sm:text-base" />
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-2xl shadow-black/30">
            <div className="flex items-center justify-between gap-4 border-b border-zinc-800 pb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-yellow-500">
                  Ranking público
                </p>
                <h2 className="mt-2 text-2xl font-bold">Acampamento Exemplo</h2>
              </div>
              <Trophy className="text-yellow-400" size={28} />
            </div>

            <div className="mt-5 space-y-3">
              {rankingPreview.map((team, index) => (
                <div
                  key={team.name}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 p-4"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="w-8 shrink-0 text-xl font-black text-yellow-500">
                      #{index + 1}
                    </span>
                    <span className={`h-10 w-10 shrink-0 rounded-xl ${team.color}`} />
                    <strong className="truncate">{team.name}</strong>
                  </div>
                  <span className="whitespace-nowrap text-lg font-black text-green-400 sm:text-xl">
                    {team.points} pts
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-3 gap-3 text-center text-sm">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <strong className="block text-xl">8</strong>
                <span className="text-zinc-400">times</span>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <strong className="block text-xl">142</strong>
                <span className="text-zinc-400">participantes</span>
              </div>
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <strong className="block text-xl">24</strong>
                <span className="text-zinc-400">lançamentos</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs uppercase tracking-[0.3em] text-yellow-500">
            Para quem é
          </p>
          <h2 className="mt-4 text-3xl font-black md:text-4xl">
            Feito para quem organiza eventos com grupos e Times.
          </h2>

          <div className="mt-10 grid grid-cols-2 gap-4 xl:grid-cols-4">
            {audiences.map((audience) => {
              const Icon = audience.icon

              return (
                <article
                  key={audience.title}
                  className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
                >
                  <Icon size={26} className="text-yellow-400" />
                  <h3 className="mt-5 text-xl font-bold">{audience.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-zinc-400">
                    {audience.description}
                  </p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-900/40 px-5 py-20 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-500">
              Funcionalidades
            </p>
            <h2 className="mt-4 text-3xl font-black md:text-4xl">
              O essencial para gerenciar o acampamento inteiro.
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-2 gap-3 lg:grid-cols-5">
            {features.map(([feature, Icon]) => (
              <div
                key={feature}
                className="flex min-h-28 flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-950 p-5"
              >
                <Icon size={22} className="text-yellow-400" />
                <span className="mt-5 text-sm font-semibold">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-500">
              Benefícios
            </p>
            <h2 className="mt-4 text-3xl font-black md:text-4xl">
              Menos controle manual, mais clareza para todos.
            </h2>
            <p className="mt-5 text-zinc-400">
              O AcampGestor ajuda a equipe de organização a trabalhar com dados
              consistentes durante todo o evento.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {benefits.map((benefit) => (
              <div
                key={benefit}
                className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5"
              >
                <span className="text-yellow-400">•</span>
                <span className="ml-2 text-sm font-semibold sm:ml-3 sm:text-base">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-zinc-800 bg-zinc-900/40 px-5 py-20 md:px-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-xs uppercase tracking-[0.3em] text-yellow-500">
            Como funciona
          </p>
          <h2 className="mt-4 text-3xl font-black md:text-4xl">
            Do pedido de acesso ao ranking compartilhado.
          </h2>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {steps.map((step, index) => (
              <article
                key={step}
                className="rounded-2xl border border-zinc-800 bg-zinc-950 p-6"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-500 font-black text-zinc-950">
                  {index + 1}
                </span>
                <h3 className="mt-5 text-lg font-bold">{step}</h3>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-20 md:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-3xl border border-yellow-500/30 bg-yellow-500/10 p-6 md:p-10 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-500">
              Exemplo visual
            </p>
            <h2 className="mt-4 text-3xl font-black md:text-4xl">
              Ranking simples para acompanhar durante o evento.
            </h2>
            <p className="mt-5 text-zinc-300">
              Este é apenas um mock visual. O ranking real usa o link público
              do acampamento configurado pela organização.
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
            {rankingPreview.map((team, index) => (
              <div
                key={team.name}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-zinc-800 py-4 last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="shrink-0 text-lg font-black text-yellow-500">
                    #{index + 1}
                  </span>
                  <span className={`h-9 w-9 shrink-0 rounded-xl ${team.color}`} />
                  <span className="truncate font-semibold">{team.name}</span>
                </div>
                <strong className="whitespace-nowrap">{team.points} pts</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 md:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-black md:text-5xl">
            Organize seu próximo acampamento com o AcampGestor.
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-zinc-400">
            Solicite acesso para avaliar o uso da plataforma ou entre no painel
            se sua conta administrativa já foi liberada.
          </p>
          <div className="mt-8 grid grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] justify-center gap-3 sm:flex sm:flex-row">
            <PrimaryCta className="whitespace-nowrap px-3 py-3 text-sm sm:px-6 sm:py-4 sm:text-base" />
            <SecondaryCta className="whitespace-nowrap px-3 py-3 text-sm sm:px-6 sm:py-4 sm:text-base" />
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-800 px-5 py-8 md:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 text-sm text-zinc-400 md:flex-row md:items-center md:justify-between">
          <strong className="text-white">AcampGestor</strong>
          <span>
            Plataforma para gestão de acampamentos, Times e rankings.
          </span>
        </div>
      </footer>
    </main>
  )
}
