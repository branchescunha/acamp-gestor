import { lazy, Suspense } from 'react'
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom'

import CampAdminRoute from './components/CampAdminRoute'
import AdminOnlyRoute from './components/AdminOnlyRoute'
import RequireActiveCamp from './components/RequireActiveCamp'

const PublicCampRanking = lazy(() => import('./pages/PublicCampRanking'))
const LandingPage = lazy(() => import('./pages/LandingPage'))
const Login = lazy(() => import('./pages/Login'))
const Gestor = lazy(() => import('./pages/Gestor'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const ResetPassword = lazy(() => import('./pages/ResetPassword'))
const RequestAccess = lazy(() => import('./pages/RequestAccess'))
const AcceptInvitation = lazy(() => import('./pages/AcceptInvitation'))
const Admin = lazy(() => import('./pages/Admin'))
const Account = lazy(() => import('./pages/Account'))
const AccessRequests = lazy(() => import('./pages/AccessRequests'))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const Camps = lazy(() => import('./pages/Camps'))
const Organizations = lazy(() => import('./pages/Organizations'))
const OrganizationMembers = lazy(() => import('./pages/OrganizationMembers'))
const Users = lazy(() => import('./pages/Users'))
const Invitations = lazy(() => import('./pages/Invitations'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const CampGroups = lazy(() => import('./pages/CampGroups'))
const CompetitionTeams = lazy(() => import('./pages/CompetitionTeams'))
const Participants = lazy(() => import('./pages/Participants'))
const Scores = lazy(() => import('./pages/Scores'))
const History = lazy(() => import('./pages/History'))
const Export = lazy(() => import('./pages/Export'))
const Gymkhana = lazy(() => import('./pages/Gymkhana'))
const Inspections = lazy(() => import('./pages/Inspections'))

function RouteLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 px-5 text-white">
      <p className="text-sm text-zinc-400">Carregando...</p>
    </main>
  )
}

function LegacyCampAdminRedirect() {
  const { campSlug = '' } = useParams()
  const location = useLocation()
  const legacyPrefix = `/${campSlug}/admin`
  const routeSuffix = location.pathname.startsWith(legacyPrefix)
    ? location.pathname.slice(legacyPrefix.length)
    : ''

  return (
    <Navigate
      to={`/${campSlug}/gestor${routeSuffix}${location.search}${location.hash}`}
      replace
    />
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteLoading />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />

        <Route path="/login" element={<Login />} />

        <Route path="/solicitar-acesso" element={<RequestAccess />} />

        <Route path="/convite/:token" element={<AcceptInvitation />} />

        <Route path="/recuperar-senha" element={<ForgotPassword />} />
        <Route
          path="/forgot-password"
          element={<Navigate to="/recuperar-senha" replace />}
        />

        <Route path="/redefinir-senha" element={<ResetPassword />} />
        <Route
          path="/reset-password"
          element={<Navigate to="/redefinir-senha" replace />}
        />

        <Route path="/admin" element={<Admin />}>
          <Route
            index
            element={
              <AdminOnlyRoute redirectGestorTo="/admin/acampamentos">
                <AdminDashboard />
              </AdminOnlyRoute>
            }
          />
          <Route path="conta" element={<Account />} />
          <Route
            path="solicitacoes"
            element={
              <AdminOnlyRoute>
                <AccessRequests />
              </AdminOnlyRoute>
            }
          />
          <Route
            path="usuarios"
            element={
              <AdminOnlyRoute>
                <Users />
              </AdminOnlyRoute>
            }
          />
          <Route
            path="convites"
            element={
              <AdminOnlyRoute>
                <Invitations />
              </AdminOnlyRoute>
            }
          />
          <Route path="acampamentos" element={<Camps />} />
          <Route path="organizacoes" element={<Organizations />} />
          <Route
            path="organizacoes/:organizationId/membros"
            element={<OrganizationMembers />}
          />
          <Route
            path="account"
            element={<Navigate to="/admin/conta" replace />}
          />
          {/* Legacy compatibility for /admin/tribos. */}
          <Route path="tribos" element={<Navigate to="/admin/equipes" replace />} />
          <Route
            path="equipes"
            element={
              <RequireActiveCamp>
                <CampGroups />
              </RequireActiveCamp>
            }
          />
          <Route
            path="times"
            element={
              <RequireActiveCamp>
                <CompetitionTeams />
              </RequireActiveCamp>
            }
          />
          <Route
            path="participantes"
            element={
              <RequireActiveCamp>
                <Participants />
              </RequireActiveCamp>
            }
          />
          <Route
            path="pontuacao"
            element={
              <RequireActiveCamp>
                <Scores />
              </RequireActiveCamp>
            }
          />
          <Route
            path="historico"
            element={
              <RequireActiveCamp>
                <History />
              </RequireActiveCamp>
            }
          />
          <Route
            path="exportacao"
            element={
              <RequireActiveCamp>
                <Export />
              </RequireActiveCamp>
            }
          />
          <Route
            path="gincana"
            element={
              <RequireActiveCamp>
                <Gymkhana />
              </RequireActiveCamp>
            }
          />
          <Route
            path="inspecoes"
            element={
              <RequireActiveCamp>
                <Inspections />
              </RequireActiveCamp>
            }
          />
        </Route>

        <Route path="/gestor" element={<Gestor />} />

        <Route path="/:campSlug/gestor" element={<CampAdminRoute />}>
          <Route index element={<Dashboard />} />
          <Route path="conta" element={<Account />} />
          <Route path="equipes" element={<CampGroups />} />
          <Route path="times" element={<CompetitionTeams />} />
          <Route path="participantes" element={<Participants />} />
          <Route path="pontuacao" element={<Scores />} />
          <Route path="historico" element={<History />} />
          <Route path="gincana" element={<Gymkhana />} />
          <Route path="inspecoes" element={<Inspections />} />
          <Route path="exportacao" element={<Export />} />
        </Route>

        <Route path="/:campSlug/admin/*" element={<LegacyCampAdminRedirect />} />

        <Route path="/:campSlug" element={<PublicCampRanking />} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
