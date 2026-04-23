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

  return (
    <div className="bg-white rounded-2xl shadow-card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">💧</span>
          <span className="font-semibold text-ink">Water</span>
        </div>
        <span className="text-sm text-ink-secondary font-medium">
          {current}/{GOAL} glasses {saving && <span className="text-ink-tertiary">·saving</span>}
        </span>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {Array.from({ length: GOAL }).map((_, i) => (
          <button
            key={i}
            onClick={() => update(i < current ? i : i + 1)}
            className={`w-8 h-8 rounded-xl flex items-center justify-center text-lg transition-all active:scale-90 ${
              i < current ? 'bg-blue-100' : 'bg-surface-tertiary opacity-40'
            }`}
          >
            💧
          </button>
        ))}
        {current > GOAL && Array.from({ length: current - GOAL }).map((_, i) => (
          <button key={`extra-${i}`} onClick={() => update(current - 1)}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-lg bg-blue-200 active:scale-90">
            💧
          </button>
        ))}
      </div>
      <div className="flex justify-between mt-3">
        <button onClick={() => update(current - 1)} className="text-xs text-ink-tertiary px-2 py-1 rounded-lg hover:bg-surface-tertiary transition-colors">
          − Remove
        </button>
        <button onClick={() => update(current + 1)} className="text-xs text-brand-600 font-semibold px-2 py-1 rounded-lg hover:bg-brand-50 transition-colors">
          + Add glass
        </button>
      </div>
    </div>
  )
}
