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
import { getCampSlugStorageKey, useActiveCamp } from '../hooks/useActiveCamp'
import { useUserProfile } from '../hooks/useUserProfile'
import { supabase } from '../lib/supabase'

export default function Sidebar({ isMenuOpen = false, onClose }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAdmin, isGestor } = useUserProfile()
  const { activeCampId } = useActiveCamp()
  const activeCampSlug = activeCampId
    ? window.localStorage.getItem(getCampSlugStorageKey(activeCampId))
    : ''
  const campAdminBasePath = activeCampSlug ? `/${activeCampSlug}/admin` : ''
  const dashboardPath = isAdmin ? '/admin' : campAdminBasePath || '/admin'
  const rankingPath = activeCampSlug ? `/${activeCampSlug}` : '/ranking'
  const roleLabel = isAdmin
    ? 'Administrador geral'
    : isGestor
      ? 'Gestor'
      : 'Perfil pendente'
  const links = [
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
    {
      label: 'Equipes',
      path: campAdminBasePath ? `${campAdminBasePath}/equipes` : '/admin/tribos',
      icon: Trophy,
    },
    {
      label: 'Participantes',
      path: campAdminBasePath
        ? `${campAdminBasePath}/participantes`
        : '/admin/participantes',
      icon: Users,
    },
    {
      label: 'Pontuação',
      path: campAdminBasePath
        ? `${campAdminBasePath}/pontuacao`
        : '/admin/pontuacao',
      icon: PlusCircle,
    },
    {
      label: 'Gincana',
      path: campAdminBasePath ? `${campAdminBasePath}/gincana` : '/admin/gincana',
      icon: Swords,
    },
    {
      label: 'Inspeções',
      path: campAdminBasePath
        ? `${campAdminBasePath}/inspecoes`
        : '/admin/inspecoes',
      icon: ClipboardCheck,
    },
    {
      label: 'Histórico',
      path: campAdminBasePath
        ? `${campAdminBasePath}/historico`
        : '/admin/historico',
      icon: History,
    },
    {
      label: 'Exportação',
      path: campAdminBasePath
        ? `${campAdminBasePath}/exportacao`
        : '/admin/exportacao',
      icon: Download,
    },
  ]

  async function handleLogout() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error(error)
      return
    }

    onClose?.()
    navigate('/login', { replace: true })
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

          <h1 className="mt-3 text-xl font-bold">Painel do acampamento</h1>

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

      <nav className="mt-6 space-y-2">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = location.pathname === link.path

          return (
            <Link
              key={link.path}
              to={link.path}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition ${
                isActive
                  ? 'bg-yellow-500 text-zinc-950'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
              }`}
            >
              <Icon size={18} />
              {link.label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-8 space-y-3">
        <Link
          to={rankingPath}
          onClick={onClose}
          className="flex items-center gap-3 rounded-xl border border-zinc-800 px-4 py-3 text-sm text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
        >
          <Trophy size={18} />
          Ver ranking do evento
        </Link>

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
