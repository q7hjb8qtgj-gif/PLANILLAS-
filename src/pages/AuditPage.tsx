import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { dateGT } from '../lib/calculations'
import { Card, Empty, Input, PageHeader } from '../components/ui'

export function AuditPage() {
  const { data } = useApp()
  const [search, setSearch] = useState('')
  const logs = [...data.auditLogs].reverse().filter((entry) => !search || `${entry.userName} ${entry.action} ${entry.module} ${entry.recordId}`.toLowerCase().includes(search.toLowerCase()))
  return <><PageHeader title="Bitácora de auditoría" description="Registro inmutable desde la interfaz: usuario, acción, fecha y valores modificados." action={<Input className="sm:w-72" placeholder="Buscar en bitácora" value={search} onChange={(e) => setSearch(e.target.value)} />} /><Card>{logs.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="border-b text-slate-500"><tr><th className="p-3">Fecha / hora</th><th>Usuario</th><th>Acción</th><th>Módulo</th><th>Registro</th><th>Valor anterior</th><th>Valor nuevo</th><th>Motivo</th></tr></thead><tbody>{logs.map((entry) => <tr key={entry.id} className="border-b border-slate-100 align-top"><td className="p-3 whitespace-nowrap">{dateGT(entry.timestamp)}<small className="block text-slate-500">{new Date(entry.timestamp).toLocaleTimeString('es-GT', { timeZone: 'America/Guatemala' })}</small></td><td>{entry.userName}</td><td>{entry.action}</td><td>{entry.module}</td><td className="max-w-36 truncate">{entry.recordId}</td><td><pre className="max-h-24 max-w-64 overflow-auto whitespace-pre-wrap text-xs">{entry.oldValue ? JSON.stringify(entry.oldValue, null, 1) : '—'}</pre></td><td><pre className="max-h-24 max-w-64 overflow-auto whitespace-pre-wrap text-xs">{entry.newValue ? JSON.stringify(entry.newValue, null, 1) : '—'}</pre></td><td>{entry.reason || '—'}</td></tr>)}</tbody></table></div> : <Empty />}</Card></>
}
