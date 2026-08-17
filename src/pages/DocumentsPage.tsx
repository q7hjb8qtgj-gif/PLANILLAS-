import { useState } from 'react'
import { ScanLine } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { dateGT } from '../lib/calculations'
import { Button, Card, Empty, Field, Input, PageHeader, Select } from '../components/ui'
import { DocumentScanner } from '../components/DocumentScanner'
import type { Attachment } from '../types'

export function DocumentsPage() {
  const { data, updateData, session } = useApp()
  const [payrollId, setPayrollId] = useState('')
  const [category, setCategory] = useState('Otro documento')
  const [message, setMessage] = useState('')
  const [scannerOpen, setScannerOpen] = useState(false)
  const canUpload = session?.role !== 'Consulta'
  const upload = async (file?: File) => {
    if (!file) return
    setMessage('')
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
    if (!allowed.includes(file.type)) { setMessage('Tipo de archivo no permitido.'); return }
    if (file.size > 5 * 1024 * 1024) { setMessage('El archivo excede el límite de 5 MB.'); return }
    const dataUrl = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(reader.error); reader.readAsDataURL(file) })
    const now = new Date().toISOString()
    const attachment: Attachment = { id: crypto.randomUUID(), payrollId: payrollId || undefined, name: file.name, type: file.type, size: file.size, category, dataUrl, active: true, createdAt: now, updatedAt: now }
    updateData('attachments', [...data.attachments, attachment], 'Adjuntar documento', attachment.id, undefined, { name: file.name, payrollId, category })
    setMessage('Documento adjuntado correctamente.')
  }
  const annul = (entry: Attachment) => {
    const reason = window.prompt('Motivo de anulación:'); if (!reason?.trim()) return
    const next = { ...entry, active: false, updatedAt: new Date().toISOString() }
    updateData('attachments', data.attachments.map((item) => item.id === entry.id ? next : item), 'Anular documento', entry.id, entry, next, reason)
  }
  return <><PageHeader title="Documentos y evidencias" description="Archivos validados y asociados a la planilla correspondiente." action={<Button onClick={() => setScannerOpen(true)} disabled={!canUpload} className="flex items-center gap-2"><ScanLine size={18} />Escanear documento</Button>} /><DocumentScanner open={scannerOpen} onClose={() => setScannerOpen(false)} onComplete={upload} /><Card><div className="grid gap-4 sm:grid-cols-3"><Field label="Planilla (opcional)"><Select value={payrollId} onChange={(e) => setPayrollId(e.target.value)}><option value="">Documento general</option>{data.payrolls.map((entry) => <option key={entry.id} value={entry.id}>{entry.code}</option>)}</Select></Field><Field label="Categoría"><Select value={category} onChange={(e) => setCategory(e.target.value)}><option>Excel</option><option>PDF</option><option>Imagen</option><option>Comprobante bancario</option><option>Autorización</option><option>Contrato</option><option>Informe de obra</option><option>Otro documento</option></Select></Field><Field label="Archivo (máx. 5 MB)"><Input type="file" accept=".xlsx,.xls,.pdf,.jpg,.jpeg,.png,image/*" capture="environment" onChange={(e) => upload(e.target.files?.[0])} disabled={!canUpload} /></Field></div><p className="mt-3 text-xs text-slate-500">Sugerencia: use <strong>Escanear documento</strong> para capturar comprobantes con la cámara y guardarlos como PDF de varias páginas.</p>{message && <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">{message}</p>}
      <div className="mt-6">{data.attachments.length ? <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="border-b text-slate-500"><tr><th className="p-3">Archivo</th><th>Categoría</th><th>Planilla</th><th>Tamaño</th><th>Fecha</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{data.attachments.map((entry) => <tr key={entry.id} className="border-b border-slate-100"><td className="p-3 font-medium">{entry.name}</td><td>{entry.category}</td><td>{data.payrolls.find((item) => item.id === entry.payrollId)?.code || 'General'}</td><td>{(entry.size / 1024).toFixed(1)} KB</td><td>{dateGT(entry.createdAt)}</td><td>{entry.active ? 'Activo' : 'Anulado'}</td><td className="space-x-2">{entry.dataUrl && <a className="font-semibold text-blue-700" href={entry.dataUrl} download={entry.name}>Descargar</a>}<Button variant="ghost" disabled={!entry.active || session?.role !== 'Administrador'} onClick={() => annul(entry)}>Anular</Button></td></tr>)}</tbody></table></div> : <Empty />}</div></Card></>
}
