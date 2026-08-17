import type { CooperativeSettings, PayrollItem } from '../types'

export const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100

export function calculatePayrollItem(item: Partial<PayrollItem>) {
  const totalIncome = roundMoney(
    Number(item.regularSalary || 0) + Number(item.overtimePay || 0) + Number(item.workPay || 0) +
    Number(item.bonus || 0) + Number(item.commissions || 0) + Number(item.otherIncome || 0),
  )
  const totalDeductions = roundMoney(
    Number(item.igss || 0) + Number(item.advances || 0) + Number(item.loans || 0) + Number(item.otherDeductions || 0),
  )
  return { totalIncome, totalDeductions, netPay: roundMoney(totalIncome - totalDeductions) }
}

export function calculateCooperative(baseAmount: number, settings: CooperativeSettings) {
  if (!settings.enabled) return { commission: 0, vat: 0, serviceTotal: 0, grandTotal: baseAmount }
  const commission = roundMoney(baseAmount * settings.commissionRate / 100)
  const vat = roundMoney(commission * settings.vatRate / 100)
  const serviceTotal = roundMoney(commission + vat)
  return { commission, vat, serviceTotal, grandTotal: roundMoney(baseAmount + serviceTotal) }
}
