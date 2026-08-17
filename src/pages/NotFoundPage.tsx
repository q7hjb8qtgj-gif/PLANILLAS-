import { Link } from 'react-router-dom'
import { Card } from '../components/ui'

export function NotFoundPage() {
  return <div className="flex min-h-[70vh] items-center justify-center"><Card className="max-w-lg text-center"><p className="text-6xl font-bold text-navy-950">404</p><h1 className="mt-3 text-xl font-bold">Página no encontrada</h1><p className="mt-2 text-slate-600">La ruta solicitada no existe o no está disponible.</p><Link className="mt-5 inline-block rounded-lg bg-navy-900 px-4 py-3 font-semibold text-white" to="/">Volver al tablero</Link></Card></div>
}
