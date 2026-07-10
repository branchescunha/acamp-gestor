import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../hooks/useAuth'
import { useUserProfile } from '../hooks/useUserProfile'
import { logError } from '../utils/logger'

function getSafeRedirectPath(value) {
  if (typeof value !== 'string') return '/admin'
  if (!value.startsWith('/') || value.startsWith('//')) return '/admin'
  return value
}

function getRoleRedirectPath(path, role) {
  if (role === 'admin') {
    return path.startsWith('/admin') ? path : '/admin'
  }

  if (role === 'gestor') {
    if (path === '/gestor' || path.startsWith('/gestor/')) return path
    if (/^\/[^/]+\/gestor(?:\/|$)/.test(path)) return path
    return '/gestor'
  }

  return '/admin'
}

export default function Login() {
  const location = useLocation()
  const { session, loadingAuth } = useAuthContext()
  const { role, loading: loadingProfile } = useUserProfile()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const redirectPath = getRoleRedirectPath(
    getSafeRedirectPath(location.state?.from),
    role,
  )

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')

    const emailValue = email.trim()

    if (!emailValue || !password.trim()) {
      setError('Informe seu e-mail e senha para continuar.')
      return
    }

    setLoading(true)

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: emailValue,
      password,
    })

    if (loginError) {
      logError('Login', loginError)
      setError('Não foi possível entrar. Verifique o e-mail e a senha.')
      setLoading(false)
      return
    }

    setLoading(false)
  }

  if (loadingAuth || (session && loadingProfile)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <p className="text-zinc-400">Verificando sessão...</p>
      </main>
    )
  }

  if (session) {
    return <Navigate to={redirectPath} replace />
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
          Painel administrativo
        </h1>

        <p className="mt-4 text-zinc-400">
          Acesse o painel administrativo do seu evento.
        </p>

        <label
          htmlFor="admin-email"
          className="mt-8 block text-sm font-medium text-zinc-300"
        >
          E-mail
        </label>

        <input
          id="admin-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="seu-email@exemplo.com"
          autoComplete="email"
          className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-4 outline-none focus:border-yellow-500"
        />

        <label
          htmlFor="admin-password"
          className="mt-5 block text-sm font-medium text-zinc-300"
        >
          Senha
        </label>

        <input
          id="admin-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Senha de acesso"
          autoComplete="current-password"
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

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-xl bg-yellow-500 px-4 py-4 font-semibold text-zinc-950 transition hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        <Link
          to="/recuperar-senha"
          className="mt-5 block text-center text-sm text-zinc-400 hover:text-yellow-500"
        >
          Esqueci minha senha
        </Link>

        <Link
          to="/solicitar-acesso"
          className="mt-4 block text-center text-sm text-zinc-400 hover:text-yellow-500"
        >
          Ainda não tem conta? Solicitar acesso
        </Link>
      </form>
    </main>
  )
}
