import ExcelJS from 'exceljs'
import { jsPDF } from 'jspdf'
import { currency, dateGT } from './calculations'
import type { Employee, Finding, Payroll } from '../types'

const download = (blob: Blob, name: string) => {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = name
  link.click()
  URL.revokeObjectURL(link.href)
}

export async function exportPayrollExcel(payroll: Payroll, employees: Employee[], findings: Finding[]) {
  const book = new ExcelJS.Workbook()
  book.creator = 'Corporación Riso'
  const summary = book.addWorksheet('Resumen', { views: [{ state: 'frozen', ySplit: 1 }] })
  summary.columns = [{ header: 'Campo', key: 'field', width: 30 }, { header: 'Valor', key: 'value', width: 35 }]
  summary.addRows([
    { field: 'Código', value: payroll.code }, { field: 'Tipo', value: payroll.type },
    { field: 'Período', value: `${dateGT(payroll.startDate)} - ${dateGT(payroll.endDate)}` },
    { field: 'Estado', value: payroll.status }, { field: 'Colaboradores', value: payroll.items.length },
    { field: 'Total ingresos', value: { formula: "SUM(Detalle!U2:U1048576)" } },
    { field: 'Total descuentos', value: { formula: "SUM(Detalle!V2:V1048576)" } },
    { field: 'Líquido total', value: { formula: "SUM(Detalle!W2:W1048576)" } },
  ])
  const detail = book.addWorksheet('Detalle', { views: [{ state: 'frozen', ySplit: 1 }], autoFilter: 'A1:Z1' })
  detail.columns = [
    ['Código', 'code'], ['Colaborador', 'employee'], ['Días', 'daysWorked'], ['Horas ordinarias', 'regularHours'], ['Horas extras', 'overtimeHours'],
    ['Tarifa', 'rate'], ['Salario ordinario', 'regularSalary'], ['Pago horas extra', 'overtimePay'], ['Pago por obra', 'workPay'], ['Bonificación', 'bonus'],
    ['Comisiones', 'commissions'], ['Otros ingresos', 'otherIncome'], ['IGSS', 'igss'], ['Anticipos', 'advances'], ['Préstamos', 'loans'],
    ['Otros descuentos', 'otherDeductions'], ['Forma de pago', 'paymentMethod'], ['Referencia', 'reference'], ['Observaciones', 'notes'],
    ['Documento', 'supportDocument'], ['Total ingresos', 'totalIncome'], ['Total descuentos', 'totalDeductions'], ['Líquido', 'netPay'],
    ['Archivo fuente', 'sourceFile'], ['Fila fuente', 'sourceRow'], ['Estado validación', 'validationStatus'],
  ].map(([header, key]) => ({ header, key, width: 20 }))
  payroll.items.forEach((item) => detail.addRow({ ...item, employee: employees.find((entry) => entry.id === item.employeeId)?.fullName || '' }))
  ;['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'U', 'V', 'W'].forEach((column) => { detail.getColumn(column).numFmt = '"Q"#,##0.00' })
  if (findings.length) {
    const sheet = book.addWorksheet('Hallazgos', { views: [{ state: 'frozen', ySplit: 1 }], autoFilter: 'A1:G1' })
    sheet.columns = ['Nivel', 'Regla', 'Colaborador', 'Monto afectado', 'Descripción', 'Recomendación', 'Estado'].map((header) => ({ header, width: 28 }))
    findings.forEach((entry) => sheet.addRow([entry.severity, entry.rule, employees.find((employee) => employee.id === entry.employeeId)?.fullName || '', entry.affectedAmount, entry.description, entry.recommendation, entry.status]))
    sheet.getColumn(4).numFmt = '"Q"#,##0.00'
  }
  ;[summary, detail, ...book.worksheets.slice(2)].forEach((sheet) => {
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B2443' } }
  })
  const buffer = await book.xlsx.writeBuffer()
  download(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${payroll.code}.xlsx`)
}

export function exportPayrollPdf(payroll: Payroll, employees: Employee[], findings: Finding[]) {
  const pdf = new jsPDF()
  pdf.setFontSize(16); pdf.text('CORPORACIÓN RISO', 14, 18)
  pdf.setFontSize(12); pdf.text('Sistema de Control y Verificación de Planillas', 14, 26)
  pdf.setFontSize(10)
  pdf.text(`Planilla: ${payroll.code} — ${payroll.type}`, 14, 37)
  pdf.text(`Período: ${dateGT(payroll.startDate)} al ${dateGT(payroll.endDate)}`, 14, 44)
  pdf.text(`Fecha de generación: ${dateGT(new Date())}`, 14, 51)
  const income = payroll.items.reduce((sum, item) => sum + item.totalIncome, 0)
  const deductions = payroll.items.reduce((sum, item) => sum + item.totalDeductions, 0)
  const net = payroll.items.reduce((sum, item) => sum + item.netPay, 0)
  pdf.text(`Total ingresos: ${currency(income)}   Total descuentos: ${currency(deductions)}   Líquido: ${currency(net)}`, 14, 61)
  let y = 73
  payroll.items.slice(0, 24).forEach((item) => {
    const employee = employees.find((entry) => entry.id === item.employeeId)
    pdf.text(`${item.code}  ${(employee?.fullName || '').slice(0, 38)}  ${currency(item.netPay)}`, 14, y)
    y += 6
  })
  if (findings.length) { y += 3; pdf.setTextColor(180, 0, 0); pdf.text(`Hallazgos abiertos: ${findings.filter((entry) => entry.status !== 'Resuelto').length}`, 14, y); pdf.setTextColor(0, 0, 0) }
  pdf.text('_____________________________', 14, 260); pdf.text('Luis Rivas', 14, 267); pdf.text('Administrador / Autorización primaria', 14, 273)
  pdf.text('_____________________________', 115, 260); pdf.text(payroll.secondarySigner || 'Firma secundaria', 115, 267)
  pdf.save(`${payroll.code}.pdf`)
}
