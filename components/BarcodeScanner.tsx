'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType, MultiFormatReader, BinaryBitmap, HybridBinarizer, RGBLuminanceSource } from '@zxing/library'

export interface BarcodeProduct {
  name: string; brand: string; portion: string
  quantity: number; unit: 'g' | 'ml'
  calories: number; protein: number; carbs: number; fat: number; fiber: number
  per100g: { calories: number; protein: number; carbs: number; fat: number; fiber: number }
  emoji: string; image: string | null; barcode: string
}

interface Props {
  onProduct: (product: BarcodeProduct) => void
  onClose: () => void
}

type CameraState = 'starting' | 'scanning' | 'blocked'

function normalizeCode(value: string) {
  return value.replace(/\s+/g, '').trim()
}

function cameraErrorMessage(err: unknown) {
  const name = err instanceof DOMException ? err.name : ''
  if (!window.isSecureContext) {
    return 'La cámara está bloqueada porque Umbrel se está abriendo sin HTTPS. Puedes subir una foto del código o escribirlo manualmente.'
  }
  if (name === 'NotAllowedError') return 'Permiso de cámara denegado. Actívalo en el navegador o usa foto/manual.'
  if (name === 'NotFoundError') return 'No se encontró ninguna cámara disponible.'
  return 'No se pudo iniciar la cámara. Usa la foto del código o introdúcelo manualmente.'
}

function calcNutrition(per100g: BarcodeProduct['per100g'], qty: number) {
  const f = (v: number) => Math.round(v * qty / 100 * 10) / 10
  return {
    calories: Math.round(per100g.calories * qty / 100),
    protein:  f(per100g.protein),
    carbs:    f(per100g.carbs),
    fat:      f(per100g.fat),
    fiber:    f(per100g.fiber),
  }
}

