'use client'

import { useState } from 'react'

interface Props {
  glasses: number
  date: string
  onChange?: (glasses: number) => void
}

const ML_PER_GLASS = 250
const GOAL_ML = 2500
const GOAL_GLASSES = GOAL_ML / ML_PER_GLASS
const MAX_GLASSES = 12

export default function WaterTracker({ glasses, date, onChange }: Props) {
  const [current, setCurrent] = useState(glasses)
  const [saving, setSaving] = useState(false)

  async function update(n: number) {
    const next = Math.max(0, Math.min(MAX_GLASSES, n))
    setCurrent(next)
    setSaving(true)
    await fetch('/api/meals/water', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, glasses: next, water_ml: next * ML_PER_GLASS }),
    })
    setSaving(false)
    onChange?.(next)
  }

  const currentMl = current * ML_PER_GLASS
  const pct = Math.min(100, (current / GOAL_GLASSES) * 100)

  return (
    <section className="water-panel glass liquid-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/40">Hidratación</p>
          <p className="mt-1 text-2xl font-bold text-white tabular-nums">{currentMl} <span className="text-sm text-white/38">ml</span></p>
        </div>
        <div className="glass-pill rounded-full px-3 py-1.5 text-xs font-bold text-sky-100">
          {saving ? 'Guardando' : `${Math.round(pct)}%`}
        </div>
      </div>

      <div className="water-progress relative h-3 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #38bdf8, #60a5fa, #a78bfa)',
            boxShadow: pct > 0 ? '0 0 18px rgba(56,189,248,0.7)' : 'none',
          }}
        />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button onClick={() => update(current - 1)} disabled={current === 0} className="glass-btn flex-1 rounded-2xl py-3 text-sm font-bold text-white/76 disabled:opacity-30">
          -250 ml
        </button>
        <button onClick={() => update(current + 1)} disabled={current >= MAX_GLASSES} className="flex-1 rounded-2xl py-3 text-sm font-bold text-white shadow-glow disabled:opacity-30" style={{ background: 'linear-gradient(145deg, #38bdf8, #2563eb)' }}>
          +250 ml
        </button>
      </div>
    </section>
  )
}
