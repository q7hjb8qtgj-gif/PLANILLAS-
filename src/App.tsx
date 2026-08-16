import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { useApp } from './context/AppContext'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { PayrollsPage } from './pages/PayrollsPage'
import { ImportPage } from './pages/ImportPage'
import { ReconciliationPage } from './pages/ReconciliationPage'
import { FindingsPage } from './pages/FindingsPage'
import { EmployeesPage } from './pages/EmployeesPage'
import { ReportsPage } from './pages/ReportsPage'
import { DocumentsPage } from './pages/DocumentsPage'
import { AuditPage } from './pages/AuditPage'
import { SettingsPage } from './pages/SettingsPage'
import { NotFoundPage } from './pages/NotFoundPage'

export default function App() {
  const { session } = useApp()
  if (!session) return <LoginPage />
  return <BrowserRouter><Layout><Routes>
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
  </Routes></Layout></BrowserRouter>
}
