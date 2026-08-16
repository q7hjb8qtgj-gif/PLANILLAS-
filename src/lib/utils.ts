import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
export const uid = () => crypto.randomUUID()
export const nowGuatemala = () => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'America/Guatemala', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit',
}).format(new Date()).replace(' ', 'T')
export const currency = (value: number) => new Intl.NumberFormat('es-GT', {
  style: 'currency', currency: 'GTQ', minimumFractionDigits: 2,
}).format(Number.isFinite(value) ? value : 0)
export const dateGT = (value?: string) => value ? new Intl.DateTimeFormat('es-GT', {
  timeZone: 'America/Guatemala', day: '2-digit', month: '2-digit', year: 'numeric',
}).format(new Date(`${value.slice(0, 10)}T12:00:00-06:00`)) : ''
export const numberValue = (value: FormDataEntryValue | null) => Number(value || 0)
