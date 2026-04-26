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

const MESES   = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
const DIAS_HDR = ['L','M','X','J','V','S','D']

function getFirstDayOffset(year: number, month: number) {
  // Monday-based: Mon=0 … Sun=6
  const d = new Date(year, month, 1).getDay()
  return d === 0 ? 6 : d - 1
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function toISO(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export default function HistoryPage() {
  const now    = new Date()
  const todayISO = now.toISOString().split('T')[0]

  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [calGoal, setCalGoal]           = useState(2000)
  const [stats, setStats]               = useState<DayData[]>([])
  const [selectedDate, setSelectedDate] = useState<string | null>(todayISO)
  const [dayMeals, setDayMeals]         = useState<Meal[]>([])
  const [loadingMeals, setLoadingMeals] = useState(false)
  const [loading, setLoading]           = useState(true)

  const totalDays  = getDaysInMonth(year, month)
  const startOffset = getFirstDayOffset(year, month)
  const startDate  = toISO(year, month, 1)
  const endDate    = toISO(year, month, totalDays)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch(`/api/history?type=week&start=${startDate}&end=${endDate}`).then(r => r.json()),
    ]).then(([me, hist]) => {
      setCalGoal(me.settings?.calorie_goal || 2000)
      setStats(hist.stats || [])
      setLoading(false)
    })
  }, [year, month, startDate, endDate])

  // Load meals for selected date
  useEffect(() => {
    if (!selectedDate) return
    setLoadingMeals(true)
    fetch(`/api/meals?date=${selectedDate}`)
      .then(r => r.json())
      .then(d => { setDayMeals(d.meals || []); setLoadingMeals(false) })
  }, [selectedDate])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
    setSelectedDate(null)
  }
  function nextMonth() {
    if (year === now.getFullYear() && month === now.getMonth()) return
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
    setSelectedDate(null)
  }

  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth()
  const statsMap = Object.fromEntries(stats.map(s => [s.date, s]))

  const selectedStats = selectedDate ? statsMap[selectedDate] : null
  const selectedDay   = selectedDate ? parseInt(selectedDate.split('-')[2]) : null

  // Build calendar cells: nulls for padding, then day numbers
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]

  return (
    <div className="liquid-page max-w-lg mx-auto min-h-screen">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 sticky top-0 z-10 header-glass">
        <h1 className="text-2xl font-bold text-zinc-100 mb-4">Historial</h1>
        <div className="flex items-center justify-between">
          <button onClick={prevMonth}
            className="glass-btn w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform">
            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <p className="font-bold text-zinc-100 text-base">{MESES[month]} {year}</p>
          </div>
          <button onClick={nextMonth} disabled={isCurrentMonth}
            className={`w-9 h-9 rounded-xl flex items-center justify-center active:scale-90 transition-transform ${isCurrentMonth ? 'opacity-25' : ''}`}
            style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="px-4 pt-4 pb-32 space-y-5">

          {/* Calendar grid */}
          <div className="glass rounded-3xl p-4">
            {/* Day headers */}
            <div className="grid grid-cols-7 mb-3">
              {DIAS_HDR.map(d => (
                <div key={d} className="text-center text-[11px] font-semibold text-zinc-600 uppercase tracking-wide py-1">{d}</div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-y-1">
              {cells.map((day, idx) => {
                if (day === null) return <div key={`pad-${idx}`} />

                const iso      = toISO(year, month, day)
                const s        = statsMap[iso]
                const hasMeals = (s?.meal_count ?? 0) > 0
                const isToday  = iso === todayISO
                const isSelected = iso === selectedDate
                const over     = s ? s.calories > calGoal : false
                const pct      = s ? Math.min(1, s.calories / calGoal) : 0

                return (
                  <button
                    key={iso}
                    onClick={() => setSelectedDate(iso === selectedDate ? null : iso)}
                    className="flex flex-col items-center gap-0.5 py-1 rounded-xl transition-all active:scale-90"
                    style={{ background: isSelected ? 'rgba(249,115,22,0.12)' : 'transparent' }}
                  >
                    {/* Day number */}
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all"
                      style={{
                        background: isToday ? '#f97316' : 'transparent',
                        color: isToday ? '#fff' : isSelected ? '#fb923c' : hasMeals ? '#f4f4f5' : '#52525b',
                        fontWeight: isToday || isSelected ? '700' : hasMeals ? '600' : '400',
                      }}
                    >
                      {day}
                    </div>
                    {/* Activity dot */}
                    {hasMeals && (
                      <div
                        className="w-1.5 h-1.5 rounded-full"
                        style={{
                          background: over ? '#ef4444' : pct > 0.8 ? '#f97316' : '#fb923c',
                          opacity: 0.9,
                        }}
                      />
                    )}
                    {!hasMeals && <div className="w-1.5 h-1.5" />}
                  </button>
                )
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 pt-3 border-t border-white/[0.06]">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-brand-400" />
                <span className="text-[11px] text-zinc-500">Registrado</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-[11px] text-zinc-500">Excedido</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-brand-500 opacity-90" />
                <span className="text-[11px] text-zinc-500">Hoy</span>
              </div>
            </div>
          </div>

          {/* Selected day detail */}
          {selectedDate && (
            <div className="space-y-3">
              {/* Day header */}
              <div className="flex items-baseline justify-between px-1">
                <h2 className="font-bold text-zinc-100 text-base">
                  {selectedDate === todayISO
                    ? 'Hoy'
                    : new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                </h2>
                {selectedStats && (
                  <span className="text-sm font-semibold tabular-nums"
                    style={{ color: selectedStats.calories > calGoal ? '#f87171' : '#fb923c' }}>
                    {Math.round(selectedStats.calories)} kcal
                  </span>
                )}
              </div>

              {/* Calorie bar */}
              {selectedStats && (
                <div className="glass rounded-2xl px-4 py-3 space-y-2">
                  <div className="flex justify-between text-xs text-zinc-500">
                    <span>{selectedStats.meal_count} comida{selectedStats.meal_count !== 1 ? 's' : ''}</span>
                    <span>Objetivo: {calGoal} kcal</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                    <div className="h-full rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (selectedStats.calories / calGoal) * 100)}%`,
                        background: selectedStats.calories > calGoal ? '#ef4444' : 'linear-gradient(90deg, #f97316, #fb923c)',
                      }} />
                  </div>
                </div>
              )}

              {/* Meals */}
              {loadingMeals ? (
                <div className="glass rounded-2xl p-6 flex justify-center">
                  <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : dayMeals.length === 0 ? (
                <div className="glass rounded-2xl p-6 text-center space-y-2">
                  <p className="text-zinc-400 font-medium text-sm">Sin comidas este día</p>
                  {selectedDate === todayISO && (
                    <Link href="/log">
                      <button className="text-sm font-semibold text-brand-400">Registrar comida →</button>
                    </Link>
                  )}
                </div>
              ) : (
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                dayMeals.map(m => <MealCard key={m.id} meal={m as any} />)
              )}
            </div>
          )}

          {/* Empty state */}
          {!selectedDate && (
            <div className="glass rounded-2xl p-6 text-center">
              <p className="text-zinc-500 text-sm">Selecciona un día para ver tus comidas</p>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
