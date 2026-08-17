import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { exportPayrollExcel, exportPayrollPdf } from '../lib/exports'
import { Button, Card, Empty, PageHeader, Select } from '../components/ui'

export function ReportsPage() {
  const { data } = useApp()
  const [payrollId, setPayrollId] = useState('')
  const payroll = data.payrolls.find((entry) => entry.id === payrollId)
  const findings = data.findings.filter((entry) => entry.payrollId === payrollId)
  return <><PageHeader title="Reportes" description="Exportaciones con trazabilidad, totales y bloques de firma." /><Card><div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]"><Select value={payrollId} onChange={(e) => setPayrollId(e.target.value)}><option value="">Seleccione una planilla</option>{data.payrolls.map((entry) => <option key={entry.id} value={entry.id}>{entry.code} — {entry.type}</option>)}</Select><Button disabled={!payroll} onClick={() => payroll && exportPayrollExcel(payroll, data.employees, findings)}>Descargar Excel</Button><Button variant="secondary" disabled={!payroll} onClick={() => payroll && exportPayrollPdf(payroll, data.employees, findings)}>Descargar PDF</Button></div>{payroll ? <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{['Resumen de planilla', 'Detalle de planilla', 'Conciliación ordinaria contra extraordinaria', 'Hallazgos', 'Pagos duplicados', 'Pagos por colaborador', 'Comparación semanal', 'Costo por empresa', 'Costo por área', 'Reporte de cooperativa', 'Bitácora de cambios', 'Planilla autorizada para pago'].map((entry) => <div key={entry} className="rounded-lg border border-slate-200 p-3 text-sm">{entry}</div>)}</div> : <div className="mt-6"><Empty /></div>}</Card></>
}
