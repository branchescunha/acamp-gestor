import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { logError } from '../utils/logger'

export default function RequestAccess() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [organization, setOrganization] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setSuccess('')

    const nameValue = name.trim()
    const emailValue = email.trim()
    const organizationValue = organization.trim()
    const messageValue = message.trim()

    if (!nameValue) {
      setError('Informe seu nome.')
      return
    }

    if (!emailValue) {
      setError('Informe seu e-mail.')
      return
    }

    if (!organizationValue) {
      setError('Informe sua igreja ou organização.')
      return
    }

    setLoading(true)

    const { error: insertError } = await supabase
      .from('access_requests')
      .insert({
        name: nameValue,
        email: emailValue,
        church_name: organizationValue,
        message: messageValue || null,
      })

    setLoading(false)

    if (insertError) {
      logError('RequestAccess', insertError)
      setError('Não foi possível enviar a solicitação. Tente novamente.')
      return
    }

    setName('')
    setEmail('')
    setOrganization('')
    setMessage('')
    setSuccess(
      'Solicitação enviada com sucesso. A organização responsável irá avaliar o pedido de acesso.',
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-white">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8"
      >
        <p className="text-xs uppercase tracking-[0.3em] text-yellow-500">
          AcampGestor
        </p>

        <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl">
          Solicitar acesso
        </h1>

        <p className="mt-4 text-zinc-400">
          O cadastro administrativo do AcampGestor é controlado. Envie seus
          dados para que a organização responsável avalie a criação da sua
          conta.
        </p>

        <label
          htmlFor="request-name"
          className="mt-8 block text-sm font-medium text-zinc-300"
        >
          Nome
        </label>

        <input
          id="request-name"
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Seu nome"
          autoComplete="name"
          className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-4 outline-none focus:border-yellow-500"
        />

        <label
          htmlFor="request-email"
          className="mt-5 block text-sm font-medium text-zinc-300"
        >
          E-mail
        </label>

        <input
          id="request-email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="seu-email@exemplo.com"
          autoComplete="email"
          className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-4 outline-none focus:border-yellow-500"
        />

        <label
          htmlFor="request-organization"
          className="mt-5 block text-sm font-medium text-zinc-300"
        >
          Igreja/organização
        </label>

        <input
          id="request-organization"
          type="text"
          value={organization}
          onChange={(event) => setOrganization(event.target.value)}
          placeholder="Nome da igreja ou organização"
          autoComplete="organization"
          className="mt-2 w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-4 outline-none focus:border-yellow-500"
        />

        <label
          htmlFor="request-message"
          className="mt-5 block text-sm font-medium text-zinc-300"
        >
          Mensagem, opcional
        </label>

        <textarea
          id="request-message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Informe o evento ou contexto do acesso"
          rows={4}
          className="mt-2 w-full resize-none rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-4 outline-none focus:border-yellow-500"
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
          {loading ? 'Enviando...' : 'Enviar solicitação'}
        </button>

        <Link
          to="/"
          className="mt-5 block text-center text-sm font-medium text-zinc-300 hover:text-yellow-500"
        >
          Voltar para o início
        </Link>

        <Link
          to="/login"
          className="mt-3 block text-center text-sm text-zinc-400 hover:text-yellow-500"
        >
          Entrar
        </Link>
      </form>
    </main>
  )
}
