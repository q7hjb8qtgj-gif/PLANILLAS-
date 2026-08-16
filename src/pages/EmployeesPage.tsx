import { useState, type FormEvent } from 'react'
import { useApp } from '../context/AppContext'
import { currency, dateGT } from '../lib/calculations'
import { Badge, Button, Card, Empty, Field, Input, Modal, PageHeader, Select, Textarea } from '../components/ui'
import type { Employee } from '../types'

const blank = { code: '', fullName: '', dpi: '', nit: '', companyId: '', areaId: '', position: '', contractType: '', bankAccount: '', paymentMethod: '', baseRate: 0, admissionDate: '', notes: '' }
export function EmployeesPage() {
  const { data, updateData, session } = useApp()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState(blank)
  const [editing, setEditing] = useState<Employee | null>(null)
  const [error, setError] = useState('')
  const readonly = session?.role === 'Consulta' || session?.role === 'Validador'
  const launch = (entry?: Employee) => { setEditing(entry || null); setForm(entry ? { code: entry.code, fullName: entry.fullName, dpi: entry.dpi || '', nit: entry.nit || '', companyId: entry.companyId, areaId: entry.areaId, position: entry.position, contractType: entry.contractType, bankAccount: entry.bankAccount || '', paymentMethod: entry.paymentMethod, baseRate: entry.baseRate, admissionDate: entry.admissionDate, notes: entry.notes || '' } : blank); setError(''); setOpen(true) }
  const save = (event: FormEvent) => {
    event.preventDefault()
    const normalized = form.fullName.trim().toLocaleLowerCase('es')
    const duplicate = data.employees.find((entry) => entry.id !== editing?.id && (entry.code === form.code || (form.dpi && entry.dpi === form.dpi) || (form.nit && entry.nit === form.nit) || entry.fullName.trim().toLocaleLowerCase('es') === normalized))
    if (duplicate) { setError(`Posible duplicado: ${duplicate.fullName} (${duplicate.code}).`); return }
    const now = new Date().toISOString()
    const item: Employee = { ...form, id: editing?.id || crypto.randomUUID(), baseRate: Number(form.baseRate), active: editing?.active ?? true, createdAt: editing?.createdAt || now, updatedAt: now }
    updateData('employees', editing ? data.employees.map((entry) => entry.id === item.id ? item : entry) : [...data.employees, item], editing ? 'Editar' : 'Crear', item.id, editing, item)
    setOpen(false)
  }
  const toggle = (entry: Employee) => {
    const next = { ...entry, active: !entry.active, updatedAt: new Date().toISOString() }
    updateData('employees', data.employees.map((item) => item.id === entry.id ? next : item), entry.active ? 'Desactivar' : 'Activar', entry.id, entry, next)
  }
  return <><PageHeader title="Colaboradores" description="Registro maestro con detección de posibles duplicados." action={<Button onClick={() => launch()} disabled={readonly || !data.companies.length}>Nuevo colaborador</Button>} />{!data.companies.length && <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Configure al menos una empresa y un área antes de registrar colaboradores.</p>}
    <Card>{data.employees.length ? <div className="overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead className="border-b text-slate-500"><tr><th className="p-3">Código</th><th>Nombre</th><th>Empresa / área</th><th>Puesto</th><th>Tarifa</th><th>Ingreso</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{data.employees.map((entry) => <tr key={entry.id} className="border-b border-slate-100"><td className="p-3 font-medium">{entry.code}</td><td>{entry.fullName}</td><td>{data.companies.find((item) => item.id === entry.companyId)?.name}<small className="block text-slate-500">{data.areas.find((item) => item.id === entry.areaId)?.name}</small></td><td>{entry.position}</td><td>{currency(entry.baseRate)}</td><td>{dateGT(entry.admissionDate)}</td><td><Badge tone={entry.active ? 'green' : 'slate'}>{entry.active ? 'Activo' : 'Inactivo'}</Badge></td><td className="space-x-2"><Button variant="ghost" onClick={() => launch(entry)}>Ver / editar</Button><Button variant="ghost" onClick={() => toggle(entry)} disabled={readonly}>{entry.active ? 'Desactivar' : 'Activar'}</Button></td></tr>)}</tbody></table></div> : <Empty />}</Card>
    <Modal title={editing ? 'Editar colaborador' : 'Nuevo colaborador'} open={open} onClose={() => setOpen(false)}><form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <Field label="Código" required><Input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} disabled={readonly} /></Field><Field label="Nombre completo" required><Input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} disabled={readonly} /></Field>
      <Field label="DPI (opcional)"><Input value={form.dpi} onChange={(e) => setForm({ ...form, dpi: e.target.value })} disabled={readonly} /></Field><Field label="NIT (opcional)"><Input value={form.nit} onChange={(e) => setForm({ ...form, nit: e.target.value })} disabled={readonly} /></Field>
      <Field label="Empresa" required><Select required value={form.companyId} onChange={(e) => setForm({ ...form, companyId: e.target.value, areaId: '' })} disabled={readonly}><option value="">Seleccione</option>{data.companies.filter((entry) => entry.active).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</Select></Field>
      <Field label="Área" required><Select required value={form.areaId} onChange={(e) => setForm({ ...form, areaId: e.target.value })} disabled={readonly}><option value="">Seleccione</option>{data.areas.filter((entry) => entry.active && entry.companyId === form.companyId).map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</Select></Field>
      <Field label="Puesto" required><Input required value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} disabled={readonly} /></Field><Field label="Tipo de contratación" required><Input required value={form.contractType} onChange={(e) => setForm({ ...form, contractType: e.target.value })} disabled={readonly} /></Field>
      <Field label="Cuenta bancaria"><Input value={form.bankAccount} onChange={(e) => setForm({ ...form, bankAccount: e.target.value })} disabled={readonly} /></Field><Field label="Forma de pago" required><Input required value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} disabled={readonly} /></Field>
      <Field label="Salario o tarifa base (Q)" required><Input required type="number" min="0" step=".01" value={form.baseRate} onChange={(e) => setForm({ ...form, baseRate: Number(e.target.value) })} disabled={readonly} /></Field><Field label="Fecha de ingreso" required><Input required type="date" value={form.admissionDate} onChange={(e) => setForm({ ...form, admissionDate: e.target.value })} disabled={readonly} /></Field>
      <Field label="Observaciones"><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} disabled={readonly} /></Field>{error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <div className="flex justify-end gap-2 sm:col-span-2"><Button type="button" variant="secondary" onClick={() => setOpen(false)}>Cancelar</Button><Button disabled={readonly}>Guardar</Button></div>
    </form></Modal>
  </>
}
