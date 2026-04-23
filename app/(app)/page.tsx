'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import CalorieRing, { type CalorieSegment } from '@/components/CalorieRing'
import MacroBars from '@/components/MacroBars'
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

  if (loading) return (
    <div className="min-h-screen bg-dark-base flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto shadow-glow-sm" />
        <p className="text-sm text-zinc-600 mt-4">Cargando…</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto min-h-screen">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 sticky top-0 z-10 header-glass">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-600 font-medium uppercase tracking-widest">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-xl font-bold text-zinc-100 mt-0.5">{greeting()}, {username} 👋</h1>
          </div>
          <Link href="/profile">
            <div className="w-10 h-10 bg-brand-500/10 border border-brand-500/20 rounded-2xl flex items-center justify-center active:scale-90 transition-transform">
              <span className="text-brand-400 font-bold text-sm">{username[0]?.toUpperCase()}</span>
            </div>
          </Link>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* API key nudge */}
        {settings && !settings.gemini_api_key && (
          <Link href="/profile">
            <div className="bg-amber-500/8 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3 active:opacity-80 transition-opacity">
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
        <div className="glass-strong rounded-3xl p-6 flex flex-col items-center">
          <CalorieRing segments={segments} goal={goal} />
          <div className="w-full mt-5 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <MacroBars protein={stats.protein} carbs={stats.carbs} fat={stats.fat} />
          </div>
        </div>

        {/* Week chart */}
        {weekData.length > 1 && (
          <div className="glass rounded-3xl p-5">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Esta semana</p>
            <WeekChart data={weekData} goal={goal} />
          </div>
        )}

        {/* Water */}
        <WaterTracker glasses={water} date={today} onChange={setWater} />

        {/* Meals */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-zinc-100 text-lg">Comidas de hoy</h2>
            <Link href="/log" className="flex items-center gap-1.5 text-xs font-semibold text-brand-400 bg-brand-500/10 border border-brand-500/20 px-3 py-1.5 rounded-xl active:opacity-70 transition-opacity">
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
              {meals.map(m => (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                <MealCard key={m.id} meal={m as any} onDelete={removeMeal} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
