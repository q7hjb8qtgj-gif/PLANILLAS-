import type { Finding, Payroll, PayrollItem, Severity } from '../types'
import { calculatePayrollItem, roundMoney } from './calculations'
import { nowGuatemala, uid } from './utils'

type FindingDraft = Pick<Finding, 'rule' | 'severity' | 'description' | 'recommendation' | 'affectedAmount'>
const draft = (rule: string, severity: Severity, description: string, affectedAmount = 0): FindingDraft => ({
  rule, severity, description, affectedAmount, recommendation: 'Revise el registro y adjunte evidencia antes de continuar.',
})
const asFinding = (payroll: Payroll, item: PayrollItem | undefined, value: FindingDraft): Finding => ({
  id: uid(), payrollId: payroll.id, itemId: item?.id, employeeName: item?.employeeName, status: 'Pendiente',
  createdAt: nowGuatemala(), ...value,
})

export function validatePayroll(payroll: Payroll, allPayrolls: Payroll[]): Finding[] {
  const findings: Finding[] = []
  const employeeIds = new Set<string>()
  const references = new Set<string>()
  const periodDays = Math.floor((new Date(payroll.endDate).getTime() - new Date(payroll.startDate).getTime()) / 86400000) + 1
  for (const item of payroll.items) {
    const calculated = calculatePayrollItem(item)
    if (roundMoney(item.totalIncome) !== calculated.totalIncome) findings.push(asFinding(payroll, item, draft('Suma incorrecta de ingresos', 'Alto', 'El total de ingresos no coincide con sus componentes.', Math.abs(item.totalIncome - calculated.totalIncome))))
    if (roundMoney(item.totalDeductions) !== calculated.totalDeductions) findings.push(asFinding(payroll, item, draft('Suma incorrecta de descuentos', 'Alto', 'El total de descuentos no coincide con sus componentes.', Math.abs(item.totalDeductions - calculated.totalDeductions))))
    if (roundMoney(item.netPay) !== calculated.netPay) findings.push(asFinding(payroll, item, draft('Líquido incorrecto', 'Crítico', 'El líquido no coincide con ingresos menos descuentos.', Math.abs(item.netPay - calculated.netPay))))
    if (item.netPay < 0) findings.push(asFinding(payroll, item, draft('Pago negativo', 'Crítico', 'El líquido a recibir es negativo.', Math.abs(item.netPay))))
    if (item.netPay === 0) findings.push(asFinding(payroll, item, draft('Pago en cero', 'Medio', 'El líquido a recibir es cero.')))
    if (employeeIds.has(item.employeeId)) findings.push(asFinding(payroll, item, draft('Colaborador repetido en el mismo período', 'Crítico', 'El colaborador aparece más de una vez.', item.netPay)))
    employeeIds.add(item.employeeId)
    if (item.reference && references.has(item.reference)) findings.push(asFinding(payroll, item, draft('Número de referencia bancaria duplicado', 'Crítico', 'La referencia ya existe en esta planilla.', item.netPay)))
    if (item.reference) references.add(item.reference)
    if (item.daysWorked < 0 || item.daysWorked > periodDays) findings.push(asFinding(payroll, item, draft('Cantidad de días fuera del período', 'Alto', `Los días trabajados exceden los ${periodDays} días del período.`)))
    if (item.overtimeHours > item.regularHours && item.overtimeHours > 0) findings.push(asFinding(payroll, item, draft('Horas extras atípicas', 'Medio', 'Las horas extra superan las horas ordinarias.')))
    if ((payroll.type === 'Extraordinaria' || payroll.type === 'Obra complementaria') && !item.notes) findings.push(asFinding(payroll, item, draft('Pago extraordinario sin justificación', 'Alto', 'El pago no contiene justificación.', item.netPay)))
    if ((payroll.type !== 'Ordinaria' || item.workPay > 0) && !item.supportDocument) findings.push(asFinding(payroll, item, draft('Falta de documento de soporte', 'Medio', 'No se indicó documento de soporte.', item.netPay)))
  }
  const comparable = allPayrolls.filter((candidate) => candidate.id !== payroll.id && candidate.companyId === payroll.companyId && candidate.startDate === payroll.startDate && candidate.endDate === payroll.endDate)
  for (const item of payroll.items) {
    for (const other of comparable) {
      const match = other.items.find((candidate) => candidate.employeeId === item.employeeId)
      if (!match) continue
      findings.push(asFinding(payroll, item, draft('Colaborador presente en planilla ordinaria y extraordinaria', 'Alto', `También aparece en ${other.code}.`, Math.min(item.netPay, match.netPay))))
      if (item.regularSalary > 0 && match.regularSalary > 0) findings.push(asFinding(payroll, item, draft('Mismo concepto pagado en ambas planillas', 'Crítico', 'Existe salario ordinario en ambas planillas.', Math.min(item.regularSalary, match.regularSalary))))
      if (item.rate !== match.rate) findings.push(asFinding(payroll, item, draft('Diferencia de tarifa', 'Medio', `La tarifa difiere de ${other.code}.`, Math.abs(item.rate - match.rate))))
    }
  }
  return findings
}
