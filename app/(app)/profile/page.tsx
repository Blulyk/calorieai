'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Settings {
  gemini_api_key: string | null; height_cm: number | null; weight_kg: number | null
  target_weight: number | null; age: number | null; gender: string | null
  activity_level: string; goal: string; calorie_goal: number | null
}
interface GoalResult {
  tdee: number; calorie_goal: number; protein_goal: number; carbs_goal: number
  fat_goal: number; bmi: number; bmi_category: string
  estimated_weeks_to_goal: number | null; advice: string; tips: string[]
}

const ACTIVITY_OPTIONS = [
  { value: 'sedentary',   label: 'Sedentary',   desc: 'Desk job, no exercise' },
  { value: 'light',       label: 'Light',        desc: '1–3 days/week' },
  { value: 'moderate',    label: 'Moderate',     desc: '3–5 days/week' },
  { value: 'active',      label: 'Active',       desc: '6–7 days/week' },
  { value: 'very_active', label: 'Very Active',  desc: 'Athlete / physical job' },
]
const GOAL_OPTIONS = [
  { value: 'lose',     label: 'Lose',     icon: '📉' },
  { value: 'maintain', label: 'Maintain', icon: '⚖️' },
  { value: 'gain',     label: 'Gain',     icon: '📈' },
]

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-dark-surface border border-dark-border rounded-3xl p-5">
      <div className="flex items-center gap-2 mb-5">
        <div className="w-8 h-8 bg-dark-elevated rounded-xl flex items-center justify-center">
          <span className="text-base">{icon}</span>
        </div>
        <h2 className="font-bold text-zinc-100">{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [settings, setSettings] = useState<Settings>({
    gemini_api_key: '', height_cm: null, weight_kg: null,
    target_weight: null, age: null, gender: null,
    activity_level: 'moderate', goal: 'maintain', calorie_goal: null,
  })
  const [saving,      setSaving]      = useState(false)
  const [saved,       setSaved]       = useState(false)
  const [calcLoading, setCalcLoading] = useState(false)
  const [goalResult,  setGoalResult]  = useState<GoalResult | null>(null)
  const [error,       setError]       = useState('')
  const [showKey,     setShowKey]     = useState(false)
  const [loggingOut,  setLoggingOut]  = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      setUsername(data.username || '')
      if (data.settings) setSettings({ ...data.settings, gemini_api_key: data.settings.gemini_api_key || '' })
    })
  }, [])

  function set<K extends keyof Settings>(key: K, val: Settings[K]) {
    setSettings(s => ({ ...s, [key]: val }))
  }

  async function save() {
    setSaving(true); setSaved(false); setError('')
    const res = await fetch('/api/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    })
    setSaving(false)
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 3000) }
    else setError('Failed to save')
  }

  async function calculateGoal() {
    setCalcLoading(true); setError('')
    try {
      const res  = await fetch('/api/profile/goal', { method: 'POST' })
      const text = await res.text()
      if (!text) { setError('Server returned empty response'); setCalcLoading(false); return }
      const data = JSON.parse(text)
      setCalcLoading(false)
      if (!res.ok) { setError(data.error || 'Error'); return }
      setGoalResult(data)
      setSettings(s => ({ ...s, calorie_goal: data.calorie_goal }))
    } catch (e: unknown) {
      setCalcLoading(false)
      setError(e instanceof Error ? e.message : 'Request failed')
    }
  }

  async function logout() {
    setLoggingOut(true)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
  }

  return (
    <div className="max-w-lg mx-auto bg-dark-base min-h-screen">
      {/* Header */}
      <div className="px-5 pt-12 pb-4 sticky top-0 z-10 flex items-center justify-between" style={{ background: 'rgba(8,8,8,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid #111' }}>
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Profile</h1>
          <p className="text-xs text-zinc-600 mt-0.5">@{username}</p>
        </div>
        <div className="w-11 h-11 bg-brand-500/10 border border-brand-500/20 rounded-2xl flex items-center justify-center">
          <span className="text-brand-400 font-bold text-lg">{username[0]?.toUpperCase()}</span>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* API Key */}
        <Section icon="🔑" title="Gemini API Key">
          <p className="text-xs text-zinc-600 mb-3">
            Get yours free at <span className="text-brand-500 font-medium">aistudio.google.com</span> — required for photo analysis.
          </p>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={settings.gemini_api_key || ''}
              onChange={e => set('gemini_api_key', e.target.value)}
              placeholder="AIza…"
              className="w-full px-4 py-3 pr-12 rounded-2xl bg-dark-elevated border border-dark-border text-zinc-100 font-mono text-sm placeholder:text-zinc-700 focus:border-brand-500/40 focus:ring-2 focus:ring-brand-500/10 outline-none transition-all"
            />
            <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors">
              {showKey
                ? <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" /></svg>
                : <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              }
            </button>
          </div>
          {settings.gemini_api_key && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-2 h-2 bg-brand-500 rounded-full shadow-glow-sm" />
              <span className="text-xs text-brand-500 font-medium">API key configured</span>
            </div>
          )}
        </Section>

        {/* Body metrics */}
        <Section icon="📏" title="Body Metrics">
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'height_cm'     as const, label: 'Height',        unit: 'cm',  placeholder: '175' },
              { key: 'weight_kg'     as const, label: 'Current weight', unit: 'kg', placeholder: '70'  },
              { key: 'target_weight' as const, label: 'Target weight',  unit: 'kg', placeholder: '65'  },
              { key: 'age'           as const, label: 'Age',            unit: 'yrs', placeholder: '25' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-zinc-600 mb-1.5">{f.label}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={settings[f.key] ?? ''}
                    onChange={e => set(f.key, e.target.value ? Number(e.target.value) : null)}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2.5 pr-10 rounded-xl bg-dark-elevated border border-dark-border text-zinc-100 placeholder:text-zinc-700 focus:border-brand-500/40 outline-none transition-all text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-700">{f.unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <label className="block text-xs font-semibold text-zinc-600 mb-2">Gender</label>
            <div className="flex gap-2">
              {[{ v: 'male', l: '♂ Male' }, { v: 'female', l: '♀ Female' }, { v: 'other', l: '⚧ Other' }].map(g => (
                <button
                  key={g.v}
                  onClick={() => set('gender', g.v)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all border ${
                    settings.gender === g.v
                      ? 'bg-brand-500/15 border-brand-500/30 text-brand-400'
                      : 'bg-dark-elevated border-dark-border text-zinc-600'
                  }`}
                >
                  {g.l}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Goal */}
        <Section icon="🎯" title="Your Goal">
          <div className="flex gap-2 mb-5">
            {GOAL_OPTIONS.map(g => (
              <button
                key={g.value}
                onClick={() => set('goal', g.value)}
                className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-semibold transition-all border ${
                  settings.goal === g.value
                    ? 'bg-brand-500/15 border-brand-500/30 text-brand-400'
                    : 'bg-dark-elevated border-dark-border text-zinc-600'
                }`}
              >
                <span className="text-xl">{g.icon}</span>
                {g.label}
              </button>
            ))}
          </div>

          <label className="block text-xs font-semibold text-zinc-600 mb-2">Activity Level</label>
          <div className="space-y-2">
            {ACTIVITY_OPTIONS.map(a => (
              <button
                key={a.value}
                onClick={() => set('activity_level', a.value)}
                className={`w-full text-left px-4 py-3 rounded-2xl flex items-center justify-between transition-all border ${
                  settings.activity_level === a.value
                    ? 'bg-brand-500/10 border-brand-500/30'
                    : 'bg-dark-elevated border-dark-border'
                }`}
              >
                <div>
                  <div className={`text-sm font-semibold ${settings.activity_level === a.value ? 'text-brand-400' : 'text-zinc-400'}`}>{a.label}</div>
                  <div className="text-xs text-zinc-700 mt-0.5">{a.desc}</div>
                </div>
                {settings.activity_level === a.value && (
                  <div className="w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-glow-sm">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={calculateGoal}
            disabled={calcLoading}
            className="mt-5 w-full bg-indigo-500/15 border border-indigo-500/30 hover:bg-indigo-500/20 disabled:opacity-50 text-indigo-400 font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            {calcLoading
              ? <><div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" /> Calculating…</>
              : <><span>🤖</span> Calculate my calorie goal</>
            }
          </button>

          {goalResult && (
            <div className="mt-4 bg-brand-500/5 border border-brand-500/15 rounded-2xl p-4 animate-slide-up space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                {[
                  { val: goalResult.calorie_goal, label: 'kcal/day', sub: 'Your goal' },
                  { val: goalResult.bmi,           label: goalResult.bmi_category, sub: 'BMI' },
                  { val: goalResult.tdee,          label: 'TDEE',    sub: 'Maintenance' },
                ].map((s, i) => (
                  <div key={i} className="bg-dark-elevated rounded-xl p-3">
                    <div className="text-lg font-bold text-brand-400">{s.val}</div>
                    <div className="text-xs text-zinc-600 leading-tight mt-0.5">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                {[
                  { g: goalResult.protein_goal, l: 'Protein', c: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
                  { g: goalResult.carbs_goal,   l: 'Carbs',   c: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
                  { g: goalResult.fat_goal,     l: 'Fat',     c: 'text-red-400 bg-red-500/10 border-red-500/20' },
                ].map(m => (
                  <div key={m.l} className={`rounded-xl p-2.5 border ${m.c}`}>
                    <div className="font-bold text-sm">{m.g}g</div>
                    <div className="text-xs opacity-70">{m.l}</div>
                  </div>
                ))}
              </div>

              {goalResult.estimated_weeks_to_goal && (
                <div className="text-center text-sm text-brand-400 font-medium">
                  ~{goalResult.estimated_weeks_to_goal} weeks to reach your goal
                </div>
              )}

              <p className="text-sm text-zinc-400 italic leading-relaxed">{goalResult.advice}</p>

              <ul className="space-y-1.5">
                {goalResult.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-zinc-500">
                    <span className="text-brand-500 font-bold mt-0.5 flex-shrink-0">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {settings.calorie_goal && !goalResult && (
            <div className="mt-3 text-center text-sm text-zinc-600">
              Current goal: <span className="font-bold text-zinc-300">{settings.calorie_goal} kcal/day</span>
            </div>
          )}
        </Section>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-2xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white font-semibold py-3.5 rounded-2xl active:scale-95 transition-all shadow-glow"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save changes'}
        </button>

        <button
          onClick={logout}
          disabled={loggingOut}
          className="w-full py-3 rounded-2xl text-red-500 font-semibold text-sm border border-red-500/20 hover:bg-red-500/5 transition-colors active:scale-95"
        >
          {loggingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  )
}
