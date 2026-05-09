'use client'

import { useEffect, useState } from 'react'

interface Props {
  protocol: string   // '16:8', '18:6', '20:4', '12:12'
  startTime: string  // 'HH:MM' eating window start
  endTime: string    // 'HH:MM' eating window end
  lastMealAt?: number // unix timestamp of last meal
}

function parseHHMM(hhmm: string): { h: number; m: number } {
  const [h, m] = hhmm.split(':').map(Number)
  return { h: h || 0, m: m || 0 }
}

function formatCountdown(diffMs: number): string {
  const totalSecs = Math.max(0, Math.floor(diffMs / 1000))
  const h = Math.floor(totalSecs / 3600)
  const m = Math.floor((totalSecs % 3600) / 60)
  const s = totalSecs % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function FastingTimer({ protocol, startTime, endTime, lastMealAt }: Props) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const start = parseHHMM(startTime)
  const end   = parseHHMM(endTime)
  const startMins = start.h * 60 + start.m
  const endMins   = end.h   * 60 + end.m
  const currentMins = now.getHours() * 60 + now.getMinutes()

  // Is eating window crossing midnight?
  const crossesMidnight = endMins < startMins
  let inEatingWindow: boolean
  if (crossesMidnight) {
    inEatingWindow = currentMins >= startMins || currentMins < endMins
  } else {
    inEatingWindow = currentMins >= startMins && currentMins < endMins
  }

  // Minutes until next state change
  let minsUntilChange: number
  if (inEatingWindow) {
    minsUntilChange = endMins > currentMins ? endMins - currentMins : (1440 - currentMins) + endMins
  } else {
    minsUntilChange = startMins > currentMins ? startMins - currentMins : (1440 - currentMins) + startMins
  }
  const countdown = formatCountdown(minsUntilChange * 60 * 1000)

  // Fasting protocol total hours
  const [fastH, eatH] = protocol.split(':').map(Number)
  const fastingDuration = (fastH || 16) * 60
  const eatingDuration  = (eatH  || 8)  * 60

  // Progress: what fraction through the current period are we?
  let periodDuration: number
  let elapsedInPeriod: number
  if (inEatingWindow) {
    periodDuration = eatingDuration
    elapsedInPeriod = crossesMidnight
      ? (currentMins >= startMins ? currentMins - startMins : (1440 - startMins) + currentMins)
      : currentMins - startMins
  } else {
    periodDuration = fastingDuration
    elapsedInPeriod = crossesMidnight
      ? (currentMins >= endMins ? currentMins - endMins : (1440 - endMins) + currentMins)
      : (currentMins >= endMins ? currentMins - endMins : (1440 - endMins) + currentMins)
  }
  const pct = Math.min(1, elapsedInPeriod / periodDuration)

  const accentColor = inEatingWindow ? '#32D74B' : '#0A84FF'
  const r = 38; const stroke = 8; const C = 2 * Math.PI * r

  return (
    <section className="glass rounded-[1.6rem] p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="h-3.5 w-3.5" fill="none" stroke={inEatingWindow ? '#32D74B' : '#0A84FF'} strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d={inEatingWindow ? 'M12 6v6l4 2M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2' : 'M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636'} />
        </svg>
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: accentColor }}>
          Ayuno {protocol}
        </span>
      </div>

      <div className="flex items-center gap-5">
        {/* Ring */}
        <svg width={96} height={96} viewBox="0 0 96 96" style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
          <circle cx={48} cy={48} r={r} stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} fill="none" />
          <circle cx={48} cy={48} r={r} stroke={accentColor} strokeWidth={stroke} fill="none" strokeLinecap="round"
            strokeDasharray={`${pct * C} ${C}`}
            style={{ filter: `drop-shadow(0 0 4px ${accentColor}88)`, transition: 'stroke-dasharray 1s linear' }}
          />
        </svg>

        <div className="flex-1">
          <p className="text-[10px] text-white/40 font-medium uppercase tracking-wider mb-1">
            {inEatingWindow ? '🟢 Ventana de alimentación' : '🔵 En ayuno'}
          </p>
          <div className="text-2xl font-bold text-white tabular-nums mb-1">{countdown}</div>
          <p className="text-xs text-white/40">
            {inEatingWindow
              ? `Ventana cierra a las ${endTime}`
              : `Ventana abre a las ${startTime}`}
          </p>
          {lastMealAt && (
            <p className="text-[10px] text-white/25 mt-1">
              Última comida: {new Date(lastMealAt * 1000).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
