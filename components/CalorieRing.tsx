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

const GAP_DEG = 3

export interface CalorieSegment {
  mealType: string
  calories: number
}

interface Props {
  segments: CalorieSegment[]
  goal: number
  size?: number
}

export default function CalorieRing({ segments, goal, size = 210 }: Props) {
  const radius = (size - 28) / 2
  const cx = size / 2
  const cy = size / 2
  const circumference = 2 * Math.PI * radius

  const consumed = segments.reduce((s, seg) => s + seg.calories, 0)
  const over = consumed > goal
  const remaining = goal - consumed

  const sorted = MEAL_ORDER
    .map(type => segments.find(s => s.mealType === type))
    .filter((s): s is CalorieSegment => !!s && s.calories > 0)

  // Build arcs with small gaps between segments
  let cumFrac = 0
  const arcs = sorted.map((seg, i) => {
    const rawFrac = goal > 0 ? seg.calories / goal : 0
    const isLast = i === sorted.length - 1
    const gapFrac = sorted.length > 1 && !isLast ? GAP_DEG / 360 : 0
    const frac = Math.max(0, Math.min(rawFrac, 1 - cumFrac) - gapFrac)
    const startFrac = cumFrac
    cumFrac += frac + gapFrac
    return { ...seg, startFrac, frac }
  })

  const lastColor = arcs.length > 0 ? MEAL_COLORS[arcs[arcs.length - 1].mealType] || '#f97316' : '#f97316'
  const glowColor = over ? '#ef4444' : lastColor

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {consumed > 0 && (
          <div className="absolute inset-0 rounded-full opacity-15 blur-2xl"
            style={{ background: glowColor }} />
        )}

        <svg width={size} height={size} className="relative z-10">
          {/* Track */}
          <circle cx={cx} cy={cy} r={radius}
            fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={18} />

          {over ? (
            <circle cx={cx} cy={cy} r={radius}
              fill="none" stroke="#ef4444" strokeWidth={18}
              strokeDasharray={circumference}
              strokeDashoffset={0}
              transform={`rotate(-90 ${cx} ${cy})`}
              strokeLinecap="round"
              style={{ filter: 'drop-shadow(0 0 8px #ef444460)' }}
            />
          ) : (
            arcs.map(arc => {
              if (arc.frac <= 0) return null
              const startDeg = arc.startFrac * 360 - 90
              const segLen = arc.frac * circumference
              const color = MEAL_COLORS[arc.mealType] || '#f97316'
              return (
                <circle
                  key={arc.mealType}
                  cx={cx} cy={cy} r={radius}
                  fill="none"
                  stroke={color}
                  strokeWidth={18}
                  strokeDasharray={`${segLen} ${circumference}`}
                  strokeDashoffset={0}
                  transform={`rotate(${startDeg} ${cx} ${cy})`}
                  strokeLinecap="butt"
                  style={{
                    filter: `drop-shadow(0 0 6px ${color}70)`,
                    transition: 'stroke-dasharray 0.7s cubic-bezier(0.16,1,0.3,1)',
                  }}
                />
              )
            })
          )}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <span className="text-4xl font-bold text-zinc-100 tabular-nums leading-none">{Math.round(consumed)}</span>
          <span className="text-xs text-zinc-500 font-medium mt-1">kcal consumidas</span>
          <div className={`mt-2 text-xs font-semibold px-2.5 py-0.5 rounded-full ${
            over ? 'text-red-400 bg-red-400/10' : 'text-orange-400 bg-orange-400/10'
          }`}>
            {over ? `+${Math.round(-remaining)} exceso` : `${Math.round(remaining)} restantes`}
          </div>
        </div>
      </div>

      {arcs.length > 0 && (
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-3 justify-center">
          {arcs.map(arc => (
            <div key={arc.mealType} className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: MEAL_COLORS[arc.mealType] }} />
              <span className="text-xs text-zinc-500">
                {MEAL_LABELS[arc.mealType]} · {Math.round(arc.calories)} kcal
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 text-sm text-zinc-500">
        Objetivo: <span className="font-semibold text-zinc-300">{goal} kcal</span>
      </div>
    </div>
  )
}