/* ─── Product Preview Screen ─────────────────────────────────────── */
function ProductPreview({
  product,
  onConfirm,
  onBack,
}: {
  product: BarcodeProduct
  onConfirm: (adjusted: BarcodeProduct) => void
  onBack: () => void
}) {
  const [qty, setQty] = useState(product.quantity)
  const nutrition = calcNutrition(product.per100g, qty)

  function handleQtyChange(raw: string) {
    const n = parseInt(raw, 10)
    if (!isNaN(n) && n > 0) setQty(n)
  }

  function confirm() {
    onConfirm({
      ...product,
      quantity: qty,
      portion: `${qty}${product.unit}`,
      ...nutrition,
    })
  }

  return (
    <div className="fixed inset-0 flex flex-col overflow-y-auto" style={{ background: '#0A0A0B', zIndex: 200 }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-5 pt-12 pb-4 flex-shrink-0">
        <button
          onClick={onBack}
          className="glass-btn w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white">Producto encontrado</h2>
          <p className="text-xs text-white/40">Ajusta la cantidad antes de añadir</p>
        </div>
      </div>

      <div className="flex-1 px-5 pb-6 space-y-4">
        {/* Banner: image or emoji */}
        {product.image ? (
          <div className="w-full h-44 rounded-3xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
          </div>
        ) : (
          <div
            className="w-full h-44 rounded-3xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(10,132,255,0.18), rgba(94,92,230,0.18))' }}
          >
            <span style={{ fontSize: 80 }}>{product.emoji}</span>
          </div>
        )}

        {/* Name + brand */}
        <div className="glass rounded-3xl p-4 space-y-1">
          <p className="text-white font-bold text-xl leading-tight">{product.name || 'Producto escaneado'}</p>
          {product.brand ? (
            <p className="text-white/45 text-sm">{product.brand}</p>
          ) : null}
          <p className="text-white/30 text-xs font-mono">{product.barcode}</p>
        </div>

        {/* Quantity adjuster */}
        <div className="glass rounded-3xl p-4">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3">Cantidad</p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQty(q => Math.max(1, q - 10))}
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-lg active:scale-90 transition-transform"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              −
            </button>
            <div className="flex-1 flex items-center gap-2 rounded-2xl px-4 py-2.5" style={{ background: 'rgba(255,255,255,0.07)' }}>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={qty}
                onChange={e => handleQtyChange(e.target.value)}
                className="w-full bg-transparent text-white text-center text-xl font-bold outline-none"
              />
              <span className="text-white/50 text-base font-medium flex-shrink-0">{product.unit}</span>
            </div>
            <button
              onClick={() => setQty(q => q + 10)}
              className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-lg active:scale-90 transition-transform"
              style={{ background: 'rgba(255,255,255,0.1)' }}
            >
              +
            </button>
          </div>
          {/* Quick presets */}
          <div className="flex gap-2 mt-3">
            {(product.unit === 'ml'
              ? [100, 150, 200, 250, 330, 500]
              : [30, 50, 100, 150, 200, 250]
            ).map(preset => (
              <button
                key={preset}
                onClick={() => setQty(preset)}
                className="flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-90"
                style={{
                  background: qty === preset ? 'rgba(10,132,255,0.3)' : 'rgba(255,255,255,0.06)',
                  color: qty === preset ? '#0A84FF' : 'rgba(255,255,255,0.4)',
                  border: qty === preset ? '1px solid rgba(10,132,255,0.5)' : '1px solid transparent',
                }}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {/* Nutrition grid */}
        <div className="glass rounded-3xl p-4">
          <p className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-3">
            Nutrición para {qty}{product.unit}
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Calorías', value: nutrition.calories, unit: 'kcal', color: '#FF9F0A' },
              { label: 'Proteína', value: nutrition.protein,  unit: 'g',    color: '#30D158' },
              { label: 'Carbos',   value: nutrition.carbs,    unit: 'g',    color: '#0A84FF' },
              { label: 'Grasas',   value: nutrition.fat,      unit: 'g',    color: '#FF453A' },
            ].map(m => (
              <div key={m.label} className="rounded-2xl px-2 py-3 text-center"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                <p className="text-white font-bold text-base">{m.value}</p>
                <p className="text-xs mt-0.5" style={{ color: m.color }}>{m.unit}</p>
                <p className="text-white/35 text-[10px] mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>
          {product.per100g.fiber > 0 && (
            <div className="mt-2 rounded-2xl px-4 py-2 flex justify-between items-center"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <span className="text-white/50 text-xs">Fibra</span>
              <span className="text-white/70 text-xs font-semibold">{nutrition.fiber}g</span>
            </div>
          )}
          <p className="text-white/25 text-[10px] text-center mt-2">
            Por 100{product.unit}: {product.per100g.calories} kcal · P {product.per100g.protein}g · C {product.per100g.carbs}g · G {product.per100g.fat}g
          </p>
        </div>

        {/* CTA */}
        <button
          onClick={confirm}
          className="w-full py-4 rounded-3xl font-bold text-white text-base active:scale-95 transition-transform flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(145deg, #30D158, #25A244)', boxShadow: '0 4px 20px rgba(48,209,88,0.4)' }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Añadir al diario
        </button>

        <button
          onClick={onBack}
          className="w-full py-3 rounded-3xl text-sm font-semibold text-white/50 active:text-white/80 transition-colors"
        >
          Escanear otro producto
        </button>
      </div>
    </div>
  )
}

/* ─── Main Scanner Component ─────────────────────────────────────── */
export default function BarcodeScanner({ onProduct, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const readerRef = useRef<BrowserMultiFormatReader | null>(null)
  const mountedRef = useRef(true)
  const processingRef = useRef(false)
  const lastCodeRef = useRef('')

  const [cameraState, setCameraState] = useState<CameraState>('starting')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [statusMsg, setStatusMsg] = useState('Iniciando cámara...')
  const [manualCode, setManualCode] = useState('')
  const [previewProduct, setPreviewProduct] = useState<BarcodeProduct | null>(null)

  const hints = useMemo(() => {
    const map = new Map()
    map.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
      BarcodeFormat.QR_CODE,
    ])
    map.set(DecodeHintType.TRY_HARDER, true)
    return map
  }, [])

  function stopScanner() {
    controlsRef.current?.stop()
    controlsRef.current = null
  }

  async function lookupCode(rawCode: string) {
    const code = normalizeCode(rawCode)
    if (!code || processingRef.current) return

    processingRef.current = true
    lastCodeRef.current = code
    setLoading(true)
    setError('')
    setStatusMsg(`Código ${code} detectado. Buscando producto...`)
    stopScanner()

    try {
      const res = await fetch(`/api/barcode/${encodeURIComponent(code)}`)
      const data = await res.json()
      if (!mountedRef.current) return

      if (!res.ok) {
        setError(data.error || 'Producto no encontrado en Open Food Facts.')
        setStatusMsg('Puedes probar otra vez, subir una foto o escribir el código.')
        return
      }

      // Show preview instead of immediately calling onProduct
      setPreviewProduct(data.product as BarcodeProduct)
    } catch {
      if (!mountedRef.current) return
      setError('No se pudo buscar el producto. Comprueba la conexión e inténtalo de nuevo.')
      setStatusMsg('Puedes probar otra vez, subir una foto o escribir el código.')
    } finally {
      if (mountedRef.current) setLoading(false)
      processingRef.current = false
    }
  }

  async function startCamera() {
    if (!videoRef.current || processingRef.current) return

    stopScanner()
    setError('')
    setPreviewProduct(null)
    lastCodeRef.current = ''
    setCameraState('starting')
    setStatusMsg('Iniciando cámara...')

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new DOMException('Camera unavailable', 'NotAllowedError')
      }

      const reader = new BrowserMultiFormatReader(hints)
      readerRef.current = reader
      const controls = await reader.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result) => {
          if (!result || !mountedRef.current || processingRef.current) return
          const code = normalizeCode(result.getText())
          if (!code || code === lastCodeRef.current) return
          void lookupCode(code)
        }
      )

      if (!mountedRef.current) {
        controls.stop()
        return
      }

      controlsRef.current = controls
      setCameraState('scanning')
      setStatusMsg('Coloca el código de barras dentro del recuadro.')
    } catch (err) {
      if (!mountedRef.current) return
      setCameraState('blocked')
      setStatusMsg('Cámara no disponible.')
      setError(cameraErrorMessage(err))
    }
  }

  useEffect(() => {
    mountedRef.current = true
    void startCamera()
    return () => {
      mountedRef.current = false
      stopScanner()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function scanImage(file: File) {
    if (!file.type.startsWith('image/')) {
      setError('Selecciona una imagen del código de barras.')
      return
    }

    setLoading(true)
    setError('')
    setStatusMsg('Leyendo código desde la imagen...')

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader()
        fr.onload = () => resolve(fr.result as string)
        fr.onerror = reject
        fr.readAsDataURL(file)
      })

      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image()
        el.onload = () => resolve(el)
        el.onerror = reject
        el.src = dataUrl
      })

      const canvas = document.createElement('canvas')
      const MAX = 1200
      const scale = Math.min(1, MAX / Math.max(img.width, img.height))
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const lum = new RGBLuminanceSource(imageData.data as unknown as Uint8ClampedArray, canvas.width, canvas.height)
      const bitmap = new BinaryBitmap(new HybridBinarizer(lum))
      const mfr = new MultiFormatReader()
      mfr.setHints(hints)
      const result = mfr.decode(bitmap)
      await lookupCode(result.getText())
    } catch (err) {
      if (!mountedRef.current) return
      const isNotFound = err instanceof Error && (
        err.name === 'NotFoundException' ||
        err.message?.includes('NotFoundException') ||
        err.message?.includes('No MultiFormat')
      )
      setError(isNotFound
        ? 'No detecté ningún código en la foto. Asegúrate de que el código esté bien visible y enfocado, o introdúcelo manualmente.'
        : 'Error al procesar la imagen. Introdúcelo manualmente.'
      )
    } finally {
      if (mountedRef.current) setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  function retryCamera() {
    lastCodeRef.current = ''
    void startCamera()
  }

  function submitManual(e: React.FormEvent) {
    e.preventDefault()
    lastCodeRef.current = ''
    void lookupCode(manualCode)
  }

  // Show product preview when a product has been found
  if (previewProduct) {
    return (
      <ProductPreview
        product={previewProduct}
        onConfirm={onProduct}
        onBack={() => {
          setPreviewProduct(null)
          processingRef.current = false
          void startCamera()
        }}
      />
    )
  }

  // Camera blocked — compact no-camera layout
  if (cameraState === 'blocked') {
    return (
      <div className="fixed inset-0 flex flex-col" style={{ background: '#0A0A0B', zIndex: 200 }}>
        <input ref={fileRef} type="file" accept="image/*" className="hidden"
          onChange={e => e.target.files?.[0] && void scanImage(e.target.files[0])} />

        <div className="flex items-center gap-3 px-5 pt-12 pb-4">
          <button onClick={() => { stopScanner(); onClose() }}
            className="glass-btn w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white">Código de barras</h2>
            <p className="text-xs text-white/40">Open Food Facts · 3 millones de productos</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
            style={{ background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)' }}>
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6.75a3.75 3.75 0 1 0-7.5 0v3.75m-.75 11.25h9A2.25 2.25 0 0 0 18.75 19.5v-6.75A2.25 2.25 0 0 0 16.5 10.5h-9a2.25 2.25 0 0 0-2.25 2.25v6.75A2.25 2.25 0 0 0 7.5 21.75Z" />
            </svg>
          </div>

          <div className="text-center">
            <p className="text-white font-bold text-lg mb-1">Cámara no disponible</p>
            <p className="text-white/45 text-sm leading-relaxed max-w-xs">
              El navegador bloquea la cámara en HTTP. Accede desde móvil para escanear en vivo, o usa una foto o el código manual.
            </p>
          </div>

          {error && (
            <div className="w-full max-w-sm rounded-2xl px-4 py-3 text-sm text-red-300 text-center"
              style={{ background: 'rgba(255,69,58,0.1)', border: '0.5px solid rgba(255,69,58,0.3)' }}>
              {error}
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-3 text-sm text-white/60">
              <div className="w-4 h-4 rounded-full border-2 border-[#34C759] border-t-transparent animate-spin" />
              Buscando producto…
            </div>
          )}

          <button
            onClick={() => fileRef.current?.click()}
            disabled={loading}
            className="w-full max-w-sm py-4 rounded-2xl font-bold text-white text-base active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(145deg, #1F8FFF, #0A6BE0)', boxShadow: '0 4px 20px rgba(10,132,255,0.4)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
            </svg>
            Hacer foto / elegir imagen
          </button>

          <form onSubmit={submitManual} className="w-full max-w-sm glass rounded-2xl p-2">
            <div className="flex items-center gap-2">
              <input
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                placeholder="Introducir código manualmente (ej: 8410076480569)"
                className="min-w-0 flex-1 bg-transparent px-3 py-2.5 text-sm text-white outline-none placeholder:text-white/30"
              />
              <button
                type="submit"
                disabled={loading || normalizeCode(manualCode).length < 6}
                className="rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-35 flex-shrink-0"
                style={{ background: '#0A84FF' }}
              >
                Buscar
              </button>
            </div>
          </form>

          <button onClick={retryCamera} disabled={loading}
            className="text-xs text-white/30 active:text-white/60 transition-colors">
            Reintentar cámara
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 flex flex-col" style={{ background: '#0A0A0B', zIndex: 200 }}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => e.target.files?.[0] && void scanImage(e.target.files[0])}
      />

      <div className="flex items-center gap-3 px-5 pt-12 pb-4">
        <button
          onClick={() => { stopScanner(); onClose() }}
          className="glass-btn w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-white">Escáner de código de barras</h2>
          <p className="text-xs text-white/40">Open Food Facts · productos empaquetados</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="relative flex-1 overflow-hidden bg-black">
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />

          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative" style={{ width: 280, height: 170 }}>
              <div
                className="absolute inset-0 rounded-2xl"
                style={{
                  boxShadow: '0 0 0 9999px rgba(0,0,0,0.62)',
                  border: loading ? '2px solid rgba(52,199,89,0.8)' : '2px solid rgba(10,132,255,0.75)',
                  transition: 'border-color 0.3s',
                }}
              />
              {([
                'top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-xl',
                'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-xl',
                'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-xl',
                'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-xl',
              ] as const).map((cls, i) => (
                <div key={i} className={`absolute h-7 w-7 ${cls}`}
                  style={{ borderColor: loading ? '#34C759' : '#0A84FF', transition: 'border-color 0.3s' }} />
              ))}
              {cameraState === 'scanning' && !loading && !error && (
                <div className="absolute left-3 right-3 h-0.5 rounded-full"
                  style={{
                    top: '50%',
                    background: 'linear-gradient(90deg, transparent, #0A84FF 40%, #0A84FF 60%, transparent)',
                    animation: 'scanline 2s ease-in-out infinite',
                  }}
                />
              )}
              {loading && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[#34C759]" />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-3 px-5 py-5">
          {error && (
            <div className="rounded-2xl px-4 py-3 text-sm text-red-300"
              style={{ background: 'rgba(255,69,58,0.1)', border: '0.5px solid rgba(255,69,58,0.3)' }}>
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)' }}>
            {loading || cameraState === 'starting' ? (
              <div className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-[#34C759] border-t-transparent" />
            ) : (
              <div className={`h-2 w-2 flex-shrink-0 rounded-full ${cameraState === 'scanning' ? 'bg-[#34C759] animate-pulse' : 'bg-white/30'}`} />
            )}
            <span className="text-sm text-white/70">{statusMsg}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button onClick={retryCamera} disabled={loading}
              className="glass-btn rounded-2xl py-3 text-sm font-semibold text-white disabled:opacity-40">
              Reintentar cámara
            </button>
            <button onClick={() => fileRef.current?.click()} disabled={loading}
              className="rounded-2xl py-3 text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: 'linear-gradient(145deg, #1F8FFF, #0A6BE0)', boxShadow: '0 4px 16px rgba(10,132,255,0.35)' }}>
              Foto del código
            </button>
          </div>

          <form onSubmit={submitManual} className="glass rounded-2xl p-2">
            <div className="flex items-center gap-2">
              <input
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                inputMode="numeric"
                autoComplete="off"
                placeholder="Introducir código manualmente"
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-white/30"
              />
              <button type="submit" disabled={loading || normalizeCode(manualCode).length < 6}
                className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-35"
                style={{ background: '#0A84FF' }}>
                Buscar
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes scanline {
          0%, 100% { transform: translateY(-30px); opacity: 0.4; }
          50% { transform: translateY(30px); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
