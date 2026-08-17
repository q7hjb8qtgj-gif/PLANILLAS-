import { describe, expect, it } from 'vitest'
import { validatePayroll } from './validation'
import type { Employee, Payroll } from '../types'

const now = '2026-08-16T00:00:00.000Z'
const employee: Employee = { id: 'employee', code: 'E1', fullName: 'Persona registrada', companyId: 'company', areaId: 'area', position: 'Puesto', contractType: 'Contrato', paymentMethod: 'Banco', baseRate: 100, admissionDate: '2026-01-01', active: true, createdAt: now, updatedAt: now }
const payroll: Payroll = {
  id: 'payroll', code: 'P1', companyId: 'company', areaId: 'area', startDate: '2026-08-10', endDate: '2026-08-16', week: 33, year: 2026,
  type: 'Ordinaria', status: 'Borrador', dataEntryResponsible: 'Usuario', items: [{
    id: 'item', employeeId: 'employee', code: 'E1', companyId: 'company', areaId: 'area', position: 'Puesto',
    daysWorked: 7, regularHours: 40, overtimeHours: 0, rate: 100, regularSalary: 700, overtimePay: 0, workPay: 0,
    bonus: 0, commissions: 0, otherIncome: 0, igss: 0, advances: 0, loans: 0, otherDeductions: 0,
    totalIncome: 700, totalDeductions: 0, netPay: 700, paymentMethod: 'Banco', validationStatus: 'Pendiente',
  }], cooperative: { enabled: false, baseAmount: 0, commissionRate: 5, vatRate: 12 }, approvedByLuisRivas: false,
  active: true, createdAt: now, updatedAt: now,
}

describe('motor de validación', () => {
  it('no inventa hallazgos para un detalle consistente', () => {
    expect(validatePayroll(payroll, [payroll], [employee])).toEqual([])
  })
  it('detecta líquido incorrecto y pagos negativos', () => {
    const invalid = { ...payroll, items: [{ ...payroll.items[0], netPay: -1 }] }
    const rules = validatePayroll(invalid, [invalid], [employee]).map((finding) => finding.rule)
    expect(rules).toContain('Líquido incorrecto')
    expect(rules).toContain('Pago negativo')
  })
  it('detecta colaborador repetido', () => {
    const duplicate = { ...payroll, items: [payroll.items[0], { ...payroll.items[0], id: 'item-2' }] }
    expect(validatePayroll(duplicate, [duplicate], [employee]).some((finding) => finding.rule === 'Colaborador repetido en el período')).toBe(true)
  })
})
