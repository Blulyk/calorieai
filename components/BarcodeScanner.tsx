'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface BarcodeProduct {
  name: string; brand: string; portion: string
  calories: number; protein: number; carbs: number; fat: number; fiber: number
  image: string | null; barcode: string
}

interface Props {
  onProduct: (product: BarcodeProduct) => void
  onClose: () => void
}

export default function BarcodeScanner({ onProduct, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number>(0)
  const [supported, setSupported] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [scanned, setScanned] = useState(false)

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const handleCode = useCallback(async (code: string) => {
    if (scanned) return
    setScanned(true)
    stopCamera()
    setLoading(true)
    try {
      const res = await fetch(`/api/barcode/${encodeURIComponent(code)}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Producto no encontrado'); setLoading(false); setScanned(false); return }
      onProduct(data.product)
    } catch {
      setError('Error al buscar el producto'); setLoading(false); setScanned(false)
    }
  }, [scanned, stopCamera, onProduct])

  useEffect(() => {
    // Check support
    const sup = 'BarcodeDetector' in window
    setSupported(sup)
    if (!sup) return

    let detector: { detect: (img: HTMLVideoElement) => Promise<Array<{rawValue: string}>> }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      detector = new (window as any).BarcodeDetector({ formats: ['ean_13','ean_8','upc_a','upc_e','code_128','code_39','qr_code'] })
    } catch { setSupported(false); return }

    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 } } })
      .then(stream => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
        }
        const scan = async () => {
          if (!videoRef.current || videoRef.current.readyState < 2) {
            rafRef.current = requestAnimationFrame(scan); return
          }
          try {
            const barcodes = await detector.detect(videoRef.current)
            if (barcodes.length > 0) { handleCode(barcodes[0].rawValue); return }
          } catch { /* ignore */ }
          rafRef.current = requestAnimationFrame(scan)
        }
        rafRef.current = requestAnimationFrame(scan)
      })
      .catch(() => setError('No se pudo acceder a la cámara. Comprueba los permisos.'))

    return () => stopCamera()
  }, [handleCode, stopCamera])

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0A0A0B' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-12 pb-4">
        <button onClick={() => { stopCamera(); onClose() }} className="glass-btn w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-white">Escáner de código de barras</h2>
          <p className="text-xs text-white/40">Apunta al código de barras del producto</p>
        </div>
      </div>

      {supported === false && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-4">
          <div className="text-4xl">📷</div>
          <p className="text-white font-bold text-center">Escáner no compatible</p>
          <p className="text-white/50 text-sm text-center">Tu navegador no soporta BarcodeDetector. Usa Chrome en Android o Safari 17+ en iOS.</p>
          <button onClick={onClose} className="glass-btn px-6 py-3 rounded-2xl text-white font-semibold">Volver</button>
        </div>
      )}

      {supported && (
        <div className="flex-1 flex flex-col">
          {/* Camera view */}
          <div className="relative flex-1 overflow-hidden">
            <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" playsInline muted />
            {/* Scan overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative" style={{ width: 260, height: 180 }}>
                <div className="absolute inset-0 rounded-2xl" style={{ border: '2px solid rgba(10,132,255,0.7)', boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }} />
                {/* Corners */}
                {[['top-0 left-0','border-t-2 border-l-2 rounded-tl-xl'],['top-0 right-0','border-t-2 border-r-2 rounded-tr-xl'],['bottom-0 left-0','border-b-2 border-l-2 rounded-bl-xl'],['bottom-0 right-0','border-b-2 border-r-2 rounded-br-xl']].map(([pos, cls], i) => (
                  <div key={i} className={`absolute w-6 h-6 ${pos} ${cls}`} style={{ borderColor: '#0A84FF' }} />
                ))}
                {/* Scan line animation */}
                {!loading && !scanned && (
                  <div className="absolute left-2 right-2 h-0.5 rounded-full animate-bounce" style={{ top: '50%', background: 'linear-gradient(90deg, transparent, #0A84FF, transparent)' }} />
                )}
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="px-5 py-6">
            {loading && (
              <div className="glass rounded-2xl px-4 py-4 flex items-center gap-3">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-[#0A84FF]" />
                <span className="text-sm text-white/80">Buscando producto…</span>
              </div>
            )}
            {error && (
              <div className="space-y-3">
                <div className="glass rounded-2xl px-4 py-3 text-sm text-red-400" style={{ border: '0.5px solid rgba(255,69,58,0.3)' }}>{error}</div>
                <button onClick={() => { setError(''); setScanned(false) }} className="w-full glass-btn rounded-2xl py-3 text-white font-semibold">Escanear de nuevo</button>
              </div>
            )}
            {!loading && !error && (
              <p className="text-center text-white/30 text-sm">Coloca el código de barras dentro del recuadro</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
