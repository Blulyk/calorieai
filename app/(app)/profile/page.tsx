'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Settings {
  gemini_api_key: string | null
  height_cm: number | null
  weight_kg: number | null
  target_weight: number | null
  age: number | null
  gender: string | null
  activity_level: string
  goal: string
  calorie_goal: number | null
}

interface GoalResult {
  tdee: number
  calorie_goal: number
  protein_goal: number
  carbs_goal: number
  fat_goal: number
  bmi: number
  bmi_category: string
  estimated_weeks_to_goal: number | null
  advice: string
  tips: string[]
}

const ACTIVITY_OPTIONS = [
  { value: 'sedentary',   label: 'Sedentary',    desc: 'Desk job, no exercise' },
  { value: 'light',       label: 'Light',         desc: '1–3 days/week' },
  { value: 'moderate',    label: 'Moderate',      desc: '3–5 days/week' },
  { value: 'active',      label: 'Active',        desc: '6–7 days/week' },
  { value: 'very_active', label: 'Very Active',   desc: 'Athlete / physical job' },
]

const GOAL_OPTIONS = [
  { value: 'lose',     label: 'Lose weight',     icon: '📉' },
  { value: 'maintain', label: 'Maintain weight', icon: '⚖️' },
  { value: 'gain',     label: 'Gain weight',     icon: '📈' },
]

