'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

interface FoodItem {
  name: string
  portion: string
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

interface AnalysisResult {
  foods: FoodItem[]
  total_calories: number
  total_protein: number
  total_carbs: number
  total_fat: number
  confidence: string
  notes: string
}

const MEAL_TYPES: { value: MealType; label: string; icon: string }[] = [
  { value: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { value: 'lunch',     label: 'Lunch',     icon: '☀️' },
  { value: 'dinner',    label: 'Dinner',    icon: '🌙' },
  { value: 'snack',     label: 'Snack',     icon: '🍎' },
]

function guessCurrentMeal(): MealType {
  const h = new Date().getHours()
  if (h < 10) return 'breakfast'
  if (h < 14) return 'lunch'
  if (h < 20) return 'dinner'
  return 'snack'
}

export default function LogPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [mealType, setMealType] = useState<MealType>(guessCurrentMeal())
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleFile = useCallback((f: File) => {
    if (!f.type.startsWith('image/')) { setError('Please select an image file'); return }
    setFile(f)
    setResult(null)
    setError('')
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result as string)
    reader.readAsDataURL(f)
  }, [])

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) handleFile(f)
  }

  async function analyze() {
    if (!file) return
    setAnalyzing(true)
    setError('')
    try {
      const form = new FormData()
      form.append('image', file)
      form.append('meal_type', mealType)
      const res = await fetch('/api/analyze', { method: 'POST', body: form })
      const text = await res.text()
      if (!text) { setError('Server error — check your API key in Profile'); setAnalyzing(false); return }
      const data = JSON.parse(text)
      setAnalyzing(false)
      if (!res.ok) { setError(data.error || 'Analysis failed'); return }
      setResult(data.analysis)
    } catch (e: unknown) {
      setAnalyzing(false)
      setError(e instanceof Error ? e.message : 'Analysis failed')
    }
  }

  async function save() {
    if (!file || !result) return
    setSaving(true)
    const form = new FormData()
    form.append('image', file)
    form.append('meal_type', mealType)
    const res = await fetch('/api/analyze', { method: 'POST', body: form })
    if (res.ok) router.replace('/')
    else { setSaving(false); setError('Failed to save') }
  }

  const CONFIDENCE_COLOR: Record<string, string> = {
    high: 'text-brand-600 bg-brand-50',
    medium: 'text-amber-600 bg-amber-50',
    low: 'text-red-600 bg-red-50',
  }

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-white px-5 pt-12 pb-4 sticky top-0 z-10 shadow-card flex items-center gap-3">
        <button onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-surface-tertiary flex items-center justify-center active:scale-95">
          <svg className="w-5 h-5 text-ink" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-ink">Log a Meal</h1>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* Meal type */}
        <div className="flex gap-2 overflow-x-auto scrollbar-none pb-1">
          {MEAL_TYPES.map(t => (
            <button
              key={t.value}
              onClick={() => setMealType(t.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-2xl text-sm font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                mealType === t.value
                  ? 'bg-brand-500 text-white shadow-card-lg'
                  : 'bg-white text-ink-secondary shadow-card'
              }`}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        {/* Upload area */}
        {!preview ? (
          <div className="bg-white rounded-3xl shadow-card p-8">
            <div
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed border-surface-tertiary rounded-2xl p-8 text-center cursor-pointer hover:border-brand-300 transition-colors active:bg-brand-50"
            >
              <div className="w-16 h-16 bg-brand-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-brand-400" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <p className="font-semibold text-ink">Upload a food photo</p>
              <p className="text-sm text-ink-secondary mt-1">Tap to choose from gallery</p>
            </div>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-surface-tertiary" />
              <span className="text-xs text-ink-tertiary font-medium">OR</span>
              <div className="flex-1 h-px bg-surface-tertiary" />
            </div>

            <button
              onClick={() => cameraRef.current?.click()}
              className="w-full bg-brand-500 text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-card-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
              </svg>
              Take a photo
            </button>

            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFileChange} />
          </div>
        ) : (
          <>
            {/* Photo preview */}
            <div className="relative w-full aspect-[4/3] rounded-3xl overflow-hidden shadow-card-lg">
              <Image src={preview} alt="Food preview" fill className="object-cover" />
              <button
                onClick={() => { setPreview(null); setFile(null); setResult(null) }}
                className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center"
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
                className="w-full bg-brand-500 text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-card-lg disabled:opacity-70"
              >
                {analyzing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Analyzing with Gemini AI…
                  </>
                ) : (
                  <>
                    <span className="text-lg">🤖</span>
                    Analyze food
                  </>
                )}
              </button>
            )}

            {/* Analysis result */}
            {result && (
              <div className="bg-white rounded-3xl shadow-card overflow-hidden animate-slide-up">
                <div className="bg-brand-500 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-white font-bold text-lg">AI Analysis</h2>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${CONFIDENCE_COLOR[result.confidence] || 'text-ink bg-white'}`}>
                      {result.confidence} confidence
                    </span>
                  </div>
                  <div className="flex gap-4 mt-3">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-white">{Math.round(result.total_calories)}</div>
                      <div className="text-white/70 text-xs">kcal</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">{Math.round(result.total_protein)}g</div>
                      <div className="text-white/70 text-xs">protein</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">{Math.round(result.total_carbs)}g</div>
                      <div className="text-white/70 text-xs">carbs</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-white">{Math.round(result.total_fat)}g</div>
                      <div className="text-white/70 text-xs">fat</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-2">
                  {result.foods.map((f, i) => (
                    <div key={i} className="flex justify-between items-start py-2 border-b border-surface-tertiary last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-ink text-sm">{f.name}</div>
                        <div className="text-xs text-ink-secondary mt-0.5">{f.portion}</div>
                        <div className="flex gap-2 mt-1">
                          <span className="text-xs text-indigo-600 font-medium">P {f.protein}g</span>
                          <span className="text-xs text-amber-600 font-medium">C {f.carbs}g</span>
                          <span className="text-xs text-red-500 font-medium">F {f.fat}g</span>
                        </div>
                      </div>
                      <div className="text-sm font-bold text-ink ml-3">{f.calories} kcal</div>
                    </div>
                  ))}

                  {result.notes && (
                    <p className="text-xs text-ink-secondary italic pt-1">{result.notes}</p>
                  )}
                </div>

                <div className="p-4 pt-0 flex gap-3">
                  <button
                    onClick={() => { setResult(null); setPreview(null); setFile(null) }}
                    className="flex-1 py-3 rounded-2xl border border-surface-tertiary text-ink-secondary font-semibold text-sm active:scale-95 transition-transform"
                  >
                    Retake
                  </button>
                  <button
                    onClick={save}
                    disabled={saving}
                    className="flex-1 py-3 rounded-2xl bg-brand-500 text-white font-semibold text-sm active:scale-95 transition-transform shadow-card-lg disabled:opacity-70"
                  >
                    {saving ? 'Saving…' : 'Save meal ✓'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
