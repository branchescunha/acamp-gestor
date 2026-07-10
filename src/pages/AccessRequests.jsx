import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import RoleAccessNotice from '../components/RoleAccessNotice'
import ResponsiveTable from '../components/ResponsiveTable'
import { useAuthContext } from '../hooks/useAuth'
import { useUserProfile } from '../hooks/useUserProfile'
import { supabase } from '../lib/supabase'
import { logError } from '../utils/logger'

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
  const [firstAccessLink, setFirstAccessLink] = useState('')

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setError('')

    const { data, error: loadError } = await supabase
      .from('access_requests')
      .select(
        'id, name, email, church_name, message, status, created_at, reviewed_at, reviewed_by',
      )
      .order('created_at', { ascending: false })

    if (loadError) {
      logError('AccessRequests', loadError)
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

  async function approveRequest(requestId) {
    setUpdatingId(requestId)
    setError('')
    setSuccess('')
    setFirstAccessLink('')

    const { data, error: approvalError } = await supabase.functions.invoke(
      'approve-access-request',
      {
        body: { requestId },
      },
    )

    if (approvalError || !data?.success) {
      logError('AccessRequests', approvalError || data)
      setError(
        data?.detail
          ? `Não foi possível aprovar automaticamente esta solicitação. ${data.detail}`
          : 'Não foi possível aprovar automaticamente esta solicitação.',
      )
      setUpdatingId(null)
      return
    }

    setSuccess(
      data.message ||
        'Solicitação aprovada. Usuário, profile e vínculo com organização foram criados automaticamente.',
    )
    setFirstAccessLink(data.firstAccessLink || '')
    await loadRequests()
    setUpdatingId(null)
  }

  async function rejectRequest(requestId) {
    setUpdatingId(requestId)
    setError('')
    setSuccess('')
    setFirstAccessLink('')

    const { data, error: updateError } = await supabase
      .from('access_requests')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: session?.user?.id,
      })
      .eq('id', requestId)
      .select(
        'id, name, email, church_name, message, status, created_at, reviewed_at, reviewed_by',
      )
      .single()

    if (updateError) {
      logError('AccessRequests', updateError)
      setError('Não foi possível atualizar a solicitação.')
      setUpdatingId(null)
      return
    }

    setRequests((currentRequests) =>
      currentRequests.map((request) =>
        request.id === requestId ? data : request,
      ),
    )
    setSuccess('Solicitação recusada.')
    setUpdatingId(null)
  }

  async function copyFirstAccessLink() {
    if (!firstAccessLink || !navigator.clipboard) {
      setError('Não foi possível acessar a área de transferência do navegador.')
      return
    }

    try {
      await navigator.clipboard.writeText(firstAccessLink)
      setSuccess('Link de primeiro acesso copiado.')
    } catch (copyError) {
      logError('AccessRequests', copyError)
      setError('Não foi possível copiar o link automaticamente.')
    }
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
              onClick={() => approveRequest(request.id)}
              className="rounded-lg border border-green-500/40 px-3 py-2 text-xs font-semibold text-green-400 transition hover:bg-green-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updatingId === request.id ? 'Aprovando...' : 'Aprovar'}
            </button>

            <button
              type="button"
              disabled={updatingId === request.id}
              onClick={() => rejectRequest(request.id)}
              className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {updatingId === request.id ? 'Atualizando...' : 'Recusar'}
            </button>
          </div>
        ) : request.status === 'approved' ? (
          <span className="text-xs text-emerald-400">Acesso criado</span>
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
        description="Avalie pedidos de acesso administrativo. Aprovar uma solicitação cria o acesso inicial do gestor automaticamente."
      />

      <div className="mb-6 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 p-5 text-sm text-yellow-100">
        Solicitações aprovadas criam automaticamente usuário, profile de gestor
        e vínculo inicial com a organização.{' '}
        <Link
          to="/admin/convites"
          className="font-semibold text-yellow-300 hover:text-yellow-200"
        >
          Convites
        </Link>{' '}
        continuam disponíveis como histórico, apoio ou fluxo manual secundário.
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

      {firstAccessLink && (
        <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-sm text-emerald-100">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h2 className="font-semibold text-emerald-200">
                Link de primeiro acesso
              </h2>
              <p className="mt-2 text-emerald-100/80">
                Envie este link ao gestor para que ele defina a senha e acesse
                o sistema.
              </p>
              <p className="mt-3 break-all font-mono text-xs text-emerald-100/80">
                {firstAccessLink}
              </p>
            </div>

            <button
              type="button"
              onClick={copyFirstAccessLink}
              className="rounded-xl border border-emerald-400/40 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:bg-emerald-500/10"
            >
              Copiar link
            </button>
          </div>
        </div>
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
