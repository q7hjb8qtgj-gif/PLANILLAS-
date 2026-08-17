import { describe, expect, it } from 'vitest'
import { calculateCooperative, calculatePayrollItem, roundMoney } from './calculations'

describe('cálculos de planilla', () => {
  it('suma ingresos, descuentos y líquido', () => {
    expect(calculatePayrollItem({
      regularSalary: 1000, overtimePay: 100, workPay: 50, bonus: 25, commissions: 10, otherIncome: 5,
      igss: 48.3, advances: 100, loans: 50, otherDeductions: 1.7,
    })).toEqual({ totalIncome: 1190, totalDeductions: 200, netPay: 990 })
  })
  it('redondea moneda a dos decimales', () => expect(roundMoney(1.005)).toBe(1.01))
})

describe('cooperativa', () => {
  it('calcula 5% de comisión y 12% de IVA sobre comisión', () => {
    expect(calculateCooperative(1000, { enabled: true, commissionRate: 5, vatRate: 12 })).toEqual({
      commission: 50, vat: 6, serviceTotal: 56, grandTotal: 1056,
    })
  })
  it('no agrega cargos cuando está desactivada', () => {
    expect(calculateCooperative(1000, { enabled: false, commissionRate: 5, vatRate: 12 }).grandTotal).toBe(1000)
  })
})