export default function ProfilePage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [settings, setSettings] = useState<Settings>({
    gemini_api_key: '',
    height_cm: null,
    weight_kg: null,
    target_weight: null,
    age: null,
    gender: null,
    activity_level: 'moderate',
    goal: 'maintain',
    calorie_goal: null,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [calcLoading, setCalcLoading] = useState(false)
  const [goalResult, setGoalResult] = useState<GoalResult | null>(null)
  const [error, setError] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      setUsername(data.username || '')
      if (data.settings) {
        setSettings({
          gemini_api_key: data.settings.gemini_api_key || '',
          height_cm: data.settings.height_cm,
          weight_kg: data.settings.weight_kg,
          target_weight: data.settings.target_weight,
          age: data.settings.age,
          gender: data.settings.gender,
          activity_level: data.settings.activity_level || 'moderate',
          goal: data.settings.goal || 'maintain',
          calorie_goal: data.settings.calorie_goal,
        })
      }
    })
  }, [])

  function set<K extends keyof Settings>(key: K, val: Settings[K]) {
    setSettings(s => ({ ...s, [key]: val }))
  }

  async function save() {
    setSaving(true)
    setSaved(false)
    setError('')
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
    setCalcLoading(true)
    setError('')
    try {
      const res = await fetch('/api/profile/goal', { method: 'POST' })
      const text = await res.text()
      if (!text) { setError('Server returned an empty response. Check the console.'); setCalcLoading(false); return }
      const data = JSON.parse(text)
      setCalcLoading(false)
      if (!res.ok) { setError(data.error || 'Unknown error'); return }
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
    <div className="max-w-lg mx-auto">
      <div className="bg-white px-5 pt-12 pb-4 sticky top-0 z-10 shadow-card">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink">Profile</h1>
            <p className="text-sm text-ink-secondary">@{username}</p>
          </div>
          <div className="w-12 h-12 bg-brand-100 rounded-2xl flex items-center justify-center">
            <span className="text-brand-700 font-bold text-xl">{username[0]?.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div className="px-4 py-5 space-y-4">

        {/* API Key */}
        <div className="bg-white rounded-3xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🔑</span>
            <h2 className="font-bold text-ink">Gemini API Key</h2>
          </div>
          <p className="text-xs text-ink-secondary mb-3">
            Required for food photo analysis. Get yours at{' '}
            <span className="text-brand-600 font-medium">aistudio.google.com</span>
          </p>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={settings.gemini_api_key || ''}
              onChange={e => set('gemini_api_key', e.target.value)}
              placeholder="AIza…"
              className="w-full px-4 py-3 pr-12 rounded-2xl border border-surface-tertiary bg-surface-secondary text-ink font-mono text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-tertiary hover:text-ink transition-colors"
            >
              {showKey ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
          {settings.gemini_api_key && (
            <div className="flex items-center gap-1.5 mt-2">
              <div className="w-2 h-2 bg-brand-500 rounded-full" />
              <span className="text-xs text-brand-600 font-medium">API key configured</span>
            </div>
          )}
        </div>

        {/* Body metrics */}
        <div className="bg-white rounded-3xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">📏</span>
            <h2 className="font-bold text-ink">Body Metrics</h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'height_cm' as const, label: 'Height', unit: 'cm', placeholder: '175' },
              { key: 'weight_kg' as const, label: 'Current weight', unit: 'kg', placeholder: '70' },
              { key: 'target_weight' as const, label: 'Target weight', unit: 'kg', placeholder: '65' },
              { key: 'age' as const, label: 'Age', unit: 'yrs', placeholder: '25' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-ink-secondary mb-1">{f.label}</label>
                <div className="relative">
                  <input
                    type="number"
                    value={settings[f.key] ?? ''}
                    onChange={e => set(f.key, e.target.value ? Number(e.target.value) : null)}
                    placeholder={f.placeholder}
                    className="w-full px-3 py-2.5 pr-10 rounded-xl border border-surface-tertiary bg-surface-secondary text-ink focus:border-brand-400 transition-all text-sm"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-ink-tertiary">{f.unit}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-3">
            <label className="block text-xs font-semibold text-ink-secondary mb-2">Gender</label>
            <div className="flex gap-2">
              {[
                { v: 'male', l: '♂ Male' },
                { v: 'female', l: '♀ Female' },
                { v: 'other', l: '⚧ Other' },
              ].map(g => (
                <button
                  key={g.v}
                  onClick={() => set('gender', g.v)}
                  className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
                    settings.gender === g.v
                      ? 'bg-brand-500 text-white'
                      : 'bg-surface-tertiary text-ink-secondary'
                  }`}
                >
                  {g.l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Goal */}
        <div className="bg-white rounded-3xl shadow-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl">🎯</span>
            <h2 className="font-bold text-ink">Your Goal</h2>
          </div>

          <div className="flex gap-2 mb-4">
            {GOAL_OPTIONS.map(g => (
              <button
                key={g.value}
                onClick={() => set('goal', g.value)}
                className={`flex-1 flex flex-col items-center gap-1 py-3 rounded-2xl text-xs font-semibold transition-all ${
                  settings.goal === g.value
                    ? 'bg-brand-500 text-white shadow-card-lg'
                    : 'bg-surface-tertiary text-ink-secondary'
                }`}
              >
                <span className="text-xl">{g.icon}</span>
                {g.label}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink-secondary mb-2">Activity Level</label>
            <div className="space-y-2">
              {ACTIVITY_OPTIONS.map(a => (
                <button
                  key={a.value}
                  onClick={() => set('activity_level', a.value)}
                  className={`w-full text-left px-4 py-3 rounded-2xl flex items-center justify-between transition-all ${
                    settings.activity_level === a.value
                      ? 'bg-brand-50 border-2 border-brand-400'
                      : 'bg-surface-tertiary border-2 border-transparent'
                  }`}
                >
                  <div>
                    <div className={`text-sm font-semibold ${settings.activity_level === a.value ? 'text-brand-700' : 'text-ink'}`}>
                      {a.label}
                    </div>
                    <div className="text-xs text-ink-tertiary">{a.desc}</div>
                  </div>
                  {settings.activity_level === a.value && (
                    <div className="w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={calculateGoal}
            disabled={calcLoading}
            className="mt-4 w-full bg-indigo-500 hover:bg-indigo-600 disabled:opacity-60 text-white font-semibold py-3.5 rounded-2xl flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            {calcLoading ? (
              <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Calculating…</>
            ) : (
              <><span>🤖</span> Calculate my calorie goal</>
            )}
          </button>

          {goalResult && (
            <div className="mt-4 bg-brand-50 rounded-2xl p-4 animate-slide-up space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div className="text-2xl font-bold text-brand-700">{goalResult.calorie_goal}</div>
                  <div className="text-xs text-brand-600">kcal/day goal</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-brand-700">{goalResult.bmi}</div>
                  <div className="text-xs text-brand-600">{goalResult.bmi_category}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-brand-700">{goalResult.tdee}</div>
                  <div className="text-xs text-brand-600">kcal TDEE</div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-indigo-100 rounded-xl p-2">
                  <div className="font-bold text-indigo-700">{goalResult.protein_goal}g</div>
                  <div className="text-xs text-indigo-600">Protein</div>
                </div>
                <div className="bg-amber-100 rounded-xl p-2">
                  <div className="font-bold text-amber-700">{goalResult.carbs_goal}g</div>
                  <div className="text-xs text-amber-600">Carbs</div>
                </div>
                <div className="bg-red-100 rounded-xl p-2">
                  <div className="font-bold text-red-700">{goalResult.fat_goal}g</div>
                  <div className="text-xs text-red-600">Fat</div>
                </div>
              </div>

              {goalResult.estimated_weeks_to_goal && (
                <div className="text-center text-sm text-brand-700 font-medium">
                  ~{goalResult.estimated_weeks_to_goal} weeks to reach your goal
                </div>
              )}

              <p className="text-sm text-brand-800 italic">{goalResult.advice}</p>

              <ul className="space-y-1">
                {goalResult.tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-brand-700">
                    <span className="text-brand-500 font-bold mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {settings.calorie_goal && !goalResult && (
            <div className="mt-3 text-center text-sm text-ink-secondary">
              Current goal: <span className="font-bold text-ink">{settings.calorie_goal} kcal/day</span>
            </div>
          )}
        </div>

        {/* Save */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">
            {error}
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-3.5 rounded-2xl active:scale-95 transition-all shadow-card-lg"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved!' : 'Save changes'}
        </button>

        {/* Logout */}
        <button
          onClick={logout}
          disabled={loggingOut}
          className="w-full py-3 rounded-2xl text-red-500 font-semibold text-sm border border-red-200 hover:bg-red-50 transition-colors active:scale-95"
        >
          {loggingOut ? 'Signing out…' : 'Sign out'}
        </button>
      </div>
    </div>
  )
}
