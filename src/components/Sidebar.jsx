import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  ClipboardCheck,
  Building2,
  FileUser,
  TentTree,
  Swords,
  Download,
  History,
  LayoutDashboard,
  LogOut,
  MailPlus,
  PlusCircle,
  Trophy,
  UserCog,
  UserRound,
  Users,
  X,
} from 'lucide-react'
import {
  getCampSlugStorageKey,
  useActiveCamp,
} from '../hooks/useActiveCamp'
import { useUserProfile } from '../hooks/useUserProfile'
import { supabase } from '../lib/supabase'

const adminOperationLinks = [
  { label: 'Equipes', path: '/admin/tribos', icon: Trophy },
  { label: 'Times', path: '/admin/times', icon: Swords },
  { label: 'Participantes', path: '/admin/participantes', icon: Users },
  { label: 'Pontuação', path: '/admin/pontuacao', icon: PlusCircle },
  { label: 'Gincana', path: '/admin/gincana', icon: Swords },
  { label: 'Inspeções', path: '/admin/inspecoes', icon: ClipboardCheck },
  { label: 'Histórico', path: '/admin/historico', icon: History },
  { label: 'Exportação', path: '/admin/exportacao', icon: Download },
]

function buildCampOperationLinks(campAdminBasePath) {
  return [
    { label: 'Dashboard', path: campAdminBasePath, icon: LayoutDashboard },
    { label: 'Conta', path: `${campAdminBasePath}/conta`, icon: UserRound },
    { label: 'Equipes', path: `${campAdminBasePath}/equipes`, icon: Trophy },
    { label: 'Times', path: `${campAdminBasePath}/times`, icon: Swords },
    {
      label: 'Participantes',
      path: `${campAdminBasePath}/participantes`,
      icon: Users,
    },
    {
      label: 'Pontuação',
      path: `${campAdminBasePath}/pontuacao`,
      icon: PlusCircle,
    },
    { label: 'Gincana', path: `${campAdminBasePath}/gincana`, icon: Swords },
    {
      label: 'Inspeções',
      path: `${campAdminBasePath}/inspecoes`,
      icon: ClipboardCheck,
    },
    { label: 'Histórico', path: `${campAdminBasePath}/historico`, icon: History },
    {
      label: 'Exportação',
      path: `${campAdminBasePath}/exportacao`,
      icon: Download,
    },
  ]
}

