import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { BarChart, Bar, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, BookOpen, Building2, ClipboardCheck, FileDown, FileSpreadsheet, FolderOpen, Gauge, Import, LogOut, Menu, Plus, Scale, Settings, Users, X } from 'lucide-react'
import { Badge, Button, Card, Empty, Field, Input, Select, Table, Td } from './components/ui'
import { calculateCooperative, calculatePayrollItem } from './lib/calculations'
import { exportPayrollExcel, exportPayrollPdf } from './lib/export'
import { readWorkbook, type ImportedSheet } from './lib/import'
import { store, useAppData } from './lib/store'
import { persistenceMode, supabase } from './lib/supabase'
import { currency, dateGT, nowGuatemala, numberValue, uid } from './lib/utils'
import { validatePayroll } from './lib/validation'
import type { AppData, CatalogItem, Employee, Finding, Payroll, PayrollItem, PayrollStatus, PayrollType, Role, UserSession } from './types'

type Page = 'dashboard' | 'payrolls' | 'import' | 'reconciliation' | 'findings' | 'employees' | 'reports' | 'documents' | 'audit' | 'settings'
const navigation: { page: Page; label: string; icon: typeof Gauge }[] = [
  { page: 'dashboard', label: 'Tablero', icon: Gauge }, { page: 'payrolls', label: 'Planillas', icon: ClipboardCheck },
  { page: 'import', label: 'Importar', icon: Import }, { page: 'reconciliation', label: 'Conciliación', icon: Scale },
  { page: 'findings', label: 'Hallazgos', icon: AlertTriangle }, { page: 'employees', label: 'Colaboradores', icon: Users },
  { page: 'reports', label: 'Reportes', icon: FileDown }, { page: 'documents', label: 'Documentos', icon: FolderOpen },
  { page: 'audit', label: 'Bitácora', icon: BookOpen }, { page: 'settings', label: 'Configuración', icon: Settings },
]
const roleNames: Record<Role, string> = { administrador: 'Administrador', validador: 'Validador', digitador: 'Digitador', consulta: 'Consulta', encargado_area: 'Encargado de área' }
const canEdit = (session: UserSession) => !['consulta'].includes(session.role)
const canApprove = (session: UserSession) => ['administrador', 'validador', 'encargado_area'].includes(session.role)

export default function App() {
  const [session, setSession] = useState<UserSession | null>(null)
  if (window.location.pathname !== '/') return <NotFound />
  if (!session) return <Login onLogin={setSession} />
  return <Application session={session} logout={() => setSession(null)} />
}

function NotFound() {
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-4"><Card className="max-w-md text-center"><p className="text-6xl font-bold text-blue-950">404</p><h1 className="mt-3 text-xl font-semibold">Página no encontrada</h1><p className="mt-2 text-sm text-slate-500">La dirección solicitada no existe.</p><Button className="mt-5" onClick={() => { window.location.href = '/' }}>Volver al inicio</Button></Card></main>
}

function Login({ onLogin }: { onLogin: (session: UserSession) => void }) {
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name') || '').trim()
    const role = String(form.get('role')) as Role
    if (!name) return setError('Ingrese su nombre.')
    if (supabase) {
      const email = String(form.get('email') || '')
      const password = String(form.get('password') || '')
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError || !data.user) return setError(authError?.message || 'No se pudo iniciar sesión.')
      onLogin({ id: data.user.id, name, role })
    } else onLogin({ id: uid(), name, role })
  }
  return <main className="grid min-h-screen place-items-center bg-slate-100 p-4"><Card className="w-full max-w-md p-6">
    <div className="mb-6 flex items-center gap-3"><div className="rounded-xl bg-blue-950 p-3 text-white"><ClipboardCheck /></div><div><h1 className="font-bold text-blue-950">Corporación Riso</h1><p className="text-sm text-slate-500">Control y verificación de planillas</p></div></div>
    <form className="grid gap-4" onSubmit={submit}>
      {persistenceMode === 'local' && <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Modo local activo. Configure Supabase para autenticación centralizada.</div>}
      {supabase && <><Field label="Correo"><Input name="email" type="email" required /></Field><Field label="Contraseña"><Input name="password" type="password" required /></Field></>}
      <Field label="Nombre completo"><Input name="name" autoComplete="name" required /></Field>
      <Field label="Rol"><Select name="role">{Object.entries(roleNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</Select></Field>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}<Button type="submit">Ingresar</Button>
    </form>
  </Card></main>
}

