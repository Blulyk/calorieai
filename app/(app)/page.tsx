'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import CalorieRing, { type CalorieSegment } from '@/components/CalorieRing'
import MealCard from '@/components/MealCard'
import WaterTracker from '@/components/WaterTracker'
import WeekStrip from '@/components/WeekStrip'
import MacroDonut from '@/components/MacroDonut'
import WeightTracker from '@/components/WeightTracker'
import FastingTimer from '@/components/FastingTimer'
import AdaptiveTDEE from '@/components/AdaptiveTDEE'

interface Meal {
  id: string; name: string | null; photo_path: string | null
  foods: unknown[]; calories: number; protein: number; carbs: number
  fat: number; meal_type: string; notes: string | null; created_at: number
}
interface DailyStats { calories: number; protein: number; carbs: number; fat: number }
interface Settings {
  calorie_goal: number | null; gemini_api_key: string | null
  fasting_enabled: boolean | null
  fasting_protocol: string | null
  fasting_start: string | null
  fasting_end: string | null
  carb_cycling_enabled: boolean | null
  training_days: string | null
  training_calorie_goal: number | null
  rest_calorie_goal: number | null
}
interface WeekDay { date: string; calories: number; meal_count: number; water_ml: number; water_glasses: number }
interface WeightLog { date: string; weight_kg: number }

function useCountUp(target: number, duration = 700, delay = 0) {
  const [value, setValue] = useState(0)
  const raf = useRef<number>(0)
  useEffect(() => {
    if (target === 0) { setValue(0); return }
    let started = false; let startTime = 0
    const timeout = setTimeout(() => {
      const step = (ts: number) => {
        if (!started) { started = true; startTime = ts }
        const progress = Math.min((ts - startTime) / duration, 1)
        setValue(Math.round((1 - Math.pow(1 - progress, 3)) * target))
        if (progress < 1) raf.current = requestAnimationFrame(step)
      }
      raf.current = requestAnimationFrame(step)
    }, delay)
    return () => { clearTimeout(timeout); cancelAnimationFrame(raf.current) }
  }, [target, duration, delay])
  return value
}

const MC = { protein: '#32D74B', carbs: '#FF9F0A', fat: '#FFD60A' }

