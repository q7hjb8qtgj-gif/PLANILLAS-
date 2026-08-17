import { useCallback, useEffect, useRef, useState } from 'react'
import { jsPDF } from 'jspdf'
import { Camera, RotateCcw, ScanLine, Trash2 } from 'lucide-react'
import { Button, Modal } from './ui'

interface ScannedPage { dataUrl: string; width: number; height: number }
interface DocumentScannerProps { open: boolean; onClose: () => void; onComplete: (file: File) => void | Promise<void> }

const MAX_EDGE = 1600

// Reduce la resolución del cuadro capturado y, opcionalmente, aplica un realce
// en escala de grises con contraste para lograr un aspecto de escaneo legible.
function frameToDataUrl(video: HTMLVideoElement, enhance: boolean): ScannedPage {
  const vw = video.videoWidth || 1280
  const vh = video.videoHeight || 720
  const scale = Math.min(1, MAX_EDGE / Math.max(vw, vh))
  const width = Math.round(vw * scale)
  const height = Math.round(vh * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo preparar el lienzo de captura.')
  ctx.drawImage(video, 0, 0, width, height)
  if (enhance) {
    const image = ctx.getImageData(0, 0, width, height)
    const pixels = image.data
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114
      const boosted = Math.min(255, Math.max(0, (gray - 128) * 1.45 + 138))
      pixels[i] = boosted
      pixels[i + 1] = boosted
      pixels[i + 2] = boosted
    }
    ctx.putImageData(image, 0, 0)
  }
  return { dataUrl: canvas.toDataURL('image/jpeg', 0.72), width, height }
}

function pagesToPdf(pages: ScannedPage[]): File {
  const pageW = 210
  const pageH = 297
  const margin = 8
  const maxW = pageW - margin * 2
  const maxH = pageH - margin * 2
  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  pages.forEach((page, index) => {
    if (index > 0) pdf.addPage()
    const ratio = Math.min(maxW / page.width, maxH / page.height)
    const drawW = page.width * ratio
    const drawH = page.height * ratio
    pdf.addImage(page.dataUrl, 'JPEG', (pageW - drawW) / 2, (pageH - drawH) / 2, drawW, drawH)
  })
  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '').replace(/(\d{8})(\d{4})/, '$1-$2')
  return new File([pdf.output('blob')], `Escaneo-${stamp}.pdf`, { type: 'application/pdf' })
}

export function DocumentScanner({ open, onClose, onComplete }: DocumentScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [pages, setPages] = useState<ScannedPage[]>([])
  const [enhance, setEnhance] = useState(true)
  const [error, setError] = useState('')
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setReady(false)
  }, [])

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setError('')
    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) { setError('Este dispositivo o navegador no permite el acceso a la cámara.'); return }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
        if (cancelled) { stream.getTracks().forEach((track) => track.stop()); return }
        streamRef.current = stream
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play().catch(() => undefined) }
        setReady(true)
      } catch {
        setError('No se pudo acceder a la cámara. Otorgue permiso o use la carga de archivos.')
      }
    }
    void start()
    return () => { cancelled = true; stopCamera() }
  }, [open, stopCamera])

  const close = () => { stopCamera(); setPages([]); setError(''); onClose() }
  const capture = () => {
    const video = videoRef.current
    if (!video || !ready) return
    try { setPages((current) => [...current, frameToDataUrl(video, enhance)]) }
    catch { setError('No fue posible capturar la imagen. Intente de nuevo.') }
  }
  const removePage = (index: number) => setPages((current) => current.filter((_, position) => position !== index))
  const importFiles = async (files: FileList | null) => {
    if (!files?.length) return
    const loaded = await Promise.all(Array.from(files).filter((file) => file.type.startsWith('image/')).map((file) => new Promise<ScannedPage>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => { const img = new Image(); img.onload = () => resolve({ dataUrl: String(reader.result), width: img.naturalWidth, height: img.naturalHeight }); img.onerror = () => reject(new Error('imagen')); img.src = String(reader.result) }
      reader.onerror = () => reject(reader.error)
      reader.readAsDataURL(file)
    })))
    setPages((current) => [...current, ...loaded])
  }
  const save = async () => {
    if (!pages.length) return
    setSaving(true)
    setError('')
    try {
      const file = pagesToPdf(pages)
      if (file.size > 5 * 1024 * 1024) { setError('El PDF supera los 5 MB. Reduzca el número de páginas.'); return }
      await onComplete(file)
      stopCamera()
      setPages([])
      onClose()
    } catch {
      setError('No fue posible generar el PDF del escaneo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Escanear documento" open={open} onClose={close}>
      <div className="grid gap-4">
        <div className="relative overflow-hidden rounded-xl border border-slate-300 bg-slate-900">
          <video ref={videoRef} playsInline muted className="max-h-[46vh] w-full object-contain" />
          {!ready && !error && <p className="absolute inset-0 flex items-center justify-center text-sm text-slate-200">Iniciando cámara…</p>}
          {ready && <div className="pointer-events-none absolute inset-4 rounded-lg border-2 border-dashed border-white/60" />}
        </div>
        {error && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{error}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={capture} disabled={!ready} className="flex items-center gap-2"><Camera size={18} />Capturar página</Button>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50">
            <ScanLine size={18} />Agregar desde galería
            <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => { void importFiles(event.target.files); event.target.value = '' }} />
          </label>
          <label className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
            <input type="checkbox" className="size-4" checked={enhance} onChange={(event) => setEnhance(event.target.checked)} />
            Realce de escaneo (escala de grises)
          </label>
        </div>
        {pages.length > 0 && (
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-slate-700">{pages.length} página(s) capturada(s)</p>
            <div className="flex flex-wrap gap-3">
              {pages.map((page, index) => (
                <div key={index} className="relative">
                  <img src={page.dataUrl} alt={`Página ${index + 1}`} className="h-28 w-20 rounded-md border border-slate-300 object-cover" />
                  <span className="absolute left-1 top-1 rounded bg-navy-950/80 px-1.5 text-xs font-semibold text-white">{index + 1}</span>
                  <button type="button" onClick={() => removePage(index)} aria-label={`Eliminar página ${index + 1}`} className="absolute -right-2 -top-2 rounded-full bg-red-700 p-1 text-white shadow"><Trash2 size={13} /></button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
          <Button variant="ghost" onClick={() => setPages([])} disabled={!pages.length} className="flex items-center gap-2"><RotateCcw size={16} />Reiniciar</Button>
          <Button variant="secondary" onClick={close}>Cancelar</Button>
          <Button onClick={save} disabled={!pages.length || saving}>{saving ? 'Generando PDF…' : `Guardar PDF (${pages.length})`}</Button>
        </div>
      </div>
    </Modal>
  )
}
