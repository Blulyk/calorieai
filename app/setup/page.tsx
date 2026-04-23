'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function SetupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ username: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    fetch('/api/setup').then(r => r.json()).then(data => {
      if (!data.needsSetup) router.replace('/login')
      else setChecking(false)
    })
  }, [router])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error); setLoading(false); return }
    router.replace('/')
  }

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-emerald-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-brand-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-float">
            <span className="text-4xl">🥗</span>
          </div>
          <h1 className="text-3xl font-bold text-ink">Welcome to CalorieAI</h1>
          <p className="text-ink-secondary mt-2">Create your admin account to get started</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Username</label>
            <input
              type="text"
              value={form.username}
              onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              placeholder="john_doe"
              required
              className="w-full px-4 py-3 rounded-2xl border border-surface-tertiary bg-white text-ink placeholder:text-ink-tertiary focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 rounded-2xl border border-surface-tertiary bg-white text-ink placeholder:text-ink-tertiary focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="At least 6 characters"
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-2xl border border-surface-tertiary bg-white text-ink placeholder:text-ink-tertiary focus:border-brand-400 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-3.5 rounded-2xl transition-all active:scale-95 shadow-card-lg"
          >
            {loading ? 'Creating account…' : 'Create account & start'}
          </button>
        </form>

        <p className="text-center text-sm text-ink-tertiary mt-6">
          Other users can register after setup is complete.
        </p>
      </div>
    </div>
  )
}
