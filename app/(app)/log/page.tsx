'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

interface FoodItem {
  name: string; portion: string; calories: number
  protein: number; carbs: number; fat: number; fiber: number
}
interface AnalysisResult {
  foods: FoodItem[]; total_calories: number; total_protein: number
  total_carbs: number; total_fat: number; confidence: string; notes: string
  model_used?: string; fallback_used?: boolean
}
interface AnalyzeErrorResponse {
  error?: string
  code?: number
  retryable?: boolean
  retry_after_seconds?: number | null
}

const MEAL_TYPES: { value: MealType; label: string; icon: string }[] = [
  { value: 'breakfast', label: 'Desayuno', icon: '🌅' },
  { value: 'lunch',     label: 'Almuerzo',     icon: '☀️'  },
  { value: 'dinner',    label: 'Cena',    icon: '🌙'  },
  { value: 'snack',     label: 'Tentempié',     icon: '🍎'  },
]

const MODEL_LABELS: Record<string, string> = {
  'gemini-2.5-flash-lite': 'Gemini 2.5 Flash-Lite',
  'gemini-2.5-flash': 'Gemini 2.5 Flash',
  'gemini-2.0-flash': 'Gemini 2.0 Flash',
}

function guessCurrentMeal(): MealType {
  const h = new Date().getHours()
  if (h >= 5 && h < 11) return 'breakfast'
  if (h >= 11 && h < 16) return 'lunch'
  if (h >= 16 && h < 20) return 'snack'
  if (h >= 20 && h < 24) return 'dinner'
  return 'snack'
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function retryDelay(attempt: number, retryAfterSeconds?: number | null) {
  if (retryAfterSeconds && retryAfterSeconds > 0) return Math.min(retryAfterSeconds * 1000, 30000)
  return Math.min(4000 + attempt * 2000, 18000)
}

function modelLabel(model?: string) {
  if (!model) return 'Gemini'
  return MODEL_LABELS[model] || model
}

export default function LogPage() {
  const router = useRouter()
  const fileRef   = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const analyzeRunRef = useRef(0)

  const [preview,  setPreview]  = useState<string | null>(null)
  const [file,     setFile]     = useState<File | null>(null)
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [analyzing, setAnalyzing] = useState(false)
  const [result,   setResult]   = useState<AnalysisResult | null>(null)
  const [error,    setError]    = useState('')
  const [analysisStatus, setAnalysisStatus] = useState('')
  const [retryCount, setRetryCount] = useState(0)
  const [saving,   setSaving]   = useState(false)

  useEffect(() => {
    setMealType(guessCurrentMeal())
  }, [])

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) { setError('Selecciona una imagen'); return }
    analyzeRunRef.current += 1
    setFile(f); setResult(null); setError('')
    setAnalysisStatus(''); setRetryCount(0)
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result as string)
    reader.readAsDataURL(f)
  }, [])

  async function analyze() {
    if (!file) return
    const runId = analyzeRunRef.current + 1
    analyzeRunRef.current = runId
    setAnalyzing(true); setError(''); setAnalysisStatus('Analizando la foto con Gemini...'); setRetryCount(0)
    let attempt = 0
    try {
      while (analyzeRunRef.current === runId) {
        attempt += 1
        const form = new FormData()
        form.append('image', file)
        const res  = await fetch('/api/analyze', { method: 'POST', body: form })
        const data = await res.json()

        if (res.ok) {
          setResult(data.analysis)
          setAnalysisStatus('')
          return
        }

        const apiError = data as AnalyzeErrorResponse
        if (apiError.retryable && apiError.code === 503) {
          setRetryCount(attempt)
          setAnalysisStatus(`Mucha demanda en Gemini. Reintentando automaticamente... intento ${attempt + 1}`)
          await wait(retryDelay(attempt, apiError.retry_after_seconds))
          continue
        }

        setError(apiError.error || 'Analisis fallido')
        setAnalysisStatus('')
        return
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Analisis fallido')
      setAnalysisStatus('')
    } finally {
      if (analyzeRunRef.current === runId) setAnalyzing(false)
    }
  }

  async function analyzeOnce() {
    if (!file) return
    setAnalyzing(true); setError('')
    try {
      const form = new FormData()
      form.append('image', file)
      const res  = await fetch('/api/analyze', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Análisis fallido'); setAnalyzing(false); return }
      setResult(data.analysis)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Análisis fallido')
    } finally {
      setAnalyzing(false)
    }
  }

  async function save() {
    if (!file || !result) return
    setSaving(true); setError('')
    try {
      const form = new FormData()
      form.append('image', file)
      form.append('meal_type', mealType)
      form.append('analysis', JSON.stringify(result))
      const res = await fetch('/api/meals', { method: 'POST', body: form })
      if (res.ok) router.replace('/')
      else { const d = await res.json(); setError(d.error || 'Error al guardar') }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  const CONF_STYLE: Record<string, string> = {
    high:   'text-brand-400 bg-brand-500/10 border-brand-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    low:    'text-red-400   bg-red-500/10   border-red-500/20',
  }

  return (
    <div className="liquid-page max-w-lg mx-auto min-h-screen">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 sticky top-0 z-10 flex items-center gap-3 header-glass">
        <button onClick={() => router.back()} className="glass-btn w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform">
          <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-zinc-100">Registrar comida</h1>

      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Meal type */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {MEAL_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setMealType(t.value)}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 border ${
                mealType === t.value
                  ? 'bg-brand-500/15 border-brand-500/30 text-brand-400 shadow-glow-sm'
                  : 'glass-btn text-zinc-500'
              }`}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Upload area */}
        {!preview ? (
          <div className="glass rounded-3xl p-6">
            <div
              onClick={() => fileRef.current?.click()}
              className="rounded-2xl p-8 text-center cursor-pointer active:scale-[0.99] transition-all"
              style={{ border: '1.5px dashed rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)' }}
            >
              <div className="w-16 h-16 bg-brand-500/10 border border-brand-500/20 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand-500/60" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <p className="font-semibold text-zinc-300">Subir foto de comida</p>
              <p className="text-sm text-zinc-600 mt-1">Toca para elegir de la galería</p>
            </div>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-xs text-zinc-700 font-medium">O</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            <button
              onClick={() => cameraRef.current?.click()}
              className="w-full bg-brand-500 text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-glow"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
              Hacer foto
            </button>

            <input ref={fileRef}   type="file" accept="image/*"             className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} />

            <button
              onClick={() => router.push('/recetario')}
              className="mt-3 w-full py-3.5 rounded-2xl flex items-center justify-center gap-2 text-brand-400 font-semibold text-sm active:scale-95 transition-transform border border-brand-500/25"
              style={{ background: 'rgba(249,115,22,0.06)' }}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              Añadir del recetario
            </button>
          </div>
        ) : (
          <>
            <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.10)' }}>
              <Image src={preview} alt="Food preview" fill className="object-cover" />
              <button
                onClick={() => { setPreview(null); setFile(null); setResult(null) }}
                className="absolute top-3 right-3 w-8 h-8 bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {!result && (
              <button
                onClick={analyze}
                disabled={analyzing}
                className="w-full bg-brand-500 text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-glow disabled:opacity-60"
              >
                {analyzing ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Analizando con IA…</>
                ) : (
                  <><span className="text-lg">🤖</span> Analizar comida</>
                )}
              </button>
            )}

            {analyzing && analysisStatus && (
              <div className="glass rounded-2xl px-4 py-3 text-sm font-medium text-sky-100">
                <div className="flex items-start gap-3">
                  <div className="mt-1 h-2 w-2 flex-shrink-0 animate-pulse rounded-full bg-sky-400" />
                  <p>{analysisStatus}</p>
                </div>
              </div>
            )}

            {result && (
              <div className="glass rounded-3xl overflow-hidden animate-slide-up">
                {/* Result header */}
                <div className="p-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', background: 'linear-gradient(135deg, rgba(249,115,22,0.09), rgba(249,115,22,0.03))' }}>
                  <div className="flex items-center justify-between mb-4 gap-3">
                    <h2 className="text-zinc-100 font-bold text-lg">Análisis IA</h2>
                    {result.model_used && (
                      <p className={`min-w-0 flex-1 text-xs font-medium ${result.fallback_used ? 'text-sky-300' : 'text-zinc-500'}`}>
                        {result.fallback_used
                          ? `Modelo alternativo usado: ${modelLabel(result.model_used)}`
                          : `Modelo usado: ${modelLabel(result.model_used)}`}
                      </p>
                    )}
                    <span className={`flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-lg border ${CONF_STYLE[result.confidence] || 'text-zinc-400 glass-pill'}`}>
                      {result.confidence === 'high' ? 'alta' : result.confidence === 'medium' ? 'media' : 'baja'} confianza
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: 'Calorías', value: Math.round(result.total_calories), unit: 'kcal', highlight: true },
                      { label: 'Proteína',  value: Math.round(result.total_protein),  unit: 'g' },
                      { label: 'Carbos',    value: Math.round(result.total_carbs),    unit: 'g' },
                      { label: 'Grasas',      value: Math.round(result.total_fat),      unit: 'g' },
                    ].map(s => (
                      <div key={s.label} className="text-center">
                        <div className={`text-xl font-bold ${s.highlight ? 'text-brand-400' : 'text-zinc-200'}`}>{s.value}</div>
                        <div className="text-xs text-zinc-600">{s.unit}</div>
                        <div className="text-xs text-zinc-700 mt-0.5">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Food items */}
                <div className="p-4 space-y-2">
                  {result.foods.map((f, i) => (
                    <div key={i} className="flex justify-between items-start py-2.5 last:border-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-zinc-200 text-sm">{f.name}</div>
                        <div className="text-xs text-zinc-600 mt-0.5">{f.portion}</div>
                        <div className="flex gap-2 mt-1.5">
                          <span className="text-xs text-indigo-400 font-medium">P {f.protein}g</span>
                          <span className="text-xs text-orange-400 font-medium">C {f.carbs}g</span>
                          <span className="text-xs text-red-400 font-medium">F {f.fat}g</span>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-zinc-300 ml-3">{f.calories} kcal</div>
                    </div>
                  ))}
                  {result.notes && <p className="text-xs text-zinc-600 italic pt-1">{result.notes}</p>}
                </div>

                <div className="p-4 pt-0 flex gap-3">
                  <button
                    onClick={() => { setResult(null); setPreview(null); setFile(null) }}
                    className="glass-btn flex-1 py-3 rounded-2xl text-zinc-300 font-semibold text-sm active:scale-95 transition-transform"
                  >
                    Repetir
                  </button>
                  <button
                    onClick={save}
                    disabled={saving}
                    className="flex-1 py-3 rounded-2xl bg-brand-500 text-white font-semibold text-sm active:scale-95 transition-transform shadow-glow disabled:opacity-60"
                  >
                    {saving ? 'Guardando…' : '✓ Guardar comida'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-2xl px-4 py-3">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