export default function Sidebar({ isMenuOpen = false, onClose }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAdmin, isGestor } = useUserProfile()
  const { activeCampId } = useActiveCamp()
  const [activeCampDetails, setActiveCampDetails] = useState(null)
  const [rankingMessage, setRankingMessage] = useState('')
  const [publicRankingCamps, setPublicRankingCamps] = useState([])

  const activeCampSlug = activeCampId
    ? activeCampDetails?.slug ||
      window.localStorage.getItem(getCampSlugStorageKey(activeCampId)) ||
      ''
    : ''
  const campAdminBasePath = activeCampSlug ? `/${activeCampSlug}/gestor` : ''
  const dashboardPath = isAdmin ? '/admin' : campAdminBasePath || '/admin'
  const isPlatformRoute = location.pathname.startsWith('/admin')
  const isCampAdminRoute = !isPlatformRoute
  const roleLabel = isCampAdminRoute
    ? 'Acesso gestor'
    : isAdmin
      ? 'Administrador geral'
      : isGestor
        ? 'Gestor'
        : 'Perfil pendente'
  const panelTitle =
    isAdmin && !isCampAdminRoute
      ? 'Painel da plataforma'
      : isGestor
        ? 'Painel do gestor'
        : 'Painel do acampamento'
  const operationLinks = isCampAdminRoute
    ? campAdminBasePath
      ? buildCampOperationLinks(campAdminBasePath)
      : []
    : adminOperationLinks
  const operationDisabled = isCampAdminRoute
    ? !campAdminBasePath
    : !activeCampId && (isAdmin || isGestor)

  const platformLinks = [
    {
      label: 'Dashboard',
      path: dashboardPath,
      icon: LayoutDashboard,
    },
    { label: 'Conta', path: '/admin/conta', icon: UserRound },
    { label: 'Acampamentos', path: '/admin/acampamentos', icon: TentTree },
    { label: 'Organizações', path: '/admin/organizacoes', icon: Building2 },
    ...(isAdmin
      ? [{ label: 'Solicitações', path: '/admin/solicitacoes', icon: FileUser }]
      : []),
    ...(isAdmin
      ? [{ label: 'Usuários', path: '/admin/usuarios', icon: UserCog }]
      : []),
    ...(isAdmin
      ? [{ label: 'Convites', path: '/admin/convites', icon: MailPlus }]
      : []),
  ]

  useEffect(() => {
    let shouldIgnore = false

    async function loadActiveCampDetails() {
      if (!activeCampId) {
        setActiveCampDetails(null)
        return
      }

      const { data, error } = await supabase
        .from('camps')
        .select('id, name, slug, public_ranking_enabled')
        .eq('id', activeCampId)
        .maybeSingle()

      if (shouldIgnore) return

      if (error) {
        console.error(error)
        setActiveCampDetails(null)
        return
      }

      setActiveCampDetails(data || null)
    }

    void loadActiveCampDetails()

    return () => {
      shouldIgnore = true
    }
  }, [activeCampId])

  async function handleOpenRanking() {
    setRankingMessage('')
    setPublicRankingCamps([])

    if (activeCampId) {
      const camp =
        activeCampDetails ||
        (await supabase
          .from('camps')
          .select('id, name, slug, public_ranking_enabled')
          .eq('id', activeCampId)
          .maybeSingle()
          .then(({ data, error }) => {
            if (error) {
              console.error(error)
              return null
            }

            return data
          }))

      const slug =
        camp?.slug ||
        window.localStorage.getItem(getCampSlugStorageKey(activeCampId)) ||
        ''

      if (!slug) {
        setRankingMessage('Este acampamento ainda não possui URL pública.')
        return
      }

      if (camp && camp.public_ranking_enabled === false) {
        setRankingMessage('O ranking público deste acampamento está desativado.')
        return
      }

      onClose?.()
      navigate(`/${slug}`)
      return
    }

    const { data, error } = await supabase
      .from('camps')
      .select('id, name, slug')
      .eq('public_ranking_enabled', true)
      .not('slug', 'is', null)
      .order('name', { ascending: true })

    if (error) {
      console.error(error)
      setRankingMessage('Não foi possível carregar rankings públicos.')
      return
    }

    if (!data?.length) {
      setRankingMessage('Nenhum ranking público disponível no momento.')
      return
    }

    setPublicRankingCamps(data)
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error(error)
      return
    }

    onClose?.()
    navigate('/login', { replace: true })
  }

  function renderLink(link, disabled = false) {
    const Icon = link.icon
    const isActive = location.pathname === link.path
    const targetPath = disabled
      ? isCampAdminRoute
        ? link.path
        : '/admin/acampamentos'
      : link.path

    return (
      <Link
        key={link.path}
        to={targetPath}
        onClick={onClose}
        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
          isActive
            ? 'bg-yellow-500 text-zinc-950'
            : disabled
              ? 'text-zinc-600 hover:bg-zinc-900 hover:text-zinc-300'
              : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
        }`}
      >
        <Icon size={18} />
        {link.label}
      </Link>
    )
  }

  return (
    <aside
      className={`fixed left-0 top-0 z-50 h-screen w-[85%] max-w-[320px] overflow-y-auto border-r border-zinc-800 bg-black p-5 transition-transform duration-300 lg:sticky lg:top-0 lg:min-h-screen lg:w-72 lg:translate-x-0 lg:bg-zinc-950 ${
        isMenuOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-start justify-between gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-yellow-500">
            AcampGestor
          </p>

          <h1 className="mt-3 text-xl font-bold">{panelTitle}</h1>

          <p className="mt-2 text-sm text-zinc-400">{roleLabel}</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar menu"
          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 lg:hidden"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="mt-6 space-y-6">
        {isPlatformRoute && (
        <div>
          <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">
            Plataforma
          </p>
          <div className="space-y-2">
            {platformLinks.map((link) => renderLink(link))}
          </div>
        </div>
        )}

        <div>
          <p className="mb-2 px-4 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">
            Operação do acampamento
          </p>

          {operationDisabled && (
            <p className="mb-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-xs leading-5 text-zinc-500">
              Selecione um acampamento para acessar equipes, participantes,
              pontuação e relatórios.
            </p>
          )}

          <div className="space-y-2">
            {operationLinks.map((link) => renderLink(link, operationDisabled))}
          </div>
        </div>

      </nav>

      <div className="mt-8 space-y-3">
        <button
          type="button"
          onClick={handleOpenRanking}
          className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 px-4 py-3 text-left text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
        >
          <Trophy size={18} />
          {isCampAdminRoute ? 'Ver ranking público' : 'Ver ranking do evento'}
        </button>

        {rankingMessage && (
          <p className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-xs leading-5 text-zinc-400">
            {rankingMessage}
          </p>
        )}

        {publicRankingCamps.length > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
            <p className="mb-2 px-1 text-xs text-zinc-500">
              Rankings públicos disponíveis
            </p>
            <div className="space-y-1">
              {publicRankingCamps.map((camp) => (
                <Link
                  key={camp.id}
                  to={`/${camp.slug}`}
                  onClick={onClose}
                  className="block rounded-lg px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
                >
                  {camp.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl border border-zinc-800 px-4 py-3 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  )
}
