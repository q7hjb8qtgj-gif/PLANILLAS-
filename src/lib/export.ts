import ExcelJS from 'exceljs'
import { jsPDF } from 'jspdf'
import type { Finding, Payroll } from '../types'
import { calculateCooperative } from './calculations'
import { currency, dateGT } from './utils'

const download = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function exportPayrollExcel(payroll: Payroll, findings: Finding[]) {
  const workbook = new ExcelJS.Workbook()
  const summary = workbook.addWorksheet('Resumen', { views: [{ state: 'frozen', ySplit: 1 }] })
  const detail = workbook.addWorksheet('Detalle', { views: [{ state: 'frozen', ySplit: 1 }] })
  const gross = payroll.items.reduce((sum, item) => sum + item.totalIncome, 0)
  const deductions = payroll.items.reduce((sum, item) => sum + item.totalDeductions, 0)
  const cooperative = calculateCooperative(payroll.items.reduce((sum, item) => sum + item.netPay, 0), payroll.cooperative)
  summary.columns = [{ header: 'Concepto', key: 'label', width: 35 }, { header: 'Valor', key: 'value', width: 24 }]
  summary.addRows([
    { label: 'Código', value: payroll.code }, { label: 'Período', value: `${dateGT(payroll.startDate)} - ${dateGT(payroll.endDate)}` },
    { label: 'Estado', value: payroll.status }, { label: 'Total ingresos', value: gross }, { label: 'Total descuentos', value: deductions },
    { label: 'Líquido', value: gross - deductions }, { label: 'Comisión cooperativa', value: cooperative.commission },
    { label: 'IVA sobre comisión', value: cooperative.vat }, { label: 'Total a desembolsar', value: cooperative.grandTotal },
  ])
  summary.getColumn('value').numFmt = '"Q"#,##0.00'
  detail.columns = [
    ['Código', 'employeeCode'], ['Colaborador', 'employeeName'], ['Días', 'daysWorked'], ['Horas ordinarias', 'regularHours'],
    ['Horas extra', 'overtimeHours'], ['Tarifa', 'rate'], ['Salario ordinario', 'regularSalary'], ['Horas extra Q', 'overtimePay'],
    ['Pago por obra', 'workPay'], ['Bonificación', 'bonus'], ['Comisiones', 'commissions'], ['Otros ingresos', 'otherIncome'],
    ['IGSS', 'igss'], ['Anticipos', 'advances'], ['Préstamos', 'loans'], ['Otros descuentos', 'otherDeductions'],
    ['Total ingresos', 'totalIncome'], ['Total descuentos', 'totalDeductions'], ['Líquido', 'netPay'], ['Forma de pago', 'paymentMethod'],
    ['Referencia', 'reference'], ['Documento fuente', 'sourceFile'], ['Fila fuente', 'sourceRow'],
  ].map(([header, key]) => ({ header, key, width: 18 }))
  payroll.items.forEach((item) => detail.addRow(item))
  for (let index = 6; index <= 19; index += 1) detail.getColumn(index).numFmt = '"Q"#,##0.00'
  detail.autoFilter = { from: 'A1', to: 'W1' }
  if (findings.length) {
    const sheet = workbook.addWorksheet('Hallazgos', { views: [{ state: 'frozen', ySplit: 1 }] })
    sheet.columns = [
      { header: 'Nivel', key: 'severity', width: 15 }, { header: 'Colaborador', key: 'employeeName', width: 28 },
      { header: 'Regla', key: 'rule', width: 35 }, { header: 'Monto afectado', key: 'affectedAmount', width: 18 },
      { header: 'Descripción', key: 'description', width: 55 }, { header: 'Estado', key: 'status', width: 15 },
    ]
    sheet.addRows(findings)
    sheet.getColumn('affectedAmount').numFmt = '"Q"#,##0.00'
    sheet.autoFilter = { from: 'A1', to: 'F1' }
  }
  for (const sheet of workbook.worksheets) {
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF172554' } }
  }
  const buffer = await workbook.xlsx.writeBuffer()
  download(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${payroll.code}.xlsx`)
}

export function exportPayrollPdf(payroll: Payroll, findings: Finding[], secondarySigner = 'Ing. Marlon Enamorado') {
  const pdf = new jsPDF()
  const gross = payroll.items.reduce((sum, item) => sum + item.totalIncome, 0)
  const deductions = payroll.items.reduce((sum, item) => sum + item.totalDeductions, 0)
  pdf.setFontSize(16); pdf.text('CORPORACIÓN RISO', 105, 18, { align: 'center' })
  pdf.setFontSize(12); pdf.text('Sistema de Control y Verificación de Planillas', 105, 27, { align: 'center' })
  pdf.setFontSize(10)
  const lines = [
    `Planilla: ${payroll.code}`, `Período: ${dateGT(payroll.startDate)} - ${dateGT(payroll.endDate)}`,
    `Estado: ${payroll.status}`, `Fecha de generación: ${dateGT(new Date().toISOString())}`,
    `Total ingresos: ${currency(gross)}`, `Total descuentos: ${currency(deductions)}`, `Líquido a pagar: ${currency(gross - deductions)}`,
    `Hallazgos: ${findings.length}`, `Observaciones: ${payroll.notes || 'Sin observaciones'}`,
  ]
  lines.forEach((line, index) => pdf.text(line, 18, 42 + index * 8))
  pdf.line(25, 155, 85, 155); pdf.line(125, 155, 185, 155)
  pdf.text('Luis Rivas', 55, 163, { align: 'center' }); pdf.text('Administrador / Autorización primaria', 55, 169, { align: 'center' })
  pdf.text(secondarySigner, 155, 163, { align: 'center' }); pdf.text(secondarySigner.includes('Margarita') ? 'Gerente de Calidad / Firma secundaria' : 'Firma secundaria', 155, 169, { align: 'center' })
  pdf.save(`${payroll.code}.pdf`)
}
