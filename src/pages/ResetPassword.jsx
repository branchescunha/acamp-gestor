import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { logError } from '../utils/logger'

const MIN_PASSWORD_LENGTH = 8

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)
  const [hasRecoverySession, setHasRecoverySession] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let isMounted = true

    async function loadSession() {
      const { data } = await supabase.auth.getSession()

      if (!isMounted) {
        return
      }

      setHasRecoverySession(Boolean(data.session))
      setCheckingSession(false)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) {
        setHasRecoverySession(Boolean(session))
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  function validatePasswordForm() {
    if (!password) {
      return 'Informe a nova senha.'
    }

    if (!confirmPassword) {
      return 'Confirme a nova senha.'
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`
    }

    if (password !== confirmPassword) {
      return 'As senhas não conferem.'
    }

    return ''
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setSuccess('')

    const validationError = validatePasswordForm()

    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    })

    setLoading(false)

    if (updateError) {
      logError('ResetPassword', updateError)
      setError('Não foi possível redefinir a senha. Solicite um novo link.')
      return
    }

    setPassword('')
    setConfirmPassword('')
    setSuccess('Senha redefinida com sucesso. Redirecionando para o login...')

    window.setTimeout(async () => {
      await supabase.auth.signOut()
      navigate('/login', { replace: true })
    }, 1600)
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-8"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-yellow-500">
          AcampGestor
        </p>

        <h1 className="mt-4 text-4xl font-bold leading-tight">
          Redefinir senha
        </h1>

        <p className="mt-4 text-zinc-400">
          Crie uma nova senha para continuar usando o AcampGestor.
        </p>

        {!checkingSession && !hasRecoverySession && (
          <p
            role="alert"
            className="mt-6 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100"
          >
            Link expirado ou sessão de recuperação não encontrada. Solicite um
            novo e-mail de recuperação.
          </p>
        )}

        <label
          htmlFor="new-password"
          className="mt-8 block text-sm font-medium text-zinc-300"
        >
          Nova senha
        </label>

        <input
          id="new-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Nova senha"
          className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-4 outline-none focus:border-yellow-500"
        />

        <label
          htmlFor="confirm-new-password"
          className="mt-5 block text-sm font-medium text-zinc-300"
        >
          Confirmar nova senha
        </label>

        <input
          id="confirm-new-password"
          type="password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="Confirme a nova senha"
          className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-4 outline-none focus:border-yellow-500"
        />

        {error && (
          <p
            role="alert"
            className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
          >
            {error}
          </p>
        )}

        {success && (
          <p
            role="status"
            className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
          >
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || checkingSession || !hasRecoverySession}
          className="mt-6 w-full rounded-xl bg-yellow-500 px-4 py-4 font-semibold text-zinc-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Salvando...' : 'Redefinir senha'}
        </button>

        <Link
          to="/recuperar-senha"
          className="mt-6 block text-center text-sm text-zinc-400 hover:text-yellow-500"
        >
          Solicitar novo e-mail de recuperação
        </Link>
      </form>
    </main>
  )
}
