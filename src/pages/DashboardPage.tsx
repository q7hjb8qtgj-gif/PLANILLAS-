import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { useApp } from '../context/AppContext'
import { calculateCooperative, currency } from '../lib/calculations'
import { Card, Empty, PageHeader } from '../components/ui'

export function DashboardPage() {
  const { data } = useApp()
  const activePayrolls = data.payrolls.filter((entry) => entry.status !== 'Anulada')
  const items = activePayrolls.flatMap((entry) => entry.items)
  const income = items.reduce((sum, item) => sum + item.totalIncome, 0)
  const deductions = items.reduce((sum, item) => sum + item.totalDeductions, 0)
  const net = items.reduce((sum, item) => sum + item.netPay, 0)
  const cooperative = activePayrolls.reduce((sum, entry) => entry.cooperative.enabled ? sum + calculateCooperative(entry.cooperative).serviceTotal : sum, 0)
  const openFindings = data.findings.filter((entry) => entry.status !== 'Resuelto')
  const cards = [
    ['Total bruto', currency(income)], ['Total descuentos', currency(deductions)], ['Líquido a pagar', currency(net)],
    ['Servicio cooperativa', currency(cooperative)], ['Costo total', currency(net + cooperative)], ['Colaboradores', new Set(items.map((entry) => entry.employeeId)).size],
    ['Hallazgos críticos', openFindings.filter((entry) => entry.severity === 'Crítico').length], ['Monto en riesgo', currency(openFindings.reduce((sum, entry) => sum + entry.affectedAmount, 0))],
    ['Planillas pendientes', activePayrolls.filter((entry) => ['Pendiente de revisión', 'Observada', 'Corregida'].includes(entry.status)).length],
    ['Planillas aprobadas', activePayrolls.filter((entry) => entry.status === 'Aprobada').length], ['Planillas pagadas', activePayrolls.filter((entry) => entry.status === 'Pagada').length],
  ]
  const chartData = data.companies.map((company) => ({ name: company.name, value: activePayrolls.filter((entry) => entry.companyId === company.id).flatMap((entry) => entry.items).reduce((sum, item) => sum + item.netPay, 0) })).filter((entry) => entry.value)
  return <><PageHeader title="Tablero principal" description="Indicadores calculados exclusivamente con información registrada." />{!data.payrolls.length ? <Empty /> : <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{cards.map(([label, value]) => <Card key={label as string}><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-navy-950">{value}</p></Card>)}</div><div className="mt-5 grid gap-5 lg:grid-cols-2"><Card><h2 className="font-bold">Costo por empresa</h2><div className="h-72">{chartData.length ? <ResponsiveContainer><PieChart><Pie data={chartData} dataKey="value" nameKey="name" outerRadius={95}>{chartData.map((entry, index) => <Cell key={entry.name} fill={['#0b2443', '#2563eb', '#0f766e', '#ca8a04'][index % 4]} />)}</Pie><Tooltip formatter={(value) => currency(Number(value))} /></PieChart></ResponsiveContainer> : <Empty />}</div></Card><Card><h2 className="font-bold">Hallazgos por nivel</h2><div className="mt-4 space-y-3">{(['Crítico', 'Alto', 'Medio', 'Informativo'] as const).map((level) => <div key={level} className="flex items-center justify-between rounded-lg bg-slate-50 p-3"><span>{level}</span><strong>{openFindings.filter((entry) => entry.severity === level).length}</strong></div>)}</div></Card></div></>}</>
}
