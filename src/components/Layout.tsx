import { useState, type ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { BarChart3, BookOpenCheck, ClipboardCheck, FileDown, FileSpreadsheet, FileText, FolderOpen, LogOut, Menu, Settings, Users, X } from 'lucide-react'
import { useApp } from '../context/AppContext'

const links = [
  ['/', 'Tablero', BarChart3], ['/planillas', 'Planillas', FileSpreadsheet], ['/importar', 'Importar', FileDown],
  ['/conciliacion', 'Conciliación', BookOpenCheck], ['/hallazgos', 'Hallazgos', ClipboardCheck], ['/colaboradores', 'Colaboradores', Users],
  ['/reportes', 'Reportes', FileText], ['/documentos', 'Documentos', FolderOpen], ['/bitacora', 'Bitácora', ClipboardCheck], ['/configuracion', 'Configuración', Settings],
] as const

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { session, setSession } = useApp()
  return <div className="min-h-screen bg-slate-100">
    {open && <button className="fixed inset-0 z-30 bg-slate-950/50 lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú" />}
    <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-navy-950 text-white transition-transform lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex min-h-20 items-center justify-between border-b border-white/10 px-5"><div><p className="font-bold">CORPORACIÓN RISO</p><p className="text-xs text-slate-300">Control de Planillas</p></div><button className="lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar"><X /></button></div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">{links.map(([to, label, Icon]) => <NavLink key={to} to={to} end={to === '/'} onClick={() => setOpen(false)} className={({ isActive }) => `flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium ${isActive ? 'bg-white text-navy-950' : 'text-slate-200 hover:bg-white/10'}`}><Icon size={19} />{label}</NavLink>)}</nav>
      <div className="border-t border-white/10 p-4"><p className="truncate text-sm font-semibold">{session?.name}</p><p className="text-xs text-slate-300">{session?.role}</p><button onClick={() => setSession(null)} className="mt-3 flex items-center gap-2 text-sm text-slate-200"><LogOut size={17} />Cerrar sesión</button></div>
    </aside>
    <div className="lg:pl-72"><header className="sticky top-0 z-20 flex min-h-16 items-center border-b border-slate-200 bg-white px-4 lg:hidden"><button onClick={() => setOpen(true)} aria-label="Abrir menú"><Menu /></button><span className="ml-3 font-bold text-navy-950">Control de Planillas</span></header><main className="mx-auto max-w-[1500px] p-4 pb-24 sm:p-6">{children}</main></div>
  </div>
}
