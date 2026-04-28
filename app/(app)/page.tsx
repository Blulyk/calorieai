'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CalorieRing, { type CalorieSegment } from '@/components/CalorieRing'
import MealCard from '@/components/MealCard'
import WaterTracker from '@/components/WaterTracker'
import WeekChart from '@/components/WeekChart'

interface Meal {
  id: string; name: string | null; photo_path: string | null
  foods: unknown[]; calories: number; protein: number; carbs: number
  fat: number; meal_type: string; notes: string | null; created_at: number
}
interface DailyStats { calories: number; protein: number; carbs: number; fat: number }
interface Settings { calorie_goal: number | null; gemini_api_key: string | null }
interface WeekDay { date: string; calories: number; meal_count: number; water_ml: number; water_glasses: number }

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
  const [meals, setMeals] = useState<Meal[]>([])
  const [stats, setStats] = useState<DailyStats>({ calories: 0, protein: 0, carbs: 0, fat: 0 })
  const [water, setWater] = useState(0)
  const [settings, setSettings] = useState<Settings | null>(null)
  const [weekData, setWeekData] = useState<WeekDay[]>([])
  const [username, setUsername] = useState('')
  const [loading, setLoading] = useState(true)

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
  const remaining = Math.round(goal - stats.calories)
  const percent = Math.min(100, Math.round((stats.calories / goal) * 100))
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
      protein: Math.max(0, s.protein - m.protein),
      carbs: Math.max(0, s.carbs - m.carbs),
      fat: Math.max(0, s.fat - m.fat),
    }))
  }

  const animatedCal = useCountUp(Math.round(stats.calories), 800, 100)
  const animatedProtein = useCountUp(Math.round(stats.protein), 600, 200)
  const animatedCarbs = useCountUp(Math.round(stats.carbs), 600, 280)
  const animatedFat = useCountUp(Math.round(stats.fat), 600, 360)

  if (loading) return (
    <div className="liquid-page flex min-h-screen items-center justify-center">
      <div className="glass-strong rounded-[2rem] px-8 py-7 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-white/30 border-t-brand-400" />
        <p className="mt-4 text-sm font-medium text-zinc-300/70">Cargando tu día</p>
      </div>
    </div>
  )

  const monthLabel = new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
    .replace(/^\w/, c => c.toUpperCase())

  const macros = [
    { label: 'Proteína', value: animatedProtein, unit: 'g', color: '#93c5fd', bg: 'rgba(59,130,246,0.16)' },
    { label: 'Carbos', value: animatedCarbs, unit: 'g', color: '#fdba74', bg: 'rgba(249,115,22,0.16)' },
    { label: 'Grasas', value: animatedFat, unit: 'g', color: '#fda4af', bg: 'rgba(244,63,94,0.16)' },
  ]

  return (
    <div className="liquid-page mx-auto min-h-screen max-w-lg pb-8">
      <div className="sticky top-0 z-10 px-5 pt-11 pb-3 header-glass">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/38">{greeting()}</p>
            <p className="mt-1 text-sm font-semibold text-white/82">@{username}</p>
          </div>
          <Link href="/profile" className="glass-pill flex h-11 w-11 items-center justify-center rounded-2xl text-base font-bold text-white">
            {username[0]?.toUpperCase()}
          </Link>
        </div>
      </div>

      <main className="space-y-4 px-4 pt-3">
        <section className="text-center">
          <p className="text-sm font-medium text-white/40">{monthLabel}</p>
          <div className="mt-1 flex items-baseline justify-center gap-2">
            <span className="max-w-full text-[4.15rem] font-bold leading-none tracking-normal text-white/90 tabular-nums">
              {animatedCal.toLocaleString('es-ES')}
            </span>
            <span className="text-lg font-semibold text-white/38">kcal</span>
          </div>
          <p className={`text-sm font-semibold ${remaining < 0 ? 'text-red-200' : 'text-white/50'}`}>
            {remaining < 0 ? `${Math.abs(remaining)} kcal por encima` : `${remaining} kcal restantes`}
          </p>
        </section>

        <section className="glass-strong liquid-card specular p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Balance diario</p>
              <p className="mt-1 text-sm text-white/62">Objetivo {goal} kcal</p>
            </div>
            <div className="glass-pill rounded-full px-3 py-1.5 text-sm font-bold text-white">
              {percent}%
            </div>
          </div>
          <CalorieRing segments={segments} goal={goal} />
        </section>

        {!settings?.gemini_api_key && (
          <Link href="/profile" className="glass flex items-center gap-3 rounded-[1.7rem] p-4">
            <div className="glass-pill flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold text-amber-100">AI</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-amber-100">Añade tu API key de Gemini</p>
              <p className="mt-0.5 text-xs text-amber-100/55">Necesaria para analizar fotos</p>
            </div>
            <span className="text-lg text-amber-100/70">›</span>
          </Link>
        )}

        <section className="grid grid-cols-3 gap-3">
          {macros.map((m, i) => (
            <div key={m.label} className="glass rounded-[1.4rem] p-3.5 animate-fadeInUp" style={{ animationDelay: `${0.08 + i * 0.06}s` }}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/38">{m.label}</p>
              <p className="mt-2 text-2xl font-bold leading-none tabular-nums" style={{ color: m.color }}>{m.value}{m.unit}</p>
              <div className="mt-3 h-1.5 rounded-full bg-white/8">
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, m.value)}%`, background: m.color, boxShadow: `0 0 14px ${m.color}` }} />
              </div>
            </div>
          ))}
        </section>

        {weekData.length > 1 && (
          <section className="glass liquid-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Semana</p>
              <Link href="/history" className="text-xs font-semibold text-brand-200">Ver historial</Link>
            </div>
            <WeekChart data={weekData} goal={goal} />
          </section>
        )}

        <WaterTracker glasses={water} date={today} onChange={setWater} />

        <section>
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-white">Comidas de hoy</h2>
            <Link href="/log" className="glass-btn rounded-full px-3 py-2 text-xs font-bold text-white">Añadir</Link>
          </div>

          {meals.length === 0 ? (
            <div className="glass liquid-card p-8 text-center">
              <p className="text-xl font-bold text-white">Sin comidas hoy</p>
              <p className="mx-auto mt-2 max-w-[260px] text-sm text-white/46">Haz una foto y deja que la IA estime calorías y macros.</p>
              <Link href="/log" className="mt-5 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-bold text-white">
                Registrar comida
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {meals.map((m, i) => (
                <MealCard key={m.id} meal={m as never} onDelete={removeMeal} index={i} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
