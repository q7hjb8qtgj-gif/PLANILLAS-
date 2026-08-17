import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { currency, dateGT } from '../lib/calculations'
import { Badge, Button, Card, Empty, PageHeader, Select } from '../components/ui'
import type { Finding } from '../types'

export function FindingsPage() {
  const { data, updateData } = useApp()
  const [severity, setSeverity] = useState('')
  const visible = data.findings.filter((entry) => !severity || entry.severity === severity)
  const resolve = (entry: Finding) => {
    const evidence = window.prompt('Describa la evidencia de resolución:'); if (!evidence?.trim()) return
    const next: Finding = { ...entry, status: 'Resuelto', evidence, resolvedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
    updateData('findings', data.findings.map((item) => item.id === entry.id ? next : item), 'Resolver hallazgo', entry.id, entry, next)
  }
  return <><PageHeader title="Hallazgos" description="Resultados del motor de validación y seguimiento de correcciones." action={<Select className="sm:w-48" value={severity} onChange={(e) => setSeverity(e.target.value)}><option value="">Todos los niveles</option><option>Crítico</option><option>Alto</option><option>Medio</option><option>Informativo</option></Select>} /><Card>{visible.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="border-b text-slate-500"><tr><th className="p-3">Nivel</th><th>Planilla</th><th>Colaborador</th><th>Regla</th><th>Monto afectado</th><th>Descripción</th><th>Estado</th><th>Fecha</th><th>Acción</th></tr></thead><tbody>{visible.map((entry) => <tr key={entry.id} className="border-b border-slate-100 align-top"><td className="p-3"><Badge tone={entry.severity === 'Crítico' ? 'red' : entry.severity === 'Alto' ? 'yellow' : 'blue'}>{entry.severity}</Badge></td><td>{data.payrolls.find((item) => item.id === entry.payrollId)?.code}</td><td>{data.employees.find((item) => item.id === entry.employeeId)?.fullName || 'General'}</td><td className="font-medium">{entry.rule}</td><td>{currency(entry.affectedAmount)}</td><td className="max-w-xs">{entry.description}<small className="mt-1 block text-slate-500">{entry.recommendation}</small></td><td>{entry.status}</td><td>{dateGT(entry.createdAt)}</td><td><Button variant="ghost" disabled={entry.status === 'Resuelto'} onClick={() => resolve(entry)}>Resolver</Button></td></tr>)}</tbody></table></div> : <Empty />}</Card></>
}
