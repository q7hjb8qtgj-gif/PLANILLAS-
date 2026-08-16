import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useApp } from '../context/AppContext'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { Button, Card, Field, Input, Select } from '../components/ui'
import type { Role } from '../types'

const schema = z.object({ name: z.string().min(2, 'Ingrese su nombre'), email: z.email('Correo inválido'), password: z.string().optional(), role: z.enum(['Administrador', 'Validador', 'Digitador', 'Consulta', 'Encargado de área']) })
type FormData = z.infer<typeof schema>
export function LoginPage() {
  const { setSession } = useApp()
  const [error, setError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({ resolver: zodResolver(schema), defaultValues: { role: 'Administrador' } })
  const submit = async (values: FormData) => {
    setError('')
    if (isSupabaseConfigured && supabase) {
      if (!values.password) { setError('Ingrese la contraseña de Supabase.'); return }
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: values.email, password: values.password })
      if (authError || !data.user) { setError(authError?.message || 'No fue posible iniciar sesión.'); return }
      setSession({ id: data.user.id, name: values.name, email: values.email, role: values.role as Role })
    } else setSession({ id: crypto.randomUUID(), name: values.name, email: values.email, role: values.role as Role })
  }
  return <main className="flex min-h-screen items-center justify-center bg-navy-950 p-4"><Card className="w-full max-w-md p-6 sm:p-8"><p className="text-xs font-bold tracking-[.2em] text-blue-700">CORPORACIÓN RISO</p><h1 className="mt-2 text-2xl font-bold text-navy-950">Control y verificación de planillas</h1><p className="mt-2 text-sm text-slate-600">{isSupabaseConfigured ? 'Acceso seguro con Supabase' : 'Modo local: los datos permanecen únicamente en este dispositivo.'}</p>
    <form className="mt-6 grid gap-4" onSubmit={handleSubmit(submit)}>
      <Field label="Nombre completo" required><Input autoComplete="name" {...register('name')} />{errors.name && <small className="text-red-700">{errors.name.message}</small>}</Field>
      <Field label="Correo electrónico" required><Input type="email" autoComplete="email" {...register('email')} />{errors.email && <small className="text-red-700">{errors.email.message}</small>}</Field>
      {isSupabaseConfigured && <Field label="Contraseña" required><Input type="password" autoComplete="current-password" {...register('password')} /></Field>}
      {!isSupabaseConfigured && <Field label="Rol para esta sesión" required><Select {...register('role')}><option>Administrador</option><option>Validador</option><option>Digitador</option><option>Consulta</option><option>Encargado de área</option></Select></Field>}
      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Ingresando…' : 'Ingresar'}</Button>
    </form>
  </Card></main>
}
