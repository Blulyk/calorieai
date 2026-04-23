'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import CalorieRing from '@/components/CalorieRing'
import MacroBars from '@/components/MacroBars'
import MealCard from '@/components/MealCard'
import WaterTracker from '@/components/WaterTracker'
import WeekChart from '@/components/WeekChart'
import Link from 'next/link'

interface Meal {
  id: string
  name: string | null
  photo_path: string | null
  foods: unknown[]
  calories: number
  protein: number
  carbs: number
  fat: number
  meal_type: string
  notes: string | null
  created_at: number
}

interface DailyStats {
  calories: number
  protein: number
  carbs: number
  fat: number
}

interface Settings {
  calorie_goal: number | null
  gemini_api_key: string | null
}

interface WeekDay {
  date: string
  calories: number
  meal_count: number
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
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  }

  useEffect(() => {
    // Check if first-time setup needed
    fetch('/api/setup').then(r => r.json()).then(d => {
      if (d.needsSetup) { router.replace('/setup'); return }
    })

    const start = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0]
    const end = today

    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch(`/api/meals?date=${today}`).then(r => r.json()),
      fetch(`/api/history?type=week&start=${start}&end=${end}`).then(r => r.json()),
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

  function removeMeal(id: string) {
    const m = meals.find(m => m.id === id)
    setMeals(ms => ms.filter(m => m.id !== id))
    if (m) {
      setStats(s => ({
        calories: Math.max(0, s.calories - m.calories),
        protein:  Math.max(0, s.protein  - m.protein),
        carbs:    Math.max(0, s.carbs    - m.carbs),
        fat:      Math.max(0, s.fat      - m.fat),
      }))
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface-secondary">
      <div className="text-center">
        <div className="w-12 h-12 border-3 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" style={{ borderWidth: 3 }} />
        <p className="text-sm text-ink-tertiary mt-4 font-medium">Loading your day…</p>
      </div>
    </div>
  )

  return (
    <div className="max-w-lg mx-auto">
      {/* Header */}
      <div className="bg-white px-5 pt-safe pb-4 pt-12 sticky top-0 z-10 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink-tertiary font-medium">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
            <h1 className="text-xl font-bold text-ink">{greeting()}, {username} 👋</h1>
          </div>
          <Link href="/profile">
            <div className="w-11 h-11 bg-brand-100 rounded-2xl flex items-center justify-center active:scale-95 transition-transform">
              <span className="text-brand-700 font-bold">{username[0]?.toUpperCase()}</span>
            </div>
          </Link>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">
        {/* API key nudge */}
        {settings && !settings.gemini_api_key && (
          <Link href="/profile">
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 active:bg-amber-100 transition-colors">
              <span className="text-2xl">🔑</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-amber-900 text-sm">Add your Gemini API key</div>
                <div className="text-amber-700 text-xs mt-0.5">Required to analyze food photos → Profile</div>
              </div>
              <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        )}

        {/* Calorie ring */}
        <div className="bg-white rounded-3xl shadow-card p-6 flex flex-col items-center">
          <CalorieRing consumed={stats.calories} goal={goal} size={180} />
          <div className="w-full mt-5 pt-5 border-t border-surface-tertiary">
            <MacroBars
              protein={stats.protein}
              carbs={stats.carbs}
              fat={stats.fat}
            />
          </div>
        </div>

        {/* Week chart */}
        {weekData.length > 1 && (
          <div className="bg-white rounded-3xl shadow-card p-5">
            <h2 className="font-semibold text-ink text-sm uppercase tracking-wide mb-3 text-ink-secondary">This Week</h2>
            <WeekChart data={weekData} goal={goal} />
          </div>
        )}

        {/* Water */}
        <WaterTracker glasses={water} date={today} onChange={setWater} />

        {/* Meals */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-ink text-lg">Today&apos;s Meals</h2>
            <Link href="/log" className="flex items-center gap-1.5 text-sm font-semibold text-brand-600 bg-brand-50 px-3 py-1.5 rounded-xl active:bg-brand-100 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Add meal
            </Link>
          </div>

          {meals.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-card p-8 text-center">
              <div className="text-5xl mb-3">🍽️</div>
              <p className="font-bold text-ink text-lg">No meals yet today</p>
              <p className="text-sm text-ink-secondary mt-1 mb-4">Take a photo to log your first meal</p>
              <Link href="/log">
                <button className="bg-brand-500 text-white font-semibold px-6 py-2.5 rounded-2xl text-sm active:scale-95 transition-transform shadow-card-lg">
                  Log a meal
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
