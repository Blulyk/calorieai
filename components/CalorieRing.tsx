'use client'

interface Props {
  consumed: number
  goal: number
  size?: number
}

export default function CalorieRing({ consumed, goal, size = 200 }: Props) {
  const radius = (size - 24) / 2
  const circumference = 2 * Math.PI * radius
  const pct = goal > 0 ? Math.min(1, consumed / goal) : 0
  const offset = circumference - pct * circumference
  const over = consumed > goal
  const remaining = goal - consumed

  const fillColor = over ? '#ef4444' : pct > 0.85 ? '#f59e0b' : '#22c55e'

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* Glow effect */}
        {pct > 0 && (
          <div
            className="absolute inset-0 rounded-full opacity-20 blur-2xl"
            style={{ background: fillColor }}
          />
        )}
        <svg width={size} height={size} className="-rotate-90 relative z-10">
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={14}
          />
          {/* Progress */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={fillColor}
            strokeWidth={14}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.16,1,0.3,1), stroke 0.3s ease', filter: `drop-shadow(0 0 8px ${fillColor}60)` }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <span className="text-3xl font-bold text-zinc-100 tabular-nums">{Math.round(consumed)}</span>
          <span className="text-xs text-zinc-500 font-medium mt-0.5">kcal eaten</span>
          <div className={`mt-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${
            over ? 'text-red-400 bg-red-400/10' : 'text-brand-400 bg-brand-400/10'
          }`}>
            {over ? `+${Math.round(-remaining)} over` : `${Math.round(remaining)} left`}
          </div>
        </div>
      </div>
      <div className="mt-2 text-sm text-zinc-500">
        Goal: <span className="font-semibold text-zinc-300">{goal} kcal</span>
      </div>
    </div>
  )
}
