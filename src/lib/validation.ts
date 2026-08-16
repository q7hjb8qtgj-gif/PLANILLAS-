import { calculateCooperative, calculateItem } from './calculations'
import type { Employee, Finding, Payroll, Severity } from '../types'

const finding = (payrollId: string, rule: string, severity: Severity, description: string, amount = 0, employeeId?: string): Finding => {
  const timestamp = new Date().toISOString()
  return { id: crypto.randomUUID(), payrollId, employeeId, rule, severity, description, affectedAmount: amount, recommendation: 'Revisar el registro y adjuntar evidencia de la corrección.', status: 'Abierto', active: true, createdAt: timestamp, updatedAt: timestamp }
}

export function validatePayroll(payroll: Payroll, allPayrolls: Payroll[], employees: Employee[]): Finding[] {
  const output: Finding[] = []
  const seenEmployees = new Set<string>()
  const seenReferences = new Set<string>()
  payroll.items.forEach((item) => {
    const expected = calculateItem(item)
    if (Math.abs(expected.totalIncome - item.totalIncome) > .009) output.push(finding(payroll.id, 'Suma incorrecta de ingresos', 'Alto', 'El total de ingresos no coincide con sus componentes.', Math.abs(expected.totalIncome - item.totalIncome), item.employeeId))
    if (Math.abs(expected.totalDeductions - item.totalDeductions) > .009) output.push(finding(payroll.id, 'Suma incorrecta de descuentos', 'Alto', 'El total de descuentos no coincide con sus componentes.', Math.abs(expected.totalDeductions - item.totalDeductions), item.employeeId))
    if (Math.abs(expected.netPay - item.netPay) > .009) output.push(finding(payroll.id, 'Líquido incorrecto', 'Crítico', 'El líquido no coincide con ingresos menos descuentos.', Math.abs(expected.netPay - item.netPay), item.employeeId))
    if (item.netPay < 0) output.push(finding(payroll.id, 'Pago negativo', 'Crítico', 'El líquido a recibir es negativo.', Math.abs(item.netPay), item.employeeId))
    if (item.netPay === 0) output.push(finding(payroll.id, 'Pago en cero', 'Medio', 'El líquido a recibir es cero.', 0, item.employeeId))
    if (seenEmployees.has(item.employeeId)) output.push(finding(payroll.id, 'Colaborador repetido en el período', 'Crítico', 'El colaborador aparece más de una vez.', item.netPay, item.employeeId))
    seenEmployees.add(item.employeeId)
    if (item.reference && seenReferences.has(item.reference)) output.push(finding(payroll.id, 'Referencia bancaria duplicada', 'Crítico', 'El número de referencia está repetido.', item.netPay, item.employeeId))
    if (item.reference) seenReferences.add(item.reference)
    if (!item.supportDocument && payroll.type !== 'Ordinaria') output.push(finding(payroll.id, 'Falta documento de soporte', 'Alto', 'El pago no tiene documento de soporte.', item.netPay, item.employeeId))
    if (item.daysWorked < 0 || item.daysWorked > 31) output.push(finding(payroll.id, 'Días fuera del período', 'Alto', 'La cantidad de días trabajados está fuera del rango permitido.', item.netPay, item.employeeId))
    if (item.overtimeHours > 80) output.push(finding(payroll.id, 'Horas extras atípicas', 'Medio', 'Las horas extras requieren revisión.', item.overtimePay, item.employeeId))
    const employee = employees.find((entry) => entry.id === item.employeeId)
    if (employee && !employee.active) output.push(finding(payroll.id, 'Pago a colaborador inactivo', 'Crítico', 'El colaborador está inactivo.', item.netPay, item.employeeId))
    if (employee && Math.abs(employee.baseRate - item.rate) > .009) output.push(finding(payroll.id, 'Diferencia contra tarifa registrada', 'Medio', 'La tarifa difiere de la ficha del colaborador.', Math.abs(employee.baseRate - item.rate), item.employeeId))
    const overlap = allPayrolls.some((other) => other.id !== payroll.id && other.companyId === payroll.companyId && other.year === payroll.year && other.week === payroll.week && other.type !== payroll.type && other.items.some((otherItem) => otherItem.employeeId === item.employeeId))
    if (overlap) output.push(finding(payroll.id, 'Ordinaria y extraordinaria', 'Alto', 'El colaborador aparece en más de un tipo de planilla de la semana.', item.netPay, item.employeeId))
  })
  const detailTotal = payroll.items.reduce((sum, item) => sum + item.netPay, 0)
  if (payroll.headerTotal != null && Math.abs(detailTotal - payroll.headerTotal) > .009) output.push(finding(payroll.id, 'Diferencia entre resumen y detalle', 'Crítico', 'El total del encabezado no coincide con el detalle.', Math.abs(detailTotal - payroll.headerTotal)))
  if (payroll.cooperative.enabled) {
    const cooperative = calculateCooperative(payroll.cooperative)
    if (payroll.cooperative.commissionRate !== 5) output.push(finding(payroll.id, 'Comisión configurada distinta de 5%', 'Informativo', `La comisión aplicada es ${payroll.cooperative.commissionRate}%.`, cooperative.commission))
    if (payroll.cooperative.vatRate !== 12) output.push(finding(payroll.id, 'IVA configurado distinto de 12%', 'Informativo', `El IVA aplicado es ${payroll.cooperative.vatRate}%.`, cooperative.vat))
  }
  return output
}
