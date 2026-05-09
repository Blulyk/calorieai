'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'

interface BarcodeProduct {
  name: string; brand: string; portion: string
  calories: number; protein: number; carbs: number; fat: number; fiber: number
  image: string | null; barcode: string
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

      onProduct(data.product)
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

    const url = URL.createObjectURL(file)
    try {
      const reader = readerRef.current ?? new BrowserMultiFormatReader(hints)
      const result = await reader.decodeFromImageUrl(url)
      await lookupCode(result.getText())
    } catch {
      setError('No pude leer ningún código en esa imagen. Prueba con una foto más enfocada o introdúcelo manualmente.')
    } finally {
      URL.revokeObjectURL(url)
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

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#0A0A0B' }}>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
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

          {cameraState === 'blocked' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black px-6 text-center">
              <div>
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl"
                  style={{ background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.2)' }}>
                  <svg className="h-10 w-10 text-red-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6.75a3.75 3.75 0 1 0-7.5 0v3.75m-.75 11.25h9A2.25 2.25 0 0 0 18.75 19.5v-6.75A2.25 2.25 0 0 0 16.5 10.5h-9a2.25 2.25 0 0 0-2.25 2.25v6.75A2.25 2.25 0 0 0 7.5 21.75Z" />
                  </svg>
                </div>
                <p className="text-lg font-bold text-white">Cámara no disponible</p>
                <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-white/50">
                  En Umbrel por HTTP el navegador puede bloquear la cámara. Usa una foto del código o introdúcelo manualmente.
                </p>
              </div>
            </div>
          )}

          {cameraState !== 'blocked' && (
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
          )}
        </div>

        <div className="space-y-3 px-5 py-5 pb-safe">
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
            <button
              onClick={retryCamera}
              disabled={loading}
              className="glass-btn rounded-2xl py-3 text-sm font-semibold text-white disabled:opacity-40"
            >
              Reintentar cámara
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              className="rounded-2xl py-3 text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: 'linear-gradient(145deg, #1F8FFF, #0A6BE0)', boxShadow: '0 4px 16px rgba(10,132,255,0.35)' }}
            >
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
                placeholder="Escribir código manualmente"
                className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-white/32"
              />
              <button
                type="submit"
                disabled={loading || normalizeCode(manualCode).length < 6}
                className="rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-35"
                style={{ background: '#0A84FF' }}
              >
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
