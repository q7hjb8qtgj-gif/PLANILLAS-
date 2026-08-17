import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { emptyData, loadData, loadSession, saveData, saveSession } from '../lib/storage'
import type { AppData, AuditLog, UserSession } from '../types'

interface AppContextValue {
  data: AppData; session: UserSession | null; setSession: (session: UserSession | null) => void
  updateData: (module: keyof Omit<AppData, 'auditLogs'>, next: unknown[], action: string, recordId?: string, oldValue?: unknown, newValue?: unknown, reason?: string) => void
  replaceData: (data: AppData) => void
}
const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => typeof localStorage === 'undefined' ? emptyData() : loadData())
  const [session, setSessionState] = useState<UserSession | null>(() => typeof sessionStorage === 'undefined' ? null : loadSession())
  useEffect(() => saveData(data), [data])
  const setSession = useCallback((next: UserSession | null) => { setSessionState(next); saveSession(next) }, [])
  const updateData = useCallback((module: keyof Omit<AppData, 'auditLogs'>, next: unknown[], action: string, recordId = '', oldValue?: unknown, newValue?: unknown, reason?: string) => {
    setData((current) => {
      const log: AuditLog = { id: crypto.randomUUID(), userId: session?.id || 'local', userName: session?.name || 'Usuario local', action, module, recordId, oldValue, newValue, timestamp: new Date().toISOString(), reason }
      return { ...current, [module]: next, auditLogs: [...current.auditLogs, log] }
    })
  }, [session])
  const replaceData = useCallback((next: AppData) => setData(next), [])
  const value = useMemo(() => ({ data, session, setSession, updateData, replaceData }), [data, session, setSession, updateData, replaceData])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}
// oxlint-disable-next-line react/only-export-components
export function useApp() {
  const value = useContext(AppContext)
  if (!value) throw new Error('useApp debe usarse dentro de AppProvider')
  return value
}
