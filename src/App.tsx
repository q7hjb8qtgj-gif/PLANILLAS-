import { lazy, Suspense } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useApp } from './context/AppContext'
import { LoginPage } from './pages/LoginPage'

const DashboardPage = lazy(() => import('./pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
const PayrollsPage = lazy(() => import('./pages/PayrollsPage').then((module) => ({ default: module.PayrollsPage })))
const ImportPage = lazy(() => import('./pages/ImportPage').then((module) => ({ default: module.ImportPage })))
const ReconciliationPage = lazy(() => import('./pages/ReconciliationPage').then((module) => ({ default: module.ReconciliationPage })))
const FindingsPage = lazy(() => import('./pages/FindingsPage').then((module) => ({ default: module.FindingsPage })))
const EmployeesPage = lazy(() => import('./pages/EmployeesPage').then((module) => ({ default: module.EmployeesPage })))
const ReportsPage = lazy(() => import('./pages/ReportsPage').then((module) => ({ default: module.ReportsPage })))
const DocumentsPage = lazy(() => import('./pages/DocumentsPage').then((module) => ({ default: module.DocumentsPage })))
const AuditPage = lazy(() => import('./pages/AuditPage').then((module) => ({ default: module.AuditPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((module) => ({ default: module.NotFoundPage })))

export default function App() {
  const { session } = useApp()
  if (!session) return <LoginPage />
  return <BrowserRouter><Layout><Suspense fallback={<div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-600">Cargando módulo…</div>}><Routes>
    <Route path="/" element={<DashboardPage />} />
    <Route path="/planillas" element={<PayrollsPage />} />
    <Route path="/importar" element={<ImportPage />} />
    <Route path="/conciliacion" element={<ReconciliationPage />} />
    <Route path="/hallazgos" element={<FindingsPage />} />
    <Route path="/colaboradores" element={<EmployeesPage />} />
    <Route path="/reportes" element={<ReportsPage />} />
    <Route path="/documentos" element={<DocumentsPage />} />
    <Route path="/bitacora" element={<AuditPage />} />
    <Route path="/configuracion" element={<SettingsPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes></Suspense></Layout></BrowserRouter>
}
