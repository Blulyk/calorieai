'use client'

import { useEffect, useState } from 'react'

interface Props {
  protein: number
  carbs: number
  fat: number
  size?: number
}

const MACROS = [
  { key: 'carbs',   label: 'Carbos',   color: '#FF9F0A' },
  { key: 'protein', label: 'Proteína', color: '#32D74B' },
  { key: 'fat',     label: 'Grasa',    color: '#FFD60A' },
] as const

export default function MacroDonut({ protein, carbs, fat, size = 96 }: Props) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setTimeout(() => setMounted(true), 120) }, [])

  const total = protein + carbs + fat
  const cx = size / 2
  const r = size * 0.38
  const stroke = size * 0.13
  const C = 2 * Math.PI * r
  const gap = 4

  const values = { carbs, protein, fat }
  const pcts = { carbs: 0, protein: 0, fat: 0 }
  if (total > 0) {
    pcts.carbs   = (carbs   / total) * 100
    pcts.protein = (protein / total) * 100
    pcts.fat     = (fat     / total) * 100
  }

  let offset = 0
  const segments = MACROS.map(m => {
    const pct  = total > 0 ? (values[m.key] / total) : 0
    const len  = Math.max(pct * C - gap, 0)
    const seg  = { ...m, len, offset, pct }
    offset    += pct * C
    return seg
  })

  if (total === 0) {
    return (
      <div className="glass rounded-[1.6rem] p-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/38 mb-3">Reparto macros</p>
        <p className="text-sm text-white/30 text-center py-4">Sin datos hoy</p>
      </div>
    )
  }

  return (
    <div className="glass rounded-[1.6rem] p-4">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/38 mb-3">Reparto macros</p>
      <div className="flex items-center gap-4">
        {/* Donut */}
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}
        >
          {/* Track */}
          <circle
            cx={cx} cy={cx} r={r}
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={stroke}
            fill="none"
          />
          {segments.map(seg => (
            <circle
              key={seg.key}
              cx={cx} cy={cx} r={r}
              stroke={seg.color}
              strokeWidth={stroke}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${mounted ? seg.len : 0} ${C}`}
              strokeDashoffset={-seg.offset}
              style={{
                filter: `drop-shadow(0 0 3px ${seg.color}88)`,
                transition: 'stroke-dasharray 0.7s cubic-bezier(0.16,1,0.3,1)',
              }}
            />
          ))}
        </svg>

        {/* Legend */}
        <div className="flex flex-col gap-2.5 flex-1">
          {MACROS.map(m => {
            const pct  = Math.round(pcts[m.key])
            const grams = Math.round(values[m.key])
            return (
              <div key={m.key} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full flex-shrink-0"
                  style={{ background: m.color, boxShadow: `0 0 6px ${m.color}99` }}
                />
                <span className="flex-1 text-xs text-white/70">{m.label}</span>
                <span className="text-xs font-bold text-white tabular-nums">{grams}g</span>
                <span className="text-[10px] text-white/40 tabular-nums w-7 text-right">{pct}%</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
