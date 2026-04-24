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
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-brand-500/10 border border-brand-500/20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-glow">
            <span className="text-4xl">🥗</span>
          </div>
          <h1 className="text-3xl font-bold text-zinc-100">Bienvenido a CalorieAI</h1>
          <p className="text-zinc-600 mt-2">Crea tu cuenta para empezar</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          {[
            { key: 'username', label: 'Nombre de usuario', type: 'text', placeholder: 'john_doe' },
            { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
            { key: 'password', label: 'Contraseña', type: 'password', placeholder: 'Mínimo 6 caracteres' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-sm font-semibold text-zinc-400 mb-2">{f.label}</label>
              <input
                type={f.type}
                value={form[f.key as keyof typeof form]}
                onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                placeholder={f.placeholder}
                required
                className="glass-input w-full px-4 py-3.5 rounded-2xl"
              />
            </div>
          ))}

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-2xl px-4 py-3">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white font-semibold py-3.5 rounded-2xl transition-all active:scale-95 shadow-glow mt-2"
          >
            {loading ? 'Creando cuenta…' : 'Empezar'}
          </button>
        </form>
      </div>
    </div>
  )
}
