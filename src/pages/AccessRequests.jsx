import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import RoleAccessNotice from '../components/RoleAccessNotice'
import ResponsiveTable from '../components/ResponsiveTable'
import { useAuthContext } from '../hooks/useAuth'
import { useUserProfile } from '../hooks/useUserProfile'
import { supabase } from '../lib/supabase'

const statusLabels = {
  pending: 'Pendente',
  approved: 'Aprovada',
  rejected: 'Recusada',
}

const statusStyles = {
  pending: 'bg-yellow-500/20 text-yellow-300',
  approved: 'bg-green-500/20 text-green-400',
  rejected: 'bg-red-500/20 text-red-400',
}

export default function AccessRequests() {
  const { session } = useAuthContext()
  const {
    profile,
    isAdmin,
    isActive,
    loading: loadingProfile,
    error: profileError,
  } = useUserProfile()
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setError('')

    const { data, error: loadError } = await supabase
      .from('access_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (loadError) {
      console.error(loadError)
      setError('Não foi possível carregar as solicitações de acesso.')
      setLoading(false)
      return
    }

    setRequests(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!isAdmin) return undefined

    const timeoutId = window.setTimeout(() => {
      void loadRequests()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [isAdmin, loadRequests])

  function formatDate(value) {
    if (!value) return '-'
    return new Date(value).toLocaleString('pt-BR')
  }

  function getInvitationPath(request) {
    const params = new URLSearchParams({
      name: request.name || '',
      email: request.email || '',
    })

    return `/admin/convites?${params.toString()}`
  }

  async function reviewRequest(requestId, status) {
    setUpdatingId(requestId)
    setError('')
    setSuccess('')

    const { data, error: updateError } = await supabase
      .from('access_requests')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: session?.user?.id,
      })
      .eq('id', requestId)
      .select()
      .single()

    if (updateError) {
      console.error(updateError)
      setError('Não foi possível atualizar a solicitação.')
      setUpdatingId(null)
      return
    }

    setRequests((currentRequests) =>
      currentRequests.map((request) =>
        request.id === requestId ? data : request,
      ),
    )
    setSuccess(
      status === 'approved'
        ? 'Solicitação aprovada. Crie um convite administrativo, depois crie o usuário no Supabase Auth e cadastre o perfil em Usuários.'
        : 'Solicitação recusada.',
    )
    setUpdatingId(null)
  }

  const columns = [
    {
      key: 'created_at',
      label: 'Data',
      render: (request) => (
        <span className="text-zinc-400">{formatDate(request.created_at)}</span>
      ),
    },
    {
      key: 'name',
      label: 'Nome',
      render: (request) => <span className="font-medium">{request.name}</span>,
    },
    {
      key: 'email',
      label: 'E-mail',
      render: (request) => (
        <span className="break-all text-zinc-400">{request.email}</span>
      ),
    },
    {
      key: 'church_name',
      label: 'Igreja/organização',
      render: (request) => (
        <span className="text-zinc-400">{request.church_name}</span>
      ),
    },
    {
      key: 'message',
      label: 'Mensagem',
      render: (request) => (
        <span className="text-zinc-400">{request.message || '-'}</span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (request) => (
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            statusStyles[request.status] || statusStyles.pending
          }`}
        >
          {statusLabels[request.status] || request.status}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (request) =>
        request.status === 'pending' ? (
          <div className="flex flex-col gap-2 sm:flex-row md:justify-start">
            <button
              type="button"
              disabled={updatingId === request.id}
              onClick={() => reviewRequest(request.id, 'approved')}
              className="rounded-lg border border-green-500/40 px-3 py-2 text-xs font-semibold text-green-400 transition hover:bg-green-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Aprovar
            </button>

            <button
              type="button"
              disabled={updatingId === request.id}
              onClick={() => reviewRequest(request.id, 'rejected')}
              className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Recusar
            </button>
          </div>
        ) : request.status === 'approved' ? (
          <Link
            to={getInvitationPath(request)}
            className="text-xs font-semibold text-yellow-400 hover:text-yellow-300"
          >
            Criar convite
          </Link>
        ) : (
          <span className="text-xs text-zinc-500">Revisada</span>
        ),
    },
  ]

  if (loadingProfile) {
    return <p className="text-zinc-400">Verificando perfil de acesso...</p>
  }

  if (profileError) {
    return (
      <RoleAccessNotice
        title="Perfil indisponível"
        message={profileError}
        actionPath=""
      />
    )
  }

  if (!profile) {
    return (
      <RoleAccessNotice
        title="Perfil de acesso não encontrado"
        message="Seu usuário ainda não possui um perfil de acesso. Entre em contato com o administrador da plataforma."
        actionPath=""
      />
    )
  }

  if (!isActive) {
    return (
      <RoleAccessNotice
        title="Acesso suspenso"
        message="Seu acesso está suspenso. Entre em contato com o administrador da plataforma."
        actionPath=""
      />
    )
  }

  if (!isAdmin) {
    return (
      <RoleAccessNotice
        title="Acesso restrito ao administrador"
        message="Somente o administrador geral da plataforma pode revisar solicitações de acesso."
      />
    )
  }

  return (
    <section>
      <PageHeader
        eyebrow="Acessos"
        title="Solicitações"
        description="Avalie pedidos de acesso administrativo. Aprovar uma solicitação não cria usuário automaticamente."
      />

      <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-sm text-yellow-100">
        Usuários administrativos ainda devem ser criados manualmente no
        Supabase Auth após a aprovação. Organize o processo em{' '}
        <Link
          to="/admin/convites"
          className="font-semibold text-yellow-300 hover:text-yellow-200"
        >
          Convites
        </Link>{' '}
        e depois cadastre o perfil em{' '}
        <Link
          to="/admin/usuarios"
          className="font-semibold text-yellow-300 hover:text-yellow-200"
        >
          Usuários
        </Link>
        .
      </div>

      {error && (
        <p
          role="alert"
          className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
        >
          {error}
        </p>
      )}

      {success && (
        <p
          role="status"
          className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        >
          {success}
        </p>
      )}

      {loading ? (
        <p className="text-zinc-400">Carregando solicitações...</p>
      ) : (
        <ResponsiveTable
          columns={columns}
          data={requests}
          emptyMessage="Nenhuma solicitação de acesso encontrada."
        />
      )}
    </section>
  )
}
