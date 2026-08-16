import type { AppData, UserSession } from '../types'

const DATA_KEY = 'riso-payroll-data-v1'
const SESSION_KEY = 'riso-payroll-session-v1'
export const emptyData = (): AppData => ({ companies: [], areas: [], catalog: [], employees: [], payrolls: [], findings: [], attachments: [], auditLogs: [] })
export function loadData(): AppData {
  try { return JSON.parse(localStorage.getItem(DATA_KEY) || '') as AppData } catch { return emptyData() }
}
export const saveData = (data: AppData) => localStorage.setItem(DATA_KEY, JSON.stringify(data))
export function loadSession(): UserSession | null {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '') as UserSession } catch { return null }
}
export const saveSession = (session: UserSession | null) => session ? sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)) : sessionStorage.removeItem(SESSION_KEY)
