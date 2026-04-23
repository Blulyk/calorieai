'use client'

import { useEffect, useState } from 'react'
import MealCard from '@/components/MealCard'
import Link from 'next/link'

interface DayData { date: string; calories: number; meal_count: number }
interface Meal {
  id: string; name: string | null; photo_path: string | null; foods: unknown[]
  calories: number; protein: number; carbs: number; fat: number
  meal_type: string; notes: string | null; created_at: number
}

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function getDaysInMonth(year: number, month: number) {
  const days: string[] = []
  const total = new Date(year, month + 1, 0).getDate()
  for (let i = total; i >= 1; i--) {
    const dt = new Date(year, month, i)
    days.push(dt.toISOString().split('T')[0])
  }
  return days
}

export default function HistoryPage() {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [calGoal, setCalGoal]           = useState(2000)
  const [stats, setStats]               = useState<DayData[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [dayMeals, setDayMeals]         = useState<Meal[]>([])
  const [loadingMeals, setLoadingMeals] = useState(false)
  const [loading, setLoading]           = useState(true)

  const days = getDaysInMonth(year, month)
  const startDate = days[days.length - 1]
  const endDate   = days[0]

  useEffect(() => {
    setLoading(true); setSelectedDate(null)
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch(`/api/history?type=week&start=${startDate}&end=${endDate}`).then(r => r.json()),
    ]).then(([me, hist]) => {
      setCalGoal(me.settings?.calorie_goal || 2000)
      setStats(hist.stats || [])
      setLoading(false)
    })
  }, [year, month, startDate, endDate])

  async function selectDate(date: string) {
    if (selectedDate === date) { setSelectedDate(null); return }
    setSelectedDate(date); setLoadingMeals(true)
    const res = await fetch(`/api/meals?date=${date}`)
    const data = await res.json()
    setDayMeals(data.meals || [])
    setLoadingMeals(false)
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (year === now.getFullYear() && month === now.getMonth()) return
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
  const statsMap = Object.fromEntries(stats.map(s => [s.date, s]))
  const today = now.toISOString().split('T')[0]

  return (
    <div className="max-w-lg mx-auto min-h-screen">
      <div className="px-5 pt-12 pb-4 sticky top-0 z-10 header-glass">
        <h1 className="text-2xl font-bold text-zinc-100 mb-3">Historial</h1>
        <div className="flex items-center justify-between">
          <button onClick={prevMonth} className="w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <svg className="w-5 h-5 text-zinc-300" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="text-center">
            <p className="font-bold text-zinc-100 text-lg">{MESES[month]}</p>
            <p className="text-xs text-zinc-500">{year}</p>
          </div>
          <button onClick={nextMonth} disabled={isCurrentMonth} className={`w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform ${isCurrentMonth ? 'opacity-30' : ''}`} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}>
            <svg className="w-5 h-5 text-zinc-300" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="px-4 py-4 space-y-2">
          {days.map(date => {
            const s = statsMap[date]
            const hasMeals = (s?.meal_count ?? 0) > 0
            const isSelected = selectedDate === date
            const isToday = date === today
            const pct = s ? Math.min(100, (s.calories / calGoal) * 100) : 0
            const over = s ? s.calories > calGoal : false
            const dayNum = new Date(date + 'T00:00:00').getDate()
            const dayName = new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short' })

            return (
              <div key={date}>
                <button onClick={() => selectDate(date)} className="w-full text-left rounded-2xl px-4 py-3.5 transition-all active:scale-[0.98]"
                  style={{ background: isSelected ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.04)', border: `1px solid ${isSelected ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)'}`, backdropFilter: 'blur(20px)' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                      style={{ background: isToday ? '#22c55e' : hasMeals ? 'rgba(34,197,94,0.12)' : 'rgba(255,255,255,0.05)', border: isToday ? 'none' : `1px solid ${hasMeals ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}` }}>
                      <span className={`text-xs font-bold leading-none ${isToday ? 'text-white' : hasMeals ? 'text-brand-400' : 'text-zinc-600'}`}>{dayNum}</span>
                      <span className={`text-[9px] leading-none mt-0.5 ${isToday ? 'text-white/80' : 'text-zinc-600'}`}>{dayName}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline">
                        <span className={`text-sm font-semibold ${isToday ? 'text-brand-400' : 'text-zinc-200'}`}>
                          {isToday ? 'Hoy' : new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric' })}
                        </span>
                        {hasMeals && <span className={`text-sm font-bold tabular-nums ${over ? 'text-red-400' : 'text-zinc-300'}`}>{Math.round(s.calories)} kcal</span>}
                      </div>
                      {hasMeals ? (
                        <div className="flex items-center gap-2 mt-1.5">
                          <div className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: over ? '#ef4444' : '#22c55e' }} />
                          </div>
                          <span className="text-xs text-zinc-600">{s.meal_count} comida{s.meal_count !== 1 ? 's' : ''}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-zinc-700">Sin comidas registradas</span>
                      )}
                    </div>
                    <svg className={`w-4 h-4 text-zinc-700 transition-transform flex-shrink-0 ${isSelected ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                {isSelected && (
                  <div className="mt-2 space-y-2 animate-slide-up pl-2">
                    {loadingMeals ? (
                      <div className="glass rounded-2xl p-4 flex justify-center"><div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" /></div>
                    ) : dayMeals.length === 0 ? (
                      <div className="glass rounded-2xl p-4 text-center">
                        <p className="text-sm text-zinc-600">Sin comidas este día</p>
                        {isToday && <Link href="/log"><button className="mt-2 text-sm font-semibold text-brand-500">Registrar comida →</button></Link>}
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
      )}
    </div>
  )
}
