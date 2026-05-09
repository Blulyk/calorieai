'use client'

import { useEffect, useRef, useState } from 'react'

interface WeightLog { date: string; weight_kg: number }

interface Props {
  logs: WeightLog[]
  onLogged?: (logs: WeightLog[]) => void
}

export default function WeightTracker({ logs: initialLogs, onLogged }: Props) {
  const [logs, setLogs]       = useState<WeightLog[]>(initialLogs)
  const [input, setInput]     = useState('')
  const [saving, setSaving]   = useState(false)
  const [editing, setEditing] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setLogs(initialLogs) }, [initialLogs])

  const today = new Date().toISOString().split('T')[0]
  const latest = logs[0]
  const todayLog = logs.find(l => l.date === today)

  // Weekly change: compare latest vs entry 7+ days ago
  const weekAgoISO = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
  const weekAgoLog = logs.find(l => l.date <= weekAgoISO)
  const weekChange = latest && weekAgoLog
    ? Math.round((latest.weight_kg - weekAgoLog.weight_kg) * 10) / 10
    : null

  // Sparkline: last 7 entries reversed (oldest → newest)
  const sparkData = [...logs].reverse().slice(-7)
  const minW = sparkData.length > 1 ? Math.min(...sparkData.map(l => l.weight_kg)) - 1 : 0
  const maxW = sparkData.length > 1 ? Math.max(...sparkData.map(l => l.weight_kg)) + 1 : 100

  async function save() {
    const kg = parseFloat(input.replace(',', '.'))
    if (!kg || kg < 20 || kg > 500) return
    setSaving(true)
    await fetch('/api/weight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: today, weight_kg: kg }),
    })
    const updated = logs.filter(l => l.date !== today)
    updated.unshift({ date: today, weight_kg: kg })
    updated.sort((a, b) => b.date.localeCompare(a.date))
    setLogs(updated)
    onLogged?.(updated)
    setInput('')
    setEditing(false)
    setSaving(false)
  }

  return (
    <section className="glass rounded-[1.6rem] p-4">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/38">Peso</p>
          {latest ? (
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-white tabular-nums">{latest.weight_kg}</span>
              <span className="text-sm text-white/40">kg</span>
            </div>
          ) : (
            <p className="text-sm text-white/35 mt-1">Sin datos</p>
          )}
          {weekChange !== null && (
            <div className="flex items-center gap-1 mt-0.5">
              <span
                className="text-[11px] font-semibold tabular-nums"
                style={{ color: weekChange < 0 ? '#32D74B' : weekChange > 0 ? '#FF453A' : 'rgba(235,235,245,0.4)' }}
              >
                {weekChange > 0 ? '+' : ''}{weekChange} kg esta semana
              </span>
            </div>
          )}
        </div>

        {/* Sparkline */}
        {sparkData.length >= 2 && (
          <svg width={64} height={36} viewBox="0 0 64 36" style={{ flexShrink: 0 }}>
            <polyline
              points={sparkData.map((l, i) => {
                const x = (i / (sparkData.length - 1)) * 60 + 2
                const y = 34 - ((l.weight_kg - minW) / (maxW - minW)) * 30
                return `${x},${y}`
              }).join(' ')}
              fill="none"
              stroke="rgba(255,255,255,0.25)"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Latest dot */}
            {(() => {
              const last = sparkData[sparkData.length - 1]
              const x = 62
              const y = 34 - ((last.weight_kg - minW) / (maxW - minW)) * 30
              return <circle cx={x} cy={y} r={2.5} fill="#0A84FF" />
            })()}
          </svg>
        )}
      </div>

      {/* Log weight section */}
      {editing ? (
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="number"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && save()}
            placeholder="ej. 72.4"
            step="0.1"
            min="20"
            max="500"
            className="glass-input flex-1 rounded-2xl px-4 py-3 text-sm"
            autoFocus
          />
          <button
            onClick={save}
            disabled={saving}
            className="rounded-2xl px-4 py-3 text-sm font-bold text-white transition-all active:scale-95"
            style={{ background: 'linear-gradient(145deg, #1F8FFF, #0A6BE0)', minWidth: 64 }}
          >
            {saving ? '…' : 'Guardar'}
          </button>
          <button
            onClick={() => { setEditing(false); setInput('') }}
            className="glass-btn rounded-2xl px-3 py-3 text-sm text-white/60"
          >
            ✕
          </button>
        </div>
      ) : (
        <button
          onClick={() => {
            setEditing(true)
            if (todayLog) setInput(String(todayLog.weight_kg))
            setTimeout(() => inputRef.current?.focus(), 50)
          }}
          className="w-full glass-btn rounded-2xl py-2.5 text-sm font-semibold text-white/70 transition-all active:scale-95"
        >
          {todayLog ? `Actualizar — hoy: ${todayLog.weight_kg} kg` : '+ Registrar peso de hoy'}
        </button>
      )}
    </section>
  )
}