function Application({ session, logout }: { session: UserSession; logout: () => void }) {
  const data = useAppData()
  const [page, setPage] = useState<Page>('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)
  const content: Record<Page, ReactNode> = {
    dashboard: <Dashboard data={data} />, payrolls: <Payrolls data={data} session={session} />,
    import: <Importer data={data} session={session} />, reconciliation: <Reconciliation data={data} />,
    findings: <Findings data={data} session={session} />, employees: <Employees data={data} session={session} />,
    reports: <Reports data={data} />, documents: <Documents data={data} session={session} />,
    audit: <Audit data={data} />, settings: <Configuration data={data} session={session} />,
  }
  return <div className="min-h-screen bg-slate-50 text-slate-900">
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-4 lg:ml-64">
      <div className="flex items-center gap-3"><Button className="px-3 lg:hidden" variant="ghost" onClick={() => setMenuOpen(true)} aria-label="Abrir menú"><Menu /></Button><div><h1 className="text-sm font-bold text-blue-950 md:text-base">SISTEMA DE PLANILLAS</h1><p className="hidden text-xs text-slate-500 sm:block">Corporación Riso · {persistenceMode === 'local' ? 'Modo local' : 'Supabase'}</p></div></div>
      <div className="flex items-center gap-2 text-right"><div><p className="text-sm font-semibold">{session.name}</p><p className="text-xs text-slate-500">{roleNames[session.role]}</p></div><Button variant="ghost" className="px-3" onClick={logout} aria-label="Cerrar sesión"><LogOut size={19} /></Button></div>
    </header>
    <aside className={`fixed inset-y-0 left-0 z-40 w-64 border-r bg-blue-950 text-white transition-transform lg:translate-x-0 ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex h-16 items-center justify-between border-b border-blue-900 px-4"><div className="flex items-center gap-2 font-bold"><Building2 /> CORPORACIÓN RISO</div><Button variant="ghost" className="text-white lg:hidden" onClick={() => setMenuOpen(false)}><X /></Button></div>
      <nav className="grid gap-1 p-3">{navigation.map(({ page: target, label, icon: Icon }) => <button key={target} onClick={() => { setPage(target); setMenuOpen(false) }} className={`flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-medium ${page === target ? 'bg-white text-blue-950' : 'text-blue-100 hover:bg-blue-900'}`}><Icon size={19} />{label}</button>)}</nav>
    </aside>
    {menuOpen && <button className="fixed inset-0 z-30 bg-black/40 lg:hidden" aria-label="Cerrar menú" onClick={() => setMenuOpen(false)} />}
    <main className="p-4 pb-24 lg:ml-64 lg:p-6"><div className="mx-auto max-w-7xl">{content[page]}</div></main>
  </div>
}

const pageTitle = (title: string, description: string, action?: ReactNode) => <div className="mb-5 flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-2xl font-bold text-blue-950">{title}</h2><p className="text-sm text-slate-500">{description}</p></div>{action}</div>

function Dashboard({ data }: { data: AppData }) {
  const active = data.payrolls.filter((payroll) => !payroll.voidedAt)
  const allItems = active.flatMap((payroll) => payroll.items)
  const gross = allItems.reduce((sum, item) => sum + item.totalIncome, 0)
  const discounts = allItems.reduce((sum, item) => sum + item.totalDeductions, 0)
  const net = gross - discounts
  const cooperative = active.reduce((sum, payroll) => sum + calculateCooperative(payroll.items.reduce((value, item) => value + item.netPay, 0), payroll.cooperative).commission, 0)
  const vat = active.reduce((sum, payroll) => sum + calculateCooperative(payroll.items.reduce((value, item) => value + item.netPay, 0), payroll.cooperative).vat, 0)
  const stats = [['Total bruto', currency(gross)], ['Total descuentos', currency(discounts)], ['Líquido a pagar', currency(net)], ['Comisión cooperativa', currency(cooperative)], ['IVA sobre comisión', currency(vat)], ['Costo total', currency(net + cooperative + vat)], ['Colaboradores', String(new Set(allItems.map((item) => item.employeeId)).size)], ['Hallazgos críticos', String(data.findings.filter((finding) => finding.severity === 'Crítico' && finding.status !== 'Resuelto').length)], ['Monto en riesgo', currency(data.findings.filter((finding) => finding.status !== 'Resuelto').reduce((sum, finding) => sum + finding.affectedAmount, 0))], ['Planillas pendientes', String(active.filter((payroll) => payroll.status === 'Pendiente de revisión').length)], ['Planillas aprobadas', String(active.filter((payroll) => payroll.status === 'Aprobada').length)], ['Planillas pagadas', String(active.filter((payroll) => payroll.status === 'Pagada').length)]]
  const companyChart = data.companies.map((company) => ({ name: company.name, total: active.filter((payroll) => payroll.companyId === company.id).flatMap((payroll) => payroll.items).reduce((sum, item) => sum + item.netPay, 0) })).filter((row) => row.total)
  const findingChart = ['Crítico', 'Alto', 'Medio', 'Informativo'].map((level) => ({ name: level, value: data.findings.filter((finding) => finding.severity === level).length })).filter((row) => row.value)
  return <>{pageTitle('Tablero principal', 'Indicadores construidos únicamente con información registrada.')}
    {!active.length ? <Empty /> : <><div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">{stats.map(([label, value]) => <Card key={label}><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-xl font-bold text-blue-950">{value}</p></Card>)}</div>
      <div className="grid gap-4 lg:grid-cols-2"><Card><h3 className="mb-4 font-semibold">Costo por empresa</h3><ResponsiveContainer width="100%" height={260}><BarChart data={companyChart}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(value) => currency(Number(value))} /><Bar dataKey="total" fill="#172554" /></BarChart></ResponsiveContainer></Card>
      <Card><h3 className="mb-4 font-semibold">Hallazgos por nivel</h3>{findingChart.length ? <ResponsiveContainer width="100%" height={260}><PieChart><Pie data={findingChart} dataKey="value" nameKey="name" outerRadius={90} label>{findingChart.map((_, index) => <Cell key={index} fill={['#b91c1c', '#ea580c', '#d97706', '#2563eb'][index]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer> : <Empty />}</Card></div></>}
  </>
}

function Employees({ data, session }: { data: AppData; session: UserSession }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const schema = z.object({ code: z.string().min(1), fullName: z.string().min(2), companyId: z.string().min(1), areaId: z.string().min(1), baseRate: z.coerce.number().nonnegative() })
  const { register, handleSubmit, reset } = useForm<Record<string, string>>()
  const submit = handleSubmit((values) => {
    const parsed = schema.safeParse(values)
    if (!parsed.success) return setError('Complete los campos obligatorios correctamente.')
    const normalized = parsed.data.fullName.toLocaleLowerCase('es-GT')
    if (data.employees.some((employee) => employee.code === parsed.data.code || employee.fullName.toLocaleLowerCase('es-GT') === normalized || (values.dpi && employee.dpi === values.dpi) || (values.nit && employee.nit === values.nit))) return setError('Existe un posible duplicado por código, DPI, NIT o nombre.')
    const employee: Employee = { id: uid(), code: parsed.data.code, fullName: parsed.data.fullName, dpi: values.dpi, nit: values.nit, companyId: parsed.data.companyId, areaId: parsed.data.areaId, position: values.position || '', contractType: values.contractType || '', bankAccount: values.bankAccount, paymentMethod: values.paymentMethod || 'Transferencia', baseRate: parsed.data.baseRate, active: true, startDate: values.startDate || '', notes: values.notes }
    store.update((current) => ({ ...current, employees: [...current.employees, employee] }), { userName: session.name, action: 'CREAR', module: 'Colaboradores', recordId: employee.id, before: null, after: employee })
    reset(); setError(''); setOpen(false)
  })
  return <>{pageTitle('Colaboradores', 'Registro editable y validación preventiva de duplicados.', canEdit(session) && <Button onClick={() => setOpen(!open)}><Plus size={18} /> Nuevo</Button>)}
    {open && <Card className="mb-5"><form onSubmit={submit} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Field label="Código *"><Input {...register('code')} /></Field><Field label="Nombre completo *"><Input {...register('fullName')} /></Field>
      <Field label="DPI opcional"><Input {...register('dpi')} /></Field><Field label="NIT opcional"><Input {...register('nit')} /></Field>
      <Field label="Empresa *"><Select {...register('companyId')}><option value="">Seleccione</option>{data.companies.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
      <Field label="Área *"><Select {...register('areaId')}><option value="">Seleccione</option>{data.areas.filter((item) => item.active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
      <Field label="Puesto"><Input {...register('position')} /></Field><Field label="Tipo de contratación"><Input {...register('contractType')} /></Field>
      <Field label="Cuenta bancaria"><Input {...register('bankAccount')} /></Field><Field label="Forma de pago"><Select {...register('paymentMethod')}><option>Transferencia</option><option>Cheque</option><option>Efectivo</option><option>Cooperativa</option></Select></Field>
      <Field label="Salario o tarifa base *"><Input type="number" min="0" step="0.01" {...register('baseRate')} /></Field><Field label="Fecha de ingreso"><Input type="date" {...register('startDate')} /></Field>
      <Field label="Observaciones"><Input {...register('notes')} /></Field>{error && <p className="self-end text-sm text-red-700">{error}</p>}<Button type="submit">Guardar colaborador</Button>
    </form></Card>}
    {!data.employees.length ? <Empty /> : <Table headers={['Código', 'Nombre', 'Empresa / Área', 'Puesto', 'Tarifa', 'Pago', 'Estado', 'Acciones']}>{data.employees.map((employee) => <tr key={employee.id}><Td>{employee.code}</Td><Td className="font-medium">{employee.fullName}</Td><Td>{nameOf(data.companies, employee.companyId)}<br /><span className="text-xs text-slate-500">{nameOf(data.areas, employee.areaId)}</span></Td><Td>{employee.position}</Td><Td>{currency(employee.baseRate)}</Td><Td>{employee.paymentMethod}</Td><Td><Badge tone={employee.active ? 'success' : 'neutral'}>{employee.active ? 'Activo' : 'Inactivo'}</Badge></Td><Td>{canEdit(session) && <Button variant="secondary" onClick={() => store.update((current) => ({ ...current, employees: current.employees.map((item) => item.id === employee.id ? { ...item, active: !item.active } : item) }), { userName: session.name, action: employee.active ? 'DESACTIVAR' : 'ACTIVAR', module: 'Colaboradores', recordId: employee.id, before: employee, after: { ...employee, active: !employee.active } })}>{employee.active ? 'Desactivar' : 'Activar'}</Button>}</Td></tr>)}</Table>}
  </>
}

function Payrolls({ data, session }: { data: AppData; session: UserSession }) {
  const [selectedId, setSelectedId] = useState<string>()
  const [creating, setCreating] = useState(false)
  const selected = data.payrolls.find((payroll) => payroll.id === selectedId)
  if (selected) return <PayrollDetail payroll={selected} data={data} session={session} back={() => setSelectedId(undefined)} />
  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget)
    const payroll: Payroll = { id: uid(), code: String(form.get('code')), companyId: String(form.get('companyId')), areaId: String(form.get('areaId')), startDate: String(form.get('startDate')), endDate: String(form.get('endDate')), week: numberValue(form.get('week')), year: numberValue(form.get('year')), type: String(form.get('type')) as PayrollType, status: 'Borrador', digitizer: session.name, reviewer: String(form.get('reviewer') || ''), notes: String(form.get('notes') || ''), items: [], cooperative: { enabled: false, commissionRate: 5, vatRate: 12 }, approvals: [], createdAt: nowGuatemala(), updatedAt: nowGuatemala() }
    store.update((current) => ({ ...current, payrolls: [payroll, ...current.payrolls] }), { userName: session.name, action: 'CREAR', module: 'Planillas', recordId: payroll.id, before: null, after: payroll })
    setSelectedId(payroll.id); setCreating(false)
  }
  return <>{pageTitle('Planillas', 'Registro, revisión y autorización semanal.', canEdit(session) && <Button onClick={() => setCreating(!creating)}><Plus size={18} /> Nueva planilla</Button>)}
    {creating && <Card className="mb-5"><form className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" onSubmit={create}>
      <Field label="Código del período"><Input name="code" required /></Field><Field label="Empresa"><Select name="companyId" required><option value="">Seleccione</option>{data.companies.filter((item) => item.active).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field>
      <Field label="Área"><Select name="areaId" required><option value="">Seleccione</option>{data.areas.filter((item) => item.active).map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</Select></Field>
      <Field label="Tipo"><Select name="type">{['Ordinaria', 'Extraordinaria', 'Obra complementaria', 'Bono', 'Ajuste', 'Otro'].map((item) => <option key={item}>{item}</option>)}</Select></Field>
      <Field label="Fecha inicial"><Input name="startDate" type="date" required /></Field><Field label="Fecha final"><Input name="endDate" type="date" required /></Field>
      <Field label="Semana"><Input name="week" type="number" min="1" max="53" required /></Field><Field label="Año"><Input name="year" type="number" min="2020" defaultValue={new Date().getFullYear()} required /></Field>
      <Field label="Responsable de revisión"><Input name="reviewer" /></Field><Field label="Observaciones"><Input name="notes" /></Field><Button className="self-end" type="submit">Crear y abrir</Button>
    </form></Card>}
    {!data.payrolls.length ? <Empty /> : <Table headers={['Código', 'Empresa / Área', 'Período', 'Tipo', 'Estado', 'Registros', 'Líquido', 'Acción']}>{data.payrolls.map((payroll) => <tr key={payroll.id} className={payroll.voidedAt ? 'opacity-60' : ''}><Td className="font-semibold">{payroll.code}</Td><Td>{nameOf(data.companies, payroll.companyId)}<br /><span className="text-xs text-slate-500">{nameOf(data.areas, payroll.areaId)}</span></Td><Td>{dateGT(payroll.startDate)} – {dateGT(payroll.endDate)}</Td><Td>{payroll.type}</Td><Td><Status value={payroll.status} /></Td><Td>{payroll.items.length}</Td><Td>{currency(payroll.items.reduce((sum, item) => sum + item.netPay, 0))}</Td><Td><Button variant="secondary" onClick={() => setSelectedId(payroll.id)}>Abrir</Button></Td></tr>)}</Table>}
  </>
}

function PayrollDetail({ payroll, data, session, back }: { payroll: Payroll; data: AppData; session: UserSession; back: () => void }) {
  const locked = ['Pagada', 'Anulada'].includes(payroll.status) || session.role === 'consulta'
  const openFindings = data.findings.filter((finding) => finding.payrollId === payroll.id && finding.status !== 'Resuelto')
  const total = payroll.items.reduce((sum, item) => sum + item.netPay, 0)
  function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const employee = data.employees.find((item) => item.id === form.get('employeeId')); if (!employee) return
    const partial = { regularSalary: numberValue(form.get('regularSalary')), overtimePay: numberValue(form.get('overtimePay')), workPay: numberValue(form.get('workPay')), bonus: numberValue(form.get('bonus')), commissions: numberValue(form.get('commissions')), otherIncome: numberValue(form.get('otherIncome')), igss: numberValue(form.get('igss')), advances: numberValue(form.get('advances')), loans: numberValue(form.get('loans')), otherDeductions: numberValue(form.get('otherDeductions')) }
    const item: PayrollItem = { id: uid(), employeeId: employee.id, employeeCode: employee.code, employeeName: employee.fullName, companyId: employee.companyId, areaId: employee.areaId, position: employee.position, daysWorked: numberValue(form.get('daysWorked')), regularHours: numberValue(form.get('regularHours')), overtimeHours: numberValue(form.get('overtimeHours')), rate: numberValue(form.get('rate')), ...partial, ...calculatePayrollItem(partial), paymentMethod: String(form.get('paymentMethod')), reference: String(form.get('reference') || ''), notes: String(form.get('notes') || ''), supportDocument: String(form.get('supportDocument') || ''), validationStatus: 'Pendiente' }
    updatePayroll(payroll.id, (value) => ({ ...value, items: [...value.items, item] }), session, 'AGREGAR DETALLE', item)
    event.currentTarget.reset()
  }
  function runValidation() {
    const results = validatePayroll(payroll, data.payrolls)
    store.update((current) => ({ ...current, findings: [...current.findings.filter((finding) => finding.payrollId !== payroll.id || finding.status === 'Resuelto'), ...results] }), { userName: session.name, action: 'VALIDAR', module: 'Planillas', recordId: payroll.id, before: openFindings, after: results })
  }
  function transition(status: PayrollStatus, action: string) {
    const needsComment = ['Rechazada', 'Anulada', 'Corregida'].includes(status)
    const comment = needsComment ? window.prompt('Ingrese el comentario obligatorio:') : window.prompt('Comentario (opcional):')
    if (needsComment && !comment) return
    if (status === 'Aprobada' && data.findings.some((finding) => finding.payrollId === payroll.id && finding.severity === 'Crítico' && finding.status !== 'Resuelto')) return window.alert('No se puede aprobar con hallazgos críticos pendientes.')
    if (action === 'Autorización primaria' && session.name.trim().toLowerCase() !== 'luis rivas' && session.role !== 'administrador') return window.alert('La autorización primaria corresponde a Luis Rivas.')
    updatePayroll(payroll.id, (value) => ({ ...value, status, approvals: [...value.approvals, { id: uid(), step: action, action: status, userName: session.name, comment: comment || undefined, createdAt: nowGuatemala() }], voidedAt: status === 'Anulada' ? nowGuatemala() : value.voidedAt }), session, action, { status, comment })
  }
  const coop = calculateCooperative(total, payroll.cooperative)
  return <>{pageTitle(payroll.code, `${dateGT(payroll.startDate)} – ${dateGT(payroll.endDate)}`, <Button variant="secondary" onClick={back}>Volver</Button>)}
    <div className="mb-5 grid gap-4 lg:grid-cols-3"><Card className="lg:col-span-2"><div className="flex flex-wrap items-center gap-3"><Status value={payroll.status} /><span>{payroll.type}</span><span>{nameOf(data.companies, payroll.companyId)} / {nameOf(data.areas, payroll.areaId)}</span></div><div className="mt-4 flex flex-wrap gap-2"><Button variant="secondary" onClick={runValidation}>Ejecutar validaciones</Button>{canApprove(session) && payroll.status === 'Borrador' && <Button onClick={() => transition('Pendiente de revisión', 'Enviar a revisión')}>Enviar a revisión</Button>}{canApprove(session) && <><Button variant="secondary" onClick={() => transition('Observada', 'Observar')}>Observar</Button><Button variant="success" onClick={() => transition('Aprobada', 'Autorización primaria')}>Aprobar</Button><Button variant="danger" onClick={() => transition('Rechazada', 'Rechazar')}>Rechazar</Button>{session.role === 'administrador' && <><Button variant="success" onClick={() => transition('Pagada', 'Marcar pagada')}>Marcar pagada</Button><Button variant="danger" onClick={() => transition('Anulada', 'Anular')}>Anular</Button></>}</>}</div></Card>
      <Card><p className="text-sm text-slate-500">Líquido</p><p className="text-2xl font-bold text-blue-950">{currency(total)}</p><p className="mt-2 text-sm">Hallazgos pendientes: <strong>{openFindings.length}</strong></p></Card></div>
    <Card className="mb-5"><div className="mb-3 flex flex-wrap items-center justify-between"><h3 className="font-semibold">Cooperativa</h3><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={payroll.cooperative.enabled} disabled={locked} onChange={(event) => updatePayroll(payroll.id, (value) => ({ ...value, cooperative: { ...value.cooperative, enabled: event.target.checked } }), session, 'CONFIGURAR COOPERATIVA', event.target.checked)} /> Activar</label></div><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"><Metric label="Monto base" value={currency(total)} /><EditableRate label="Comisión %" value={payroll.cooperative.commissionRate} disabled={locked} change={(commissionRate) => updatePayroll(payroll.id, (value) => ({ ...value, cooperative: { ...value.cooperative, commissionRate } }), session, 'EDITAR COMISIÓN', commissionRate)} /><EditableRate label="IVA %" value={payroll.cooperative.vatRate} disabled={locked} change={(vatRate) => updatePayroll(payroll.id, (value) => ({ ...value, cooperative: { ...value.cooperative, vatRate } }), session, 'EDITAR IVA', vatRate)} /><Metric label="Comisión" value={currency(coop.commission)} /><Metric label="IVA" value={currency(coop.vat)} /><Metric label="Total" value={currency(coop.grandTotal)} /></div></Card>
    {!locked && <Card className="mb-5"><h3 className="mb-4 font-semibold">Agregar detalle</h3><form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onSubmit={addItem}>
      <Field label="Colaborador"><Select name="employeeId" required><option value="">Seleccione</option>{data.employees.filter((employee) => employee.active && employee.companyId === payroll.companyId).map((employee) => <option key={employee.id} value={employee.id}>{employee.code} · {employee.fullName}</option>)}</Select></Field>
      {[['daysWorked', 'Días trabajados'], ['regularHours', 'Horas ordinarias'], ['overtimeHours', 'Horas extras'], ['rate', 'Tarifa'], ['regularSalary', 'Salario ordinario'], ['overtimePay', 'Pago horas extras'], ['workPay', 'Pago por obra'], ['bonus', 'Bonificación'], ['commissions', 'Comisiones'], ['otherIncome', 'Otros ingresos'], ['igss', 'IGSS'], ['advances', 'Anticipos'], ['loans', 'Préstamos'], ['otherDeductions', 'Otros descuentos']].map(([name, label]) => <Field label={label} key={name}><Input name={name} type="number" step="0.01" min="0" defaultValue="0" /></Field>)}
      <Field label="Forma de pago"><Select name="paymentMethod"><option>Transferencia</option><option>Cheque</option><option>Efectivo</option><option>Cooperativa</option></Select></Field><Field label="Referencia"><Input name="reference" /></Field><Field label="Documento de soporte"><Input name="supportDocument" /></Field><Field label="Observaciones"><Input name="notes" /></Field><Button className="self-end" type="submit">Agregar registro</Button>
    </form></Card>}
    {!payroll.items.length ? <Empty text="Sin registros en esta planilla" /> : <Table headers={['Código', 'Colaborador', 'Días / Horas', 'Ingresos', 'Descuentos', 'Líquido', 'Pago / Referencia', 'Acción']}>{payroll.items.map((item) => <tr key={item.id}><Td>{item.employeeCode}</Td><Td className="font-medium">{item.employeeName}</Td><Td>{item.daysWorked} días<br />{item.regularHours}h + {item.overtimeHours}h extra</Td><Td>{currency(item.totalIncome)}</Td><Td>{currency(item.totalDeductions)}</Td><Td className="font-semibold">{currency(item.netPay)}</Td><Td>{item.paymentMethod}<br /><span className="text-xs text-slate-500">{item.reference || 'Sin referencia'}</span></Td><Td>{!locked && <Button variant="danger" onClick={() => { if (confirm('¿Anular este registro? Quedará constancia en bitácora.')) updatePayroll(payroll.id, (value) => ({ ...value, items: value.items.filter((candidate) => candidate.id !== item.id) }), session, 'ANULAR DETALLE', item) }}>Anular</Button>}</Td></tr>)}</Table>}
  </>
}

function Importer({ data, session }: { data: AppData; session: UserSession }) {
  const [sheets, setSheets] = useState<ImportedSheet[]>([])
  const [sheetIndex, setSheetIndex] = useState(0)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [payrollId, setPayrollId] = useState('')
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const fields = ['employeeCode', 'daysWorked', 'regularHours', 'overtimeHours', 'rate', 'regularSalary', 'overtimePay', 'workPay', 'bonus', 'commissions', 'otherIncome', 'igss', 'advances', 'loans', 'otherDeductions', 'paymentMethod', 'reference', 'notes', 'supportDocument']
  async function choose(file?: File) {
    if (!file) return
    if (file.size > 10 * 1024 * 1024) return setError('El archivo supera el máximo de 10 MB.')
    if (!/\.(xlsx|xls|csv)$/i.test(file.name)) return setError('Tipo de archivo no permitido.')
    try { const parsed = await readWorkbook(file); setSheets(parsed); setFileName(file.name); setMapping({}); setError('') } catch (caught) { setError(caught instanceof Error ? caught.message : 'No se pudo leer el archivo.') }
  }
  function confirmImport() {
    const payroll = data.payrolls.find((item) => item.id === payrollId); const sheet = sheets[sheetIndex]
    if (!payroll || !sheet || !mapping.employeeCode) return setError('Seleccione planilla y mapee el código del colaborador.')
    const imported: PayrollItem[] = []; const rowErrors: string[] = []; const seen = new Set<string>()
    sheet.rows.forEach((row) => {
      const code = String(row[mapping.employeeCode] || '').trim(); const employee = data.employees.find((item) => item.code === code)
      if (!code || !employee) return rowErrors.push(`Fila ${row.__row}: colaborador no encontrado.`)
      if (seen.has(code)) return rowErrors.push(`Fila ${row.__row}: colaborador repetido en el archivo.`)
      seen.add(code)
      const numeric = (field: string) => { const value = Number(row[mapping[field]] || 0); if (!Number.isFinite(value)) throw new Error(`Fila ${row.__row}: ${field} no es numérico.`); return value }
      try {
        const partial = { regularSalary: numeric('regularSalary'), overtimePay: numeric('overtimePay'), workPay: numeric('workPay'), bonus: numeric('bonus'), commissions: numeric('commissions'), otherIncome: numeric('otherIncome'), igss: numeric('igss'), advances: numeric('advances'), loans: numeric('loans'), otherDeductions: numeric('otherDeductions') }
        imported.push({ id: uid(), employeeId: employee.id, employeeCode: code, employeeName: employee.fullName, companyId: employee.companyId, areaId: employee.areaId, position: employee.position, daysWorked: numeric('daysWorked'), regularHours: numeric('regularHours'), overtimeHours: numeric('overtimeHours'), rate: numeric('rate'), ...partial, ...calculatePayrollItem(partial), paymentMethod: String(row[mapping.paymentMethod] || employee.paymentMethod), reference: String(row[mapping.reference] || ''), notes: String(row[mapping.notes] || ''), supportDocument: String(row[mapping.supportDocument] || ''), validationStatus: 'Pendiente', sourceFile: fileName, sourceRow: Number(row.__row) })
      } catch (caught) { rowErrors.push(caught instanceof Error ? caught.message : `Fila ${row.__row}: error.`) }
    })
    if (imported.length) updatePayroll(payroll.id, (value) => ({ ...value, items: [...value.items, ...imported] }), session, 'IMPORTAR EXCEL', { fileName, rows: imported.length, errors: rowErrors })
    setError(rowErrors.length ? `${imported.length} filas importadas. Errores omitidos: ${rowErrors.join(' ')}` : `Constancia: ${imported.length} filas importadas correctamente desde ${fileName}.`)
  }
  const sheet = sheets[sheetIndex]
  return <>{pageTitle('Importación', 'XLSX y CSV con vista previa, mapeo y validación por fila.')}
    <Card className="mb-5"><div className="grid gap-4 md:grid-cols-3"><Field label="Archivo (máximo 10 MB)"><Input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => choose(event.target.files?.[0])} /></Field><Field label="Planilla de destino"><Select value={payrollId} onChange={(event) => setPayrollId(event.target.value)}><option value="">Seleccione</option>{data.payrolls.filter((item) => !['Pagada', 'Anulada'].includes(item.status)).map((item) => <option value={item.id} key={item.id}>{item.code}</option>)}</Select></Field>{sheets.length > 1 && <Field label="Hoja"><Select value={sheetIndex} onChange={(event) => setSheetIndex(Number(event.target.value))}>{sheets.map((item, index) => <option key={item.name} value={index}>{item.name}</option>)}</Select></Field>}</div>{error && <div className={`mt-4 rounded-lg p-3 text-sm ${error.startsWith('Constancia') ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{error}</div>}</Card>
    {sheet && <><Card className="mb-5"><h3 className="mb-3 font-semibold">Mapeo de columnas</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{fields.map((field) => <Field key={field} label={field}><Select value={mapping[field] || ''} onChange={(event) => setMapping((current) => ({ ...current, [field]: event.target.value }))}><option value="">No importar</option>{sheet.headers.map((header) => <option key={header}>{header}</option>)}</Select></Field>)}</div><Button className="mt-4" onClick={confirmImport}>Confirmar importación válida</Button></Card>
      <Table headers={sheet.headers}>{sheet.rows.slice(0, 10).map((row) => <tr key={String(row.__row)}>{sheet.headers.map((header) => <Td key={header}>{String(row[header] ?? '')}</Td>)}</tr>)}</Table></>}
    {!sheet && <Empty text="Seleccione un archivo para iniciar" />}
  </>
}

function Reconciliation({ data }: { data: AppData }) {
  const [onlyDifferences, setOnlyDifferences] = useState(true)
  const rows = useMemo(() => {
    const ordinary = data.payrolls.filter((payroll) => payroll.type === 'Ordinaria' && !payroll.voidedAt)
    return ordinary.flatMap((payroll) => {
      const extraordinary = data.payrolls.filter((candidate) => candidate.companyId === payroll.companyId && candidate.startDate === payroll.startDate && candidate.endDate === payroll.endDate && candidate.type !== 'Ordinaria' && !candidate.voidedAt)
      return payroll.items.map((item) => {
        const extra = extraordinary.flatMap((candidate) => candidate.items).filter((candidate) => candidate.employeeId === item.employeeId).reduce((sum, candidate) => sum + candidate.netPay, 0)
        return { key: `${payroll.id}-${item.id}`, employee: item.employeeName, ordinary: item.netPay, extra, difference: extra, duplicate: extra > 0, risk: extra > 0 ? Math.min(item.netPay, extra) : 0 }
      })
    })
  }, [data.payrolls])
  const visible = onlyDifferences ? rows.filter((row) => row.difference !== 0) : rows
  return <>{pageTitle('Conciliación', 'Comparación de planilla ordinaria contra extraordinaria.')}<label className="mb-4 flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyDifferences} onChange={(event) => setOnlyDifferences(event.target.checked)} /> Mostrar únicamente discrepancias</label>
    {!visible.length ? <Empty /> : <Table headers={['Colaborador', 'Ordinaria', 'Extraordinaria', 'Diferencia', 'Posible duplicidad', 'Monto en riesgo', 'Estado', 'Acción recomendada']}>{visible.map((row) => <tr key={row.key}><Td>{row.employee}</Td><Td>{currency(row.ordinary)}</Td><Td>{currency(row.extra)}</Td><Td>{currency(row.difference)}</Td><Td><Badge tone={row.duplicate ? 'danger' : 'success'}>{row.duplicate ? 'Sí' : 'No'}</Badge></Td><Td>{currency(row.risk)}</Td><Td>{row.duplicate ? 'Revisar' : 'Conciliado'}</Td><Td>{row.duplicate ? 'Validar conceptos y soportes' : 'Sin acción'}</Td></tr>)}</Table>}
  </>
}

function Findings({ data, session }: { data: AppData; session: UserSession }) {
  const [severity, setSeverity] = useState('')
  const visible = data.findings.filter((finding) => !severity || finding.severity === severity)
  function resolve(finding: Finding) {
    const evidence = window.prompt('Indique evidencia o comentario de resolución:')
    if (!evidence) return
    store.update((current) => ({ ...current, findings: current.findings.map((item) => item.id === finding.id ? { ...item, status: 'Resuelto', evidence, resolvedAt: nowGuatemala() } : item) }), { userName: session.name, action: 'RESOLVER', module: 'Hallazgos', recordId: finding.id, before: finding, after: { status: 'Resuelto', evidence } })
  }
  return <>{pageTitle('Hallazgos', 'Resultados del motor de validación y seguimiento.')}<Field label="Filtrar por nivel"><Select className="mb-4 max-w-xs" value={severity} onChange={(event) => setSeverity(event.target.value)}><option value="">Todos</option>{['Crítico', 'Alto', 'Medio', 'Informativo'].map((item) => <option key={item}>{item}</option>)}</Select></Field>
    {!visible.length ? <Empty /> : <Table headers={['Nivel', 'Colaborador', 'Planilla', 'Regla', 'Monto afectado', 'Descripción', 'Estado', 'Acción']}>{visible.map((finding) => <tr key={finding.id}><Td><Severity value={finding.severity} /></Td><Td>{finding.employeeName || 'General'}</Td><Td>{data.payrolls.find((item) => item.id === finding.payrollId)?.code}</Td><Td>{finding.rule}</Td><Td>{currency(finding.affectedAmount)}</Td><Td>{finding.description}<br /><span className="text-xs text-slate-500">{finding.recommendation}</span></Td><Td>{finding.status}</Td><Td>{finding.status !== 'Resuelto' && canEdit(session) && <Button variant="success" onClick={() => resolve(finding)}>Resolver</Button>}</Td></tr>)}</Table>}
  </>
}

function Reports({ data }: { data: AppData }) {
  const [payrollId, setPayrollId] = useState('')
  const [signer, setSigner] = useState('Ing. Marlon Enamorado')
  const payroll = data.payrolls.find((item) => item.id === payrollId)
  return <>{pageTitle('Reportes', 'Exportación trazable a Excel y PDF.')}<Card><div className="grid gap-4 md:grid-cols-3"><Field label="Planilla"><Select value={payrollId} onChange={(event) => setPayrollId(event.target.value)}><option value="">Seleccione</option>{data.payrolls.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</Select></Field><Field label="Firma secundaria"><Select value={signer} onChange={(event) => setSigner(event.target.value)}><option>Ing. Marlon Enamorado</option><option>Ing. Margarita Orellana</option></Select></Field><div className="flex items-end gap-2"><Button disabled={!payroll} onClick={() => payroll && exportPayrollExcel(payroll, data.findings.filter((item) => item.payrollId === payroll.id))}><FileSpreadsheet size={18} /> Excel</Button><Button variant="secondary" disabled={!payroll} onClick={() => payroll && exportPayrollPdf(payroll, data.findings.filter((item) => item.payrollId === payroll.id), signer)}><FileDown size={18} /> PDF</Button></div></div></Card>
  </>
}

function Documents({ data, session }: { data: AppData; session: UserSession }) {
  function upload(file?: File, payrollId?: string) {
    if (!file) return
    if (file.size > 10 * 1024 * 1024 || !/\.(xlsx|xls|csv|pdf|png|jpe?g)$/i.test(file.name)) return window.alert('Archivo no permitido o mayor de 10 MB.')
    const attachment = { id: uid(), payrollId, name: file.name, type: file.type, size: file.size, createdAt: nowGuatemala() }
    store.update((current) => ({ ...current, attachments: [attachment, ...current.attachments] }), { userName: session.name, action: 'ADJUNTAR', module: 'Documentos', recordId: attachment.id, before: null, after: attachment, relatedDocument: file.name })
  }
  return <>{pageTitle('Documentos y evidencias', 'Metadatos locales; con Supabase se almacenan en un bucket privado.')}<Card className="mb-5"><form className="grid gap-4 md:grid-cols-3" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); upload((form.get('file') as File), String(form.get('payrollId') || '') || undefined); event.currentTarget.reset() }}><Field label="Planilla"><Select name="payrollId"><option value="">General</option>{data.payrolls.map((item) => <option key={item.id} value={item.id}>{item.code}</option>)}</Select></Field><Field label="Documento"><Input name="file" type="file" accept=".xlsx,.xls,.csv,.pdf,image/*" capture="environment" required /></Field><Button className="self-end" type="submit">Registrar evidencia</Button></form></Card>
    {!data.attachments.length ? <Empty /> : <Table headers={['Documento', 'Tipo', 'Tamaño', 'Planilla', 'Fecha']}>{data.attachments.map((item) => <tr key={item.id}><Td>{item.name}</Td><Td>{item.type || 'Desconocido'}</Td><Td>{(item.size / 1024).toFixed(1)} KB</Td><Td>{data.payrolls.find((payroll) => payroll.id === item.payrollId)?.code || 'General'}</Td><Td>{dateGT(item.createdAt)}</Td></tr>)}</Table>}
  </>
}

