import type { CooperativeSettings, PayrollItem } from '../types'

const money = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
export const currency = (value: number) => new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: 2 }).format(value)
export const dateGT = (value: string | Date) => new Intl.DateTimeFormat('es-GT', { timeZone: 'America/Guatemala', day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(value))

export function calculateItem(item: Partial<PayrollItem>): Pick<PayrollItem, 'totalIncome' | 'totalDeductions' | 'netPay'> {
  const income = Number(item.regularSalary || 0) + Number(item.overtimePay || 0) + Number(item.workPay || 0)
    + Number(item.bonus || 0) + Number(item.commissions || 0) + Number(item.otherIncome || 0)
  const deductions = Number(item.igss || 0) + Number(item.advances || 0) + Number(item.loans || 0) + Number(item.otherDeductions || 0)
  return { totalIncome: money(income), totalDeductions: money(deductions), netPay: money(income - deductions) }
}

export function calculateCooperative(settings: CooperativeSettings) {
  const commission = money(settings.baseAmount * settings.commissionRate / 100)
  const vat = money(commission * settings.vatRate / 100)
  const serviceTotal = money(commission + vat)
  return { commission, vat, serviceTotal, disbursementTotal: money(settings.baseAmount + serviceTotal) }
}