export default function Dashboard() {
  const router = useRouter()
  const today = new Date().toISOString().split('T')[0]

  const [viewDay, setViewDay]     = useState(today)
  const [meals, setMeals]         = useState<Meal[]>([])
  const [stats, setStats]         = useState<DailyStats>({ calories: 0, protein: 0, carbs: 0, fat: 0 })
  const [water, setWater]         = useState(0)
  const [settings, setSettings]   = useState<Settings | null>(null)
  const [weekData, setWeekData]   = useState<WeekDay[]>([])
  const [username, setUsername]   = useState('')
  const [streak, setStreak]       = useState(0)
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([])
  const [loading, setLoading]     = useState(true)
  const [dayLoading, setDayLoading] = useState(false)
  const [coachTip, setCoachTip]   = useState<string | null>(null)
  const [coachLoading, setCoachLoading] = useState(false)
  const [coachError, setCoachError] = useState('')
  const [adaptiveTDEE, setAdaptiveTDEE] = useState<{ tdee: number; confidence: 'high'|'medium'|'low'; days: number } | null>(null)

  const greeting = () => {
    const h = new Date().getHours()
    if (h < 12) return 'Buenos días'
    if (h < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  // Initial setup: me, week history, streak
  useEffect(() => {
    fetch('/api/setup').then(r => r.json()).then(d => { if (d.needsSetup) router.replace('/setup') })
    const start = new Date(Date.now() - 6 * 86400000).toISOString().split('T')[0]
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch(`/api/history?type=week&start=${start}&end=${today}`).then(r => r.json()),
      fetch('/api/streak').then(r => r.json()),
      fetch('/api/weight').then(r => r.json()),
    ]).then(([me, history, streakData, weightData]) => {
      setUsername(me.username || '')
      setSettings(me.settings)
      setWeekData(history.stats || [])
      setStreak(streakData.streak || 0)
      setWeightLogs(weightData.logs || [])
      setLoading(false)
    })
    fetch('/api/tdee').then(r => r.json()).then(d => { if (d.adaptive) setAdaptiveTDEE(d.adaptive) })
  }, [today, router])

  // Day-specific: meals, stats, water — reloads when viewDay changes
  useEffect(() => {
    setDayLoading(true)
    fetch(`/api/meals?date=${viewDay}`)
      .then(r => r.json())
      .then(d => {
        setMeals(d.meals || [])
        setStats(d.stats || { calories: 0, protein: 0, carbs: 0, fat: 0 })
        setWater(d.water || 0)
        setDayLoading(false)
      })
  }, [viewDay])

  async function askCoach() {
    setCoachLoading(true); setCoachError(''); setCoachTip(null)
    try {
      const res = await fetch('/api/coach', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setCoachError(data.error || 'Error'); setCoachLoading(false); return }
      setCoachTip(data.tip)
    } catch { setCoachError('Error de conexión') }
    setCoachLoading(false)
  }

  const goal = (() => {
    if (settings?.carb_cycling_enabled && viewDay === today) {
      const dayOfWeek = new Date().getDay() // 0=Sun, 1=Mon...
      const trainingDays = (settings.training_days || '').split(',').map(Number)
      if (trainingDays.includes(dayOfWeek)) return settings.training_calorie_goal || settings.calorie_goal || 2000
      return settings.rest_calorie_goal || settings.calorie_goal || 2000
    }
    return settings?.calorie_goal || 2000
  })()

  const remaining = Math.round(goal - stats.calories)
  const percent = Math.min(100, Math.round((stats.calories / goal) * 100))
  const isViewingToday = viewDay === today

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
      protein:  Math.max(0, s.protein - m.protein),
      carbs:    Math.max(0, s.carbs - m.carbs),
      fat:      Math.max(0, s.fat - m.fat),
    }))
  }

  const animatedCal   = useCountUp(Math.round(stats.calories), 800, 100)
  const animatedProt  = useCountUp(Math.round(stats.protein),  600, 200)
  const animatedCarbs = useCountUp(Math.round(stats.carbs),    600, 280)
  const animatedFat   = useCountUp(Math.round(stats.fat),      600, 360)

  if (loading) return (
    <div className="liquid-page flex min-h-screen items-center justify-center">
      <div className="glass-strong rounded-[2rem] px-8 py-7 text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-white/30 border-t-[#0A84FF]" />
        <p className="mt-4 text-sm font-medium text-zinc-300/70">Cargando tu día</p>
      </div>
    </div>
  )

  const dateLabel = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    .replace(/^\w/, c => c.toUpperCase())

  const viewDayLabel = isViewingToday ? null : new Date(viewDay + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  }).replace(/^\w/, c => c.toUpperCase())

  return (
    <div className="liquid-page mx-auto min-h-screen max-w-lg pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 px-5 pt-11 pb-3 header-glass animate-fadeIn">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/38">{greeting()}</p>
            <p className="mt-0.5 text-sm font-semibold text-white/82">{dateLabel}</p>
          </div>
          <Link href="/profile" className="glass-pill flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold text-white">
            {username[0]?.toUpperCase()}
          </Link>
        </div>
      </div>

      <main className="space-y-3 px-4 pt-2">

        {/* Week strip */}
        <section className="glass rounded-[1.6rem] p-3 animate-fadeInUp" style={{ animationDelay: '0.05s' }}>
          <WeekStrip
            data={weekData}
            goal={goal}
            selected={viewDay}
            onSelect={(date) => setViewDay(date)}
          />
        </section>

        {/* Fasting Timer */}
        {isViewingToday && settings?.fasting_enabled && (
          <section className="animate-fadeInUp" style={{ animationDelay: '0.08s' }}>
            <FastingTimer
              protocol={settings.fasting_protocol || '16:8'}
              startTime={settings.fasting_start || '12:00'}
              endTime={settings.fasting_end || '20:00'}
            />
          </section>
        )}

        {/* Viewing past day banner */}
        {!isViewingToday && (
          <div
            className="flex items-center justify-between rounded-2xl px-4 py-2.5 animate-fadeIn"
            style={{ background: 'rgba(255,159,10,0.1)', border: '0.5px solid rgba(255,159,10,0.25)' }}
          >
            <div className="flex items-center gap-2">
              <svg className="h-3.5 w-3.5 text-[#FF9F0A]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3M3.05 11a9 9 0 1 0 .5-3" />
              </svg>
              <span className="text-xs font-semibold text-[#FF9F0A]">{viewDayLabel}</span>
            </div>
            <button
              onClick={() => setViewDay(today)}
              className="text-[10px] font-bold text-white/50 active:text-white transition-colors"
            >
              Volver a hoy →
            </button>
          </div>
        )}

        {/* Hero calories */}
        <section className="text-center animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
          {dayLoading ? (
            <div className="flex justify-center py-4">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
            </div>
          ) : (
            <>
              <div className="flex items-baseline justify-center gap-2 mt-1">
                <span className="text-[4.4rem] font-bold leading-none tracking-tight text-white tabular-nums">
                  {animatedCal.toLocaleString('es-ES')}
                </span>
                <span className="text-xl font-semibold text-white/35">kcal</span>
              </div>
              <p className={`mt-1 text-sm font-semibold ${remaining < 0 ? 'text-[#FF453A]' : 'text-white/45'}`}>
                {remaining < 0 ? `${Math.abs(remaining)} kcal por encima` : `${remaining} kcal restantes`}
              </p>
            </>
          )}
        </section>

        {/* Ring + macros card */}
        <section className="glass-strong liquid-card overflow-hidden animate-fadeInScale" style={{ animationDelay: '0.13s' }}>
          <div className="flex items-center justify-between px-5 pt-4 pb-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/38">Balance diario</p>
              <p className="mt-0.5 text-xs text-white/55">Objetivo {goal} kcal</p>
            </div>
            <div className="glass-pill rounded-full px-3 py-1.5 text-sm font-bold text-white">{percent}%</div>
          </div>

          <div className="flex justify-center pb-3">
            <CalorieRing segments={segments} goal={goal} />
          </div>

          <div className="flex" style={{ borderTop: '0.5px solid rgba(255,255,255,0.06)' }}>
            {[
              { l: 'CARBOS',    v: animatedCarbs, goal: 250, c: MC.carbs },
              { l: 'PROTEÍNA',  v: animatedProt,  goal: 140, c: MC.protein },
              { l: 'GRASA',     v: animatedFat,   goal: 70,  c: MC.fat },
            ].map((m, i, arr) => (
              <div key={m.l} className="flex-1 px-3 py-3 text-center"
                style={{ borderRight: i < arr.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none' }}>
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  <span className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                    style={{ background: m.c, boxShadow: `0 0 6px ${m.c}99` }} />
                  <span className="text-[9.5px] font-bold uppercase tracking-wider text-white/40">{m.l}</span>
                </div>
                <div className="text-[17px] font-bold tabular-nums" style={{ letterSpacing: '-0.4px' }}>
                  {m.v}<span className="text-[10px] text-white/30 font-medium">/{m.goal}g</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Macro donut */}
        {(stats.protein + stats.carbs + stats.fat) > 0 && (
          <div className="animate-fadeInUp" style={{ animationDelay: '0.16s' }}>
            <MacroDonut protein={stats.protein} carbs={stats.carbs} fat={stats.fat} />
          </div>
        )}

        {/* Streak + Coach row */}
        <div className="grid grid-cols-2 gap-3 animate-fadeInUp" style={{ animationDelay: '0.18s' }}>
          {/* Streak card */}
          <div className="glass rounded-[1.4rem] p-4 flex flex-col gap-1">
            <div className="flex items-center gap-1.5 mb-1" style={{ color: '#FF9F0A' }}>
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c1 4 5 5 5 10a5 5 0 11-10 0c0-3 2-4 2-7 1 1 2 2 3 0z" />
              </svg>
              <span className="text-[9.5px] font-bold uppercase tracking-wider">Racha</span>
            </div>
            <span className="text-3xl font-bold text-white tabular-nums leading-none">{streak}</span>
            <span className="text-[10px] text-white/35 font-medium">{streak === 1 ? 'día' : 'días'} seguidos</span>
          </div>

          {/* API key nudge OR coach card */}
          {settings && !settings.gemini_api_key ? (
            <Link href="/profile" className="glass rounded-[1.4rem] p-4 flex flex-col gap-1 justify-between">
              <div className="flex items-center gap-1.5 text-amber-400 mb-1">
                <span className="text-[9.5px] font-bold uppercase tracking-wider">API Key</span>
              </div>
              <p className="text-xs text-amber-200/80 leading-tight">Añade tu API key de Gemini para analizar fotos</p>
              <span className="text-[10px] text-amber-400 font-bold">Configurar →</span>
            </Link>
          ) : (
            <div
              className="glass rounded-[1.4rem] p-4 flex flex-col gap-2"
              style={{ border: '0.5px solid rgba(125,122,255,0.18)' }}
            >
              <div className="flex items-center gap-1.5" style={{ color: '#7D7AFF' }}>
                <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
                </svg>
                <span className="text-[9.5px] font-bold uppercase tracking-wider">Coach IA</span>
              </div>

              {coachLoading ? (
                <div className="flex items-center gap-2 flex-1">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-[#7D7AFF]" />
                  <span className="text-[10px] text-white/35">Analizando…</span>
                </div>
              ) : coachTip ? (
                <p className="text-[10.5px] text-white/75 leading-snug line-clamp-3 flex-1">{coachTip}</p>
              ) : (
                <p className="text-[10px] text-white/35 leading-snug flex-1">Consejo personalizado basado en tu día</p>
              )}

              <button
                onClick={askCoach}
                disabled={coachLoading}
                className="w-full rounded-xl py-2 text-xs font-bold transition-all active:scale-95"
                style={{
                  background: coachLoading
                    ? 'rgba(125,122,255,0.1)'
                    : 'linear-gradient(135deg, rgba(125,122,255,0.3), rgba(88,86,214,0.4))',
                  color: '#A8A6FF',
                  border: '0.5px solid rgba(125,122,255,0.25)',
                  boxShadow: coachLoading ? 'none' : '0 2px 10px rgba(125,122,255,0.2)',
                }}
              >
                {coachLoading ? '…' : coachTip ? 'Nuevo' : 'Pedir consejo'}
              </button>
            </div>
          )}
        </div>

        {/* Coach error */}
        {coachError && (
          <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-xs text-red-400 border border-red-500/20 animate-fadeIn">
            {coachError}
          </div>
        )}

        {/* Adaptive TDEE widget */}
        {isViewingToday && adaptiveTDEE && (
          <div className="animate-fadeInUp" style={{ animationDelay: '0.21s' }}>
            <AdaptiveTDEE
              tdee={adaptiveTDEE.tdee}
              confidence={adaptiveTDEE.confidence}
              days={adaptiveTDEE.days}
              currentGoal={settings?.calorie_goal || null}
              onAccept={async (tdee) => {
                await fetch('/api/profile', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ calorie_goal: tdee }) })
                setSettings(s => s ? { ...s, calorie_goal: tdee } : s)
                setAdaptiveTDEE(null)
              }}
            />
          </div>
        )}

        {/* Water — only show for today */}
        {isViewingToday && (
          <div className="animate-fadeInUp" style={{ animationDelay: '0.22s' }}>
            <WaterTracker glasses={water} date={today} onChange={setWater} />
          </div>
        )}

        {/* Weight tracker */}
        {isViewingToday && (
          <div className="animate-fadeInUp" style={{ animationDelay: '0.25s' }}>
            <WeightTracker logs={weightLogs} onLogged={setWeightLogs} />
          </div>
        )}

        {/* API key nudge banner */}
        {settings && !settings.gemini_api_key && (
          <Link href="/profile" className="glass flex items-center gap-3 rounded-[1.7rem] p-4 animate-fadeInUp" style={{ animationDelay: '0.24s' }}>
            <div className="glass-pill flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold text-amber-100">AI</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-amber-100">Añade tu API key de Gemini</p>
              <p className="mt-0.5 text-xs text-amber-100/55">Necesaria para analizar fotos</p>
            </div>
            <span className="text-lg text-amber-100/70">›</span>
          </Link>
        )}

        {/* Meals */}
        <section className="animate-fadeInUp" style={{ animationDelay: '0.28s' }}>
          <div className="mb-3 flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-white">
              {isViewingToday ? 'Comidas de hoy' : 'Comidas del día'}
            </h2>
            {isViewingToday && (
              <Link href="/log" className="glass-btn rounded-full px-3 py-2 text-xs font-bold text-white">Añadir</Link>
            )}
          </div>

          {dayLoading ? (
            <div className="glass liquid-card p-8 flex justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
            </div>
          ) : meals.length === 0 ? (
            <div className="glass liquid-card p-8 text-center">
              <p className="text-xl font-bold text-white">Sin comidas {isViewingToday ? 'hoy' : 'ese día'}</p>
              <p className="mx-auto mt-2 max-w-[260px] text-sm text-white/46">
                {isViewingToday ? 'Haz una foto y deja que la IA estime calorías y macros.' : 'No se registraron comidas este día.'}
              </p>
              {isViewingToday && (
                <Link href="/log" className="mt-5 inline-flex rounded-full bg-[#0071e3] px-6 py-3 text-sm font-bold text-white">
                  Registrar comida
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {meals.map((m, i) => (
                <MealCard key={m.id} meal={m as never} onDelete={isViewingToday ? removeMeal : undefined} index={i} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