function Audit({ data }: { data: AppData }) {
  return <>{pageTitle('Bitácora', 'Registro inmutable desde la interfaz.')} {!data.auditLogs.length ? <Empty /> : <Table headers={['Fecha y hora', 'Usuario', 'Acción', 'Módulo', 'Registro', 'Valor anterior', 'Valor nuevo', 'Motivo']}>{data.auditLogs.map((log) => <tr key={log.id}><Td>{log.createdAt.replace('T', ' ')}</Td><Td>{log.userName}</Td><Td>{log.action}</Td><Td>{log.module}</Td><Td>{log.recordId.slice(0, 8)}</Td><Td className="max-w-xs truncate">{JSON.stringify(log.before)}</Td><Td className="max-w-xs truncate">{JSON.stringify(log.after)}</Td><Td>{log.reason || ''}</Td></tr>)}</Table>}</>
}

function Configuration({ data, session }: { data: AppData; session: UserSession }) {
  const catalogs: { key: keyof Pick<AppData, 'companies' | 'areas' | 'costCenters' | 'positions' | 'workTypes' | 'projects' | 'payrollTypes'>; label: string }[] = [
    { key: 'companies', label: 'Empresas' }, { key: 'areas', label: 'Áreas' }, { key: 'costCenters', label: 'Centros de costo' }, { key: 'positions', label: 'Puestos' }, { key: 'workTypes', label: 'Tipos de trabajo' }, { key: 'projects', label: 'Proyectos / obras' }, { key: 'payrollTypes', label: 'Tipos de planilla' },
  ]
  const [tab, setTab] = useState(catalogs[0].key)
  const definition = catalogs.find((item) => item.key === tab)!
  const items = data[tab]
  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const item: CatalogItem = { id: uid(), name: String(form.get('name')).trim(), active: true, companyId: String(form.get('companyId') || '') || undefined }; if (!item.name) return
    store.update((current) => ({ ...current, [tab]: [...current[tab], item] }), { userName: session.name, action: 'CREAR', module: 'Configuración', recordId: item.id, before: null, after: item })
    event.currentTarget.reset()
  }
  return <>{pageTitle('Configuración', 'Catálogos abiertos, editables y sin información ficticia.')}<div className="mb-4 flex gap-2 overflow-x-auto pb-2">{catalogs.map((item) => <Button key={item.key} variant={tab === item.key ? 'primary' : 'secondary'} onClick={() => setTab(item.key)}>{item.label}</Button>)}</div>
    {session.role !== 'administrador' ? <Empty text="Solo el Administrador puede modificar configuraciones." /> : <><Card className="mb-5"><form className="flex flex-wrap items-end gap-3" onSubmit={add}><Field label={`Nuevo registro en ${definition.label}`}><Input name="name" required /></Field>{tab !== 'companies' && <Field label="Empresa opcional"><Select name="companyId"><option value="">General</option>{data.companies.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>}<Button type="submit">Agregar</Button></form></Card>
    {!items.length ? <Empty /> : <Table headers={['Nombre', 'Empresa', 'Estado', 'Acciones']}>{items.map((item) => <tr key={item.id}><Td>{item.name}</Td><Td>{item.companyId ? nameOf(data.companies, item.companyId) : 'General'}</Td><Td><Badge tone={item.active ? 'success' : 'neutral'}>{item.active ? 'Activo' : 'Inactivo'}</Badge></Td><Td><Button variant="secondary" onClick={() => { const name = window.prompt('Editar nombre:', item.name); if (!name) return; store.update((current) => ({ ...current, [tab]: current[tab].map((candidate) => candidate.id === item.id ? { ...candidate, name } : candidate) }), { userName: session.name, action: 'EDITAR', module: 'Configuración', recordId: item.id, before: item, after: { ...item, name } }) }}>Editar</Button> <Button variant="secondary" onClick={() => store.update((current) => ({ ...current, [tab]: current[tab].map((candidate) => candidate.id === item.id ? { ...candidate, active: !candidate.active } : candidate) }), { userName: session.name, action: item.active ? 'DESACTIVAR' : 'ACTIVAR', module: 'Configuración', recordId: item.id, before: item, after: { ...item, active: !item.active } })}>{item.active ? 'Desactivar' : 'Activar'}</Button></Td></tr>)}</Table>}</>}</>
}

