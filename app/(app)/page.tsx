'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import CalorieRing, { type CalorieSegment } from '@/components/CalorieRing'
import MealCard from '@/components/MealCard'
import WaterTracker from '@/components/WaterTracker'
import WeekChart from '@/components/WeekChart'
import Link from 'next/link'

interface Meal {
  id: string; name: string | null; photo_path: string | null
  foods: unknown[]; calories: number; protein: number; carbs: number
  fat: number; meal_type: string; notes: string | null; created_at: number
}
interface DailyStats { calories: number; protein: number; carbs: number; fat: number }
interface Settings { calorie_goal: number | null; gemini_api_key: string | null }
interface WeekDay { date: string; calories: number; meal_count: number }

function useCountUp(target: number, duration = 700, delay = 0) {
  const [value, setValue] = useState(0)
  const raf = useRef<number>(0)
  useEffect(() => {
    if (target === 0) { setValue(0); return }
    let started = false
    let startTime = 0
    const timeout = setTimeout(() => {
      const step = (ts: number) => {
        if (!started) { started = true; startTime = ts }
        const progress = Math.min((ts - startTime) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(Math.round(eased * target))
        if (progress < 1) raf.current = requestAnimationFrame(step)
      }
      raf.current = requestAnimationFrame(step)
    }, delay)
    return () => { clearTimeout(timeout); cancelAnimationFrame(raf.current) }
  }, [target, duration, delay])
  return value
}

export default function Dashboard() {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]
  const [meals, setMeals]       = useState<Meal[]>([])
  const [stats, setStats]       = useState<DailyStats>({ calories: 0, protein: 0, carbs: 0, fat: 0 })
  const [water, setWater]       = useState(0)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [weekData, setWeekData] = useState<WeekDay[]>([])
  const [username, setUsername] = useState('')
  const [loading, setLoading]   = useState(true)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  useEffect(() => {
    fetch('/api/setup').then(r => r.json()).then(d => { if (d.needsSetup) router.replace('/setup') })
    const start = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0]
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch(`/api/meals?date=${today}`).then(r => r.json()),
      fetch(`/api/history?type=week&start=${start}&end=${today}`).then(r => r.json()),
    ]).then(([me, daily, history]) => {
      setUsername(me.username || '')
      setSettings(me.settings)
      setMeals(daily.meals || [])
      setStats(daily.stats || { calories: 0, protein: 0, carbs: 0, fat: 0 })
      setWater(daily.water || 0)
      setWeekData(history.stats || [])
      setLoading(false)
    })
  }, [today, router])

  const goal = settings?.calorie_goal || 2000

  const segments: CalorieSegment[] = ['breakfast', 'lunch', 'dinner', 'snack']
    .map(type => ({
      mealType: type,
      calories: meals.filter(m => m.meal_type === type).reduce((s, m) => s + m.calories, 0),
    }))
    .filter(s => s.calories > 0)

  function removeMeal(id: string) {
    const m = meals.find(m => m.id === id)
    setMeals(ms => ms.filter(m => m.id !== id))
    if (m) setStats(s => ({
      calories: Math.max(0, s.calories - m.calories),
      protein:  Math.max(0, s.protein  - m.protein),
      carbs:    Math.max(0, s.carbs    - m.carbs),
      fat:      Math.max(0, s.fat      - m.fat),
    }))
  }

  const animatedCal     = useCountUp(Math.round(stats.calories), 800, 100)
  const animatedProtein = useCountUp(Math.round(stats.protein),  600, 200)
  const animatedCarbs   = useCountUp(Math.round(stats.carbs),    600, 280)
  const animatedFat     = useCountUp(Math.round(stats.fat),      600, 360)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto shadow-glow-sm" />
        <p className="text-sm text-zinc-600 mt-4">Cargando…</p>
      </div>
    </div>
  )

  const todayLabel = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase())

  const macros = [
    { label: 'Proteína',      value: animatedProtein, unit: 'g', color: '#3b82f6' },
    { label: 'Carbohidratos', value: animatedCarbs,   unit: 'g', color: '#f59e0b' },
    { label: 'Grasas',        value: animatedFat,     unit: 'g', color: '#ec4899' },
  ]

  return (
    <div className="max-w-lg mx-auto min-h-screen">
      {/* Header */}
      <div className="px-5 pt-12 pb-3 sticky top-0 z-10 header-glass animate-fadeIn">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-600 font-medium uppercase tracking-widest">
              {greeting()}, {username}
            </p>
          </div>
          <Link href="/profile">
            <div className="w-9 h-9 bg-white/5 border border-white/8 rounded-2xl flex items-center justify-center active:scale-90 transition-transform">
              <span className="text-zinc-400 font-bold text-sm">{username[0]?.toUpperCase()}</span>
            </div>
          </Link>
        </div>

        {/* Hero calorie number */}
        <div className="mt-3 mb-1">
          <p className="text-sm text-zinc-600 font-medium">{todayLabel}</p>
          <div className="flex items-baseline gap-3 mt-0.5">
            <span className="text-5xl font-bold text-white tabular-nums leading-none tracking-tight">
              {animatedCal.toLocaleString('es-ES')}
            </span>
            <span className="text-lg text-zinc-600 font-medium">kcal</span>
          </div>
          <p className="text-xs text-zinc-700 mt-1">de {goal} kcal objetivo</p>
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* API key nudge */}
        {settings && !settings.gemini_api_key && (
          <Link href="/profile">
            <div className="animate-fadeInUp bg-amber-500/8 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 active:opacity-80 transition-opacity"
              style={{ animationDelay: '0.05s' }}>
              <div className="w-9 h-9 bg-amber-500/15 rounded-xl flex items-center justify-center flex-shrink-0">
                <span className="text-lg">🔑</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-amber-400 text-sm">Añade tu API key de Gemini</div>
                <div className="text-amber-600 text-xs mt-0.5">Necesaria para analizar fotos → Perfil</div>
              </div>
              <svg className="w-4 h-4 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        )}

        {/* Calorie ring */}
        <div className="animate-fadeInScale rounded-3xl p-5 flex flex-col items-center"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.07)',
            animationDelay: '0.1s',
          }}>
          <CalorieRing segments={segments} goal={goal} />
        </div>

        {/* Macro stat cards */}
        <div className="grid grid-cols-3 gap-3">
          {macros.map(({ label, value, unit, color }, i) => (
            <div
              key={label}
              className="animate-fadeInUp rounded-2xl px-3 py-3.5 flex flex-col gap-1"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.07)',
                animationDelay: `${0.18 + i * 0.07}s`,
              }}
            >
              <span className="text-[10px] text-zinc-600 font-medium uppercase tracking-wide leading-none">{label}</span>
              <span className="text-xl font-bold tabular-nums leading-none" style={{ color }}>
                {value}{unit}
              </span>
            </div>
          ))}
        </div>

        {/* Week chart */}
        {weekData.length > 1 && (
          <div className="glass rounded-3xl p-5 animate-fadeInUp" style={{ animationDelay: '0.32s' }}>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Esta semana</p>
            <WeekChart data={weekData} goal={goal} />
          </div>
        )}

        {/* Water */}
        <div className="animate-fadeInUp" style={{ animationDelay: '0.38s' }}>
          <WaterTracker glasses={water} date={today} onChange={setWater} />
        </div>

        {/* Meals */}
        <div className="animate-fadeInUp" style={{ animationDelay: '0.44s' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-zinc-100 text-lg">Comidas de hoy</h2>
            <Link href="/log" className="flex items-center gap-1.5 text-xs font-semibold text-brand-400 px-3 py-1.5 rounded-xl active:scale-95 transition-all glass-btn">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Añadir comida
            </Link>
          </div>

          {meals.length === 0 ? (
            <div className="glass rounded-3xl p-8 text-center">
              <div className="text-5xl mb-3">🍽️</div>
              <p className="font-bold text-zinc-200 text-lg">Sin comidas hoy</p>
              <p className="text-sm text-zinc-600 mt-1 mb-5">Haz una foto para registrar tu primera comida</p>
              <Link href="/log">
                <button className="bg-brand-500 text-white font-semibold px-6 py-2.5 rounded-2xl text-sm active:scale-95 transition-transform shadow-glow">
                  Registrar comida
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {meals.map((m, i) => (
                <MealCard
                  key={m.id}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  meal={m as any}
                  onDelete={removeMeal}
                  index={i}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
