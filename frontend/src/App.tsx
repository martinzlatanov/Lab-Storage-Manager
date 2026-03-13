import { Component, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

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
import { AddItemPage } from './pages/items/AddItemPage'
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />

        {/* App shell wraps all authenticated routes */}
        <Route element={<ErrorBoundary><AppShell /></ErrorBoundary>}>
          <Route path="/" element={<DashboardPage />} />

          {/* Items */}
          <Route path="/items" element={<ItemListPage />} />
          <Route path="/items/new/:type" element={<AddItemPage />} />
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
          <Route path="/admin/users" element={<UserManagementPage />} />
          <Route path="/admin/locations" element={<LocationConfigPage />} />
          <Route path="/admin/external-locations" element={<ExternalLocationAdminPage />} />
          <Route path="/admin/settings" element={<SystemSettingsPage />} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
