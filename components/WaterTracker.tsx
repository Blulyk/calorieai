'use client'

import { useState } from 'react'

interface Props {
  glasses: number
  date: string
  onChange?: (glasses: number) => void
}

const GOAL = 8

export default function WaterTracker({ glasses, date, onChange }: Props) {
  const [current, setCurrent] = useState(glasses)
  const [saving, setSaving] = useState(false)

  async function update(n: number) {
    const next = Math.max(0, Math.min(12, n))
    setCurrent(next)
    setSaving(true)
    await fetch('/api/meals/water', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, glasses: next }),
    })
    setSaving(false)
    onChange?.(next)
  }

  const pct = Math.min(100, (current / GOAL) * 100)

  return (
    <div className="bg-dark-surface border border-dark-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
            <span className="text-base">💧</span>
          </div>
          <span className="font-semibold text-zinc-200">Water</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-400 font-medium">{current}/{GOAL}</span>
          {saving && <span className="text-xs text-zinc-700">saving…</span>}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-dark-elevated rounded-full overflow-hidden mb-3">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #3b82f6, #06b6d4)', boxShadow: '0 0 8px #3b82f640' }}
        />
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {Array.from({ length: Math.max(GOAL, current) }).map((_, i) => (
          <button
            key={i}
            onClick={() => update(i < current ? i : i + 1)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all active:scale-90 ${
              i < current
                ? 'bg-blue-500/20 border border-blue-500/30'
                : 'bg-dark-elevated border border-dark-border opacity-30'
            }`}
          >
            💧
          </button>
        ))}
      </div>

      <div className="flex justify-between mt-3">
        <button onClick={() => update(current - 1)} className="text-xs text-zinc-600 hover:text-zinc-400 px-2 py-1 rounded-lg transition-colors">
          − Remove
        </button>
        <button onClick={() => update(current + 1)} className="text-xs text-brand-500 font-semibold px-2 py-1 rounded-lg hover:bg-brand-500/10 transition-colors">
          + Add glass
        </button>
      </div>
    </div>
  )
}
