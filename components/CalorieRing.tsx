'use client'

const MEAL_COLORS: Record<string, string> = {
  breakfast: '#f59e0b',
  lunch:     '#3b82f6',
  dinner:    '#8b5cf6',
  snack:     '#ec4899',
}

const MEAL_LABELS: Record<string, string> = {
  breakfast: 'Desayuno',
  lunch:     'Almuerzo',
  dinner:    'Cena',
  snack:     'Tentempié',
}

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack']

const GAP_DEG = 4

export interface CalorieSegment {
  mealType: string
  calories: number
}

interface Props {
  segments: CalorieSegment[]
  goal: number
  size?: number
}

export default function CalorieRing({ segments, goal, size = 230 }: Props) {
  const strokeW = 24
  const radius  = (size - strokeW - 4) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * radius

  const consumed = segments.reduce((s, seg) => s + seg.calories, 0)
  const over = consumed > goal
  const pct  = goal > 0 ? Math.round((consumed / goal) * 100) : 0

  const sorted = MEAL_ORDER
    .map(type => segments.find(s => s.mealType === type))
    .filter((s): s is CalorieSegment => !!s && s.calories > 0)

  // Dominant segment (most calories)
  const dominant = sorted.length > 0
    ? sorted.reduce((a, b) => a.calories >= b.calories ? a : b)
    : null

  let cumFrac = 0
  const arcs = sorted.map((seg, i) => {
    const rawFrac = goal > 0 ? seg.calories / goal : 0
    const isLast  = i === sorted.length - 1
    const gapFrac = sorted.length > 1 && !isLast ? GAP_DEG / 360 : 0
    const frac    = Math.max(0, Math.min(rawFrac, 1 - cumFrac) - gapFrac)
    const startFrac = cumFrac
    cumFrac += frac + gapFrac
    return { ...seg, startFrac, frac }
  })

  const dominantColor = dominant ? (MEAL_COLORS[dominant.mealType] || '#f97316') : '#f97316'
  const glowColor     = over ? '#ef4444' : dominantColor

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Ambient glow */}
        {consumed > 0 && (
          <div className="absolute rounded-full opacity-20 blur-3xl"
            style={{
              inset: '10%',
              background: glowColor,
            }} />
        )}

        <svg width={size} height={size} className="relative z-10" style={{ overflow: 'visible' }}>
          {/* Track */}
          <circle cx={cx} cy={cy} r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth={strokeW} />

          {over ? (
            <circle cx={cx} cy={cy} r={radius}
              fill="none" stroke="#ef4444" strokeWidth={strokeW}
              strokeDasharray={circumference} strokeDashoffset={0}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="butt"
              style={{ filter: 'drop-shadow(0 0 10px #ef444470)' }}
            />
          ) : (
            arcs.map(arc => {
              if (arc.frac <= 0) return null
              const startDeg = arc.startFrac * 360 - 90
              const segLen   = arc.frac * circumference
              const color    = MEAL_COLORS[arc.mealType] || '#f97316'
              return (
                <circle
                  key={arc.mealType}
                  cx={cx} cy={cy} r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth={strokeW}
                  strokeDasharray={`${segLen} ${circumference}`}
                  strokeDashoffset={0}
                  transform={`rotate(${startDeg} ${cx} ${cy})`}
                  strokeLinecap="butt"
                  style={{
                    filter: `drop-shadow(0 0 8px ${color}80)`,
                    transition: 'stroke-dasharray 0.8s cubic-bezier(0.16,1,0.3,1)',
                  }}
                />
              )
            })
          )}
        </svg>

        {/* Center label — mirrors the "Utilities • €464.69 • 59%" style */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 px-4 text-center">
          {consumed > 0 && dominant ? (
            <>
              <span className="text-xs font-semibold uppercase tracking-widest mb-1"
                style={{ color: MEAL_COLORS[dominant.mealType], opacity: 0.85 }}>
                {MEAL_LABELS[dominant.mealType]}
              </span>
              <span className="text-4xl font-bold text-white tabular-nums leading-none">
                {Math.round(consumed)}
              </span>
              <span className="text-xs text-zinc-500 mt-1 font-medium">
                kcal · {pct > 100 ? '+' : ''}{pct > 100 ? pct - 100 : pct}%
              </span>
              {over && (
                <span className="mt-2 text-[10px] font-semibold text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full">
                  +{Math.round(consumed - goal)} exceso
                </span>
              )}
            </>
          ) : (
            <>
              <span className="text-3xl font-bold text-zinc-600 tabular-nums leading-none">0</span>
              <span className="text-xs text-zinc-700 mt-1">kcal consumidas</span>
            </>
          )}
        </div>
      </div>

      {/* Segment legend */}
      {arcs.length > 0 && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 justify-center">
          {arcs.map(arc => (
            <div key={arc.mealType} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: MEAL_COLORS[arc.mealType] }} />
              <span className="text-xs text-zinc-500">
                {MEAL_LABELS[arc.mealType]}
                <span className="text-zinc-600 ml-1 tabular-nums">
                  {Math.round(arc.calories)}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 text-xs text-zinc-600">
        Objetivo <span className="text-zinc-400 font-semibold">{goal} kcal</span>
        {consumed === 0 && (
          <span className="ml-2 text-zinc-700">· {goal} restantes</span>
        )}
        {consumed > 0 && !over && (
          <span className="ml-2 text-zinc-600">· {Math.round(goal - consumed)} restantes</span>
        )}
      </div>
    </div>
  )
}
