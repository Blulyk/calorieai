'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const text = await res.text()
      const data = text ? JSON.parse(text) : {}
      if (!res.ok) { setError(data.error || 'Error al iniciar sesión'); setLoading(false); return }
      router.replace('/')
    } catch {
      setError('Error del servidor — inténtalo de nuevo')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-base flex flex-col items-center justify-center p-6">
      {/* Background glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm relative">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-brand-500/10 border border-brand-500/20 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-glow">
            <span className="text-4xl">🥗</span>
          </div>
          <h1 className="text-3xl font-bold text-zinc-100">CalorieAI</h1>
          <p className="text-zinc-600 mt-2">Inicia sesión en tu cuenta</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-zinc-400 mb-2">Usuario o email</label>
            <input
              type="text"
              value={form.identifier}
              onChange={e => setForm(f => ({ ...f, identifier: e.target.value }))}
              placeholder="usuario o email"
              required
              autoComplete="username"
              className="w-full px-4 py-3.5 rounded-2xl bg-dark-surface border border-dark-border text-zinc-100 placeholder:text-zinc-700 focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-zinc-400 mb-2">Contraseña</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              required
              autoComplete="current-password"
              className="w-full px-4 py-3.5 rounded-2xl bg-dark-surface border border-dark-border text-zinc-100 placeholder:text-zinc-700 focus:border-brand-500/50 focus:ring-2 focus:ring-brand-500/10 outline-none transition-all"
            />
          </div>

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
            {loading ? 'Iniciando sesión…' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link href="/register" className="text-sm text-zinc-600 hover:text-brand-400 transition-colors">
            ¿Nuevo usuario? <span className="text-brand-500 font-semibold">Crear cuenta</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
