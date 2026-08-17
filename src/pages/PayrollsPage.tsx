import { useMemo, useState, type FormEvent } from 'react'
import { useApp } from '../context/AppContext'
import { calculateCooperative, calculateItem, currency, dateGT } from '../lib/calculations'
import { validatePayroll } from '../lib/validation'
import { Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Select, Textarea } from '../components/ui'
import type { Payroll, PayrollItem, PayrollStatus, PayrollType } from '../types'

const currentYear = new Date().getFullYear()
const blankPayroll = { code: '', companyId: '', areaId: '', startDate: '', endDate: '', week: 1, year: currentYear, type: 'Ordinaria' as PayrollType, dataEntryResponsible: '', reviewer: '', notes: '', cooperative: { enabled: false, baseAmount: 0, commissionRate: 5, vatRate: 12 }, headerTotal: undefined as number | undefined }
const blankItem = { employeeId: '', daysWorked: 0, regularHours: 0, overtimeHours: 0, rate: 0, regularSalary: 0, overtimePay: 0, workPay: 0, bonus: 0, commissions: 0, otherIncome: 0, igss: 0, advances: 0, loans: 0, otherDeductions: 0, paymentMethod: '', reference: '', notes: '', supportDocument: '' }

export function PayrollsPage() {
  const { data, updateData, session } = useApp()
  const [headerOpen, setHeaderOpen] = useState(false)
  const [itemOpen, setItemOpen] = useState(false)
  const [form, setForm] = useState(blankPayroll)
  const [itemForm, setItemForm] = useState(blankItem)
  const [selected, setSelected] = useState<Payroll | null>(null)
  const [editingItem, setEditingItem] = useState<PayrollItem | null>(null)
  const canEdit = !['Consulta', 'Validador'].includes(session?.role || '') && selected?.status !== 'Pagada'
  const activeEmployees = useMemo(() => data.employees.filter((entry) => entry.active && (!selected || (entry.companyId === selected.companyId && entry.areaId === selected.areaId))), [data.employees, selected])
  const launchHeader = () => { setForm({ ...blankPayroll, dataEntryResponsible: session?.name || '' }); setHeaderOpen(true) }
  const saveHeader = (event: FormEvent) => {
    event.preventDefault(); const now = new Date().toISOString()
    const payroll: Payroll = { ...form, id: crypto.randomUUID(), status: 'Borrador', items: [], approvedByLuisRivas: false, secondarySigner: '', active: true, createdAt: now, updatedAt: now }
    updateData('payrolls', [...data.payrolls, payroll], 'Crear', payroll.id, undefined, payroll); setHeaderOpen(false); setSelected(payroll)
  }
  const launchItem = (entry?: PayrollItem) => {
    setEditingItem(entry || null)
    setItemForm(entry ? { employeeId: entry.employeeId, daysWorked: entry.daysWorked, regularHours: entry.regularHours, overtimeHours: entry.overtimeHours, rate: entry.rate, regularSalary: entry.regularSalary, overtimePay: entry.overtimePay, workPay: entry.workPay, bonus: entry.bonus, commissions: entry.commissions, otherIncome: entry.otherIncome, igss: entry.igss, advances: entry.advances, loans: entry.loans, otherDeductions: entry.otherDeductions, paymentMethod: entry.paymentMethod, reference: entry.reference || '', notes: entry.notes || '', supportDocument: entry.supportDocument || '' } : blankItem)
    setItemOpen(true)
  }
  const saveItem = (event: FormEvent) => {
    event.preventDefault(); if (!selected) return
    const employee = data.employees.find((entry) => entry.id === itemForm.employeeId); if (!employee) return
    const totals = calculateItem(itemForm)
    const item: PayrollItem = { ...itemForm, ...totals, id: editingItem?.id || crypto.randomUUID(), code: employee.code, companyId: employee.companyId, areaId: employee.areaId, position: employee.position, validationStatus: 'Pendiente' }
    const payroll: Payroll = { ...selected, items: editingItem ? selected.items.map((entry) => entry.id === item.id ? item : entry) : [...selected.items, item], updatedAt: new Date().toISOString() }
    updateData('payrolls', data.payrolls.map((entry) => entry.id === payroll.id ? payroll : entry), editingItem ? 'Editar detalle' : 'Agregar detalle', payroll.id, editingItem, item)
    setSelected(payroll); setItemOpen(false)
  }
  const updateStatus = (status: PayrollStatus) => {
    if (!selected) return
    const mandatory = ['Rechazada', 'Anulada', 'Corregida'].includes(status)
    const reason = mandatory ? window.prompt('Ingrese el comentario obligatorio:') : window.prompt('Comentario (opcional):') || ''
    if (mandatory && !reason?.trim()) return
    const unresolvedCritical = data.findings.some((entry) => entry.payrollId === selected.id && entry.severity === 'Crítico' && entry.status !== 'Resuelto')
    if (status === 'Aprobada' && unresolvedCritical) { window.alert('No es posible aprobar mientras existan hallazgos críticos sin resolver.'); return }
    if (status === 'Aprobada' && !selected.approvedByLuisRivas) { window.alert('Luis Rivas debe validar la planilla antes de aprobarla.'); return }
    if (status === 'Pagada' && selected.status !== 'Aprobada') { window.alert('Solo una planilla aprobada puede marcarse como pagada.'); return }
    const next = { ...selected, status, updatedAt: new Date().toISOString() }
    updateData('payrolls', data.payrolls.map((entry) => entry.id === next.id ? next : entry), `Cambiar estado a ${status}`, next.id, selected, next, reason || undefined); setSelected(next)
  }
  const runValidation = () => {
    if (!selected) return
    const generated = validatePayroll(selected, data.payrolls, data.employees)
    const retained = data.findings.filter((entry) => entry.payrollId !== selected.id || entry.status === 'Resuelto')
    updateData('findings', [...retained, ...generated], 'Ejecutar validación', selected.id, undefined, { hallazgos: generated.length })
    window.alert(`Validación finalizada: ${generated.length} hallazgo(s).`)
  }
  const validateLuis = () => {
    if (!selected || session?.role !== 'Administrador') return
    const next = { ...selected, approvedByLuisRivas: true, updatedAt: new Date().toISOString() }
    updateData('payrolls', data.payrolls.map((entry) => entry.id === next.id ? next : entry), 'Validación primaria de Luis Rivas', next.id, selected, next); setSelected(next)
  }
  const cooperative = selected ? calculateCooperative(selected.cooperative) : null
  return <><PageHeader title="Planillas" description="Registro, revisión y autorización con trazabilidad completa." action={<Button onClick={launchHeader} disabled={session?.role === 'Consulta' || !data.companies.length}>Nueva planilla</Button>} />
    <div className="grid gap-5 xl:grid-cols-[380px_1fr]"><Card><h2 className="mb-3 font-bold">Períodos registrados</h2>{data.payrolls.length ? <div className="space-y-2">{data.payrolls.map((entry) => <button key={entry.id} onClick={() => setSelected(entry)} className={`w-full rounded-lg border p-3 text-left ${selected?.id === entry.id ? 'border-navy-800 bg-blue-50' : 'border-slate-200'}`}><div className="flex justify-between gap-2"><strong>{entry.code}</strong><Badge tone={entry.status === 'Aprobada' || entry.status === 'Pagada' ? 'green' : entry.status === 'Anulada' || entry.status === 'Rechazada' ? 'red' : 'yellow'}>{entry.status}</Badge></div><small className="mt-1 block text-slate-500">{entry.type} · Semana {entry.week} · {entry.items.length} registros</small></button>)}</div> : <Empty />}</Card>
      <Card>{selected ? <><div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="text-xl font-bold text-navy-950">{selected.code}</h2><p className="text-sm text-slate-500">{selected.type} · {dateGT(selected.startDate)} al {dateGT(selected.endDate)}</p></div><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={runValidation}>Validar</Button><Button onClick={() => launchItem()} disabled={!canEdit}>Agregar detalle</Button></div></div>
        <div className="my-4 grid gap-3 sm:grid-cols-3"><div className="rounded-lg bg-slate-50 p-3"><small>Total ingresos</small><strong className="block">{currency(selected.items.reduce((sum, item) => sum + item.totalIncome, 0))}</strong></div><div className="rounded-lg bg-slate-50 p-3"><small>Total descuentos</small><strong className="block">{currency(selected.items.reduce((sum, item) => sum + item.totalDeductions, 0))}</strong></div><div className="rounded-lg bg-slate-50 p-3"><small>Líquido</small><strong className="block">{currency(selected.items.reduce((sum, item) => sum + item.netPay, 0))}</strong></div></div>
        {selected.cooperative.enabled && cooperative && <div className="mb-4 grid gap-2 rounded-lg bg-blue-50 p-3 text-sm sm:grid-cols-4"><span>Monto base <strong className="block">{currency(selected.cooperative.baseAmount)}</strong></span><span>Comisión ({selected.cooperative.commissionRate}%) <strong className="block">{currency(cooperative.commission)}</strong></span><span>IVA ({selected.cooperative.vatRate}%) <strong className="block">{currency(cooperative.vat)}</strong></span><span>Total desembolso <strong className="block">{currency(cooperative.disbursementTotal)}</strong></span></div>}
        {selected.items.length ? <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="border-b text-slate-500"><tr><th className="p-3">Código</th><th>Colaborador</th><th>Días</th><th>H. ord.</th><th>H. extra</th><th>Ingresos</th><th>Descuentos</th><th>Líquido</th><th>Referencia</th><th>Acción</th></tr></thead><tbody>{selected.items.map((item) => <tr key={item.id} className="border-b border-slate-100"><td className="p-3">{item.code}</td><td>{data.employees.find((entry) => entry.id === item.employeeId)?.fullName}</td><td>{item.daysWorked}</td><td>{item.regularHours}</td><td>{item.overtimeHours}</td><td>{currency(item.totalIncome)}</td><td>{currency(item.totalDeductions)}</td><td className="font-semibold">{currency(item.netPay)}</td><td>{item.reference || '—'}</td><td><Button variant="ghost" onClick={() => launchItem(item)}>Editar</Button></td></tr>)}</tbody></table></div> : <Empty text="La planilla aún no tiene detalle." />}
        <div className="mt-5 border-t pt-4"><p className="mb-3 text-sm font-semibold">Flujo de autorización</p><div className="flex flex-wrap gap-2"><Button variant="secondary" onClick={() => updateStatus('Pendiente de revisión')}>Enviar a revisión</Button><Button variant="secondary" onClick={() => updateStatus('Observada')}>Observar</Button><Button variant="secondary" onClick={() => updateStatus('Corregida')}>Devolver / corregir</Button><Button variant="secondary" onClick={validateLuis} disabled={selected.approvedByLuisRivas || session?.role !== 'Administrador'}>{selected.approvedByLuisRivas ? 'Validada por Luis Rivas' : 'Validar como Luis Rivas'}</Button><Button onClick={() => updateStatus('Aprobada')}>Aprobar</Button><Button variant="secondary" onClick={() => updateStatus('Pagada')}>Marcar pagada</Button><Button variant="danger" onClick={() => updateStatus('Rechazada')}>Rechazar</Button><Button variant="danger" onClick={() => updateStatus('Anulada')}>Anular</Button></div></div>
      </> : <Empty text="Seleccione una planilla para ver su detalle." />}</Card></div>
    <Modal title="Nueva planilla" open={headerOpen} onClose={() => setHeaderOpen(false)}><form onSubmit={saveHeader} className="grid gap-4 sm:grid-cols-2">
      <Field label="Código del período" required><Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} /></Field><Field label="Tipo" required><Select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as PayrollType })}><option>Ordinaria</option><option>Extraordinaria</option><option>Obra complementaria</option><option>Bono</option><option>Ajuste</option><option>Otro</option></Select></Field>
      <Field label="Empresa" required><Select required value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value, areaId: '' })}><option value="">Seleccione</option>{data.companies.filter((entry) => entry.active).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</Select></Field><Field label="Área" required><Select required value={form.areaId} onChange={(e) => setForm({ ...form, areaId: e.target.value })}><option value="">Seleccione</option>{data.areas.filter((entry) => entry.active && entry.companyId === form.companyId).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</Select></Field>
      <Field label="Fecha inicial" required><Input required type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field><Field label="Fecha final" required><Input required type="date" min={form.startDate} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field><Field label="Semana" required><Input required type="number" min="1" max="53" value={form.week} onChange={(e) => setForm({ ...form, week: Number(e.target.value) })} /></Field><Field label="Año" required><Input required type="number" min="2000" value={form.year} onChange={(e) => setForm({ ...form, year: Number(e.target.value) })} /></Field>
      <Field label="Responsable de digitación" required><Input required value={form.dataEntryResponsible} onChange={(e) => setForm({ ...form, dataEntryResponsible: e.target.value })} /></Field><Field label="Responsable de revisión"><Input value={form.reviewer} onChange={(e) => setForm({ ...form, reviewer: e.target.value })} /></Field>
      <Field label="Total de encabezado (opcional)"><Input type="number" step=".01" min="0" value={form.headerTotal ?? ''} onChange={(e) => setForm({ ...form, headerTotal: e.target.value ? Number(e.target.value) : undefined })} /></Field><Field label="Observaciones"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
      <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={form.cooperative.enabled} onChange={(e) => setForm({ ...form, cooperative: { ...form.cooperative, enabled: e.target.checked } })} />Gestionar pagos por cooperativa</label>{form.cooperative.enabled && <><Field label="Monto base"><Input type="number" min="0" step=".01" value={form.cooperative.baseAmount} onChange={(e) => setForm({ ...form, cooperative: { ...form.cooperative, baseAmount: Number(e.target.value) } })} /></Field><div className="grid grid-cols-2 gap-2"><Field label="% Comisión"><Input type="number" min="0" step=".01" value={form.cooperative.commissionRate} onChange={(e) => setForm({ ...form, cooperative: { ...form.cooperative, commissionRate: Number(e.target.value) } })} /></Field><Field label="% IVA"><Input type="number" min="0" step=".01" value={form.cooperative.vatRate} onChange={(e) => setForm({ ...form, cooperative: { ...form.cooperative, vatRate: Number(e.target.value) } })} /></Field></div></>}
      <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="secondary" onClick={() => setHeaderOpen(false)}>Cancelar</Button><Button>Crear planilla</Button></div>
    </form></Modal>
    <Modal title={editingItem ? 'Editar detalle' : 'Agregar detalle'} open={itemOpen} onClose={() => setItemOpen(false)}><form onSubmit={saveItem} className="grid gap-4 sm:grid-cols-3">
      <Field label="Colaborador" required><Select required value={itemForm.employeeId} onChange={(e) => { const employee = data.employees.find((entry) => entry.id === e.target.value); setItemForm({ ...itemForm, employeeId: e.target.value, rate: employee?.baseRate || 0, paymentMethod: employee?.paymentMethod || '' }) }} disabled={!canEdit}><option value="">Seleccione</option>{activeEmployees.map((entry) => <option key={entry.id} value={entry.id}>{entry.code} — {entry.fullName}</option>)}</Select></Field>
      {([['Días trabajados', 'daysWorked'], ['Horas ordinarias', 'regularHours'], ['Horas extras', 'overtimeHours'], ['Tarifa', 'rate'], ['Salario ordinario', 'regularSalary'], ['Pago horas extra', 'overtimePay'], ['Pago por obra', 'workPay'], ['Bonificación', 'bonus'], ['Comisiones', 'commissions'], ['Otros ingresos', 'otherIncome'], ['IGSS', 'igss'], ['Anticipos', 'advances'], ['Préstamos', 'loans'], ['Otros descuentos', 'otherDeductions']] as const).map(([label, key]) => <Field key={key} label={label}><Input type="number" min="0" step=".01" value={itemForm[key]} onChange={(e) => setItemForm({ ...itemForm, [key]: Number(e.target.value) })} disabled={!canEdit} /></Field>)}
      <Field label="Forma de pago" required><Input required value={itemForm.paymentMethod} onChange={(e) => setItemForm({ ...itemForm, paymentMethod: e.target.value })} disabled={!canEdit} /></Field><Field label="Número de referencia"><Input value={itemForm.reference} onChange={(e) => setItemForm({ ...itemForm, reference: e.target.value })} disabled={!canEdit} /></Field><Field label="Documento de soporte"><Input value={itemForm.supportDocument} onChange={(e) => setItemForm({ ...itemForm, supportDocument: e.target.value })} disabled={!canEdit} /></Field><Field label="Observaciones"><Textarea value={itemForm.notes} onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })} disabled={!canEdit} /></Field>
      <div className="rounded-lg bg-slate-50 p-3 sm:col-span-3"><strong>Vista previa:</strong> ingresos {currency(calculateItem(itemForm).totalIncome)} · descuentos {currency(calculateItem(itemForm).totalDeductions)} · líquido {currency(calculateItem(itemForm).netPay)}</div>
      <div className="flex justify-end gap-2 sm:col-span-3"><Button type="button" variant="secondary" onClick={() => setItemOpen(false)}>Cancelar</Button><Button disabled={!canEdit}>Guardar detalle</Button></div>
    </form></Modal>
  </>
}
