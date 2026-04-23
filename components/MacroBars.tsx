'use client'

interface MacroBarProps {
  label: string
  value: number
  goal: number
  color: string
  unit?: string
}

function MacroBar({ label, value, goal, color, unit = 'g' }: MacroBarProps) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0
  return (
    <div className="flex-1 min-w-0">
      <div className="flex justify-between items-baseline mb-1">
        <span className="text-xs font-semibold text-ink-secondary uppercase tracking-wide">{label}</span>
        <span className="text-xs font-bold text-ink tabular-nums">{Math.round(value)}{unit}</span>
      </div>
      <div className="h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="text-xs text-ink-tertiary mt-0.5 text-right">of {goal}{unit}</div>
    </div>
  )
}

interface Props {
  protein: number
  carbs: number
  fat: number
  proteinGoal?: number
  carbsGoal?: number
  fatGoal?: number
}

export default function MacroBars({ protein, carbs, fat, proteinGoal = 130, carbsGoal = 250, fatGoal = 65 }: Props) {
  return (
    <div className="flex gap-4">
      <MacroBar label="Protein" value={protein} goal={proteinGoal} color="#6366f1" />
      <MacroBar label="Carbs"   value={carbs}   goal={carbsGoal}   color="#f59e0b" />
      <MacroBar label="Fat"     value={fat}      goal={fatGoal}     color="#ef4444" />
    </div>
  )
}
