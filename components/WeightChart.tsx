'use client'

import { useMemo } from 'react'

interface WeightLog { date: string; weight_kg: number }
interface Props { logs: WeightLog[] }

export default function WeightChart({ logs }: Props) {
  const sorted = useMemo(() => [...logs].sort((a, b) => a.date.localeCompare(b.date)), [logs])

  if (sorted.length < 2) return null

  const minW = Math.min(...sorted.map(l => l.weight_kg))
  const maxW = Math.max(...sorted.map(l => l.weight_kg))
  const range = maxW - minW || 1
  const W = 320; const H = 120; const pad = 16

  const points = sorted.map((l, i) => ({
    x: pad + (i / (sorted.length - 1)) * (W - pad * 2),
    y: H - pad - ((l.weight_kg - minW) / range) * (H - pad * 2),
    ...l,
  }))

  const polyline = points.map(p => `${p.x},${p.y}`).join(' ')
  const area = `M${points[0].x},${H} ${points.map(p => `L${p.x},${p.y}`).join(' ')} L${points[points.length - 1].x},${H} Z`

  const first = sorted[0]
  const last  = sorted[sorted.length - 1]
  const change = Math.round((last.weight_kg - first.weight_kg) * 10) / 10
  const changeColor = change < 0 ? '#32D74B' : change > 0 ? '#FF453A' : 'rgba(235,235,245,0.4)'

  // Show month ticks
  const months = [...new Set(sorted.map(l => l.date.slice(0, 7)))]

  return (
    <div className="glass rounded-[1.6rem] p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/38">Evolución del peso</p>
        <span className="text-xs font-bold tabular-nums" style={{ color: changeColor }}>
          {change > 0 ? '+' : ''}{change} kg
        </span>
      </div>

      <div className="flex items-baseline gap-3 mb-4">
        <span className="text-2xl font-bold text-white tabular-nums">{last.weight_kg} kg</span>
        <span className="text-xs text-white/35">desde {first.weight_kg} kg</span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
        <defs>
          <linearGradient id="wg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0A84FF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#0A84FF" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Area fill */}
        <path d={area} fill="url(#wg)" />
        {/* Line */}
        <polyline points={polyline} fill="none" stroke="#0A84FF" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {/* Dots for each point */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2.5}
            fill={i === points.length - 1 ? '#0A84FF' : 'rgba(10,132,255,0.5)'}
            stroke={i === points.length - 1 ? '#0A0A0B' : 'none'} strokeWidth={1.5}
          />
        ))}
        {/* Min/max labels */}
        <text x={pad} y={H - 4} fill="rgba(235,235,245,0.3)" fontSize={10}>{minW}kg</text>
        <text x={pad} y={pad + 4} fill="rgba(235,235,245,0.3)" fontSize={10}>{maxW}kg</text>
      </svg>

      {/* Month labels */}
      {months.length > 1 && (
        <div className="flex justify-between mt-1 px-1">
          {months.slice(0, 4).map(m => (
            <span key={m} className="text-[9px] text-white/25">
              {new Date(m + '-01').toLocaleDateString('es-ES', { month: 'short' })}
            </span>
          ))}
        </div>
      )}

      {/* Recent entries */}
      <div className="mt-3 pt-3 space-y-1.5" style={{ borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
        {sorted.slice(-5).reverse().map(l => (
          <div key={l.date} className="flex items-center justify-between">
            <span className="text-xs text-white/40">
              {new Date(l.date + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <span className="text-xs font-semibold text-white tabular-nums">{l.weight_kg} kg</span>
          </div>
        ))}
      </div>
    </div>
  )
}
