import { describe, expect, it } from 'vitest'
import { calculateCooperative, calculateItem } from './calculations'

describe('cálculos de planilla', () => {
  it('calcula ingresos, descuentos y líquido', () => {
    expect(calculateItem({ regularSalary: 1000, overtimePay: 125, workPay: 50, bonus: 250, commissions: 75, otherIncome: 10, igss: 48.3, advances: 100, loans: 25, otherDeductions: 5 }))
      .toEqual({ totalIncome: 1510, totalDeductions: 178.3, netPay: 1331.7 })
  })
  it('trata componentes vacíos como cero', () => {
    expect(calculateItem({})).toEqual({ totalIncome: 0, totalDeductions: 0, netPay: 0 })
  })
  it('calcula comisión e IVA con redondeo monetario', () => {
    expect(calculateCooperative({ enabled: true, baseAmount: 1000, commissionRate: 5, vatRate: 12 }))
      .toEqual({ commission: 50, vat: 6, serviceTotal: 56, disbursementTotal: 1056 })
  })
})
