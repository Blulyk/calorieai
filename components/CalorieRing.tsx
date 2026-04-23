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

  const trackColor = '#f1f5f9'
  const fillColor = over ? '#ef4444' : pct > 0.85 ? '#f59e0b' : '#22c55e'

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={trackColor} strokeWidth={14}
          />
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={fillColor} strokeWidth={14}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-ink tabular-nums">{Math.round(consumed)}</span>
          <span className="text-xs text-ink-tertiary font-medium mt-0.5">kcal eaten</span>
          <div className={`mt-1 text-xs font-semibold ${over ? 'text-red-500' : 'text-brand-600'}`}>
            {over
              ? `+${Math.round(-remaining)} over`
              : `${Math.round(remaining)} left`}
          </div>
        </div>
      </div>
      <div className="mt-2 text-sm text-ink-secondary">
        Goal: <span className="font-semibold text-ink">{goal} kcal</span>
      </div>
    </div>
  )
}
