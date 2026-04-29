'use client'

import { useEffect, useState } from 'react'

const MEAL_COLORS: Record<string, string> = {
  breakfast: '#9b8a78',
  lunch: '#4f8fda',
  dinner: '#756a5f',
  snack: '#b6a28c',
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Tentempie',
}

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack']
const MAIN_START_DEG = -38
const MAIN_ARC_DEG = 202
const SIDE_START_DEG = 168
const SIDE_ARC_DEG = 132
const SIDE_GAP_DEG = 13

export interface CalorieSegment {
  mealType: string
  calories: number
}

interface Props {
  segments: CalorieSegment[]
  goal: number
  size?: number
}

export default function CalorieRing({ segments, goal, size = 248 }: Props) {
  const strokeW = 25
  const radius = (size - strokeW - 18) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * radius
  const centerSize = Math.round(size * 0.58)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 80)
    return () => clearTimeout(t)
  }, [])

  const consumed = segments.reduce((s, seg) => s + seg.calories, 0)
  const over = consumed > goal
  const pct = goal > 0 ? Math.round((consumed / goal) * 100) : 0
  const sorted = MEAL_ORDER
    .map(type => segments.find(s => s.mealType === type))
    .filter((s): s is CalorieSegment => !!s && s.calories > 0)
  const dominant = sorted.length > 0 ? sorted.reduce((a, b) => a.calories >= b.calories ? a : b) : null

  const sideSegments = sorted.filter(seg => seg.mealType !== dominant?.mealType)
  const sideTotal = Math.max(sideSegments.reduce((sum, seg) => sum + seg.calories, 0), 1)
  const sideAvailable = Math.max(0, SIDE_ARC_DEG - Math.max(0, sideSegments.length - 1) * SIDE_GAP_DEG)
  let sideCursor = SIDE_START_DEG
  const sideArcs = sideSegments.map(seg => {
    const deg = sideSegments.length === 1
      ? Math.min(62, Math.max(32, sideAvailable))
      : Math.min(54, Math.max(24, (seg.calories / sideTotal) * sideAvailable))
    const startDeg = sideCursor
    sideCursor += deg + SIDE_GAP_DEG
    return { ...seg, startDeg, deg }
  })

  const mainColor = '#4f8fda'
  const dominantColor = dominant ? (dominant.mealType === 'lunch' ? mainColor : MEAL_COLORS[dominant.mealType] || mainColor) : mainColor
  const glowColor = over ? '#ef4444' : dominantColor

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {consumed > 0 && (
          <div
            className="absolute rounded-full blur-3xl animate-glowPulse"
            style={{ inset: '8%', background: glowColor, opacity: 0.26 }}
          />
        )}

        <div
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: centerSize,
            height: centerSize,
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle at 38% 24%, rgba(255,255,255,0.18), transparent 28%), radial-gradient(circle at 45% 58%, ${dominantColor}24, rgba(18,24,27,0.9) 55%, #111 100%)`,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -28px 42px rgba(0,0,0,0.36), 0 18px 40px rgba(0,0,0,0.34)',
          }}
        />

        <svg width={size} height={size} className="relative z-10" style={{ overflow: 'visible' }}>
          <defs>
            <filter id="calorie-ring-glow" x="-35%" y="-35%" width="170%" height="170%">
              <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={glowColor} floodOpacity="0.42" />
            </filter>
          </defs>

          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="rgba(94,88,80,0.34)"
            strokeWidth={strokeW * 0.95}
            strokeLinecap="round"
            strokeDasharray={`${((MAIN_ARC_DEG + SIDE_ARC_DEG) / 360) * circumference} ${circumference}`}
            transform={`rotate(${MAIN_START_DEG} ${cx} ${cy})`}
          />
          <circle
            cx={cx}
            cy={cy}
            r={radius - strokeW * 0.74}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />

          {over ? (
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke="#ef4444"
              strokeWidth={strokeW}
              strokeDasharray={ready ? `${(MAIN_ARC_DEG / 360) * circumference} ${circumference}` : `0 ${circumference}`}
              transform={`rotate(${MAIN_START_DEG} ${cx} ${cy})`}
              strokeLinecap="round"
              style={{
                filter: 'url(#calorie-ring-glow)',
                transition: 'stroke-dasharray 1s cubic-bezier(0.16,1,0.3,1)',
              }}
            />
          ) : (
            <>
              {dominant && (
                <circle
                  key="dominant-main-arc"
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill="none"
                  stroke={mainColor}
                  strokeWidth={strokeW}
                  strokeDasharray={ready ? `${(MAIN_ARC_DEG / 360) * circumference} ${circumference}` : `0 ${circumference}`}
                  transform={`rotate(${MAIN_START_DEG} ${cx} ${cy})`}
                  strokeLinecap="round"
                  style={{
                    filter: `drop-shadow(0 0 16px ${mainColor}78)`,
                    transition: 'stroke-dasharray 0.95s cubic-bezier(0.16,1,0.3,1)',
                  }}
                />
              )}

              {sideArcs.map((arc, idx) => {
                const segLen = (arc.deg / 360) * circumference
                const color = MEAL_COLORS[arc.mealType] || '#9b8a78'
                return (
                  <circle
                    key={arc.mealType}
                    cx={cx}
                    cy={cy}
                    r={radius}
                    fill="none"
                    stroke={color}
                    strokeWidth={strokeW * 0.9}
                    strokeDasharray={ready ? `${segLen} ${circumference}` : `0 ${circumference}`}
                    transform={`rotate(${arc.startDeg} ${cx} ${cy})`}
                    strokeLinecap="round"
                    style={{
                      filter: `drop-shadow(0 0 10px ${color}66)`,
                      opacity: 0.92,
                      transition: `stroke-dasharray 0.85s cubic-bezier(0.16,1,0.3,1) ${120 + idx * 80}ms`,
                    }}
                  />
                )
              })}
            </>
          )}
        </svg>

        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-4 text-center">
          {consumed > 0 && dominant ? (
            <>
              <span className="mb-1 text-xs font-bold uppercase" style={{ color: MEAL_COLORS[dominant.mealType] }}>
                {MEAL_LABELS[dominant.mealType]}
              </span>
              <span
                className="text-[3.15rem] font-bold leading-none text-white tabular-nums"
                style={{ textShadow: '0 0 22px rgba(255,255,255,0.16)' }}
              >
                {Math.round(consumed)}
              </span>
              <span className="mt-2 text-xs font-semibold text-zinc-300/64">
                kcal <span className="text-zinc-500">·</span> {pct > 100 ? '+' : ''}{pct > 100 ? pct - 100 : pct}%
              </span>
              {over && (
                <span className="mt-2 rounded-full bg-red-400/10 px-2 py-0.5 text-[10px] font-semibold text-red-300">
                  +{Math.round(consumed - goal)} exceso
                </span>
              )}
            </>
          ) : (
            <>
              <span className="text-4xl font-bold leading-none text-zinc-400/70 tabular-nums">0</span>
              <span className="mt-1 text-xs text-zinc-400/50">kcal consumidas</span>
            </>
          )}
        </div>
      </div>

      {sorted.length > 0 && (
        <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
          {sorted.map(arc => (
            <div key={arc.mealType} className="flex items-center gap-1.5">
              <div
                className="h-2 w-2 flex-shrink-0 rounded-full shadow-[0_0_10px_currentColor]"
                style={{ background: MEAL_COLORS[arc.mealType], color: MEAL_COLORS[arc.mealType] }}
              />
              <span className="text-xs font-medium text-zinc-300/58">
                {MEAL_LABELS[arc.mealType]}
                <span className="ml-1 font-semibold text-zinc-100/74 tabular-nums">{Math.round(arc.calories)}</span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 text-xs font-medium text-zinc-300/54">
        Objetivo <span className="font-semibold text-zinc-100">{goal} kcal</span>
        {consumed === 0 && <span className="ml-2 text-zinc-400/50">· {goal} restantes</span>}
        {consumed > 0 && !over && <span className="ml-2 text-zinc-400/60">· {Math.round(goal - consumed)} restantes</span>}
      </div>
    </div>
  )
}
