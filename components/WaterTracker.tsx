'use client'

import { useState } from 'react'

interface Props {
  glasses: number
  date: string
  onChange?: (glasses: number) => void
}

const ML_PER_GLASS = 250
const GOAL_ML = 2500
const GOAL_GLASSES = GOAL_ML / ML_PER_GLASS  // 10
const MAX_GLASSES = 12                         // 3000 ml

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
      body: JSON.stringify({ date, glasses: next }),
    })
    setSaving(false)
    onChange?.(next)
  }

  const currentMl = current * ML_PER_GLASS
  const pct = Math.min(100, (current / GOAL_GLASSES) * 100)
  const reached = currentMl >= GOAL_ML

  return (
    <div className="bg-dark-surface border border-dark-border rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/15 border border-blue-500/20 flex items-center justify-center">
            <span className="text-base">💧</span>
          </div>
          <span className="font-semibold text-zinc-200">Agua</span>
        </div>
        <div className="flex items-center gap-2">
          {saving && <span className="text-xs text-zinc-600">guardando…</span>}
          <span className={`text-sm font-bold tabular-nums ${reached ? 'text-blue-400' : 'text-zinc-300'}`}>
            {currentMl} <span className="text-zinc-600 font-normal text-xs">/ {GOAL_ML} ml</span>
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-3 bg-dark-elevated rounded-full overflow-hidden mb-3 relative">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: reached
              ? 'linear-gradient(90deg, #2563eb, #06b6d4)'
              : 'linear-gradient(90deg, #3b82f6, #06b6d4)',
            boxShadow: pct > 0 ? '0 0 10px #3b82f650' : 'none',
          }}
        />
        {/* Goal marker */}
        {!reached && (
          <div className="absolute right-0 top-0 h-full w-px bg-blue-500/30" />
        )}
      </div>

      {/* Ml markers */}
      <div className="flex justify-between mb-4">
        {[0, 500, 1000, 1500, 2000, 2500].map(ml => (
          <span key={ml} className={`text-[10px] tabular-nums ${
            currentMl >= ml ? 'text-blue-500/60' : 'text-zinc-700'
          }`}>{ml === 0 ? '0' : `${ml/1000}L`}</span>
        ))}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => update(current - 1)}
          disabled={current === 0}
          className="flex-1 py-2.5 rounded-xl border border-dark-border text-zinc-400 font-semibold text-sm active:scale-95 transition-all disabled:opacity-30"
        >
          − 250 ml
        </button>
        <div className="flex flex-col items-center">
          <span className="text-xl">{reached ? '✅' : '💧'}</span>
        </div>
        <button
          onClick={() => update(current + 1)}
          disabled={current >= MAX_GLASSES}
          className="flex-1 py-2.5 rounded-xl bg-blue-500/15 border border-blue-500/25 text-blue-400 font-semibold text-sm active:scale-95 transition-all disabled:opacity-30"
        >
          + 250 ml
        </button>
      </div>

      {reached && (
        <p className="text-xs text-blue-400 text-center mt-2 font-medium">
          ¡Objetivo de hidratación alcanzado! 🎉
        </p>
      )}
    </div>
  )
}
