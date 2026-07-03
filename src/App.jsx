import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import Ranking from './pages/Ranking'
import PublicCampRanking from './pages/PublicCampRanking'
import CampAdminRoute from './components/CampAdminRoute'
import AdminOnlyRoute from './components/AdminOnlyRoute'
import RequireActiveCamp from './components/RequireActiveCamp'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import RequestAccess from './pages/RequestAccess'
import AcceptInvitation from './pages/AcceptInvitation'
import Admin from './pages/Admin'
import Account from './pages/Account'
import AccessRequests from './pages/AccessRequests'
import AdminDashboard from './pages/AdminDashboard'
import Camps from './pages/Camps'
import Organizations from './pages/Organizations'
import OrganizationMembers from './pages/OrganizationMembers'
import Users from './pages/Users'
import Invitations from './pages/Invitations'
import Dashboard from './pages/Dashboard'
import Tribes from './pages/Tribes'
import Participants from './pages/Participants'
import Scores from './pages/Scores'
import History from './pages/History'
import Export from './pages/Export'
import Gymkhana from './pages/Gymkhana'
import Inspections from './pages/Inspections'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route path="/ranking" element={<Ranking />} />

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
          <Route
            path="tribos"
            element={
              <RequireActiveCamp>
                <Tribes />
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

        <Route path="/:campSlug/admin" element={<CampAdminRoute />}>
          <Route index element={<Dashboard />} />
          <Route path="equipes" element={<Tribes />} />
          <Route path="participantes" element={<Participants />} />
          <Route path="pontuacao" element={<Scores />} />
          <Route path="historico" element={<History />} />
          <Route path="gincana" element={<Gymkhana />} />
          <Route path="inspecoes" element={<Inspections />} />
          <Route path="exportacao" element={<Export />} />
        </Route>

        <Route path="/:campSlug" element={<PublicCampRanking />} />

        <Route path="*" element={<Navigate to="/ranking" />} />
      </Routes>
    </BrowserRouter>
  )
}
