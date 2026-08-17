import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { currency } from '../lib/calculations'
import { Badge, Card, Empty, Field, PageHeader, Select } from '../components/ui'

export function ReconciliationPage() {
  const { data } = useApp()
  const [ordinaryId, setOrdinaryId] = useState('')
  const [extraId, setExtraId] = useState('')
  const [onlyDifferences, setOnlyDifferences] = useState(true)
  const rows = useMemo(() => {
    const ordinary = data.payrolls.find((entry) => entry.id === ordinaryId)
    const extra = data.payrolls.find((entry) => entry.id === extraId)
    const employeeIds = new Set([...(ordinary?.items.map((entry) => entry.employeeId) || []), ...(extra?.items.map((entry) => entry.employeeId) || [])])
    return [...employeeIds].map((employeeId) => {
      const a = ordinary?.items.filter((entry) => entry.employeeId === employeeId).reduce((sum, entry) => sum + entry.netPay, 0) || 0
      const b = extra?.items.filter((entry) => entry.employeeId === employeeId).reduce((sum, entry) => sum + entry.netPay, 0) || 0
      return { employeeId, ordinary: a, extra: b, difference: b - a, duplicate: a > 0 && b > 0, risk: a > 0 && b > 0 ? Math.min(a, b) : Math.abs(b - a) }
    }).filter((entry) => !onlyDifferences || entry.difference !== 0 || entry.duplicate)
  }, [data.payrolls, ordinaryId, extraId, onlyDifferences])
  return <><PageHeader title="Conciliación" description="Compare planilla ordinaria contra extraordinaria y revise posibles duplicidades." /><Card><div className="mb-5 grid gap-4 sm:grid-cols-3"><Field label="Planilla ordinaria"><Select value={ordinaryId} onChange={(e) => setOrdinaryId(e.target.value)}><option value="">Seleccione</option>{data.payrolls.filter((entry) => entry.type === 'Ordinaria').map((entry) => <option key={entry.id} value={entry.id}>{entry.code}</option>)}</Select></Field><Field label="Planilla extraordinaria"><Select value={extraId} onChange={(e) => setExtraId(e.target.value)}><option value="">Seleccione</option>{data.payrolls.filter((entry) => entry.type !== 'Ordinaria').map((entry) => <option key={entry.id} value={entry.id}>{entry.code} — {entry.type}</option>)}</Select></Field><label className="flex items-center gap-2 pt-6 text-sm"><input type="checkbox" checked={onlyDifferences} onChange={(e) => setOnlyDifferences(e.target.checked)} />Mostrar únicamente discrepancias</label></div>
      {ordinaryId && extraId ? rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b text-slate-500"><tr><th className="p-3">Colaborador</th><th>Ordinaria</th><th>Extraordinaria</th><th>Diferencia</th><th>Duplicidad</th><th>Monto en riesgo</th><th>Acción recomendada</th></tr></thead><tbody>{rows.map((entry) => <tr key={entry.employeeId} className="border-b border-slate-100"><td className="p-3">{data.employees.find((item) => item.id === entry.employeeId)?.fullName}</td><td>{currency(entry.ordinary)}</td><td>{currency(entry.extra)}</td><td>{currency(entry.difference)}</td><td><Badge tone={entry.duplicate ? 'red' : 'green'}>{entry.duplicate ? 'Posible' : 'No detectada'}</Badge></td><td>{currency(entry.risk)}</td><td>{entry.duplicate ? 'Verificar conceptos y soportes' : 'Revisar diferencia'}</td></tr>)}</tbody></table></div> : <Empty text="No se encontraron discrepancias con los filtros actuales." /> : <Empty text="Seleccione las dos planillas que desea comparar." />}</Card></>
}
