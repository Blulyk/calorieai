'use client'

import { useEffect, useState } from 'react'
import MealCard from '@/components/MealCard'
import { formatDate } from '@/lib/nutrition'
import Link from 'next/link'

interface DayData { date: string; calories: number; meal_count: number }
interface Meal {
  id: string; name: string | null; photo_path: string | null; foods: unknown[]
  calories: number; protein: number; carbs: number; fat: number
  meal_type: string; notes: string | null; created_at: number
}

function getDays(n = 30) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i)
    return d.toISOString().split('T')[0]
  })
}

export default function HistoryPage() {
  const [calGoal,      setCalGoal]      = useState(2000)
  const [stats,        setStats]        = useState<DayData[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayMeals,     setDayMeals]     = useState<Meal[]>([])
  const [loadingMeals, setLoadingMeals] = useState(false)
  const [loading,      setLoading]      = useState(true)

  const days = getDays(30)

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch(`/api/history?type=week&start=${days[29]}&end=${days[0]}`).then(r => r.json()),
    ]).then(([me, hist]) => {
      setCalGoal(me.settings?.calorie_goal || 2000)
      setStats(hist.stats || [])
      setLoading(false)
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function selectDate(date: string) {
    if (selectedDate === date) { setSelectedDate(null); return }
    setSelectedDate(date); setLoadingMeals(true)
    const res = await fetch(`/api/meals?date=${date}`)
    const data = await res.json()
    setDayMeals(data.meals || [])
    setLoadingMeals(false)
  }

  const statsMap = Object.fromEntries(stats.map(s => [s.date, s]))

  if (loading) return (
    <div className="min-h-screen bg-dark-base flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="max-w-lg mx-auto bg-dark-base min-h-screen">
      <div className="px-5 pt-12 pb-4 sticky top-0 z-10" style={{ background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #111' }}>
        <h1 className="text-2xl font-bold text-zinc-100">History</h1>
        <p className="text-xs text-zinc-600 mt-0.5 uppercase tracking-widest">Last 30 days</p>
      </div>

      <div className="px-4 py-4 space-y-2">
        {days.map(date => {
          const s = statsMap[date]
          const hasMeals = s?.meal_count > 0
          const isSelected = selectedDate === date
          const isToday = date === new Date().toISOString().split('T')[0]
          const pct = s ? Math.min(100, (s.calories / calGoal) * 100) : 0
          const over = s ? s.calories > calGoal : false

          return (
            <div key={date}>
              <button
                onClick={() => selectDate(date)}
                className={`w-full text-left bg-dark-surface border rounded-2xl px-4 py-3.5 transition-all active:scale-[0.98] ${
                  isSelected ? 'border-brand-500/30 bg-brand-500/5' : 'border-dark-border'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm ${
                    isToday ? 'bg-brand-500 text-white shadow-glow-sm'
                    : hasMeals ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
                    : 'bg-dark-elevated text-zinc-700'
                  }`}>
                    {new Date(date + 'T00:00:00').getDate()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <span className={`text-sm font-semibold ${isToday ? 'text-brand-400' : 'text-zinc-200'}`}>
                        {isToday ? 'Today' : formatDate(date)}
                      </span>
                      {hasMeals && (
                        <span className={`text-sm font-bold tabular-nums ${over ? 'text-red-400' : 'text-zinc-300'}`}>
                          {Math.round(s.calories)} kcal
                        </span>
                      )}
                    </div>
                    {hasMeals ? (
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="flex-1 h-1 bg-dark-elevated rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: over ? '#ef4444' : '#22c55e', boxShadow: over ? '0 0 4px #ef444440' : '0 0 4px #22c55e40' }}
                          />
                        </div>
                        <span className="text-xs text-zinc-700">{s.meal_count} meal{s.meal_count !== 1 ? 's' : ''}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-700 mt-0.5">No meals logged</span>
                    )}
                  </div>

                  <svg className={`w-4 h-4 text-zinc-700 transition-transform ${isSelected ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {isSelected && (
                <div className="mt-2 space-y-2 animate-slide-up pl-2">
                  {loadingMeals ? (
                    <div className="bg-dark-surface border border-dark-border rounded-2xl p-4 flex justify-center">
                      <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : dayMeals.length === 0 ? (
                    <div className="bg-dark-surface border border-dark-border rounded-2xl p-4 text-center">
                      <p className="text-sm text-zinc-600">No meals on this day</p>
                      {isToday && (
                        <Link href="/log"><button className="mt-2 text-sm font-semibold text-brand-500">Log a meal →</button></Link>
                      )}
                    </div>
                  ) : (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    dayMeals.map(m => <MealCard key={m.id} meal={m as any} />)
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
