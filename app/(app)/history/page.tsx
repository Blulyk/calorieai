'use client'

import { useEffect, useState } from 'react'
import MealCard from '@/components/MealCard'
import Link from 'next/link'

interface DayData {
  date: string
  calories: number
  meal_count: number
  water_ml: number
  water_glasses: number
  protein?: number
  carbs?: number
  fat?: number
}
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

function DonutMacros({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = protein + carbs + fat
  if (total === 0) return null
  const data = [
    { v: (carbs / total) * 100, c: '#FF9F0A' },
    { v: (protein / total) * 100, c: '#32D74B' },
    { v: (fat / total) * 100, c: '#FFD60A' },
  ]
  const r = 38, stroke = 12, C2 = 2 * Math.PI * r, gap = 8
  let off = 0
  return (
    <svg width={100} height={100} viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx="50" cy="50" r={r} stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} fill="none"/>
      {data.map((d, i) => {
        const len = (d.v / 100) * C2 - gap
        const seg = (
          <circle key={i} cx="50" cy="50" r={r} stroke={d.c} strokeWidth={stroke}
            fill="none" strokeLinecap="round"
            strokeDasharray={`${Math.max(len, 0)} ${C2}`} strokeDashoffset={-off}
            style={{ filter: `drop-shadow(0 0 3px ${d.c}88)` }}
          />
        )
        off += (d.v / 100) * C2
        return seg
      })}
    </svg>
  )
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
  const [selectedWaterMl, setSelectedWaterMl] = useState(0)
  const [loadingMeals, setLoadingMeals] = useState(false)
  const [loading, setLoading]           = useState(true)
  const [view, setView]                 = useState<'calendar' | 'week'>('calendar')

  const totalDays  = getDaysInMonth(year, month)
  const startOffset = getFirstDayOffset(year, month)
  const startDate  = toISO(year, month, 1)
  const endDate    = toISO(year, month, totalDays)

  // For week view: always use current week
  const dow = now.getDay() === 0 ? 6 : now.getDay() - 1
  const weekStart = new Date(now); weekStart.setDate(now.getDate() - dow)
  const weekStartISO = weekStart.toISOString().split('T')[0]

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
      .then(d => {
        setDayMeals(d.meals || [])
        setSelectedWaterMl(Number(d.water_ml ?? (d.water ?? 0) * 250) || 0)
        setLoadingMeals(false)
      })
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

  // Build calendar cells: nulls for padding, then day numbers
  const cells: (number | null)[] = [
    ...Array(startOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]

  // Week view data: current week stats
  const weekStats = stats.filter(d => d.date >= weekStartISO && d.date <= todayISO)

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

          {/* Segmented control */}
          <div className="glass rounded-2xl p-1 flex relative">
            <div style={{
              position: 'absolute', top: 4, bottom: 4,
              left: view === 'calendar' ? 4 : '50%',
              width: 'calc(50% - 4px)',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 10,
              border: '0.5px solid rgba(255,255,255,0.06)',
              transition: 'left 0.32s cubic-bezier(.5,1.4,.4,1)',
            }} />
            {(['calendar', 'week'] as const).map(v => (
              <button key={v} onClick={() => setView(v)}
                className="relative z-10 flex-1 py-2 text-sm font-semibold transition-colors"
                style={{ color: view === v ? '#fff' : 'rgba(235,235,245,0.45)' }}>
                {v === 'calendar' ? 'Calendario' : 'Semana'}
              </button>
            ))}
          </div>

          {view === 'calendar' && (
            <>
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
                    const hasWater = (s?.water_ml ?? 0) > 0
                    const hasData  = hasMeals || hasWater
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
                            color: isToday ? '#fff' : isSelected ? '#fb923c' : hasData ? '#f4f4f5' : '#52525b',
                            fontWeight: isToday || isSelected ? '700' : hasData ? '600' : '400',
                          }}
                        >
                          {day}
                        </div>
                        <div className="flex h-1.5 items-center justify-center gap-0.5">
                          {hasMeals && (
                            <span
                              className="h-1.5 w-1.5 rounded-full"
                              style={{
                                background: over ? '#ef4444' : pct > 0.8 ? '#f97316' : '#fb923c',
                                opacity: 0.9,
                              }}
                            />
                          )}
                          {hasWater && <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />}
                        </div>
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
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-sky-400" />
                    <span className="text-[11px] text-zinc-500">Agua</span>
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

                  <div className="water-summary glass rounded-2xl px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-100/55">Agua</p>
                        <p className="mt-1 text-2xl font-bold text-zinc-100 tabular-nums">{selectedWaterMl} <span className="text-sm text-zinc-500">ml</span></p>
                      </div>
                      <div className="h-12 w-12 rounded-full border border-sky-300/25 bg-sky-400/10 flex items-center justify-center text-sm font-bold text-sky-100">
                        {Math.round(Math.min(100, selectedWaterMl / 2500 * 100))}%
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="h-full rounded-full bg-sky-400 transition-all"
                        style={{ width: `${Math.min(100, selectedWaterMl / 2500 * 100)}%` }}
                      />
                    </div>
                  </div>

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
            </>
          )}

          {view === 'week' && (
            <div className="space-y-3">
              {/* Bar chart */}
              <div className="glass rounded-3xl p-5">
                <div className="flex items-baseline justify-between mb-4">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/38">Esta semana</p>
                </div>
                <div className="flex items-end gap-2" style={{ height: 140 }}>
                  {stats.map((d) => {
                    const h = calGoal > 0 ? Math.min((d.calories / (calGoal * 1.3)) * 100, 100) : 0
                    const isToday = d.date === todayISO
                    const over = d.calories > calGoal
                    const dayOfWeek = new Date(d.date + 'T12:00:00').getDay()
                    const dayLabel = ['L','M','X','J','V','S','D'][dayOfWeek === 0 ? 6 : dayOfWeek - 1]
                    return (
                      <div key={d.date} className="flex flex-1 flex-col items-center gap-1.5 justify-end h-full">
                        <div className="w-full rounded-lg flex-shrink-0" style={{
                          height: `${Math.max(h, 4)}%`,
                          background: isToday ? '#FF9F0A' : over ? '#FF453A44' : 'rgba(255,255,255,0.16)',
                          boxShadow: isToday ? '0 0 14px #FF9F0A88' : 'none',
                        }} />
                        <span className="text-[10px] font-semibold" style={{ color: isToday ? '#fff' : 'rgba(235,235,245,0.45)' }}>
                          {dayLabel}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Macro donut — only shown if any macro data is available */}
              {weekStats.length > 0 && (weekStats.some(d => (d.protein || 0) > 0 || (d.carbs || 0) > 0 || (d.fat || 0) > 0)) && (
                <div className="glass rounded-3xl p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/38 mb-4">Reparto macros</p>
                  <div className="flex items-center gap-5">
                    <DonutMacros
                      protein={weekStats.reduce((s, d) => s + (d.protein || 0), 0)}
                      carbs={weekStats.reduce((s, d) => s + (d.carbs || 0), 0)}
                      fat={weekStats.reduce((s, d) => s + (d.fat || 0), 0)}
                    />
                    <div className="flex flex-col gap-2 flex-1">
                      {[
                        { l: 'Carbos', c: '#FF9F0A' },
                        { l: 'Proteína', c: '#32D74B' },
                        { l: 'Grasa', c: '#FFD60A' },
                      ].map(r => (
                        <div key={r.l} className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: r.c, boxShadow: `0 0 6px ${r.c}` }} />
                          <span className="flex-1 text-xs text-white/80">{r.l}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Achievements */}
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-white/38 mb-3 px-1">Logros</p>
                <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1" style={{ margin: '0 -4px', padding: '0 4px 4px' }}>
                  {[
                    { t: 'En racha', s: 'Registros consecutivos', c: '#FF9F0A', show: stats.some(d => d.meal_count > 0) },
                    { t: 'Semana activa', s: `${stats.filter(d => d.meal_count > 0).length}/7 días`, c: '#32D74B', show: stats.filter(d => d.meal_count > 0).length >= 5 },
                    { t: 'Hidratado', s: 'Objetivo de agua', c: '#5AC8FA', show: stats.some(d => (d.water_ml || 0) >= 2500) },
                    { t: 'Objetivo cumplido', s: 'Calorías en rango', c: '#BF5AF2', show: stats.some(d => d.calories >= calGoal * 0.85 && d.calories <= calGoal * 1.1) },
                  ].filter(a => a.show).map(a => (
                    <div key={a.t} className="glass rounded-[1.4rem] p-4 flex-shrink-0" style={{ minWidth: 140, borderColor: `${a.c}22` }}>
                      <div className="h-8 w-8 rounded-xl flex items-center justify-center mb-2"
                        style={{ background: `${a.c}22`, border: `0.5px solid ${a.c}44` }}>
                        <svg className="h-4 w-4" fill="none" stroke={a.c} strokeWidth={2.2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 12l4 4 10-10" />
                        </svg>
                      </div>
                      <p className="text-sm font-bold text-white">{a.t}</p>
                      <p className="text-[10px] text-white/40 mt-0.5">{a.s}</p>
                    </div>
                  ))}
                  {stats.filter(d => d.meal_count > 0).length === 0 && (
                    <div className="glass rounded-[1.4rem] p-4 flex-shrink-0" style={{ minWidth: 200 }}>
                      <p className="text-sm text-white/40">Sin logros esta semana aún</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
