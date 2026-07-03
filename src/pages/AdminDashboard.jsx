import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Building2,
  FileUser,
  TentTree,
  UserCog,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { supabase } from '../lib/supabase'

const initialMetrics = {
  organizations: 0,
  camps: 0,
  profiles: 0,
  pendingRequests: 0,
  publicCamps: 0,
}

const requestStatusLabels = {
  pending: 'Pendente',
  approved: 'Aprovada',
  rejected: 'Recusada',
}

const requestStatusStyles = {
  pending: 'bg-yellow-500/20 text-yellow-300',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
}

const organizationTypeLabels = {
  church: 'Igreja',
  school: 'Escola',
  other: 'Outra',
}

const metricCards = [
  {
    key: 'organizations',
    label: 'Organizações',
    icon: Building2,
  },
  {
    key: 'camps',
    label: 'Acampamentos',
    icon: TentTree,
  },
  {
    key: 'profiles',
    label: 'Usuários',
    icon: UserCog,
  },
  {
    key: 'pendingRequests',
    label: 'Solicitações pendentes',
    icon: FileUser,
  },
  {
    key: 'publicCamps',
    label: 'Acampamentos públicos',
    icon: TentTree,
  },
]

const shortcuts = [
  {
    label: 'Solicitações',
    description: 'Revisar pedidos de acesso',
    path: '/admin/solicitacoes',
    icon: FileUser,
  },
  {
    label: 'Usuários',
    description: 'Gerenciar profiles de acesso',
    path: '/admin/usuarios',
    icon: UserCog,
  },
  {
    label: 'Organizações',
    description: 'Ver igrejas, escolas e instituições',
    path: '/admin/organizacoes',
    icon: Building2,
  },
  {
    label: 'Acampamentos',
    description: 'Gerenciar eventos cadastrados',
    path: '/admin/acampamentos',
    icon: TentTree,
  },
]

function formatDate(value) {
  if (!value) return '-'
  return new Date(value).toLocaleString('pt-BR')
}

function getCount(response) {
  return response.count ?? 0
}

export default function AdminDashboard() {
  const [metrics, setMetrics] = useState(initialMetrics)
  const [organizations, setOrganizations] = useState([])
  const [camps, setCamps] = useState([])
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const loadDashboard = useCallback(async () => {
    setLoading(true)
    setError('')

    const [
      organizationsCount,
      campsCount,
      profilesCount,
      pendingRequestsCount,
      publicCampsCount,
      latestOrganizations,
      latestCamps,
      latestRequests,
    ] = await Promise.all([
      supabase.from('organizations').select('id', { count: 'exact', head: true }),
      supabase.from('camps').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase
        .from('access_requests')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'pending'),
      supabase
        .from('camps')
        .select('id', { count: 'exact', head: true })
        .eq('public_ranking_enabled', true),
      supabase
        .from('organizations')
        .select('id, name, type, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('camps')
        .select('id, name, slug, public_ranking_enabled, created_at, organizations(name)')
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('access_requests')
        .select('id, name, email, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
    ])

    const responses = [
      organizationsCount,
      campsCount,
      profilesCount,
      pendingRequestsCount,
      publicCampsCount,
      latestOrganizations,
      latestCamps,
      latestRequests,
    ]
    const dashboardError = responses.find((response) => response.error)?.error

    if (dashboardError) {
      console.error(dashboardError)
      setError('Não foi possível carregar o dashboard administrativo.')
      setLoading(false)
      return
    }

    setMetrics({
      organizations: getCount(organizationsCount),
      camps: getCount(campsCount),
      profiles: getCount(profilesCount),
      pendingRequests: getCount(pendingRequestsCount),
      publicCamps: getCount(publicCampsCount),
    })
    setOrganizations(latestOrganizations.data || [])
    setCamps(latestCamps.data || [])
    setRequests(latestRequests.data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadDashboard()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadDashboard])

  if (loading) {
    return (
      <section>
        <PageHeader
          eyebrow="AcampGestor"
          title="Painel da plataforma"
          description="Visão geral da plataforma AcampGestor"
        />
        <p className="text-zinc-400">Carregando dashboard administrativo...</p>
      </section>
    )
  }

  return (
    <section>
      <PageHeader
        eyebrow="AcampGestor"
        title="Painel da plataforma"
        description="Visão geral da plataforma AcampGestor"
      />

      {error && (
        <p
          role="alert"
          className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((metric) => {
          const Icon = metric.icon

          return (
            <div
              key={metric.key}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-zinc-400">{metric.label}</p>
                <Icon size={20} className="text-yellow-400" />
              </div>

              <strong className="mt-4 block text-3xl">
                {metrics[metric.key]}
              </strong>
            </div>
          )
        })}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {shortcuts.map((shortcut) => {
          const Icon = shortcut.icon

          return (
            <Link
              key={shortcut.path}
              to={shortcut.path}
              className="rounded-2xl border border-zinc-800 bg-zinc-900 p-5 transition hover:border-yellow-500/60 hover:bg-zinc-900/80"
            >
              <Icon size={22} className="text-yellow-400" />
              <strong className="mt-4 block">{shortcut.label}</strong>
              <span className="mt-2 block text-sm text-zinc-400">
                {shortcut.description}
              </span>
            </Link>
          )
        })}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-3">
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-bold">Últimas organizações</h2>

          {organizations.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-400">
              Nenhuma organização cadastrada.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {organizations.map((organization) => (
                <div
                  key={organization.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                >
                  <strong className="block">{organization.name}</strong>
                  <span className="mt-1 block text-sm text-zinc-400">
                    {organizationTypeLabels[organization.type] ||
                      organization.type ||
                      '-'}
                  </span>
                  <span className="mt-2 block text-xs text-zinc-500">
                    {formatDate(organization.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-bold">Últimos acampamentos</h2>

          {camps.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-400">
              Nenhum acampamento cadastrado.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {camps.map((camp) => (
                <div
                  key={camp.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong className="block">{camp.name}</strong>
                      <span className="mt-1 block text-sm text-zinc-400">
                        {camp.organizations?.name || 'Sem organização'}
                      </span>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        camp.public_ranking_enabled
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-zinc-700 text-zinc-300'
                      }`}
                    >
                      {camp.public_ranking_enabled ? 'Público' : 'Privado'}
                    </span>
                  </div>

                  <span className="mt-3 block break-all text-xs text-zinc-500">
                    {camp.slug ? `/${camp.slug}` : 'Sem slug'}
                  </span>
                  <span className="mt-2 block text-xs text-zinc-500">
                    {formatDate(camp.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <h2 className="text-xl font-bold">Últimas solicitações</h2>

          {requests.length === 0 ? (
            <p className="mt-6 text-sm text-zinc-400">
              Nenhuma solicitação encontrada.
            </p>
          ) : (
            <div className="mt-6 space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <strong className="block">{request.name}</strong>
                      <span className="mt-1 block break-all text-sm text-zinc-400">
                        {request.email}
                      </span>
                    </div>

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        requestStatusStyles[request.status] ||
                        requestStatusStyles.pending
                      }`}
                    >
                      {requestStatusLabels[request.status] || request.status}
                    </span>
                  </div>

                  <span className="mt-3 block text-xs text-zinc-500">
                    {formatDate(request.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  )
}
