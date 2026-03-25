import { Component, type ReactNode, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { UserRole } from './types'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null }
  static getDerivedStateFromError(error: Error) { return { error } }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-8 text-center">
          <div>
            <p className="text-lg font-semibold text-slate-800 mb-2">Something went wrong</p>
            <p className="text-sm text-slate-500 mb-4">{(this.state.error as Error).message}</p>
            <button onClick={() => this.setState({ error: null })} className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
import { AppShell } from './components/layout/AppShell'
import { LoginPage } from './pages/auth/LoginPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { ItemListPage } from './pages/items/ItemListPage'
import { ItemDetailPage } from './pages/items/ItemDetailPage'
import { AddItemPage, EditItemPage } from './pages/items/AddItemPage'
import {
  ReceiptPage,
  MovePage,
  ExitPage,
  ReturnPage,
  ScrapPage,
  ConsumePage,
} from './pages/operations/OperationsPages'
import {
  LocationBrowserPage,
  ContainerManagerPage,
  ExternalLocationsPage,
} from './pages/storage/StoragePages'
import { LabelsPage } from './pages/LabelsPage'
import {
  ItemsByLocationPage,
  ExternalReportPage,
  ExpiryReportPage,
  AuditLogPage,
} from './pages/reports/ReportsPages'
import {
  UserManagementPage,
  LocationConfigPage,
  ExternalLocationAdminPage,
  SystemSettingsPage,
} from './pages/admin/AdminPages'

function NotFoundPage() {
  const navigate = useNavigate()
  useEffect(() => {
    const timer = setTimeout(() => navigate('/', { replace: true }), 3000)
    return () => clearTimeout(timer)
  }, [navigate])
  return (
    <div className="flex flex-col items-center justify-center h-full py-24 text-center">
      <p className="text-6xl font-bold text-slate-200 mb-4">404</p>
      <p className="text-lg font-semibold text-slate-700 mb-1">Page not found</p>
      <p className="text-sm text-slate-500 mb-6">The page you're looking for doesn't exist. Redirecting home…</p>
    </div>
  )
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return null
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return null
  if (isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}

function AdminRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()
  if (isLoading) return null
  if (!user || user.role !== UserRole.ADMIN) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <AuthProvider>
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

        {/* App shell wraps all authenticated routes */}
        <Route element={<ProtectedRoute><ErrorBoundary><AppShell /></ErrorBoundary></ProtectedRoute>}>
          <Route path="/" element={<DashboardPage />} />

          {/* Items */}
          <Route path="/items" element={<ItemListPage />} />
          <Route path="/items/new/:type" element={<AddItemPage />} />
          <Route path="/items/:id/edit" element={<EditItemPage />} />
          <Route path="/items/:id" element={<ItemDetailPage />} />

          {/* Operations */}
          <Route path="/operations/receipt" element={<ReceiptPage />} />
          <Route path="/operations/move" element={<MovePage />} />
          <Route path="/operations/exit" element={<ExitPage />} />
          <Route path="/operations/return" element={<ReturnPage />} />
          <Route path="/operations/scrap" element={<ScrapPage />} />
          <Route path="/operations/consume" element={<ConsumePage />} />

          {/* Storage */}
          <Route path="/storage/locations" element={<LocationBrowserPage />} />
          <Route path="/storage/containers" element={<ContainerManagerPage />} />
          <Route path="/storage/external" element={<ExternalLocationsPage />} />

          {/* Labels */}
          <Route path="/labels" element={<LabelsPage />} />

          {/* Reports */}
          <Route path="/reports/by-location" element={<ItemsByLocationPage />} />
          <Route path="/reports/external" element={<ExternalReportPage />} />
          <Route path="/reports/expiry" element={<ExpiryReportPage />} />
          <Route path="/reports/audit" element={<AuditLogPage />} />

          {/* Admin */}
          <Route path="/admin/users" element={<AdminRoute><UserManagementPage /></AdminRoute>} />
          <Route path="/admin/locations" element={<AdminRoute><LocationConfigPage /></AdminRoute>} />
          <Route path="/admin/external-locations" element={<AdminRoute><ExternalLocationAdminPage /></AdminRoute>} />
          <Route path="/admin/settings" element={<AdminRoute><SystemSettingsPage /></AdminRoute>} />

          {/* Fallback — 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  )
}
