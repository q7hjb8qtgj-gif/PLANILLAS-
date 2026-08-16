import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { clsx } from 'clsx'

export function Button({ className, variant = 'primary', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const styles = { primary: 'bg-navy-900 text-white hover:bg-navy-800', secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50', danger: 'bg-red-700 text-white hover:bg-red-800', ghost: 'text-slate-700 hover:bg-slate-100' }
  return <button className={clsx('min-h-11 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50', styles[variant], className)} {...props} />
}
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) { return <input className={clsx('min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-800 focus:ring-2 focus:ring-blue-100', className)} {...props} /> }
export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) { return <select className={clsx('min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-800', className)} {...props}>{children}</select> }
export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea className={clsx('min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-navy-800', className)} {...props} /> }
export function Field({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) { return <label className="grid gap-1.5 text-sm font-medium text-slate-700">{label}{required && <span className="sr-only"> (obligatorio)</span>}{children}</label> }
export function Card({ children, className }: { children: ReactNode; className?: string }) { return <section className={clsx('rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5', className)}>{children}</section> }
export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) { return <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h1 className="text-2xl font-bold text-navy-950">{title}</h1>{description && <p className="mt-1 text-sm text-slate-600">{description}</p>}</div>{action}</header> }
export function Empty({ text = 'Sin datos registrados' }: { text?: string }) { return <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{text}</div> }
export function Badge({ children, tone = 'slate' }: { children: ReactNode; tone?: 'slate' | 'green' | 'yellow' | 'red' | 'blue' }) {
  const tones = { slate: 'bg-slate-100 text-slate-700', green: 'bg-emerald-100 text-emerald-800', yellow: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-red-800', blue: 'bg-blue-100 text-blue-800' }
  return <span className={clsx('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', tones[tone])}>{children}</span>
}
export function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  if (!open) return null
  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={title}><div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-3xl sm:rounded-2xl"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold text-navy-950">{title}</h2><Button variant="ghost" onClick={onClose} aria-label="Cerrar">×</Button></div>{children}</div></div>
}
