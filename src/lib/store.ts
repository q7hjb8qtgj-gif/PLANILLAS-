import { useSyncExternalStore } from 'react'
import type { AppData, AuditLog } from '../types'
import { nowGuatemala, uid } from './utils'

const STORAGE_KEY = 'riso-planillas-v1'
export const emptyData: AppData = {
  companies: [], areas: [], costCenters: [], positions: [], workTypes: [], projects: [], payrollTypes: [],
  employees: [], payrolls: [], findings: [], attachments: [], auditLogs: [],
}
let data: AppData = load()
const listeners = new Set<() => void>()

function load(): AppData {
  try { return { ...emptyData, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } as AppData } catch { return emptyData }
}
function emit() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  listeners.forEach((listener) => listener())
}
export const store = {
  get: () => data,
  subscribe: (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener) },
  update(updater: (current: AppData) => AppData, audit?: Omit<AuditLog, 'id' | 'createdAt'>) {
    const next = updater(data)
    data = audit ? { ...next, auditLogs: [{ ...audit, id: uid(), createdAt: nowGuatemala() }, ...next.auditLogs] } : next
    emit()
  },
  reset() { data = emptyData; emit() },
}
export const useAppData = () => useSyncExternalStore(store.subscribe, store.get)
