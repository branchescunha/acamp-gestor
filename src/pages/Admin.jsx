import { Navigate, Outlet, useLocation } from 'react-router-dom'
import AdminLayout from '../components/AdminLayout'
import RoleAccessNotice from '../components/RoleAccessNotice'
import { useAuthContext } from '../hooks/useAuth'
import { useUserProfile } from '../hooks/useUserProfile'

export default function Admin() {
  const location = useLocation()
  const { session, loadingAuth } = useAuthContext()
  const {
    profile,
    isAdmin,
    isGestor,
    isActive,
    loading: loadingProfile,
  } = useUserProfile()

  if (loadingAuth || (session && loadingProfile)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-white">
        <p className="text-zinc-400">Verificando sessão...</p>
      </main>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (isGestor) {
    return <Navigate to="/gestor" replace />
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-5 text-white">
        <RoleAccessNotice
          title="Perfil de acesso não encontrado"
          message="Seu usuário ainda não possui um perfil de acesso. Entre em contato com o administrador da plataforma."
          actionPath=""
        />
      </main>
    )
  }

  if (!isActive || !isAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-5 text-white">
        <RoleAccessNotice
          title="Acesso negado"
          message="Esta área é exclusiva para ADMIN."
          actionPath=""
        />
      </main>
    )
  }

  return (
    <AdminLayout>
      <Outlet />
    </AdminLayout>
  )
}
