'use client'

import { useEffect, useRef, useState } from 'react'

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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const processingRef = useRef(false)
  const mountedRef = useRef(true)

  const [supported, setSupported] = useState<boolean | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [statusMsg, setStatusMsg] = useState('Iniciando cámara…')

  // Stable refs for callbacks
  const onProductRef = useRef(onProduct)
  const onCloseRef = useRef(onClose)
  onProductRef.current = onProduct
  onCloseRef.current = onClose

  function stopAll() {
    mountedRef.current = false
    if (timerRef.current) clearTimeout(timerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }

  useEffect(() => {
    mountedRef.current = true

    // 1. Check support
    if (!('BarcodeDetector' in window)) {
      setSupported(false)
      return
    }
    setSupported(true)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let detector: { detect: (source: HTMLCanvasElement) => Promise<Array<{ rawValue: string }>> }
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      detector = new (window as any).BarcodeDetector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
      })
    } catch {
      setSupported(false)
      return
    }

    // 2. Start camera
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
      .then(stream => {
        if (!mountedRef.current) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        video.onloadedmetadata = () => {
          video.play().then(() => {
            if (!mountedRef.current) return
            setCameraReady(true)
            setStatusMsg('Coloca el código de barras dentro del recuadro')
            scheduleNextScan()
          })
        }
      })
      .catch(() => {
        if (!mountedRef.current) return
        setError('No se pudo acceder a la cámara. Comprueba los permisos.')
      })

    // 3. Scan loop — draw each frame to canvas, detect from canvas
    function scheduleNextScan() {
      timerRef.current = setTimeout(async () => {
        if (!mountedRef.current || processingRef.current) {
          scheduleNextScan()
          return
        }
        const video = videoRef.current
        const canvas = canvasRef.current
        if (!video || !canvas || video.readyState < 3 || video.videoWidth === 0) {
          scheduleNextScan()
          return
        }

        // Draw current frame to canvas
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (!ctx) { scheduleNextScan(); return }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        try {
          const barcodes = await detector.detect(canvas)
          if (barcodes.length > 0 && mountedRef.current) {
            const code = barcodes[0].rawValue
            processingRef.current = true
            setLoading(true)
            setStatusMsg('Código detectado, buscando producto…')
            // Stop camera immediately
            streamRef.current?.getTracks().forEach(t => t.stop())
            streamRef.current = null

            try {
              const res = await fetch(`/api/barcode/${encodeURIComponent(code)}`)
              const data = await res.json()
              if (!mountedRef.current) return
              if (!res.ok) {
                setError(data.error || 'Producto no encontrado en la base de datos')
                setLoading(false)
                processingRef.current = false
                // Restart camera for retry
                return
              }
              onProductRef.current(data.product)
            } catch {
              if (!mountedRef.current) return
              setError('Error al buscar el producto')
              setLoading(false)
              processingRef.current = false
            }
            return // Don't reschedule after detection attempt
          }
        } catch {
          // Detection failed silently — try again
        }

        scheduleNextScan()
      }, 250) // Scan every 250ms
    }

    return () => { stopAll() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Run once on mount only

  function handleRetry() {
    setError('')
    setLoading(false)
    processingRef.current = false
    onCloseRef.current()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0A0A0B' }}>
      {/* Hidden canvas used for barcode detection */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-12 pb-4">
        <button
          onClick={() => { stopAll(); onCloseRef.current() }}
          className="glass-btn w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 className="text-lg font-bold text-white">Escáner de código de barras</h2>
          <p className="text-xs text-white/40">Open Food Facts · 3 millones de productos</p>
        </div>
      </div>

      {/* Not supported */}
      {supported === false && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-5">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center" style={{ background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.2)' }}>
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-white font-bold text-lg mb-2">Escáner no disponible</p>
            <p className="text-white/50 text-sm leading-relaxed">Tu navegador no soporta la detección de códigos de barras por cámara. Prueba con Chrome en Android o Safari 17+ en iOS.</p>
          </div>
          <button onClick={() => onCloseRef.current()} className="glass-btn px-8 py-3 rounded-2xl text-white font-semibold">
            Volver
          </button>
        </div>
      )}

      {/* Camera view */}
      {supported === true && (
        <div className="flex-1 flex flex-col">
          <div className="relative flex-1 overflow-hidden bg-black">
            <video
              ref={videoRef}
              className="absolute inset-0 w-full h-full object-cover"
              playsInline
              muted
              autoPlay
            />

            {/* Overlay with scan frame */}
            <div className="absolute inset-0 flex items-center justify-center">
              {/* Dark overlay with hole — using box-shadow trick */}
              <div
                className="relative"
                style={{ width: 280, height: 170 }}
              >
                <div
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.62)',
                    border: loading ? '2px solid rgba(52,199,89,0.8)' : '2px solid rgba(10,132,255,0.75)',
                    transition: 'border-color 0.3s',
                  }}
                />
                {/* Corner marks */}
                {([
                  'top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-xl',
                  'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-xl',
                  'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-xl',
                  'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-xl',
                ] as const).map((cls, i) => (
                  <div
                    key={i}
                    className={`absolute w-7 h-7 ${cls}`}
                    style={{ borderColor: loading ? '#34C759' : '#0A84FF', transition: 'border-color 0.3s' }}
                  />
                ))}
                {/* Scan line */}
                {cameraReady && !loading && !error && (
                  <div
                    className="absolute left-3 right-3 h-0.5 rounded-full"
                    style={{
                      top: '50%',
                      background: 'linear-gradient(90deg, transparent, #0A84FF 40%, #0A84FF 60%, transparent)',
                      animation: 'scanline 2s ease-in-out infinite',
                    }}
                  />
                )}
                {/* Loading indicator */}
                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-[#34C759] animate-spin" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status bar */}
          <div className="px-5 py-5">
            {error ? (
              <div className="space-y-3">
                <div
                  className="rounded-2xl px-4 py-3 text-sm text-red-400"
                  style={{ background: 'rgba(255,69,58,0.1)', border: '0.5px solid rgba(255,69,58,0.3)' }}
                >
                  {error}
                </div>
                <button
                  onClick={handleRetry}
                  className="w-full glass-btn rounded-2xl py-3 text-white font-semibold text-sm active:scale-95 transition-transform"
                >
                  Cerrar y volver a intentar
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
                {loading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-[#34C759] border-t-transparent animate-spin flex-shrink-0" />
                ) : (
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cameraReady ? 'bg-[#34C759] animate-pulse' : 'bg-white/30'}`} />
                )}
                <span className="text-sm text-white/70">{statusMsg}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes scanline {
          0%, 100% { transform: translateY(-30px); opacity: 0.4; }
          50% { transform: translateY(30px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
