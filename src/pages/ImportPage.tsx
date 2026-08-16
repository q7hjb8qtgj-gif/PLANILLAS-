import { useState } from 'react'
import ExcelJS from 'exceljs'
import { useApp } from '../context/AppContext'
import { calculateItem } from '../lib/calculations'
import { Button, Card, Empty, Field, Input, PageHeader, Select } from '../components/ui'
import type { PayrollItem } from '../types'

const fields = [
  ['code', 'Código de colaborador'], ['daysWorked', 'Días trabajados'], ['regularHours', 'Horas ordinarias'], ['overtimeHours', 'Horas extras'],
  ['rate', 'Tarifa'], ['regularSalary', 'Salario ordinario'], ['overtimePay', 'Pago horas extra'], ['workPay', 'Pago por obra'], ['bonus', 'Bonificación'],
  ['commissions', 'Comisiones'], ['otherIncome', 'Otros ingresos'], ['igss', 'IGSS'], ['advances', 'Anticipos'], ['loans', 'Préstamos'],
  ['otherDeductions', 'Otros descuentos'], ['paymentMethod', 'Forma de pago'], ['reference', 'Referencia'], ['notes', 'Observaciones'], ['supportDocument', 'Documento soporte'],
] as const
type FieldKey = typeof fields[number][0]
type Row = Record<string, string | number>
export function ImportPage() {
  const { data, updateData } = useApp()
  const [fileName, setFileName] = useState('')
  const [sheets, setSheets] = useState<{ name: string; rows: Row[] }[]>([])
  const [sheetIndex, setSheetIndex] = useState(0)
  const [mapping, setMapping] = useState<Partial<Record<FieldKey, string>>>({})
  const [message, setMessage] = useState('')
  const [payrollId, setPayrollId] = useState('')
  const rows = sheets[sheetIndex]?.rows || []
  const headers = rows.length ? Object.keys(rows[0]) : []
  const readFile = async (file?: File) => {
    if (!file) return
    setMessage(''); setFileName(file.name)
    try {
      if (file.size > 10 * 1024 * 1024) throw new Error('El archivo excede el límite de 10 MB.')
      if (!/\.(xlsx|xls|csv)$/i.test(file.name)) throw new Error('Tipo de archivo no permitido.')
      const book = new ExcelJS.Workbook()
      if (/\.csv$/i.test(file.name)) await book.csv.read(await file.text() as never)
      else await book.xlsx.load(await file.arrayBuffer())
      const parsed = book.worksheets.map((sheet) => {
        const headerRow = sheet.getRow(1).values as unknown[]
        const names = headerRow.slice(1).map((value, index) => String(value || `Columna ${index + 1}`))
        const sheetRows: Row[] = []
        sheet.eachRow((row, rowNumber) => {
          if (rowNumber === 1) return
          const values = row.values as unknown[]
          const entry: Row = { __row: rowNumber }
          names.forEach((name, index) => { const cell = values[index + 1]; entry[name] = typeof cell === 'number' ? cell : String(cell ?? '') })
          sheetRows.push(entry)
        })
        return { name: sheet.name, rows: sheetRows }
      })
      if (!parsed.length) throw new Error('El archivo no contiene hojas legibles.')
      setSheets(parsed); setSheetIndex(0)
      const automatic: Partial<Record<FieldKey, string>> = {}
      fields.forEach(([key, label]) => { const match = Object.keys(parsed[0].rows[0] || {}).find((header) => header.toLowerCase().replace(/\s/g, '') === label.toLowerCase().replace(/\s/g, '') || header.toLowerCase() === key.toLowerCase()); if (match) automatic[key] = match })
      setMapping(automatic)
    } catch (error) { setSheets([]); setMessage(error instanceof Error ? error.message : 'No fue posible leer el archivo.') }
  }
  const analyzed = rows.map((row) => {
    const errors: string[] = []
    const code = String(row[mapping.code || ''] || '').trim()
    const employee = data.employees.find((entry) => entry.code === code)
    if (!code) errors.push('Código vacío')
    if (!employee) errors.push('Colaborador no registrado')
    const numericKeys: FieldKey[] = ['daysWorked', 'regularHours', 'overtimeHours', 'rate', 'regularSalary', 'overtimePay', 'workPay', 'bonus', 'commissions', 'otherIncome', 'igss', 'advances', 'loans', 'otherDeductions']
    numericKeys.forEach((key) => { const value = row[mapping[key] || '']; if (value !== '' && value != null && !Number.isFinite(Number(value))) errors.push(`${fields.find(([field]) => field === key)?.[1]} no numérico`) })
    return { row, code, employee, errors }
  })
  const confirm = () => {
    const payroll = data.payrolls.find((entry) => entry.id === payrollId); if (!payroll) return
    const existing = new Set(payroll.items.map((entry) => entry.employeeId))
    const additions: PayrollItem[] = []
    analyzed.forEach(({ row, employee, errors }) => {
      if (errors.length || !employee || existing.has(employee.id)) return
      const number = (key: FieldKey) => Number(row[mapping[key] || ''] || 0)
      const draft = { regularSalary: number('regularSalary'), overtimePay: number('overtimePay'), workPay: number('workPay'), bonus: number('bonus'), commissions: number('commissions'), otherIncome: number('otherIncome'), igss: number('igss'), advances: number('advances'), loans: number('loans'), otherDeductions: number('otherDeductions') }
      additions.push({ id: crypto.randomUUID(), employeeId: employee.id, code: employee.code, companyId: employee.companyId, areaId: employee.areaId, position: employee.position, daysWorked: number('daysWorked'), regularHours: number('regularHours'), overtimeHours: number('overtimeHours'), rate: mapping.rate ? number('rate') : employee.baseRate, ...draft, ...calculateItem(draft), paymentMethod: String(row[mapping.paymentMethod || ''] || employee.paymentMethod), reference: String(row[mapping.reference || ''] || ''), notes: String(row[mapping.notes || ''] || ''), supportDocument: String(row[mapping.supportDocument || ''] || ''), validationStatus: 'Pendiente', sourceFile: fileName, sourceRow: Number(row.__row) })
      existing.add(employee.id)
    })
    if (!additions.length) { setMessage('No hay filas válidas nuevas para importar.'); return }
    const next = { ...payroll, items: [...payroll.items, ...additions], updatedAt: new Date().toISOString() }
    updateData('payrolls', data.payrolls.map((entry) => entry.id === next.id ? next : entry), 'Importar archivo', payroll.id, undefined, { archivo: fileName, filas: additions.length })
    setMessage(`Importación confirmada: ${additions.length} fila(s). Las filas con errores fueron omitidas.`)
  }
  return <><PageHeader title="Importar Excel" description="Vista previa, mapeo de columnas y validación antes de guardar." /><div className="grid gap-5 lg:grid-cols-[360px_1fr]"><Card><div className="grid gap-4"><Field label="Planilla destino" required><Select value={payrollId} onChange={(e) => setPayrollId(e.target.value)}><option value="">Seleccione</option>{data.payrolls.filter((entry) => !['Pagada', 'Anulada'].includes(entry.status)).map((entry) => <option key={entry.id} value={entry.id}>{entry.code}</option>)}</Select></Field><Field label="Archivo XLSX, XLS o CSV (máx. 10 MB)"><Input type="file" accept=".xlsx,.xls,.csv" onChange={(e) => readFile(e.target.files?.[0])} /></Field>{sheets.length > 1 && <Field label="Hoja"><Select value={sheetIndex} onChange={(e) => setSheetIndex(Number(e.target.value))}>{sheets.map((entry, index) => <option key={entry.name} value={index}>{entry.name}</option>)}</Select></Field>}</div>
      {headers.length > 0 && <div className="mt-5 border-t pt-4"><h2 className="mb-3 font-bold">Mapeo de columnas</h2><div className="grid max-h-[55vh] gap-3 overflow-y-auto pr-1">{fields.map(([key, label]) => <Field key={key} label={label}><Select value={mapping[key] || ''} onChange={(e) => setMapping({ ...mapping, [key]: e.target.value })}><option value="">No importar</option>{headers.filter((header) => header !== '__row').map((header) => <option key={header}>{header}</option>)}</Select></Field>)}</div></div>}</Card>
      <Card><div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Vista previa</h2>{rows.length > 0 && <Button onClick={confirm} disabled={!payrollId || !mapping.code}>Confirmar filas válidas</Button>}</div>{message && <p className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{message}</p>}{rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b"><th className="p-3">Fila</th><th>Código</th><th>Colaborador</th><th>Resultado</th></tr></thead><tbody>{analyzed.slice(0, 100).map((entry) => <tr key={String(entry.row.__row)} className="border-b border-slate-100"><td className="p-3">{entry.row.__row}</td><td>{entry.code || '—'}</td><td>{entry.employee?.fullName || '—'}</td><td className={entry.errors.length ? 'text-red-700' : 'text-emerald-700'}>{entry.errors.join(', ') || 'Fila válida'}</td></tr>)}</tbody></table></div> : <Empty text="Seleccione un archivo para comenzar." />}</Card></div></>
}
