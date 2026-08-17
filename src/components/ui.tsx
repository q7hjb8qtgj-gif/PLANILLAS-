import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '../lib/utils'

const buttonVariants = cva('inline-flex min-h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:pointer-events-none disabled:opacity-50', {
  variants: {
    variant: {
      primary: 'bg-blue-950 text-white hover:bg-blue-900',
      secondary: 'border border-slate-300 bg-white text-slate-800 hover:bg-slate-50',
      danger: 'bg-red-700 text-white hover:bg-red-800',
      success: 'bg-emerald-700 text-white hover:bg-emerald-800',
      ghost: 'text-slate-700 hover:bg-slate-100',
    },
  },
  defaultVariants: { variant: 'primary' },
})
export function Button({ className, variant, asChild, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : 'button'
  return <Component className={cn(buttonVariants({ variant }), className)} {...props} />
}
export const Input = ({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) => <input className={cn('min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100', className)} {...props} />
export const Select = ({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) => <select className={cn('min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-base outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100', className)} {...props} />
export const Textarea = ({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className={cn('min-h-24 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-100', className)} {...props} />
export const Card = ({ className, ...props }: HTMLAttributes<HTMLDivElement>) => <section className={cn('rounded-xl border border-slate-200 bg-white p-4 shadow-sm', className)} {...props} />
export const Badge = ({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'danger' | 'warning' | 'success' | 'info' }) => {
  const colors = { neutral: 'bg-slate-100 text-slate-700', danger: 'bg-red-100 text-red-800', warning: 'bg-amber-100 text-amber-900', success: 'bg-emerald-100 text-emerald-800', info: 'bg-blue-100 text-blue-800' }
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', colors[tone])}>{children}</span>
}
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="grid gap-1 text-sm font-medium text-slate-700"><span>{label}</span>{children}{hint && <span className="text-xs font-normal text-slate-500">{hint}</span>}</label>
}
export function Empty({ text = 'Sin datos registrados' }: { text?: string }) {
  return <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{text}</div>
}
export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return <div className="overflow-x-auto rounded-lg border border-slate-200"><table className="w-full min-w-[760px] border-collapse text-left text-sm"><thead className="sticky top-0 bg-slate-100 text-slate-700"><tr>{headers.map((header) => <th className="whitespace-nowrap px-3 py-3 font-semibold" key={header}>{header}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{children}</tbody></table></div>
}
export const Td = ({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) => <td className={cn('px-3 py-3 align-top', className)} {...props} />
