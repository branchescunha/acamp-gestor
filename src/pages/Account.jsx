import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../hooks/useAuth'
import { logError } from '../utils/logger'

const MIN_PASSWORD_LENGTH = 8

export default function Account() {
  const { campSlug } = useParams()
  const { session } = useAuthContext()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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
      logError('Account', updateError)
      setError('Não foi possível alterar a senha.')
      return
    }

    setPassword('')
    setConfirmPassword('')
    setSuccess('Senha alterada com sucesso.')
  }

  return (
    <div>
      <header>
        <p className="text-xs uppercase tracking-[0.3em] text-yellow-500">
          Conta
        </p>

        <h1 className="mt-3 text-3xl font-bold">Configurações da conta</h1>

        <p className="mt-3 max-w-2xl text-zinc-400">
          {campSlug
            ? 'Gerencie seu acesso gestor no AcampGestor.'
            : 'Gerencie o acesso administrativo no AcampGestor.'}
        </p>
      </header>

      <section className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
          <p className="text-sm text-zinc-400">Usuário logado</p>

          <p className="mt-3 break-all text-lg font-semibold text-white">
            {session?.user?.email || 'E-mail não disponível'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6"
        >
          <h2 className="text-xl font-semibold">Alterar senha</h2>

          <label
            htmlFor="account-new-password"
            className="mt-6 block text-sm font-medium text-zinc-300"
          >
            Nova senha
          </label>

          <input
            id="account-new-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Nova senha"
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
          />

          <label
            htmlFor="account-confirm-password"
            className="mt-5 block text-sm font-medium text-zinc-300"
          >
            Confirmar nova senha
          </label>

          <input
            id="account-confirm-password"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Confirme a nova senha"
            className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 outline-none focus:border-yellow-500"
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
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-yellow-500 px-4 py-3 font-semibold text-zinc-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Salvando...' : 'Salvar nova senha'}
          </button>
        </form>
      </section>
    </div>
  )
}
