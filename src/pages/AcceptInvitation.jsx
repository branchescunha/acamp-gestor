import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { useAuthContext } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'

const roleLabels = {
  admin: 'Administrador',
  gestor: 'Gestor',
}

const statusLabels = {
  pending: 'Pendente',
  accepted: 'Aceito',
  canceled: 'Cancelado',
}

function getInvitationFromRpcResult(data) {
  if (Array.isArray(data)) return data[0] || null
  return data || null
}

function getUserEmail(session) {
  return session?.user?.email || ''
}

export default function AcceptInvitation() {
  const { token = '' } = useParams()
  const location = useLocation()
  const { session, loadingAuth } = useAuthContext()
  const [invitation, setInvitation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const loadInvitation = useCallback(async () => {
    setLoading(true)
    setError('')

    const { data, error: loadError } = await supabase.rpc(
      'get_invitation_by_token',
      {
        invitation_token: token,
      },
    )

    if (loadError) {
      console.error(loadError)
      setInvitation(null)
      setError('Não foi possível carregar este convite.')
      setLoading(false)
      return
    }

    setInvitation(getInvitationFromRpcResult(data))
    setLoading(false)
  }, [token])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadInvitation()
    }, 0)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [loadInvitation])

  async function handleAcceptInvitation() {
    setAccepting(true)
    setError('')
    setSuccess('')

    const { data, error: acceptError } = await supabase.rpc(
      'accept_invitation',
      {
        invitation_token: token,
      },
    )

    if (acceptError) {
      console.error(acceptError)
      setError(
        acceptError.message ||
          'Não foi possível ativar o acesso deste convite.',
      )
      setAccepting(false)
      return
    }

    const acceptedInvitation = getInvitationFromRpcResult(data)

    setInvitation((currentInvitation) => ({
      ...currentInvitation,
      status: acceptedInvitation?.invitation_status || 'accepted',
      accepted_at:
        acceptedInvitation?.accepted_at || new Date().toISOString(),
      canceled_at: null,
    }))
    setSuccess('Acesso ativado com sucesso.')
    setAccepting(false)
  }

  const userEmail = getUserEmail(session)
  const isPending = invitation?.status === 'pending'
  const isAccepted = invitation?.status === 'accepted'
  const isCanceled = invitation?.status === 'canceled'
  const isDifferentEmail =
    Boolean(session && invitation?.email) &&
    userEmail.toLowerCase() !== invitation.email.toLowerCase()

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-white">
      <section className="w-full max-w-xl rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
        <p className="text-xs uppercase tracking-[0.3em] text-yellow-500">
          AcampGestor
        </p>

        <h1 className="mt-4 text-4xl font-bold leading-tight">
          Convite administrativo
        </h1>

        {loading || loadingAuth ? (
          <p className="mt-6 text-zinc-400">Carregando convite...</p>
        ) : error && !invitation ? (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {error}
          </p>
        ) : !invitation ? (
          <p className="mt-6 text-zinc-400">Convite não encontrado.</p>
        ) : (
          <>
            <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950 p-5">
              <dl className="space-y-4 text-sm">
                <div>
                  <dt className="text-zinc-500">Nome</dt>
                  <dd className="mt-1 font-medium">{invitation.name}</dd>
                </div>

                <div>
                  <dt className="text-zinc-500">E-mail convidado</dt>
                  <dd className="mt-1 break-all text-zinc-300">
                    {invitation.email}
                  </dd>
                </div>

                <div>
                  <dt className="text-zinc-500">Papel</dt>
                  <dd className="mt-1 text-zinc-300">
                    {roleLabels[invitation.role] || invitation.role}
                  </dd>
                </div>

                <div>
                  <dt className="text-zinc-500">Status</dt>
                  <dd className="mt-1 text-zinc-300">
                    {statusLabels[invitation.status] || invitation.status}
                  </dd>
                </div>
              </dl>
            </div>

            {error && (
              <p
                role="alert"
                className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
              >
                {error}
              </p>
            )}

            {success && (
              <p
                role="status"
                className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
              >
                {success}
              </p>
            )}

            {isPending && !session && (
              <div className="mt-6 space-y-4">
                <p className="text-sm leading-relaxed text-zinc-400">
                  Entre com o e-mail convidado para ativar o acesso.
                </p>

                <Link
                  to="/login"
                  state={{ from: location.pathname }}
                  className="inline-flex rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-yellow-400"
                >
                  Entrar para ativar
                </Link>
              </div>
            )}

            {isPending && session && isDifferentEmail && (
              <div className="mt-6 space-y-4">
                <p className="text-sm leading-relaxed text-red-200">
                  Este convite pertence a outro e-mail. Entre com o e-mail
                  convidado.
                </p>

                <p className="text-xs text-zinc-500">
                  E-mail atual: {userEmail}
                </p>
              </div>
            )}

            {isPending && session && !isDifferentEmail && (
              <div className="mt-6 space-y-4">
                <p className="text-sm leading-relaxed text-zinc-400">
                  O convite será vinculado ao usuário autenticado atual.
                </p>

                <button
                  type="button"
                  onClick={handleAcceptInvitation}
                  disabled={accepting}
                  className="rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {accepting ? 'Ativando...' : 'Ativar acesso'}
                </button>
              </div>
            )}

            {isAccepted && (
              <div className="mt-6 space-y-4">
                <p className="text-sm leading-relaxed text-zinc-400">
                  Convite já aceito.
                </p>

                <Link
                  to={session ? '/admin/acampamentos' : '/login'}
                  className="inline-flex rounded-xl bg-yellow-500 px-5 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-yellow-400"
                >
                  {session ? 'Ir para acampamentos' : 'Entrar'}
                </Link>
              </div>
            )}

            {isCanceled && (
              <p className="mt-6 text-sm leading-relaxed text-zinc-400">
                Este convite foi cancelado.
              </p>
            )}
          </>
        )}
      </section>
    </main>
  )
}
