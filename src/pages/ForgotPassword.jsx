import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { logError } from '../utils/logger'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    const emailValue = email.trim()

    setError('')
    setSuccess('')

    if (!emailValue) {
      setError('Informe o e-mail de recuperação.')
      return
    }

    setLoading(true)

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      emailValue,
      {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      },
    )

    setLoading(false)

    if (resetError) {
      logError('ForgotPassword', resetError)
      setError('Não foi possível enviar o e-mail de recuperação.')
      return
    }

    setSuccess('E-mail de recuperação enviado. Verifique sua caixa de entrada.')
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
          Recuperar senha
        </h1>

        <p className="mt-4 text-zinc-400">
          Recupere o acesso ao painel administrativo do evento.
        </p>

        <label
          htmlFor="recovery-email"
          className="mt-8 block text-sm font-medium text-zinc-300"
        >
          E-mail
        </label>

        <input
          id="recovery-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="seu-email@exemplo.com"
          autoComplete="email"
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
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-yellow-500 px-4 py-4 font-semibold text-zinc-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Enviando...' : 'Enviar link de recuperação'}
        </button>

        <Link
          to="/login"
          className="mt-6 block text-center text-sm text-zinc-400 hover:text-yellow-500"
        >
          Voltar para o login
        </Link>
      </form>
    </main>
  )
}