function updatePayroll(id: string, updater: (payroll: Payroll) => Payroll, session: UserSession, action: string, after: unknown) {
  const before = store.get().payrolls.find((payroll) => payroll.id === id)
  store.update((current) => ({ ...current, payrolls: current.payrolls.map((payroll) => payroll.id === id ? { ...updater(payroll), updatedAt: nowGuatemala() } : payroll) }), { userName: session.name, action, module: 'Planillas', recordId: id, before, after })
}
const nameOf = (items: CatalogItem[], id: string) => items.find((item) => item.id === id)?.name || 'Sin configurar'
function Status({ value }: { value: PayrollStatus }) {
  const tone = value === 'Aprobada' || value === 'Pagada' ? 'success' : value === 'Rechazada' || value === 'Anulada' ? 'danger' : value === 'Observada' ? 'warning' : 'info'
  return <Badge tone={tone}>{value}</Badge>
}
function Severity({ value }: { value: Finding['severity'] }) {
  return <Badge tone={value === 'Crítico' ? 'danger' : value === 'Alto' || value === 'Medio' ? 'warning' : 'info'}>{value}</Badge>
}
const Metric = ({ label, value }: { label: string; value: string }) => <div><p className="text-xs text-slate-500">{label}</p><p className="font-semibold">{value}</p></div>
const EditableRate = ({ label, value, disabled, change }: { label: string; value: number; disabled: boolean; change: (value: number) => void }) => <Field label={label}><Input className="h-9 min-h-9" type="number" min="0" step="0.01" value={value} disabled={disabled} onChange={(event) => change(Number(event.target.value))} /></Field>
