import { describe, expect, it } from 'vitest'
import type { Payroll, PayrollItem } from '../types'
import { validatePayroll } from './validation'

const item: PayrollItem = {
  id: 'item-1', employeeId: 'employee-1', employeeCode: 'E1', employeeName: 'Persona', companyId: 'company',
  areaId: 'area', position: '', daysWorked: 8, regularHours: 40, overtimeHours: 0, rate: 10,
  regularSalary: 100, overtimePay: 0, workPay: 0, bonus: 0, commissions: 0, otherIncome: 0,
  igss: 0, advances: 0, loans: 0, otherDeductions: 0, totalIncome: 100, totalDeductions: 0,
  netPay: 90, paymentMethod: 'Transferencia', validationStatus: 'Pendiente',
}
const payroll: Payroll = {
  id: 'payroll', code: 'P1', companyId: 'company', areaId: 'area', startDate: '2026-08-10', endDate: '2026-08-16',
  week: 33, year: 2026, type: 'Ordinaria', status: 'Borrador', digitizer: '', reviewer: '', items: [item],
  cooperative: { enabled: false, commissionRate: 5, vatRate: 12 }, approvals: [], createdAt: '', updatedAt: '',
}

describe('motor de validación', () => {
  it('detecta líquido incorrecto y días fuera del período', () => {
    const findings = validatePayroll(payroll, [payroll])
    expect(findings.map((finding) => finding.rule)).toContain('Líquido incorrecto')
    expect(findings.map((finding) => finding.rule)).toContain('Cantidad de días fuera del período')
  })
  it('detecta colaborador repetido dentro del período', () => {
    const findings = validatePayroll({ ...payroll, items: [item, { ...item, id: 'item-2' }] }, [payroll])
    expect(findings.map((finding) => finding.rule)).toContain('Colaborador repetido en el mismo período')
  })
})
